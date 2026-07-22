import { describe, expect, test } from "vitest";

import { computeVocWindows } from "@/lib/voc";

function minutesBetween(left: string, right: string) {
  return Math.abs(new Date(left).getTime() - new Date(right).getTime()) / 60000;
}

describe("computeVocWindows", () => {
  test("matches Astro-Seek reference windows for July 2026 (modern body set)", () => {
    const windows = computeVocWindows(
      new Date("2026-06-30T00:00:00Z"),
      new Date("2026-07-31T23:59:59Z"),
      "modern",
    );

    // Reference source: Astro-Seek 2026 VOC calendar. Traditional body sets will differ.
    const expected = [
      {
        startsAt: "2026-07-03T17:27:00.000Z",
        endsAt: "2026-07-04T06:30:00.000Z",
      },
      {
        startsAt: "2026-07-10T10:12:00.000Z",
        endsAt: "2026-07-10T22:42:00.000Z",
      },
      {
        startsAt: "2026-07-28T06:10:00.000Z",
        endsAt: "2026-07-29T01:46:00.000Z",
      },
    ];

    for (const reference of expected) {
      const match = windows.find((window) => window.startsAt < reference.endsAt && window.endsAt > reference.startsAt);
      expect(match).toBeDefined();
      expect(minutesBetween(match!.startsAt, reference.startsAt)).toBeLessThanOrEqual(2);
      expect(minutesBetween(match!.endsAt, reference.endsAt)).toBeLessThanOrEqual(2);
    }
  });

  test("supports full-transit VOC windows when no exact aspects occur inside a sign", () => {
    const windows = computeVocWindows(
      new Date("2026-07-20T00:00:00Z"),
      new Date("2026-07-22T00:00:00Z"),
      "modern",
    );

    expect(windows.some((window) => minutesBetween(window.startsAt, "2026-07-21T11:05:00.000Z") <= 2)).toBe(true);
  });
});
