import 'reflect-metadata';
import { validateSync, ValidationError } from 'class-validator';
import { DateOverrideType } from 'generated/prisma/client';
import { DateTime } from 'luxon';
import { CreateAvailabilityOverrideDto } from './create-availability-override.dto';
import { ListAvailabilityOverridesDto } from './list-availability-overrides.dto';
import {
  SetWeeklyHoursDto,
  WeeklyHoursWindowDto,
} from './set-weekly-hours.dto';
import { SitterAvailabilityDto } from './sitter-availability.dto';

function messages(dto: object): string[] {
  const walk = (errors: ValidationError[]): string[] =>
    errors.flatMap((error) => [
      ...Object.values(error.constraints ?? {}),
      ...walk(error.children ?? []),
    ]);
  return walk(validateSync(dto));
}

describe('availability DTOs', () => {
  describe('SetWeeklyHoursDto', () => {
    function week(...windows: WeeklyHoursWindowDto[]) {
      return Object.assign(new SetWeeklyHoursDto(), {
        windows: windows.map((window) =>
          Object.assign(new WeeklyHoursWindowDto(), window),
        ),
      });
    }

    it('accepts a window that ends after it starts, including 24:00', () => {
      expect(
        messages(week({ weekday: 1, startMinute: 0, endMinute: 1440 })),
      ).toEqual([]);
    });

    it.each([
      [
        'ends before it starts',
        { weekday: 1, startMinute: 600, endMinute: 540 },
      ],
      ['has zero length', { weekday: 1, startMinute: 600, endMinute: 600 }],
    ])('rejects a window that %s', (_label, window) => {
      expect(messages(week(window)).join(' ')).toContain(
        'must end after it starts',
      );
    });
  });

  const monday = DateTime.fromISO('2026-11-09T00:00:00.000+04:00');

  describe('SitterAvailabilityDto', () => {
    function query(from: DateTime, to: DateTime) {
      return Object.assign(new SitterAvailabilityDto(), {
        from: from.toISO(),
        to: to.toISO(),
        sitterServiceId: 30,
      });
    }

    it('accepts a range of exactly 31 days', () => {
      expect(messages(query(monday, monday.plus({ days: 31 })))).toEqual([]);
    });

    it.each([
      ['equal', monday, monday],
      ['reversed', monday.plus({ days: 1 }), monday],
      ['longer than 31 days', monday, monday.plus({ days: 31, minutes: 1 })],
    ])('rejects a %s range', (_label, from, to) => {
      expect(messages(query(from, to)).length).toBeGreaterThan(0);
    });
  });

  describe('ListAvailabilityOverridesDto', () => {
    it('accepts a past start with no end', () => {
      expect(
        messages(
          Object.assign(new ListAvailabilityOverridesDto(), {
            from: monday.minus({ months: 1 }).toISO(),
          }),
        ),
      ).toEqual([]);
    });

    it('rejects an end that is not after the start', () => {
      expect(
        messages(
          Object.assign(new ListAvailabilityOverridesDto(), {
            from: monday.toISO(),
            to: monday.toISO(),
          }),
        ).length,
      ).toBeGreaterThan(0);
    });
  });

  describe('CreateAvailabilityOverrideDto', () => {
    function override(start: DateTime, end: DateTime) {
      return Object.assign(new CreateAvailabilityOverrideDto(), {
        startTime: start.toISO(),
        endTime: end.toISO(),
        type: DateOverrideType.BLOCK,
      });
    }

    it('accepts an override that already started and still ends in the future', () => {
      expect(
        messages(
          override(
            DateTime.now().minus({ hours: 1 }),
            DateTime.now().plus({ hours: 1 }),
          ),
        ),
      ).toEqual([]);
    });

    it.each([
      [
        'ends in the past',
        DateTime.now().minus({ hours: 2 }),
        DateTime.now().minus({ hours: 1 }),
      ],
      [
        'does not end after it starts',
        DateTime.now().plus({ hours: 2 }),
        DateTime.now().plus({ hours: 1 }),
      ],
    ])('rejects an override that %s', (_label, start, end) => {
      expect(messages(override(start, end)).length).toBeGreaterThan(0);
    });
  });
});
