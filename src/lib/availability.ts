import "server-only";

import { addDays, addMinutes, format, parseISO } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

import { listBusyIntervals } from "@/lib/google";
import { getResolvedHostConfig, hasSupabaseConfig, getSupabaseAdmin } from "@/lib/supabase";
import { computeVocWindows } from "@/lib/voc";
import type { BodySet, Interval, Slot, SlotBlocker, VocWindow, WeeklyAvailability } from "@/lib/types";

function overlaps(left: Interval, right: Interval) {
  return left.startsAt < right.endsAt && left.endsAt > right.startsAt;
}

function dateKeyToWeekday(dateKey: string) {
  return new Date(`${dateKey}T00:00:00Z`).getUTCDay().toString();
}

function buildAvailabilityIntervals(from: Date, to: Date, availabilityRules: WeeklyAvailability, timezone: string) {
  const startDateKey = formatInTimeZone(from, timezone, "yyyy-MM-dd");
  const endDateKey = formatInTimeZone(to, timezone, "yyyy-MM-dd");
  const intervals: Interval[] = [];

  for (
    let cursor = parseISO(`${startDateKey}T00:00:00Z`);
    cursor <= parseISO(`${endDateKey}T00:00:00Z`);
    cursor = addDays(cursor, 1)
  ) {
    const dateKey = format(cursor, "yyyy-MM-dd");
    const weekday = dateKeyToWeekday(dateKey);

    for (const window of availabilityRules[weekday] ?? []) {
      const windowStart = fromZonedTime(`${dateKey}T${window.start}:00`, timezone);
      const windowEnd = fromZonedTime(`${dateKey}T${window.end}:00`, timezone);
      const startsAt = new Date(Math.max(windowStart.getTime(), from.getTime()));
      const endsAt = new Date(Math.min(windowEnd.getTime(), to.getTime()));

      if (endsAt > startsAt) {
        intervals.push({ startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString() });
      }
    }
  }

  return intervals;
}

function buildSlots(baseIntervals: Interval[], durationMinutes: number, blockers: Array<{ kind: SlotBlocker; interval: Interval }>) {
  const slots: Slot[] = [];

  for (const interval of baseIntervals) {
    let cursor = new Date(interval.startsAt);
    const intervalEnd = new Date(interval.endsAt);

    while (addMinutes(cursor, durationMinutes) <= intervalEnd) {
      const slot: Slot = {
        startsAt: cursor.toISOString(),
        endsAt: addMinutes(cursor, durationMinutes).toISOString(),
        status: "available",
        blockers: [],
      };

      for (const blocker of blockers) {
        if (overlaps(slot, blocker.interval)) {
          slot.status = "blocked";
          if (!slot.blockers.includes(blocker.kind)) {
            slot.blockers.push(blocker.kind);
          }
        }
      }

      slots.push(slot);
      cursor = addMinutes(cursor, durationMinutes);
    }
  }

  return slots;
}

async function ensureVocCache(from: Date, to: Date, bodySet: BodySet) {
  if (!hasSupabaseConfig()) {
    return computeVocWindows(from, to, bodySet);
  }

  const supabase = getSupabaseAdmin();
  const { data: latestWindow } = await supabase
    .from("voc_windows")
    .select("ends_at")
    .eq("body_set", bodySet)
    .gte("ends_at", from.toISOString())
    .order("ends_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const latestEnd = latestWindow?.ends_at ? new Date(latestWindow.ends_at) : null;
  if (!latestEnd || latestEnd < to) {
    const computeFrom = latestEnd ? addDays(latestEnd, -3) : addDays(from, -5);
    const computed = computeVocWindows(computeFrom, addDays(to, 2), bodySet);

    if (computed.length > 0) {
      const { error } = await supabase.from("voc_windows").upsert(
        computed.map((window) => ({
          starts_at: window.startsAt,
          ends_at: window.endsAt,
          body_set: window.bodySet,
          computed_at: new Date().toISOString(),
        })),
        { onConflict: "body_set,starts_at,ends_at", ignoreDuplicates: true },
      );

      if (error) {
        throw error;
      }
    }
  }

  const { data, error } = await supabase
    .from("voc_windows")
    .select("starts_at, ends_at, body_set, computed_at")
    .eq("body_set", bodySet)
    .lt("starts_at", to.toISOString())
    .gt("ends_at", from.toISOString())
    .order("starts_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map((window) => ({
    startsAt: window.starts_at,
    endsAt: window.ends_at,
    bodySet: window.body_set as BodySet,
    computedAt: window.computed_at,
  })) satisfies VocWindow[];
}

async function listBookedIntervals(from: Date, to: Date): Promise<Interval[]> {
  if (!hasSupabaseConfig()) {
    return [];
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("bookings")
    .select("starts_at, ends_at")
    .lt("starts_at", to.toISOString())
    .gt("ends_at", from.toISOString())
    .order("starts_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map((booking) => ({ startsAt: booking.starts_at, endsAt: booking.ends_at }));
}

export async function getAvailabilityResponse(from: Date, to: Date) {
  const hostConfig = await getResolvedHostConfig();
  const baseIntervals = buildAvailabilityIntervals(from, to, hostConfig.availabilityRules, hostConfig.timezone);
  const [vocWindows, busyIntervals, bookedIntervals] = await Promise.all([
    ensureVocCache(from, to, hostConfig.bodySet),
    listBusyIntervals(from, to),
    listBookedIntervals(from, to),
  ]);

  const slots = buildSlots(baseIntervals, hostConfig.meetingDurationMinutes, [
    ...vocWindows.map((interval) => ({ kind: "voc" as const, interval })),
    ...busyIntervals.map((interval) => ({ kind: "busy" as const, interval })),
    ...bookedIntervals.map((interval) => ({ kind: "booked" as const, interval })),
  ]);

  return {
    hostTimezone: hostConfig.timezone,
    meetingDurationMinutes: hostConfig.meetingDurationMinutes,
    bodySet: hostConfig.bodySet,
    vocWindows,
    slots,
    bookableSlots: slots.filter((slot) => slot.status === "available"),
    googleConnected: (await listBusyIntervals(from, to)).length > 0 || Boolean(await import("@/lib/google").then((m) => m.getStoredRefreshToken())),
  };
}

export async function refreshVocCache(daysAhead = 90) {
  const hostConfig = await getResolvedHostConfig();
  const from = new Date();
  const to = addDays(from, daysAhead);
  return ensureVocCache(from, to, hostConfig.bodySet);
}
