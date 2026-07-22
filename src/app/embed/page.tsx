import { BookingWidget } from "@/components/booking-widget";

export default function EmbedPage() {
  return (
    <main className="min-h-screen bg-white px-4 py-6">
      <BookingWidget chromeless />
    </main>
  );
}
