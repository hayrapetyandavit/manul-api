import { availableRanges, isCovered, TimeRange } from './availability-rules';

const TBILISI = 'Asia/Tbilisi';
const NEW_YORK = 'America/New_York';

const at = (iso: string) => new Date(iso);
const tb = (local: string) => at(`${local}:00+04:00`);
const span = (start: string, end: string): TimeRange => ({
  startTime: at(start),
  endTime: at(end),
});
const slot = (weekday: number, startMinute: number, endMinute: number) => ({
  weekday,
  startMinute,
  endMinute,
});

function free({
  timezone = TBILISI,
  overnight = false,
  weekly = [] as ReturnType<typeof slot>[],
  blocks = [] as TimeRange[],
  opens = [] as TimeRange[],
  busy = [] as TimeRange[],
  range,
}: {
  timezone?: string;
  overnight?: boolean;
  weekly?: ReturnType<typeof slot>[];
  blocks?: TimeRange[];
  opens?: TimeRange[];
  busy?: TimeRange[];
  range: TimeRange;
}) {
  return availableRanges(
    {
      timezone,
      overnight,
      weekly,
      overrides: [
        ...blocks.map((block) => ({ ...block, type: 'BLOCK' as const })),
        ...opens.map((open) => ({ ...open, type: 'OPEN' as const })),
      ],
      busy,
    },
    range,
  );
}

