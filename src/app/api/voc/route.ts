import { NextRequest, NextResponse } from "next/server";

import { getAvailabilityResponse } from "@/lib/availability";

export async function GET(request: NextRequest) {
  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");

  if (!from || !to) {
    return NextResponse.json({ error: "from and to are required." }, { status: 400 });
  }

  try {
    const availability = await getAvailabilityResponse(new Date(from), new Date(to));
    return NextResponse.json({ bodySet: availability.bodySet, vocWindows: availability.vocWindows });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load VOC windows." },
      { status: 500 },
    );
  }
}
