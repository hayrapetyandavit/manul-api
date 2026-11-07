import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { BookingStatus, ServiceType } from 'generated/prisma/client';
import { DateTime } from 'luxon';
import { PrismaService } from 'src/prisma/prisma.service';
import { availableRanges, isCovered } from './availability-rules';
import { CreateAvailabilityOverrideDto } from './dto/create-availability-override.dto';
import { ListAvailabilityOverridesDto } from './dto/list-availability-overrides.dto';
import { SetWeeklyHoursDto } from './dto/set-weekly-hours.dto';
import { SitterAvailabilityDto } from './dto/sitter-availability.dto';

/** Statuses that occupy a sitter on the public calendar and in booking overlap. */
export const blockingBookingStatuses = [
  BookingStatus.PENDING,
  BookingStatus.ACCEPTED,
];

@Injectable()
export class AvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  async getWeeklyHours(userId: number) {
    const profile = await this.prisma.sitterProfile.findUniqueOrThrow({
      where: { userId },
      select: { id: true, timezone: true },
    });
    const windows = await this.prisma.weeklyAvailability.findMany({
      where: { sitterProfileId: profile.id },
      orderBy: [{ weekday: 'asc' }, { startMinute: 'asc' }],
      select: { weekday: true, startMinute: true, endMinute: true },
    });

    return { timezone: profile.timezone, windows };
  }

  async setWeeklyHours(userId: number, dto: SetWeeklyHoursDto) {
    const profile = await this.prisma.sitterProfile.findUniqueOrThrow({
      where: { userId },
      select: { id: true, timezone: true },
    });

    const windows = dto.windows
      .map(({ weekday, startMinute, endMinute }) => ({
        weekday,
        startMinute,
        endMinute,
      }))
      .sort(
        (left, right) =>
          left.weekday - right.weekday || left.startMinute - right.startMinute,
      );

    for (let index = 1; index < windows.length; index++) {
      const previous = windows[index - 1];
      const current = windows[index];
      if (
        current.weekday === previous.weekday &&
        current.startMinute < previous.endMinute
      ) {
        throw new BadRequestException(
          'Weekly hours on the same day must not overlap',
        );
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.weeklyAvailability.deleteMany({
        where: { sitterProfileId: profile.id },
      });
      if (windows.length > 0) {
        await tx.weeklyAvailability.createMany({
          data: windows.map((window) => ({
            sitterProfileId: profile.id,
            ...window,
          })),
        });
      }
    });

    return { timezone: profile.timezone, windows };
  }

  async listOverrides(userId: number, query: ListAvailabilityOverridesDto) {
    const from = query.from ? new Date(query.from) : new Date();
    return this.prisma.availabilityOverride.findMany({
      where: {
        sitterProfile: { userId },
        endTime: { gt: from },
        ...(query.to ? { startTime: { lt: new Date(query.to) } } : {}),
      },
      orderBy: { startTime: 'asc' },
    });
  }

  async createOverride(userId: number, dto: CreateAvailabilityOverrideDto) {
    const profile = await this.prisma.sitterProfile.findUniqueOrThrow({
      where: { userId },
      select: { id: true },
    });

    return this.prisma.availabilityOverride.create({
      data: {
        sitterProfileId: profile.id,
        startTime: new Date(dto.startTime),
        endTime: new Date(dto.endTime),
        type: dto.type,
      },
    });
  }

  async removeOverride(id: number, userId: number) {
    return this.prisma.availabilityOverride.delete({
      where: { id, sitterProfile: { userId } },
    });
  }

  async getSitterAvailability(
    sitterProfileId: number,
    query: SitterAvailabilityDto,
  ) {
    const from = DateTime.fromISO(query.from);
    const to = DateTime.fromISO(query.to);
    const service = await this.prisma.sitterService.findFirstOrThrow({
      where: {
        id: query.sitterServiceId,
        sitterProfileId,
        sitterProfile: { user: { isActive: true, deletedAt: null } },
      },
      select: {
        type: true,
        sitterProfile: { select: { timezone: true } },
      },
    });

    const timezone = service.sitterProfile.timezone;
    const visibleFrom = DateTime.max(from, DateTime.now());
    if (visibleFrom >= to) {
      return { timezone, intervals: [] };
    }

    const overnight = service.type === ServiceType.OVERNIGHT;
    const rangeStart = from.toJSDate();
    const rangeEnd = to.toJSDate();
    const [weekly, overrides, bookings] = await Promise.all([
      overnight
        ? Promise.resolve([])
        : this.prisma.weeklyAvailability.findMany({
            where: { sitterProfileId },
            select: { weekday: true, startMinute: true, endMinute: true },
          }),
      this.prisma.availabilityOverride.findMany({
        where: {
          sitterProfileId,
          startTime: { lt: rangeEnd },
          endTime: { gt: rangeStart },
        },
        select: { startTime: true, endTime: true, type: true },
      }),
      this.prisma.booking.findMany({
        where: {
          sitterProfileId,
          status: { in: blockingBookingStatuses },
          startTime: { lt: rangeEnd },
          endTime: { gt: rangeStart },
        },
        select: { startTime: true, endTime: true },
      }),
    ]);

    return {
      timezone,
      intervals: availableRanges(
        {
          timezone,
          overnight,
          weekly,
          overrides,
          busy: bookings,
        },
        { startTime: visibleFrom.toJSDate(), endTime: rangeEnd },
      ).map((part) => ({
        startTime: part.startTime.toISOString(),
        endTime: part.endTime.toISOString(),
      })),
    };
  }

  async assertAvailable(
    sitterProfileId: number,
    serviceType: ServiceType,
    startTime: Date,
    endTime: Date,
  ) {
    const profile = await this.prisma.sitterProfile.findFirstOrThrow({
      where: {
        id: sitterProfileId,
        user: { isActive: true, deletedAt: null },
      },
      select: {
        timezone: true,
        weeklyAvailability: {
          select: { weekday: true, startMinute: true, endMinute: true },
        },
        availabilityOverrides: {
          where: {
            startTime: { lt: endTime },
            endTime: { gt: startTime },
          },
          select: { startTime: true, endTime: true, type: true },
        },
      },
    });

    const request = { startTime, endTime };
    const available = availableRanges(
      {
        timezone: profile.timezone,
        overnight: serviceType === ServiceType.OVERNIGHT,
        weekly: profile.weeklyAvailability,
        overrides: profile.availabilityOverrides,
      },
      request,
    );
    if (!isCovered(available, request)) {
      throw new ConflictException('Sitter is not available in that time range');
    }
  }
}
