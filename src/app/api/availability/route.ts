import { NextRequest, NextResponse } from "next/server";

import { getAvailabilityResponse } from "@/lib/availability";

export async function GET(request: NextRequest) {
  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");

  if (!from || !to) {
    return NextResponse.json({ error: "from and to are required." }, { status: 400 });
  }

  const fromDate = new Date(from);
  const toDate = new Date(to);
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime()) || toDate <= fromDate) {
    return NextResponse.json({ error: "Invalid date range." }, { status: 400 });
  }

  try {
    const availability = await getAvailabilityResponse(fromDate, toDate);
    return NextResponse.json(availability);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load availability." },
      { status: 500 },
    );
  }
}
