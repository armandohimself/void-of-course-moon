import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getDefaultAvailability, getDefaultBodySet, getDefaultMeetingDurationMinutes, getDefaultTimezone, getEnv, requireEnv } from "@/lib/config";
import type { HostConfig } from "@/lib/types";

export function hasSupabaseConfig() {
  return Boolean(getEnv("SUPABASE_URL") && getEnv("SUPABASE_SERVICE_ROLE_KEY"));
}

export function getSupabaseAdmin() {
  return createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function getResolvedHostConfig(): Promise<HostConfig> {
  const fallback: HostConfig = {
    timezone: getDefaultTimezone(),
    availabilityRules: getDefaultAvailability(),
    meetingDurationMinutes: getDefaultMeetingDurationMinutes(),
    bodySet: getDefaultBodySet(),
    encryptedGoogleRefreshToken: null,
  };

  if (!hasSupabaseConfig()) {
    return fallback;
  }

  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("host_config")
    .select("timezone, availability_rules, meeting_duration_minutes, body_set, encrypted_google_refresh_token")
    .eq("id", 1)
    .maybeSingle();

  if (!data) {
    return fallback;
  }

  return {
    timezone: data.timezone ?? fallback.timezone,
    availabilityRules: data.availability_rules ?? fallback.availabilityRules,
    meetingDurationMinutes: data.meeting_duration_minutes ?? fallback.meetingDurationMinutes,
    bodySet: data.body_set ?? fallback.bodySet,
    encryptedGoogleRefreshToken: data.encrypted_google_refresh_token ?? null,
  };
}
