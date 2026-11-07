import { DateTime, Interval } from 'luxon';
import { MINUTES_PER_DAY } from './constants';

export const availabilityHorizonDays = 31;

export type TimeRange = {
  startTime: Date;
  endTime: Date;
};

export type WeeklyWindow = {
  weekday: number;
  startMinute: number;
  endMinute: number;
};

export type ScheduleOverride = TimeRange & {
  type: 'BLOCK' | 'OPEN';
};

export type AvailabilitySchedule = {
  timezone: string;
  /** OVERNIGHT ignores weekly hours and OPEN overrides. */
  overnight: boolean;
  weekly: WeeklyWindow[];
  overrides: ScheduleOverride[];
  busy?: TimeRange[];
};

/**
 * Free time inside `range`. The range is used as given: callers clip to "now".
 *
 * No weekly rows means the whole range is open. The first row turns enforcement
 * on, and a weekday with no row is closed. OPEN adds time only in that case.
 * BLOCK always removes time. OVERNIGHT stays open except for BLOCK and busy.
 */
export function availableRanges(
  schedule: AvailabilitySchedule,
  range: TimeRange,
): TimeRange[] {
  const rangeStart = DateTime.fromJSDate(range.startTime);
  const rangeEnd = DateTime.fromJSDate(range.endTime);
  if (!rangeStart.isValid || !rangeEnd.isValid || rangeStart >= rangeEnd) {
    return [];
  }

  const span = Interval.fromDateTimes(rangeStart, rangeEnd);
  const opened = openCoverage(schedule, span);
  const blocked = Interval.merge([
    ...overrideIntervals(schedule.overrides, 'BLOCK'),
    ...(schedule.busy ?? []).map((booking) =>
      Interval.fromDateTimes(
        DateTime.fromJSDate(booking.startTime),
        DateTime.fromJSDate(booking.endTime),
      ),
    ),
  ]);

  return blocked
    .reduce(
      (remaining, block) => remaining.flatMap((part) => part.difference(block)),
      opened,
    )
    .filter((part) => part.isValid && part.length('milliseconds') > 0)
    .sort((left, right) => left.start.toMillis() - right.start.toMillis())
    .map((part) => ({
      startTime: part.start.toJSDate(),
      endTime: part.end.toJSDate(),
    }));
}

/** True when one available range contains the whole request. */
export function isCovered(available: TimeRange[], request: TimeRange): boolean {
  const start = request.startTime.getTime();
  const end = request.endTime.getTime();
  if (!(end > start)) {
    return false;
  }

  return available.some(
    (part) =>
      part.startTime.getTime() <= start && part.endTime.getTime() >= end,
  );
}

function openCoverage(
  schedule: AvailabilitySchedule,
  range: Interval,
): Interval[] {
  if (schedule.overnight) {
    return [range];
  }

  // No weekly rows means unrestricted. Saving a row turns the allow-list on.
  if (schedule.weekly.length === 0) {
    return [range];
  }

  return within(
    range,
    Interval.merge([
      ...weeklyIntervals(schedule.timezone, schedule.weekly, range),
      ...overrideIntervals(schedule.overrides, 'OPEN'),
    ]),
  );
}

function weeklyIntervals(
  timezone: string,
  windows: WeeklyWindow[],
  range: Interval,
) {
  const intervals: Interval[] = [];
  const lastDay = range.end.setZone(timezone);

  for (
    let day = range.start.setZone(timezone).startOf('day');
    day < lastDay;
    day = day.plus({ days: 1 })
  ) {
    for (const window of windows) {
      if (window.weekday !== day.weekday) {
        continue;
      }
      const interval = Interval.fromDateTimes(
        localInstant(day, window.startMinute),
        localInstant(day, window.endMinute),
      );
      if (interval.isValid) {
        intervals.push(interval);
      }
    }
  }

  return intervals;
}

/**
 * Wall-clock minute on a local day. A missing spring-forward time moves to
 * the first real instant after the gap. An ambiguous fall-back time keeps
 * the earlier offset, so the window covers the repeated hour.
 */
function localInstant(day: DateTime, minuteOfDay: number): DateTime {
  if (minuteOfDay >= MINUTES_PER_DAY) {
    return day.plus({ days: 1 }).startOf('day');
  }

  const resolved = day.set({
    hour: Math.floor(minuteOfDay / 60),
    minute: minuteOfDay % 60,
    second: 0,
    millisecond: 0,
  });
  if (isSameClock(resolved, minuteOfDay)) {
    return resolved;
  }

  for (let earlier = minuteOfDay - 1; earlier >= 0; earlier--) {
    const previous = day.set({
      hour: Math.floor(earlier / 60),
      minute: earlier % 60,
      second: 0,
      millisecond: 0,
    });
    if (isSameClock(previous, earlier)) {
      return previous.plus({ minutes: 1 });
    }
  }

  return day.startOf('day');
}

function isSameClock(local: DateTime, minuteOfDay: number) {
  return (
    local.hour * 60 + local.minute === minuteOfDay &&
    local.second === 0 &&
    local.millisecond === 0
  );
}

function overrideIntervals(
  overrides: ScheduleOverride[],
  type: ScheduleOverride['type'],
) {
  return overrides
    .filter((override) => override.type === type)
    .map((override) =>
      Interval.fromDateTimes(
        DateTime.fromJSDate(override.startTime),
        DateTime.fromJSDate(override.endTime),
      ),
    )
    .filter((interval) => interval.isValid);
}

function within(range: Interval, intervals: Interval[]) {
  return intervals.flatMap((interval) => {
    const clipped = interval.intersection(range);
    return clipped?.isValid ? [clipped] : [];
  });
}
