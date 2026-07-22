import type { BodySet, WeeklyAvailability } from "@/lib/types";

const DEFAULT_AVAILABILITY: WeeklyAvailability = {
  "1": [{ start: "09:00", end: "17:00" }],
  "2": [{ start: "09:00", end: "17:00" }],
  "3": [{ start: "09:00", end: "17:00" }],
  "4": [{ start: "09:00", end: "17:00" }],
  "5": [{ start: "09:00", end: "17:00" }],
};

export function getEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
}

export function getDefaultTimezone() {
  return getEnv("HOST_TIMEZONE") ?? "America/New_York";
}

export function getDefaultMeetingDurationMinutes() {
  const raw = getEnv("MEETING_DURATION_MINUTES");
  const parsed = raw ? Number.parseInt(raw, 10) : 30;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 30;
}

export function getDefaultBodySet(): BodySet {
  return "modern";
}

export function getDefaultAvailability(): WeeklyAvailability {
  return DEFAULT_AVAILABILITY;
}

export function requireEnv(name: string): string {
  const value = getEnv(name);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}
