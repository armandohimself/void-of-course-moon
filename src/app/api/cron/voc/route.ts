import { NextResponse } from "next/server";

import { refreshVocCache } from "@/lib/availability";

export async function GET() {
  try {
    const vocWindows = await refreshVocCache();
    return NextResponse.json({ refreshed: vocWindows.length });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to refresh VOC cache." },
      { status: 500 },
    );
  }
}
