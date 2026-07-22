"use client";

import { useMemo, useState } from "react";

import type { Slot } from "@/lib/types";

type AvailabilityResponse = {
  hostTimezone: string;
  meetingDurationMinutes: number;
  bodySet: "modern" | "traditional";
  slots: Slot[];
  googleConnected: boolean;
};

type BookingWidgetProps = {
  chromeless?: boolean;
  initialAvailability: AvailabilityResponse | null;
  initialError?: string | null;
};

function badgeText(slot: Slot) {
  if (slot.blockers.includes("voc")) {
    return "VOC Moon";
  }
  if (slot.blockers.includes("booked")) {
    return "Booked";
  }
  if (slot.blockers.includes("busy")) {
    return "Busy";
  }
  return "Available";
}

function formatSlot(dateIso: string, timeZone: string) {
  return new Intl.DateTimeFormat(undefined, {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(dateIso));
}

export function BookingWidget({
  chromeless = false,
  initialAvailability,
  initialError = null,
}: BookingWidgetProps) {
  const [availability, setAvailability] = useState<AvailabilityResponse | null>(initialAvailability);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [visitorName, setVisitorName] = useState("");
  const [visitorEmail, setVisitorEmail] = useState("");
  const [bookingState, setBookingState] = useState<"idle" | "submitting" | "confirmed">("idle");
  const [bookingMessage, setBookingMessage] = useState<string | null>(null);

  const range = useState(() => {
    const from = new Date();
    const to = new Date(from.getTime() + 14 * 24 * 60 * 60 * 1000);
    return { from, to };
  })[0];

  async function loadAvailability() {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        from: range.from.toISOString(),
        to: range.to.toISOString(),
      });
      const response = await fetch(`/api/availability?${params.toString()}`);
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to load availability.");
      }

      setAvailability(payload);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load availability.");
    } finally {
      setLoading(false);
    }
  }

  async function handleBooking() {
    if (!selectedSlot) {
      return;
    }

    setBookingState("submitting");
    setBookingMessage(null);

    try {
      const response = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startsAt: selectedSlot.startsAt,
          endsAt: selectedSlot.endsAt,
          visitorName,
          visitorEmail,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to book the slot.");
      }

      setBookingState("confirmed");
      setBookingMessage(`Confirmed for ${formatSlot(selectedSlot.startsAt, availability?.hostTimezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone)}.`);
      await loadAvailability();
    } catch (submitError) {
      setBookingState("idle");
      setBookingMessage(submitError instanceof Error ? submitError.message : "Unable to book the slot.");
    }
  }

  const groupedSlots = useMemo(() => {
    if (!availability) {
      return [] as Array<{ key: string; label: string; slots: Slot[] }>;
    }

    const formatter = new Intl.DateTimeFormat(undefined, {
      timeZone: availability.hostTimezone,
      weekday: "long",
      month: "long",
      day: "numeric",
    });

    const groups = new Map<string, { key: string; label: string; slots: Slot[] }>();
    for (const slot of availability.slots) {
      const key = new Intl.DateTimeFormat("en-CA", {
        timeZone: availability.hostTimezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(slot.startsAt));

      if (!groups.has(key)) {
        groups.set(key, { key, label: formatter.format(new Date(slot.startsAt)), slots: [] });
      }

      groups.get(key)?.slots.push(slot);
    }

    return Array.from(groups.values());
  }, [availability]);

  return (
    <div className={chromeless ? "" : "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"}>
      <div className="mb-6 flex flex-col gap-2">
        <h2 className="text-2xl font-semibold text-slate-950">Schedule a meeting</h2>
        <p className="text-sm text-slate-600">
          Slots marked <span className="font-semibold text-amber-700">VOC Moon</span> are intentionally blocked until the Moon changes signs.
        </p>
        {availability ? (
          <p className="text-sm text-slate-500">
            Host timezone: <span className="font-medium">{availability.hostTimezone}</span> · Body set: <span className="font-medium capitalize">{availability.bodySet}</span>
          </p>
        ) : null}
        {availability && !availability.googleConnected ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Google Calendar has not been connected yet, so bookings cannot be finalized until the host completes OAuth.
          </p>
        ) : null}
      </div>

      {loading ? <p className="text-sm text-slate-500">Loading the next 14 days of availability…</p> : null}
      {error ? <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      {!loading && availability ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
          <div className="space-y-4">
            {groupedSlots.map((group) => (
              <section key={group.key} className="space-y-2">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{group.label}</h3>
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {group.slots.map((slot) => {
                    const isAvailable = slot.status === "available";
                    const isSelected = selectedSlot?.startsAt === slot.startsAt && selectedSlot?.endsAt === slot.endsAt;

                    return (
                      <button
                        key={slot.startsAt}
                        type="button"
                        disabled={!isAvailable}
                        onClick={() => setSelectedSlot(slot)}
                        className={`rounded-2xl border px-4 py-3 text-left transition ${
                          isAvailable
                            ? isSelected
                              ? "border-sky-500 bg-sky-50"
                              : "border-slate-200 bg-white hover:border-sky-300 hover:bg-sky-50"
                            : slot.blockers.includes("voc")
                              ? "border-amber-200 bg-amber-50 text-amber-950"
                              : "border-slate-200 bg-slate-50 text-slate-500"
                        }`}
                      >
                        <div className="text-sm font-semibold">{formatSlot(slot.startsAt, availability.hostTimezone)}</div>
                        <div className="mt-1 text-xs uppercase tracking-wide text-slate-500">{badgeText(slot)}</div>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>

          <aside className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-lg font-semibold text-slate-950">Confirm your slot</h3>
            {selectedSlot ? (
              <>
                <p className="mt-2 text-sm text-slate-600">
                  Selected: <span className="font-medium">{formatSlot(selectedSlot.startsAt, availability.hostTimezone)}</span>
                </p>
                <div className="mt-4 space-y-3">
                  <label className="block text-sm text-slate-700">
                    Name
                    <input
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
                      value={visitorName}
                      onChange={(event) => setVisitorName(event.target.value)}
                    />
                  </label>
                  <label className="block text-sm text-slate-700">
                    Email
                    <input
                      type="email"
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
                      value={visitorEmail}
                      onChange={(event) => setVisitorEmail(event.target.value)}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => void handleBooking()}
                    disabled={bookingState === "submitting" || !visitorName.trim() || !visitorEmail.trim()}
                    className="w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
                  >
                    {bookingState === "submitting" ? "Confirming…" : "Confirm booking"}
                  </button>
                </div>
              </>
            ) : (
              <p className="mt-2 text-sm text-slate-600">Choose an available slot to continue.</p>
            )}

            {bookingMessage ? (
              <p className={`mt-4 rounded-xl px-3 py-2 text-sm ${bookingState === "confirmed" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                {bookingMessage}
              </p>
            ) : null}
          </aside>
        </div>
      ) : null}
    </div>
  );
}
