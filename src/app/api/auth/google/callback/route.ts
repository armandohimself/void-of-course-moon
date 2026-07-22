import { NextRequest, NextResponse } from "next/server";

import { verifyGoogleOAuthState } from "@/lib/google-auth-state";
import { exchangeGoogleCode, storeEncryptedRefreshToken } from "@/lib/google";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const error = request.nextUrl.searchParams.get("error");

  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }

  if (!code || !state || !verifyGoogleOAuthState(state)) {
    return NextResponse.json({ error: "Invalid OAuth callback." }, { status: 400 });
  }

  try {
    const refreshToken = await exchangeGoogleCode(code);
    await storeEncryptedRefreshToken(refreshToken);
    return NextResponse.redirect(new URL("/?google=connected", request.url));
  } catch (callbackError) {
    return NextResponse.json(
      {
        error:
          callbackError instanceof Error
            ? callbackError.message
            : "Unable to finish Google OAuth.",
      },
      { status: 500 },
    );
  }
}
