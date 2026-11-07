import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Test, TestingModule } from '@nestjs/testing';
import { DateOverrideType } from 'generated/prisma/enums';
import { JwtUser } from 'src/auth/types/jwt-payload.type';
import { JwtAuthGuard } from 'src/auth/utils/Guards';
import { AvailabilityController } from './availability.controller';
import { AvailabilityService } from './availability.service';
import { CreateAvailabilityOverrideDto } from './dto/create-availability-override.dto';
import { ListAvailabilityOverridesDto } from './dto/list-availability-overrides.dto';
import { SetWeeklyHoursDto } from './dto/set-weekly-hours.dto';
import { SitterAvailabilityDto } from './dto/sitter-availability.dto';

describe('AvailabilityController', () => {
  let controller: AvailabilityController;
  const availabilityService = {
    getWeeklyHours: jest.fn(),
    setWeeklyHours: jest.fn(),
    listOverrides: jest.fn(),
    createOverride: jest.fn(),
    removeOverride: jest.fn(),
    getSitterAvailability: jest.fn(),
  };
  const user = { id: 1, email: 'sitter@example.com' } as JwtUser;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AvailabilityController],
      providers: [
        { provide: AvailabilityService, useValue: availabilityService },
      ],
    }).compile();

    controller = module.get(AvailabilityController);
  });

  it('protects every route with the JWT guard', () => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, AvailabilityController),
    ).toEqual([JwtAuthGuard]);
  });

  it("returns the current user's weekly hours", async () => {
    const week = { timezone: 'Asia/Tbilisi', windows: [] };
    availabilityService.getWeeklyHours.mockResolvedValue(week);

    await expect(controller.getWeeklyHours(user)).resolves.toBe(week);
    expect(availabilityService.getWeeklyHours).toHaveBeenCalledWith(1);
  });

  it('replaces weekly hours for the current user', async () => {
    const dto = {
      windows: [{ weekday: 1, startMinute: 540, endMinute: 1020 }],
    } as SetWeeklyHoursDto;
    const week = { timezone: 'Asia/Tbilisi', windows: dto.windows };
    availabilityService.setWeeklyHours.mockResolvedValue(week);

    await expect(controller.setWeeklyHours(user, dto)).resolves.toBe(week);
    expect(availabilityService.setWeeklyHours).toHaveBeenCalledWith(1, dto);
  });

  it('lists overrides for the current user with the query filters', async () => {
    const query = {
      from: '2026-11-09T00:00:00.000Z',
      to: '2026-11-16T00:00:00.000Z',
    } as ListAvailabilityOverridesDto;
    availabilityService.listOverrides.mockResolvedValue([{ id: 5 }]);

    await expect(controller.listOverrides(user, query)).resolves.toEqual([
      { id: 5 },
    ]);
    expect(availabilityService.listOverrides).toHaveBeenCalledWith(1, query);
  });

  it('creates an override for the current user', async () => {
    const dto = {
      startTime: '2026-11-09T08:00:00.000Z',
      endTime: '2026-11-09T09:00:00.000Z',
      type: DateOverrideType.BLOCK,
    } as CreateAvailabilityOverrideDto;
    availabilityService.createOverride.mockResolvedValue({ id: 5 });

    await expect(controller.createOverride(user, dto)).resolves.toEqual({
      id: 5,
    });
    expect(availabilityService.createOverride).toHaveBeenCalledWith(1, dto);
  });

  it('deletes an override only as the current user', async () => {
    availabilityService.removeOverride.mockResolvedValue({ id: 5 });

    await expect(controller.removeOverride(5, user)).resolves.toEqual({
      id: 5,
    });
    expect(availabilityService.removeOverride).toHaveBeenCalledWith(5, 1);
  });

  it("returns a sitter's availability for the route profile id, not the caller's", async () => {
    const query = {
      from: '2026-11-09T00:00:00.000Z',
      to: '2026-11-16T00:00:00.000Z',
      sitterServiceId: 30,
    } as SitterAvailabilityDto;
    const result = { timezone: 'Asia/Tbilisi', intervals: [] };
    availabilityService.getSitterAvailability.mockResolvedValue(result);

    await expect(controller.getSitterAvailability(12, query)).resolves.toBe(
      result,
    );
    expect(availabilityService.getSitterAvailability).toHaveBeenCalledWith(
      12,
      query,
    );
  });
});
