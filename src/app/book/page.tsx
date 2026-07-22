import { addDays } from "date-fns";

import { BookingWidget } from "@/components/booking-widget";
import { getAvailabilityResponse } from "@/lib/availability";

export const dynamic = "force-dynamic";

export default async function BookingPage() {
  const from = new Date();
  const to = addDays(from, 14);
  let initialAvailability = null;
  let initialError: string | null = null;

  try {
    initialAvailability = await getAvailabilityResponse(from, to);
  } catch (error) {
    initialError =
      error instanceof Error ? error.message : "Unable to load initial availability.";
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-6 py-12">
      <div className="max-w-2xl space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-700">Public booking page</p>
        <h1 className="text-4xl font-semibold tracking-tight">Book a moon-aware meeting</h1>
        <p className="text-base leading-7 text-slate-600">
          Pick an available slot, review the VOC Moon blocks, then confirm your booking before anything is written to Google Calendar.
        </p>
      </div>
      <BookingWidget initialAvailability={initialAvailability} initialError={initialError} />
    </main>
  );
}
