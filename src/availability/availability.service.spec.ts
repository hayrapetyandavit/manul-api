import { BadRequestException, ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from 'generated/prisma/client';
import { DateOverrideType, ServiceType } from 'generated/prisma/enums';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  AvailabilityService,
  blockingBookingStatuses,
} from './availability.service';
import { CreateAvailabilityOverrideDto } from './dto/create-availability-override.dto';
import { ListAvailabilityOverridesDto } from './dto/list-availability-overrides.dto';
import {
  SetWeeklyHoursDto,
  WeeklyHoursWindowDto,
} from './dto/set-weekly-hours.dto';
import { SitterAvailabilityDto } from './dto/sitter-availability.dto';

describe('AvailabilityService', () => {
  let service: AvailabilityService;
  let prisma: {
    sitterProfile: {
      findUniqueOrThrow: jest.Mock;
      findFirstOrThrow: jest.Mock;
    };
    sitterService: { findFirstOrThrow: jest.Mock };
    weeklyAvailability: {
      findMany: jest.Mock;
      deleteMany: jest.Mock;
      createMany: jest.Mock;
    };
    availabilityOverride: {
      findMany: jest.Mock;
      create: jest.Mock;
      delete: jest.Mock;
    };
    booking: { findMany: jest.Mock };
    $transaction: jest.Mock;
  };

  const userId = 1;
  const otherUserId = 2;
  const profileId = 12;
  const serviceId = 30;
  const TBILISI = 'Asia/Tbilisi';

  // Tbilisi is UTC+4 with no DST. 2026-11-09 is a Monday.
  const tb = (local: string) => `${local}:00+04:00`;
  const date = (iso: string) => new Date(iso);
  const iso = (value: string) => new Date(value).toISOString();
  const interval = (start: string, end: string) => ({
    startTime: iso(start),
    endTime: iso(end),
  });
  const slot = (weekday: number, startMinute: number, endMinute: number) =>
    ({ weekday, startMinute, endMinute }) as WeeklyHoursWindowDto;
  const weeklyDto = (...windows: WeeklyHoursWindowDto[]) =>
    ({ windows }) as SetWeeklyHoursDto;
  const availabilityQuery = (from: string, to: string) =>
    ({ from, to, sitterServiceId: serviceId }) as SitterAvailabilityDto;

  function missingRecord() {
    return new Prisma.PrismaClientKnownRequestError('Record not found', {
      code: 'P2025',
      clientVersion: 'test',
    });
  }

  beforeEach(async () => {
    prisma = {
      sitterProfile: {
        findUniqueOrThrow: jest.fn(),
        findFirstOrThrow: jest.fn(),
      },
      sitterService: { findFirstOrThrow: jest.fn() },
      weeklyAvailability: {
        findMany: jest.fn(),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        createMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      availabilityOverride: {
        findMany: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
      },
      booking: { findMany: jest.fn() },
      $transaction: jest.fn((arg: unknown) =>
        typeof arg === 'function'
          ? (arg as (tx: unknown) => unknown)(prisma)
          : Promise.all(arg as Promise<unknown>[]),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AvailabilityService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(AvailabilityService);

    jest.useFakeTimers({ now: date('2026-11-08T00:00:00.000Z') });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('getWeeklyHours', () => {
    it("returns the caller's windows in weekday and start order, with the profile time zone", async () => {
      prisma.sitterProfile.findUniqueOrThrow.mockResolvedValue({
        id: profileId,
        timezone: TBILISI,
      });
      const rows = [slot(1, 540, 720), slot(1, 780, 1020), slot(3, 0, 60)];
      prisma.weeklyAvailability.findMany.mockResolvedValue(rows);

      await expect(service.getWeeklyHours(userId)).resolves.toEqual({
        timezone: TBILISI,
        windows: rows,
      });
      expect(prisma.sitterProfile.findUniqueOrThrow).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId } }),
      );
      expect(prisma.weeklyAvailability.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { sitterProfileId: profileId },
          orderBy: [{ weekday: 'asc' }, { startMinute: 'asc' }],
        }),
      );
    });

    it('returns an empty week when no hours are set', async () => {
      prisma.sitterProfile.findUniqueOrThrow.mockResolvedValue({
        id: profileId,
        timezone: TBILISI,
      });
      prisma.weeklyAvailability.findMany.mockResolvedValue([]);

      await expect(service.getWeeklyHours(userId)).resolves.toEqual({
        timezone: TBILISI,
        windows: [],
      });
    });

    it('fails with not found when the caller has no sitter profile', async () => {
      prisma.sitterProfile.findUniqueOrThrow.mockRejectedValue(missingRecord());

      await expect(service.getWeeklyHours(userId)).rejects.toMatchObject({
        code: 'P2025',
      });
      expect(prisma.weeklyAvailability.findMany).not.toHaveBeenCalled();
    });
  });

  describe('setWeeklyHours', () => {
    beforeEach(() => {
      prisma.sitterProfile.findUniqueOrThrow.mockResolvedValue({
        id: profileId,
        timezone: TBILISI,
      });
    });

    it("replaces every window of the caller's profile inside one transaction", async () => {
      await service.setWeeklyHours(
        userId,
        weeklyDto(slot(1, 540, 1020), slot(2, 600, 720)),
      );

      expect(prisma.sitterProfile.findUniqueOrThrow).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId } }),
      );
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.weeklyAvailability.deleteMany).toHaveBeenCalledWith({
        where: { sitterProfileId: profileId },
      });
      const [{ data }] = prisma.weeklyAvailability.createMany.mock.calls[0] as [
        { data: unknown[] },
      ];
      expect(data).toHaveLength(2);
      expect(data).toEqual(
        expect.arrayContaining([
          {
            sitterProfileId: profileId,
            weekday: 1,
            startMinute: 540,
            endMinute: 1020,
          },
          {
            sitterProfileId: profileId,
            weekday: 2,
            startMinute: 600,
            endMinute: 720,
          },
        ]),
      );
    });

    it('deletes old windows before inserting the new ones', async () => {
      await service.setWeeklyHours(userId, weeklyDto(slot(1, 540, 1020)));

      expect(
        prisma.weeklyAvailability.deleteMany.mock.invocationCallOrder[0],
      ).toBeLessThan(
        prisma.weeklyAvailability.createMany.mock.invocationCallOrder[0],
      );
    });

    it('returns the saved week sorted by weekday then start, with the time zone', async () => {
      await expect(
        service.setWeeklyHours(
          userId,
          weeklyDto(slot(3, 600, 700), slot(1, 800, 900), slot(1, 60, 120)),
        ),
      ).resolves.toEqual({
        timezone: TBILISI,
        windows: [slot(1, 60, 120), slot(1, 800, 900), slot(3, 600, 700)],
      });
    });

    it('clears the week when given no windows', async () => {
      await expect(
        service.setWeeklyHours(userId, weeklyDto()),
      ).resolves.toEqual({ timezone: TBILISI, windows: [] });

      expect(prisma.weeklyAvailability.deleteMany).toHaveBeenCalledWith({
        where: { sitterProfileId: profileId },
      });
      expect(prisma.weeklyAvailability.createMany).not.toHaveBeenCalled();
    });

    it('accepts a full day, touching windows, and the same hours on different days', async () => {
      await expect(
        service.setWeeklyHours(
          userId,
          weeklyDto(
            slot(7, 0, 1440),
            slot(1, 540, 720),
            slot(1, 720, 900),
            slot(2, 540, 720),
          ),
        ),
      ).resolves.toBeDefined();
      expect(prisma.weeklyAvailability.createMany).toHaveBeenCalledTimes(1);
    });

    it.each([
      ['partially overlap', [slot(1, 540, 720), slot(1, 660, 900)]],
      [
        'overlap in reverse input order',
        [slot(1, 660, 900), slot(1, 540, 720)],
      ],
      ['are identical', [slot(4, 540, 720), slot(4, 540, 720)]],
      ['contain one another', [slot(5, 540, 1020), slot(5, 600, 660)]],
      [
        'overlap with an unrelated window in between',
        [slot(6, 0, 600), slot(2, 0, 60), slot(6, 599, 700)],
      ],
    ])('rejects windows on the same day that %s', async (_label, windows) => {
      await expect(
        service.setWeeklyHours(userId, weeklyDto(...windows)),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.weeklyAvailability.deleteMany).not.toHaveBeenCalled();
      expect(prisma.weeklyAvailability.createMany).not.toHaveBeenCalled();
    });

    it('uses the profile from the token, not one from the body', async () => {
      await service.setWeeklyHours(userId, {
        windows: [{ ...slot(1, 540, 600), sitterProfileId: 99 }],
      } as unknown as SetWeeklyHoursDto);

      const [{ data }] = prisma.weeklyAvailability.createMany.mock.calls[0] as [
        { data: unknown[] },
      ];
      expect(data).toEqual([
        {
          sitterProfileId: profileId,
          weekday: 1,
          startMinute: 540,
          endMinute: 600,
        },
      ]);
    });

    it('writes nothing when the caller has no sitter profile', async () => {
      prisma.sitterProfile.findUniqueOrThrow.mockRejectedValue(missingRecord());

      await expect(
        service.setWeeklyHours(userId, weeklyDto(slot(1, 540, 600))),
      ).rejects.toMatchObject({ code: 'P2025' });
      expect(prisma.weeklyAvailability.deleteMany).not.toHaveBeenCalled();
      expect(prisma.weeklyAvailability.createMany).not.toHaveBeenCalled();
    });
  });

  describe('listOverrides', () => {
    const now = date('2026-11-08T00:00:00.000Z');

    it("lists the caller's overrides that have not ended yet, by start time", async () => {
      const rows = [{ id: 1 }, { id: 2 }];
      prisma.availabilityOverride.findMany.mockResolvedValue(rows);

      await expect(
        service.listOverrides(userId, {} as ListAvailabilityOverridesDto),
      ).resolves.toBe(rows);
      expect(prisma.availabilityOverride.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { sitterProfile: { userId }, endTime: { gt: now } },
          orderBy: { startTime: 'asc' },
        }),
      );
    });

    it('returns overrides that overlap the requested range', async () => {
      prisma.availabilityOverride.findMany.mockResolvedValue([]);
      const from = tb('2026-11-09T00:00');
      const to = tb('2026-11-16T00:00');

      await service.listOverrides(userId, { from, to });

      expect(prisma.availabilityOverride.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            sitterProfile: { userId },
            endTime: { gt: date(from) },
            startTime: { lt: date(to) },
          },
        }),
      );
    });

    it('lets "from" reach into the past', async () => {
      prisma.availabilityOverride.findMany.mockResolvedValue([]);
      const from = tb('2026-10-01T00:00');

      await service.listOverrides(userId, { from });

      expect(prisma.availabilityOverride.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { sitterProfile: { userId }, endTime: { gt: date(from) } },
        }),
      );
    });

    it('keeps the default start of now when only "to" is given', async () => {
      prisma.availabilityOverride.findMany.mockResolvedValue([]);
      const to = tb('2026-11-16T00:00');

      await service.listOverrides(userId, { to });

      expect(prisma.availabilityOverride.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            sitterProfile: { userId },
            endTime: { gt: now },
            startTime: { lt: date(to) },
          },
        }),
      );
    });
  });

  describe('createOverride', () => {
    const dto = {
      startTime: tb('2026-11-09T12:00'),
      endTime: tb('2026-11-09T13:00'),
      type: DateOverrideType.BLOCK,
    } as CreateAvailabilityOverrideDto;

    beforeEach(() => {
      prisma.sitterProfile.findUniqueOrThrow.mockResolvedValue({
        id: profileId,
        timezone: TBILISI,
      });
    });

    it("attaches the override to the caller's profile with Date values", async () => {
      const created = { id: 5 };
      prisma.availabilityOverride.create.mockResolvedValue(created);

      await expect(service.createOverride(userId, dto)).resolves.toBe(created);
      expect(prisma.sitterProfile.findUniqueOrThrow).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId } }),
      );
      expect(prisma.availabilityOverride.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            sitterProfileId: profileId,
            startTime: date(dto.startTime),
            endTime: date(dto.endTime),
            type: DateOverrideType.BLOCK,
          },
        }),
      );
    });

    it('ignores a profile id smuggled into the body', async () => {
      prisma.availabilityOverride.create.mockResolvedValue({ id: 5 });

      await service.createOverride(userId, {
        ...dto,
        sitterProfileId: 99,
      } as CreateAvailabilityOverrideDto);

      expect(prisma.availabilityOverride.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ sitterProfileId: profileId }),
        }),
      );
    });

    it('accepts an OPEN override that already started but has not ended', async () => {
      prisma.availabilityOverride.create.mockResolvedValue({ id: 5 });

      await service.createOverride(userId, {
        startTime: '2026-11-07T22:00:00.000Z',
        endTime: '2026-11-08T02:00:00.000Z',
        type: DateOverrideType.OPEN,
      });

      expect(prisma.availabilityOverride.create).toHaveBeenCalledTimes(1);
    });

    it('does not insert anything when the caller has no sitter profile', async () => {
      prisma.sitterProfile.findUniqueOrThrow.mockRejectedValue(missingRecord());

      await expect(service.createOverride(userId, dto)).rejects.toMatchObject({
        code: 'P2025',
      });
      expect(prisma.availabilityOverride.create).not.toHaveBeenCalled();
    });
  });

  describe('removeOverride', () => {
    it("deletes the override only through the caller's profile", async () => {
      prisma.availabilityOverride.delete.mockResolvedValue({ id: 5 });

      await expect(service.removeOverride(5, userId)).resolves.toMatchObject({
        id: 5,
      });
      expect(prisma.availabilityOverride.delete).toHaveBeenCalledWith({
        where: { id: 5, sitterProfile: { userId } },
      });
    });

    it("user A cannot delete user B's override", async () => {
      prisma.availabilityOverride.delete.mockRejectedValue(missingRecord());

      await expect(
        service.removeOverride(5, otherUserId),
      ).rejects.toMatchObject({ code: 'P2025' });
      expect(prisma.availabilityOverride.delete).toHaveBeenCalledWith({
        where: { id: 5, sitterProfile: { userId: otherUserId } },
      });
    });
  });

  describe('getSitterAvailability', () => {
    type Range = { start: string; end: string };

    function arrange({
      type = ServiceType.WALKING as ServiceType,
      timezone = TBILISI,
      weekly = [] as WeeklyHoursWindowDto[],
      blocks = [] as Range[],
      opens = [] as Range[],
      bookings = [] as Range[],
    } = {}) {
      prisma.sitterService.findFirstOrThrow.mockResolvedValue({
        type,
        sitterProfile: { timezone },
      });
      prisma.weeklyAvailability.findMany.mockResolvedValue(weekly);
      prisma.availabilityOverride.findMany.mockResolvedValue([
        ...blocks.map(({ start, end }) => ({
          startTime: date(start),
          endTime: date(end),
          type: DateOverrideType.BLOCK,
        })),
        ...opens.map(({ start, end }) => ({
          startTime: date(start),
          endTime: date(end),
          type: DateOverrideType.OPEN,
        })),
      ]);
      prisma.booking.findMany.mockResolvedValue(
        bookings.map(({ start, end }) => ({
          startTime: date(start),
          endTime: date(end),
        })),
      );
    }

    const monday = tb('2026-11-09T00:00');
    const tuesday = tb('2026-11-10T00:00');
    const wednesday = tb('2026-11-11T00:00');

    it('only serves a service that belongs to that profile and an active sitter', async () => {
      prisma.sitterService.findFirstOrThrow.mockRejectedValue(missingRecord());

      await expect(
        service.getSitterAvailability(
          profileId,
          availabilityQuery(monday, tuesday),
        ),
      ).rejects.toMatchObject({ code: 'P2025' });
      expect(prisma.sitterService.findFirstOrThrow).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: serviceId,
            sitterProfileId: profileId,
            sitterProfile: { user: { isActive: true, deletedAt: null } },
          },
        }),
      );
    });

    it('loads hours, overlapping overrides, and overlapping pending or accepted bookings', async () => {
      arrange();

      await service.getSitterAvailability(
        profileId,
        availabilityQuery(monday, wednesday),
      );

      expect(prisma.weeklyAvailability.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { sitterProfileId: profileId } }),
      );
      expect(prisma.availabilityOverride.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            sitterProfileId: profileId,
            startTime: { lt: date(wednesday) },
            endTime: { gt: date(monday) },
          },
        }),
      );
      expect(prisma.booking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            sitterProfileId: profileId,
            status: { in: blockingBookingStatuses },
            startTime: { lt: date(wednesday) },
            endTime: { gt: date(monday) },
          },
        }),
      );
    });

    it('returns the whole future range when the sitter has no weekly hours', async () => {
      arrange();

      await expect(
        service.getSitterAvailability(
          profileId,
          availabilityQuery(monday, wednesday),
        ),
      ).resolves.toEqual({
        timezone: TBILISI,
        intervals: [interval(monday, wednesday)],
      });
    });

    it('returns one weekly window as ISO intervals', async () => {
      arrange({ weekly: [slot(1, 540, 1020)] });

      await expect(
        service.getSitterAvailability(
          profileId,
          availabilityQuery(monday, wednesday),
        ),
      ).resolves.toEqual({
        timezone: TBILISI,
        intervals: [interval(tb('2026-11-09T09:00'), tb('2026-11-09T17:00'))],
      });
    });

    it('never returns time that has already passed', async () => {
      jest.setSystemTime(date(tb('2026-11-09T11:00')));
      arrange({ weekly: [slot(1, 540, 1020)] });

      await expect(
        service.getSitterAvailability(
          profileId,
          availabilityQuery(monday, tuesday),
        ),
      ).resolves.toEqual({
        timezone: TBILISI,
        intervals: [interval(tb('2026-11-09T11:00'), tb('2026-11-09T17:00'))],
      });
    });

    it('returns nothing for a range that is entirely in the past', async () => {
      jest.setSystemTime(date(tb('2026-11-09T11:00')));
      arrange({ weekly: [slot(7, 0, 1440), slot(1, 0, 480)] });

      await expect(
        service.getSitterAvailability(
          profileId,
          availabilityQuery(tb('2026-11-08T00:00'), tb('2026-11-09T08:00')),
        ),
      ).resolves.toEqual({ timezone: TBILISI, intervals: [] });
      expect(prisma.weeklyAvailability.findMany).not.toHaveBeenCalled();
    });

    it('does not load weekly hours for an overnight service', async () => {
      arrange({ type: ServiceType.OVERNIGHT });

      await expect(
        service.getSitterAvailability(
          profileId,
          availabilityQuery(monday, tuesday),
        ),
      ).resolves.toEqual({
        timezone: TBILISI,
        intervals: [interval(monday, tuesday)],
      });
      expect(prisma.weeklyAvailability.findMany).not.toHaveBeenCalled();
    });
  });

  describe('assertAvailable', () => {
    const start = date(tb('2026-11-09T10:00'));
    const end = date(tb('2026-11-09T11:00'));

    function arrange(profile: {
      timezone?: string;
      weeklyAvailability?: WeeklyHoursWindowDto[];
      availabilityOverrides?: {
        startTime: Date;
        endTime: Date;
        type: DateOverrideType;
      }[];
    }) {
      prisma.sitterProfile.findFirstOrThrow.mockResolvedValue({
        timezone: TBILISI,
        weeklyAvailability: [],
        availabilityOverrides: [],
        ...profile,
      });
    }

    it('loads the schedule in one query and allows a request inside weekly hours', async () => {
      arrange({ weeklyAvailability: [slot(1, 540, 1020)] });

      await expect(
        service.assertAvailable(profileId, ServiceType.WALKING, start, end),
      ).resolves.toBeUndefined();
      expect(prisma.sitterProfile.findFirstOrThrow).toHaveBeenCalledWith({
        where: {
          id: profileId,
          user: { isActive: true, deletedAt: null },
        },
        select: {
          timezone: true,
          weeklyAvailability: {
            select: { weekday: true, startMinute: true, endMinute: true },
          },
          availabilityOverrides: {
            where: { startTime: { lt: end }, endTime: { gt: start } },
            select: { startTime: true, endTime: true, type: true },
          },
        },
      });
      expect(prisma.booking.findMany).not.toHaveBeenCalled();
    });

    it('allows any time when the sitter has no weekly hours', async () => {
      arrange({});

      await expect(
        service.assertAvailable(profileId, ServiceType.WALKING, start, end),
      ).resolves.toBeUndefined();
    });

    it('rejects a request outside weekly hours', async () => {
      arrange({ weeklyAvailability: [slot(1, 540, 600)] });

      await expect(
        service.assertAvailable(profileId, ServiceType.WALKING, start, end),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rejects a request covered by a blocking override', async () => {
      arrange({
        availabilityOverrides: [
          {
            startTime: date(tb('2026-11-09T00:00')),
            endTime: date(tb('2026-11-10T00:00')),
            type: DateOverrideType.BLOCK,
          },
        ],
      });

      await expect(
        service.assertAvailable(profileId, ServiceType.WALKING, start, end),
      ).rejects.toThrow('Sitter is not available in that time range');
    });

    it('ignores weekly hours for overnight and still applies blocks', async () => {
      arrange({ weeklyAvailability: [slot(2, 0, 60)] });

      await expect(
        service.assertAvailable(profileId, ServiceType.OVERNIGHT, start, end),
      ).resolves.toBeUndefined();

      arrange({
        weeklyAvailability: [slot(1, 0, 1440)],
        availabilityOverrides: [
          {
            startTime: start,
            endTime: end,
            type: DateOverrideType.BLOCK,
          },
        ],
      });
      await expect(
        service.assertAvailable(profileId, ServiceType.OVERNIGHT, start, end),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('fails with not found when the sitter is missing or inactive', async () => {
      prisma.sitterProfile.findFirstOrThrow.mockRejectedValue(missingRecord());

      await expect(
        service.assertAvailable(profileId, ServiceType.WALKING, start, end),
      ).rejects.toMatchObject({ code: 'P2025' });
    });
  });
});
