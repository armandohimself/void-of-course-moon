import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center gap-8 px-6 py-16">
      <div className="max-w-3xl space-y-4">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-700">VOC-Moon-Aware Scheduling Widget</p>
        <h1 className="text-5xl font-semibold tracking-tight text-slate-950">
          Schedule around the Void-of-Course Moon.
        </h1>
        <p className="text-lg leading-8 text-slate-600">
          This MVP blocks bookable meeting times during computed VOC Moon windows, existing Google Calendar busy periods, and already-booked slots.
        </p>
      </div>

      <div className="flex flex-wrap gap-4">
        <Link href="/book" className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white">
          Open booking page
        </Link>
        <Link href="/embed" className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700">
          Preview embed view
        </Link>
        <Link href="/api/auth/google" className="rounded-full border border-sky-300 px-5 py-3 text-sm font-semibold text-sky-700">
          Connect Google Calendar
        </Link>
      </div>

      <section className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-3">
        <div>
          <h2 className="text-lg font-semibold">Astronomy Engine</h2>
          <p className="mt-2 text-sm text-slate-600">VOC windows are computed from geocentric ecliptic longitudes and cached in UTC.</p>
        </div>
        <div>
          <h2 className="text-lg font-semibold">Google Calendar</h2>
          <p className="mt-2 text-sm text-slate-600">FreeBusy removes conflicts and confirmed bookings create a real calendar event.</p>
        </div>
        <div>
          <h2 className="text-lg font-semibold">Supabase</h2>
          <p className="mt-2 text-sm text-slate-600">A unique booking constraint prevents double-booking races at the database level.</p>
        </div>
      </section>
    </main>
  );
}
