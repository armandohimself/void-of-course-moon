import { NextRequest, NextResponse } from "next/server";

import { createBooking } from "@/lib/bookings";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  try {
    const booking = await createBooking({
      startsAt: body.startsAt,
      endsAt: body.endsAt,
      visitorName: body.visitorName,
      visitorEmail: body.visitorEmail,
    });

    return NextResponse.json({ booking });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create booking.";
    if (error instanceof Error && error.name === "SlotTakenError") {
      return NextResponse.json({ error: message }, { status: 409 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
