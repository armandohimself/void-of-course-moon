import { addDays } from "date-fns";

import { BookingWidget } from "@/components/booking-widget";
import { getAvailabilityResponse } from "@/lib/availability";

export const dynamic = "force-dynamic";

export default async function EmbedPage() {
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
    <main className="min-h-screen bg-white px-4 py-6">
      <BookingWidget
        chromeless
        initialAvailability={initialAvailability}
        initialError={initialError}
      />
    </main>
  );
}
