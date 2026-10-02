import { DateTime } from 'luxon';
import { ValidationArguments } from 'class-validator';
import { DateRangeValidator } from './date-range.validator';

describe('DateRangeValidator', () => {
  const validator = new DateRangeValidator();

  function args(
    value: string,
    constraints: {
      min?: (object?: Record<string, any>) => DateTime;
      max?: (object?: Record<string, any>) => DateTime;
    },
    object: Record<string, any> = {},
  ): ValidationArguments {
    return {
      value,
      constraints: [constraints],
      object,
      property: 'startTime',
      targetName: 'Dto',
    };
  }

  it('rejects an empty or unparseable value', () => {
    const range = { min: () => DateTime.fromISO('2026-01-01T00:00:00.000Z') };

    expect(validator.validate('', args('', range) as never)).toBe(false);
    expect(
      validator.validate('not-a-date', args('not-a-date', range) as never),
    ).toBe(false);
  });

  it('accepts a value inside the min and max and rejects one outside', () => {
    const min = DateTime.fromISO('2026-06-01T00:00:00.000Z');
    const max = DateTime.fromISO('2026-06-08T00:00:00.000Z');
    const range = {
      min: () => min,
      max: () => max,
    };
    const inside = '2026-06-02T00:00:00.000Z';
    const tooEarly = '2026-05-01T00:00:00.000Z';
    const tooLate = '2026-07-01T00:00:00.000Z';

    expect(validator.validate(inside, args(inside, range) as never)).toBe(true);
    expect(validator.validate(tooEarly, args(tooEarly, range) as never)).toBe(
      false,
    );
    expect(validator.validate(tooLate, args(tooLate, range) as never)).toBe(
      false,
    );
  });

  it('names the bounds that failed', () => {
    const min = DateTime.fromISO('2026-06-01T00:00:00.000Z');
    const message = validator.defaultMessage(
      args('2026-05-01T00:00:00.000Z', { min: () => min }) as never,
    );

    expect(message).toContain('startTime must be within date range');
    expect(message).toContain('Received: 2026-05-01T00:00:00.000Z');
    expect(message).toContain(`min: ${min.toISO()}`);
  });
});
