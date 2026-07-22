export type BodySet = "modern" | "traditional";

export type AvailabilityWindow = {
  start: string;
  end: string;
};

export type WeeklyAvailability = Record<string, AvailabilityWindow[]>;

export type HostConfig = {
  timezone: string;
  availabilityRules: WeeklyAvailability;
  meetingDurationMinutes: number;
  bodySet: BodySet;
  encryptedGoogleRefreshToken: string | null;
};

export type Interval = {
  startsAt: string;
  endsAt: string;
};

export type VocWindow = Interval & {
  bodySet: BodySet;
  computedAt?: string;
};

export type SlotBlocker = "voc" | "busy" | "booked";

export type Slot = Interval & {
  status: "available" | "blocked";
  blockers: SlotBlocker[];
};