describe('availableRanges', () => {
  const monday = span(
    tb('2026-11-09T00:00').toISOString(),
    tb('2026-11-10T00:00').toISOString(),
  );
  const mondayToWednesday = span(
    tb('2026-11-09T00:00').toISOString(),
    tb('2026-11-11T00:00').toISOString(),
  );

  describe('no weekly hours', () => {
    it('leaves the whole range open', () => {
      expect(free({ range: mondayToWednesday })).toEqual([mondayToWednesday]);
    });

    it('still removes blocks and busy time', () => {
      expect(
        free({
          range: monday,
          blocks: [
            span(
              tb('2026-11-09T12:00').toISOString(),
              tb('2026-11-09T13:00').toISOString(),
            ),
          ],
          busy: [
            span(
              tb('2026-11-09T18:00').toISOString(),
              tb('2026-11-09T19:00').toISOString(),
            ),
          ],
        }),
      ).toEqual([
        span(
          tb('2026-11-09T00:00').toISOString(),
          tb('2026-11-09T12:00').toISOString(),
        ),
        span(
          tb('2026-11-09T13:00').toISOString(),
          tb('2026-11-09T18:00').toISOString(),
        ),
        span(
          tb('2026-11-09T19:00').toISOString(),
          tb('2026-11-10T00:00').toISOString(),
        ),
      ]);
    });

    it('does not narrow the range to an OPEN override', () => {
      expect(
        free({
          range: monday,
          opens: [
            span(
              tb('2026-11-09T10:00').toISOString(),
              tb('2026-11-09T12:00').toISOString(),
            ),
          ],
        }),
      ).toEqual([monday]);
    });
  });

  describe('weekly hours', () => {
    it("expands each window in the sitter's time zone on matching days only", () => {
      expect(
        free({
          weekly: [slot(1, 540, 1020)],
          range: mondayToWednesday,
        }),
      ).toEqual([
        span(
          tb('2026-11-09T09:00').toISOString(),
          tb('2026-11-09T17:00').toISOString(),
        ),
      ]);
    });

    it('closes a weekday that has no row once any weekly hours exist', () => {
      expect(
        free({
          weekly: [slot(1, 540, 1020)],
          range: span(
            tb('2026-11-10T00:00').toISOString(),
            tb('2026-11-11T00:00').toISOString(),
          ),
        }),
      ).toEqual([]);
    });

    it('repeats every week inside the range', () => {
      expect(
        free({
          weekly: [slot(1, 540, 1020)],
          range: span(
            tb('2026-11-09T00:00').toISOString(),
            tb('2026-11-17T00:00').toISOString(),
          ),
        }),
      ).toEqual([
        span(
          tb('2026-11-09T09:00').toISOString(),
          tb('2026-11-09T17:00').toISOString(),
        ),
        span(
          tb('2026-11-16T09:00').toISOString(),
          tb('2026-11-16T17:00').toISOString(),
        ),
      ]);
    });

    it('returns intervals in time order whatever order the windows are in', () => {
      expect(
        free({
          weekly: [slot(2, 540, 600), slot(1, 840, 900), slot(1, 540, 600)],
          range: mondayToWednesday,
        }),
      ).toEqual([
        span(
          tb('2026-11-09T09:00').toISOString(),
          tb('2026-11-09T10:00').toISOString(),
        ),
        span(
          tb('2026-11-09T14:00').toISOString(),
          tb('2026-11-09T15:00').toISOString(),
        ),
        span(
          tb('2026-11-10T09:00').toISOString(),
          tb('2026-11-10T10:00').toISOString(),
        ),
      ]);
    });

    it('clips windows to the requested range', () => {
      expect(
        free({
          weekly: [slot(1, 540, 1020)],
          range: span(
            tb('2026-11-09T10:00').toISOString(),
            tb('2026-11-09T12:00').toISOString(),
          ),
        }),
      ).toEqual([
        span(
          tb('2026-11-09T10:00').toISOString(),
          tb('2026-11-09T12:00').toISOString(),
        ),
      ]);
    });

    it('merges touching windows on the same day', () => {
      expect(
        free({
          weekly: [slot(1, 540, 720), slot(1, 720, 900)],
          range: monday,
        }),
      ).toEqual([
        span(
          tb('2026-11-09T09:00').toISOString(),
          tb('2026-11-09T15:00').toISOString(),
        ),
      ]);
    });

    it('merges a window ending at midnight with one starting the next day', () => {
      expect(
        free({
          weekly: [slot(1, 1200, 1440), slot(2, 0, 120)],
          range: mondayToWednesday,
        }),
      ).toEqual([
        span(
          tb('2026-11-09T20:00').toISOString(),
          tb('2026-11-10T02:00').toISOString(),
        ),
      ]);
    });

    it('merges Sunday night into Monday morning across the week boundary', () => {
      expect(
        free({
          weekly: [slot(7, 1320, 1440), slot(1, 0, 60)],
          range: span(
            tb('2026-11-08T12:00').toISOString(),
            tb('2026-11-10T00:00').toISOString(),
          ),
        }),
      ).toEqual([
        span(
          tb('2026-11-08T22:00').toISOString(),
          tb('2026-11-09T01:00').toISOString(),
        ),
      ]);
    });

    it('keeps wall-clock hours across a daylight saving change', () => {
      expect(
        free({
          timezone: NEW_YORK,
          weekly: [slot(7, 540, 1020)],
          range: span('2027-03-07T00:00:00-05:00', '2027-03-15T00:00:00-04:00'),
        }),
      ).toEqual([
        span('2027-03-07T09:00:00-05:00', '2027-03-07T17:00:00-05:00'),
        span('2027-03-14T09:00:00-04:00', '2027-03-14T17:00:00-04:00'),
      ]);
    });

    it('skips local times that do not exist on the spring-forward day', () => {
      expect(
        free({
          timezone: NEW_YORK,
          weekly: [slot(7, 120, 240)],
          range: span('2027-03-07T00:00:00-05:00', '2027-03-15T00:00:00-04:00'),
        }),
      ).toEqual([
        span('2027-03-07T02:00:00-05:00', '2027-03-07T04:00:00-05:00'),
        span('2027-03-14T03:00:00-04:00', '2027-03-14T04:00:00-04:00'),
      ]);
    });

    it('drops a window that falls entirely inside the spring-forward gap', () => {
      expect(
        free({
          timezone: NEW_YORK,
          weekly: [slot(7, 150, 165)],
          range: span('2027-03-07T00:00:00-05:00', '2027-03-15T00:00:00-04:00'),
        }),
      ).toEqual([
        span('2027-03-07T02:30:00-05:00', '2027-03-07T02:45:00-05:00'),
      ]);
    });

    it('starts after the gap when a window begins in the missing hour', () => {
      expect(
        free({
          timezone: NEW_YORK,
          weekly: [slot(7, 150, 240)],
          range: span('2027-03-07T00:00:00-05:00', '2027-03-15T00:00:00-04:00'),
        }),
      ).toEqual([
        span('2027-03-07T02:30:00-05:00', '2027-03-07T04:00:00-05:00'),
        span('2027-03-14T03:00:00-04:00', '2027-03-14T04:00:00-04:00'),
      ]);
    });

    it('keeps the local window across the fall-back, including the repeated hour', () => {
      expect(
        free({
          timezone: NEW_YORK,
          weekly: [slot(7, 60, 180)],
          range: span('2026-10-25T00:00:00-04:00', '2026-11-02T00:00:00-05:00'),
        }),
      ).toEqual([
        span('2026-10-25T01:00:00-04:00', '2026-10-25T03:00:00-04:00'),
        span('2026-11-01T01:00:00-04:00', '2026-11-01T03:00:00-05:00'),
      ]);
    });
  });

  describe('overrides and busy time', () => {
    it('cuts a BLOCK out of the middle of a window', () => {
      expect(
        free({
          weekly: [slot(1, 540, 1020)],
          blocks: [
            span(
              tb('2026-11-09T12:00').toISOString(),
              tb('2026-11-09T13:00').toISOString(),
            ),
          ],
          range: monday,
        }),
      ).toEqual([
        span(
          tb('2026-11-09T09:00').toISOString(),
          tb('2026-11-09T12:00').toISOString(),
        ),
        span(
          tb('2026-11-09T13:00').toISOString(),
          tb('2026-11-09T17:00').toISOString(),
        ),
      ]);
    });

    it('removes everything a BLOCK covers, even when it extends past the range', () => {
      expect(
        free({
          weekly: [slot(1, 540, 1020), slot(2, 540, 1020)],
          blocks: [
            span(
              tb('2026-11-01T00:00').toISOString(),
              tb('2026-11-09T18:00').toISOString(),
            ),
          ],
          range: mondayToWednesday,
        }),
      ).toEqual([
        span(
          tb('2026-11-10T09:00').toISOString(),
          tb('2026-11-10T17:00').toISOString(),
        ),
      ]);
    });

    it('adds OPEN time outside weekly hours and merges it with overlapping hours', () => {
      expect(
        free({
          weekly: [slot(1, 540, 1020)],
          opens: [
            span(
              tb('2026-11-09T16:00').toISOString(),
              tb('2026-11-09T19:00').toISOString(),
            ),
            span(
              tb('2026-11-14T10:00').toISOString(),
              tb('2026-11-14T14:00').toISOString(),
            ),
          ],
          range: span(
            tb('2026-11-09T00:00').toISOString(),
            tb('2026-11-15T00:00').toISOString(),
          ),
        }),
      ).toEqual([
        span(
          tb('2026-11-09T09:00').toISOString(),
          tb('2026-11-09T19:00').toISOString(),
        ),
        span(
          tb('2026-11-14T10:00').toISOString(),
          tb('2026-11-14T14:00').toISOString(),
        ),
      ]);
    });

    it('clips OPEN time to the requested range', () => {
      expect(
        free({
          weekly: [slot(2, 540, 1020)],
          opens: [
            span(
              tb('2026-11-08T20:00').toISOString(),
              tb('2026-11-09T02:00').toISOString(),
            ),
          ],
          range: monday,
        }),
      ).toEqual([
        span(
          tb('2026-11-09T00:00').toISOString(),
          tb('2026-11-09T02:00').toISOString(),
        ),
      ]);
    });

    it('leaves a window unchanged when a BLOCK only touches its edge', () => {
      expect(
        free({
          weekly: [slot(1, 540, 1020)],
          blocks: [
            span(
              tb('2026-11-09T08:00').toISOString(),
              tb('2026-11-09T09:00').toISOString(),
            ),
            span(
              tb('2026-11-09T17:00').toISOString(),
              tb('2026-11-09T18:00').toISOString(),
            ),
          ],
          range: monday,
        }),
      ).toEqual([
        span(
          tb('2026-11-09T09:00').toISOString(),
          tb('2026-11-09T17:00').toISOString(),
        ),
      ]);
    });

    it('lets BLOCK win where it overlaps OPEN', () => {
      expect(
        free({
          weekly: [slot(5, 540, 1020)],
          opens: [
            span(
              tb('2026-11-14T10:00').toISOString(),
              tb('2026-11-14T14:00').toISOString(),
            ),
          ],
          blocks: [
            span(
              tb('2026-11-14T11:00').toISOString(),
              tb('2026-11-14T12:00').toISOString(),
            ),
          ],
          range: span(
            tb('2026-11-14T00:00').toISOString(),
            tb('2026-11-15T00:00').toISOString(),
          ),
        }),
      ).toEqual([
        span(
          tb('2026-11-14T10:00').toISOString(),
          tb('2026-11-14T11:00').toISOString(),
        ),
        span(
          tb('2026-11-14T12:00').toISOString(),
          tb('2026-11-14T14:00').toISOString(),
        ),
      ]);
    });

    it('subtracts busy time, including a booking that touches a window edge', () => {
      expect(
        free({
          weekly: [slot(1, 540, 1020)],
          busy: [
            span(
              tb('2026-11-09T09:00').toISOString(),
              tb('2026-11-09T10:00').toISOString(),
            ),
            span(
              tb('2026-11-09T12:00').toISOString(),
              tb('2026-11-09T13:30').toISOString(),
            ),
          ],
          range: monday,
        }),
      ).toEqual([
        span(
          tb('2026-11-09T10:00').toISOString(),
          tb('2026-11-09T12:00').toISOString(),
        ),
        span(
          tb('2026-11-09T13:30').toISOString(),
          tb('2026-11-09T17:00').toISOString(),
        ),
      ]);
    });

    it('removes overlapping busy ranges as one stretch', () => {
      expect(
        free({
          weekly: [slot(1, 540, 1020)],
          busy: [
            span(
              tb('2026-11-09T10:00').toISOString(),
              tb('2026-11-09T12:00').toISOString(),
            ),
            span(
              tb('2026-11-09T11:00').toISOString(),
              tb('2026-11-09T13:00').toISOString(),
            ),
          ],
          range: monday,
        }),
      ).toEqual([
        span(
          tb('2026-11-09T09:00').toISOString(),
          tb('2026-11-09T10:00').toISOString(),
        ),
        span(
          tb('2026-11-09T13:00').toISOString(),
          tb('2026-11-09T17:00').toISOString(),
        ),
      ]);
    });

    it('splits a window when busy time crosses midnight', () => {
      expect(
        free({
          weekly: [slot(1, 1200, 1440), slot(2, 0, 120)],
          busy: [
            span(
              tb('2026-11-09T23:00').toISOString(),
              tb('2026-11-10T01:00').toISOString(),
            ),
          ],
          range: mondayToWednesday,
        }),
      ).toEqual([
        span(
          tb('2026-11-09T20:00').toISOString(),
          tb('2026-11-09T23:00').toISOString(),
        ),
        span(
          tb('2026-11-10T01:00').toISOString(),
          tb('2026-11-10T02:00').toISOString(),
        ),
      ]);
    });

    it('drops a window that busy time covers entirely', () => {
      expect(
        free({
          weekly: [slot(1, 540, 600)],
          busy: [
            span(
              tb('2026-11-09T08:00').toISOString(),
              tb('2026-11-09T11:00').toISOString(),
            ),
          ],
          range: monday,
        }),
      ).toEqual([]);
    });
  });

  describe('OVERNIGHT', () => {
    it('ignores weekly hours and OPEN overrides, and still removes blocks and busy time', () => {
      expect(
        free({
          overnight: true,
          weekly: [slot(1, 540, 600)],
          opens: [
            span(
              tb('2026-11-09T01:00').toISOString(),
              tb('2026-11-09T02:00').toISOString(),
            ),
          ],
          blocks: [
            span(
              tb('2026-11-09T12:00').toISOString(),
              tb('2026-11-09T18:00').toISOString(),
            ),
          ],
          busy: [
            span(
              tb('2026-11-10T20:00').toISOString(),
              tb('2026-11-11T10:00').toISOString(),
            ),
          ],
          range: mondayToWednesday,
        }),
      ).toEqual([
        span(
          tb('2026-11-09T00:00').toISOString(),
          tb('2026-11-09T12:00').toISOString(),
        ),
        span(
          tb('2026-11-09T18:00').toISOString(),
          tb('2026-11-10T20:00').toISOString(),
        ),
      ]);
    });
  });
});

