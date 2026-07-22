import "server-only";

import { google } from "googleapis";

import { getEnv, requireEnv } from "@/lib/config";
import { encryptSecret, decryptSecret } from "@/lib/crypto";
import { getResolvedHostConfig, getSupabaseAdmin } from "@/lib/supabase";
import type { Interval } from "@/lib/types";

function getOAuth2Client() {
  return new google.auth.OAuth2(
    requireEnv("GOOGLE_CLIENT_ID"),
    requireEnv("GOOGLE_CLIENT_SECRET"),
    requireEnv("GOOGLE_REDIRECT_URI"),
  );
}

export async function getStoredRefreshToken() {
  const fromEnv = getEnv("GOOGLE_HOST_REFRESH_TOKEN");
  if (fromEnv) {
    return fromEnv;
  }

  const hostConfig = await getResolvedHostConfig();
  if (!hostConfig.encryptedGoogleRefreshToken) {
    return null;
  }

  return decryptSecret(hostConfig.encryptedGoogleRefreshToken);
}

async function getCalendarClient() {
  const refreshToken = await getStoredRefreshToken();
  if (!refreshToken) {
    return null;
  }

  const auth = getOAuth2Client();
  auth.setCredentials({ refresh_token: refreshToken });
  return google.calendar({ version: "v3", auth });
}

export async function listBusyIntervals(from: Date, to: Date): Promise<Interval[]> {
  const calendar = await getCalendarClient();
  if (!calendar) {
    return [];
  }

  const response = await calendar.freebusy.query({
    requestBody: {
      timeMin: from.toISOString(),
      timeMax: to.toISOString(),
      items: [{ id: "primary" }],
    },
  });

  const busy = response.data.calendars?.primary?.busy ?? [];
  return busy.flatMap((entry) => {
    if (!entry.start || !entry.end) {
      return [];
    }

    return [{ startsAt: entry.start, endsAt: entry.end }];
  });
}

export async function insertCalendarEvent(input: {
  startsAt: string;
  endsAt: string;
  visitorName: string;
  visitorEmail: string;
}) {
  const calendar = await getCalendarClient();
  if (!calendar) {
    throw new Error("Google Calendar is not connected yet.");
  }

  const response = await calendar.events.insert({
    calendarId: "primary",
    sendUpdates: "all",
    requestBody: {
      summary: `Meeting with ${input.visitorName}`,
      description: "Booked via the Void of Course Moon scheduling widget.",
      start: { dateTime: input.startsAt },
      end: { dateTime: input.endsAt },
      attendees: [{ displayName: input.visitorName, email: input.visitorEmail }],
    },
  });

  return response.data.id ?? null;
}

export async function getGoogleConsentUrl(state: string) {
  const auth = getOAuth2Client();
  return auth.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/calendar.events"],
    state,
  });
}

export async function exchangeGoogleCode(code: string) {
  const auth = getOAuth2Client();
  const { tokens } = await auth.getToken(code);
  if (!tokens.refresh_token) {
    throw new Error("Google did not return a refresh token. Re-run consent with prompt=consent.");
  }

  return tokens.refresh_token;
}

export async function storeEncryptedRefreshToken(refreshToken: string) {
  const hostConfig = await getResolvedHostConfig();
  const supabase = getSupabaseAdmin();

  const { error } = await supabase.from("host_config").upsert({
    id: 1,
    timezone: hostConfig.timezone,
    availability_rules: hostConfig.availabilityRules,
    meeting_duration_minutes: hostConfig.meetingDurationMinutes,
    body_set: hostConfig.bodySet,
    encrypted_google_refresh_token: encryptSecret(refreshToken),
    updated_at: new Date().toISOString(),
  });

  if (error) {
    throw error;
  }
}
