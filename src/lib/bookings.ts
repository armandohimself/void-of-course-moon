import "server-only";

import { getStoredRefreshToken, insertCalendarEvent } from "@/lib/google";
import { getAvailabilityResponse } from "@/lib/availability";
import { getSupabaseAdmin, hasSupabaseConfig } from "@/lib/supabase";

function isEmail(value: string) {
  return /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/.test(
    value,
  );
}

export async function createBooking(input: {
  startsAt: string;
  endsAt: string;
  visitorName: string;
  visitorEmail: string;
}) {
  if (!hasSupabaseConfig()) {
    throw new Error("Supabase is not configured.");
  }

  if (!input.visitorName.trim()) {
    throw new Error("Visitor name is required.");
  }

  if (!isEmail(input.visitorEmail)) {
    throw new Error("A valid visitor email is required.");
  }

  if (!(await getStoredRefreshToken())) {
    throw new Error("Google Calendar is not connected yet.");
  }

  const startsAt = new Date(input.startsAt);
  const endsAt = new Date(input.endsAt);
  if (!(startsAt < endsAt)) {
    throw new Error("Invalid booking window.");
  }

  const availability = await getAvailabilityResponse(startsAt, endsAt);
  const matchingSlot = availability.bookableSlots.find(
    (slot) => slot.startsAt === input.startsAt && slot.endsAt === input.endsAt,
  );

  if (!matchingSlot) {
    const error = new Error("That slot is no longer available.");
    error.name = "SlotTakenError";
    throw error;
  }

  const supabase = getSupabaseAdmin();
  const { data: booking, error: insertError } = await supabase
    .from("bookings")
    .insert({
      starts_at: input.startsAt,
      ends_at: input.endsAt,
      visitor_name: input.visitorName.trim(),
      visitor_email: input.visitorEmail.trim().toLowerCase(),
    })
    .select("id, starts_at, ends_at")
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      const error = new Error("That slot was just booked by someone else.");
      error.name = "SlotTakenError";
      throw error;
    }

    throw insertError;
  }

  try {
    const googleEventId = await insertCalendarEvent(input);

    await supabase
      .from("bookings")
      .update({ google_event_id: googleEventId })
      .eq("id", booking.id);

    return {
      bookingId: booking.id,
      startsAt: booking.starts_at,
      endsAt: booking.ends_at,
      googleEventId,
    };
  } catch (error) {
    await supabase.from("bookings").delete().eq("id", booking.id);
    throw error;
  }
}