describe('isCovered', () => {
  const day = span(
    tb('2026-11-09T00:00').toISOString(),
    tb('2026-11-10T00:00').toISOString(),
  );

  it('is true when one open range contains the request', () => {
    const open = free({ weekly: [slot(1, 540, 1020)], range: day });
    expect(
      isCovered(
        open,
        span(
          tb('2026-11-09T10:00').toISOString(),
          tb('2026-11-09T11:00').toISOString(),
        ),
      ),
    ).toBe(true);
  });

  it('is true for any request when the sitter has no weekly hours and no blocks', () => {
    expect(
      isCovered(
        free({ range: day }),
        span(
          tb('2026-11-09T22:00').toISOString(),
          tb('2026-11-09T23:00').toISOString(),
        ),
      ),
    ).toBe(true);
  });

  it('is false when the request crosses a gap between weekly windows', () => {
    const open = free({
      weekly: [slot(1, 540, 720), slot(1, 840, 1020)],
      range: day,
    });
    expect(
      isCovered(
        open,
        span(
          tb('2026-11-09T11:30').toISOString(),
          tb('2026-11-09T14:30').toISOString(),
        ),
      ),
    ).toBe(false);
  });

  it('is false when a block covers the request on an otherwise open week', () => {
    const open = free({
      blocks: [
        span(
          tb('2026-11-09T10:00').toISOString(),
          tb('2026-11-09T12:00').toISOString(),
        ),
      ],
      range: day,
    });
    expect(
      isCovered(
        open,
        span(
          tb('2026-11-09T11:00').toISOString(),
          tb('2026-11-09T11:30').toISOString(),
        ),
      ),
    ).toBe(false);
  });

  it('is true for a request that crosses midnight when the windows touch', () => {
    const open = free({
      weekly: [slot(1, 1200, 1440), slot(2, 0, 120)],
      range: span(
        tb('2026-11-09T00:00').toISOString(),
        tb('2026-11-11T00:00').toISOString(),
      ),
    });
    expect(
      isCovered(
        open,
        span(
          tb('2026-11-09T23:00').toISOString(),
          tb('2026-11-10T01:00').toISOString(),
        ),
      ),
    ).toBe(true);
  });

  it('is true for an overnight request on a closed weekday, and false when a block overlaps it', () => {
    const request = span(
      tb('2026-11-10T20:00').toISOString(),
      tb('2026-11-11T08:00').toISOString(),
    );
    const range = span(
      tb('2026-11-10T00:00').toISOString(),
      tb('2026-11-12T00:00').toISOString(),
    );
    expect(
      isCovered(
        free({ overnight: true, weekly: [slot(1, 540, 600)], range }),
        request,
      ),
    ).toBe(true);
    expect(
      isCovered(
        free({
          overnight: true,
          blocks: [
            span(
              tb('2026-11-11T00:00').toISOString(),
              tb('2026-11-11T06:00').toISOString(),
            ),
          ],
          range,
        }),
        request,
      ),
    ).toBe(false);
  });
});
