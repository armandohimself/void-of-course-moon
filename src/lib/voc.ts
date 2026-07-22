import { Body, Ecliptic, EclipticGeoMoon, GeoVector, SunPosition } from "astronomy-engine";
import { addDays } from "date-fns";

import type { BodySet, VocWindow } from "@/lib/types";

const ASPECTS = [0, 60, 90, 120, 180] as const;
const INGRESS_SCAN_STEP_MS = 6 * 60 * 60 * 1000;
const ASPECT_SCAN_STEP_MS = 30 * 60 * 1000;
const ROOT_TOLERANCE_MS = 1000;
// The Moon only moves a fraction of a degree in a 30-minute scan step, but this wider
// threshold keeps the coarse search focused on nearby aspect crossings while still
// tolerating circular-angle wraparound and slower-moving planet geometry.
const ASPECT_BRACKETING_THRESHOLD_DEGREES = 20;

const BODY_SETS: Record<BodySet, Body[]> = {
  modern: [
    Body.Sun,
    Body.Mercury,
    Body.Venus,
    Body.Mars,
    Body.Jupiter,
    Body.Saturn,
    Body.Uranus,
    Body.Neptune,
    Body.Pluto,
  ],
  traditional: [Body.Sun, Body.Mercury, Body.Venus, Body.Mars, Body.Jupiter, Body.Saturn],
};

function normalizeDegrees(angle: number) {
  const normalized = angle % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

function signedAngleDelta(angle: number, target: number) {
  return ((angle - target + 540) % 360) - 180;
}

function moonLongitude(date: Date) {
  return EclipticGeoMoon(date).lon;
}

function bodyLongitude(body: Body, date: Date) {
  if (body === Body.Sun) {
    return SunPosition(date).elon;
  }

  return Ecliptic(GeoVector(body, date, true)).elon;
}

function separationLongitude(body: Body, date: Date) {
  return normalizeDegrees(bodyLongitude(body, date) - moonLongitude(date));
}

function bisectRoot(start: Date, end: Date, fn: (date: Date) => number) {
  let left = start.getTime();
  let right = end.getTime();
  let leftValue = fn(start);

  while (right - left > ROOT_TOLERANCE_MS) {
    const mid = Math.floor((left + right) / 2);
    const midDate = new Date(mid);
    const midValue = fn(midDate);

    if ((leftValue <= 0 && midValue <= 0) || (leftValue >= 0 && midValue >= 0)) {
      left = mid;
      leftValue = midValue;
    } else {
      right = mid;
    }
  }

  return new Date(Math.floor((left + right) / 2));
}

function findMoonIngresses(start: Date, end: Date) {
  const ingresses: Date[] = [];
  let previousTime = start;
  let previousSign = Math.floor(moonLongitude(previousTime) / 30);

  for (
    let cursor = new Date(start.getTime() + INGRESS_SCAN_STEP_MS);
    cursor <= end;
    cursor = new Date(cursor.getTime() + INGRESS_SCAN_STEP_MS)
  ) {
    const nextSign = Math.floor(moonLongitude(cursor) / 30);
    if (nextSign !== previousSign) {
      const boundary = ((previousSign + 1) % 12) * 30;
      ingresses.push(
        bisectRoot(previousTime, cursor, (date) => signedAngleDelta(moonLongitude(date), boundary)),
      );
      previousSign = nextSign;
    }

    previousTime = cursor;
  }

  return ingresses;
}

function orientedTargets(aspect: number) {
  return aspect === 0 || aspect === 180 ? [aspect] : [aspect, 360 - aspect];
}

function findLastAspectInTransit(start: Date, end: Date, bodySet: BodySet) {
  let lastAspect: Date | null = null;

  for (const body of BODY_SETS[bodySet]) {
    for (const aspect of ASPECTS) {
      for (const target of orientedTargets(aspect)) {
        let previousTime = start;
        let previousValue = signedAngleDelta(separationLongitude(body, previousTime), target);

        for (
          let cursor = new Date(start.getTime() + ASPECT_SCAN_STEP_MS);
          cursor <= end;
          cursor = new Date(cursor.getTime() + ASPECT_SCAN_STEP_MS)
        ) {
          const nextValue = signedAngleDelta(separationLongitude(body, cursor), target);
          const crossesZero =
            previousValue === 0 ||
            nextValue === 0 ||
            (previousValue < 0 && nextValue > 0) ||
            (previousValue > 0 && nextValue < 0);

          if (
            crossesZero &&
            (Math.abs(previousValue) < ASPECT_BRACKETING_THRESHOLD_DEGREES ||
              Math.abs(nextValue) < ASPECT_BRACKETING_THRESHOLD_DEGREES)
          ) {
            const root = bisectRoot(previousTime, cursor, (date) =>
              signedAngleDelta(separationLongitude(body, date), target),
            );

            if (root >= start && root <= end && (!lastAspect || root > lastAspect)) {
              lastAspect = root;
            }
          }

          previousTime = cursor;
          previousValue = nextValue;
        }
      }
    }
  }

  return lastAspect;
}

export function computeVocWindows(from: Date, to: Date, bodySet: BodySet): VocWindow[] {
  if (to <= from) {
    return [];
  }

  // A Moon sign transit lasts less than 3 days, so padding backward by 4 days ensures
  // we capture the ingress that opens the first transit touching the requested range.
  // Padding forward by 1 extra day ensures we still see the closing ingress just after `to`.
  const paddedStart = addDays(from, -4);
  const paddedEnd = addDays(to, 1);
  const ingresses = findMoonIngresses(paddedStart, paddedEnd);
  const windows: VocWindow[] = [];

  for (let index = 0; index < ingresses.length - 1; index += 1) {
    const transitStart = ingresses[index];
    const transitEnd = ingresses[index + 1];
    // If there are no exact aspects before the Moon leaves the sign, the whole transit is VOC.
    const lastAspect = findLastAspectInTransit(transitStart, transitEnd, bodySet) ?? transitStart;

    if (transitEnd > from && lastAspect < to) {
      windows.push({
        startsAt: lastAspect.toISOString(),
        endsAt: transitEnd.toISOString(),
        bodySet,
      });
    }
  }

  return windows;
}
