import { NextResponse } from "next/server";

import { createGoogleOAuthState } from "@/lib/google-auth-state";
import { getGoogleConsentUrl } from "@/lib/google";

export async function GET() {
  try {
    const state = createGoogleOAuthState();
    const url = await getGoogleConsentUrl(state);
    return NextResponse.redirect(url);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to start Google OAuth." },
      { status: 500 },
    );
  }
}
