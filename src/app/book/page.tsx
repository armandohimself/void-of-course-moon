import { BookingWidget } from "@/components/booking-widget";

export default function BookingPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-6 py-12">
      <div className="max-w-2xl space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-700">Public booking page</p>
        <h1 className="text-4xl font-semibold tracking-tight">Book a moon-aware meeting</h1>
        <p className="text-base leading-7 text-slate-600">
          Pick an available slot, review the VOC Moon blocks, then confirm your booking before anything is written to Google Calendar.
        </p>
      </div>
      <BookingWidget />
    </main>
  );
}
