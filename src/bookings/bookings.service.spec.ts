import { BadRequestException, ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { BookingStatus, PetType, ServiceType } from 'generated/prisma/enums';
import { Outbox } from '@nestjs/outbox';
import { PrismaService } from 'src/prisma/prisma.service';
import { AvailabilityService } from 'src/availability/availability.service';
import { BookingsService } from './bookings.service';

describe('BookingsService', () => {
  let service: BookingsService;
  let prisma: {
    pet: { findUniqueOrThrow: jest.Mock };
    sitterService: { findFirstOrThrow: jest.Mock };
    booking: {
      findFirst: jest.Mock;
      findFirstOrThrow: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let outbox: { add: jest.Mock; notify: jest.Mock };
  let availability: { assertAvailable: jest.Mock };

  const createDto = {
    petId: 10,
    sitterProfileId: 20,
    sitterServiceId: 30,
    startTime: '2026-10-01T10:00:00.000Z',
    endTime: '2026-10-01T12:00:00.000Z',
  };

  beforeEach(async () => {
    prisma = {
      pet: { findUniqueOrThrow: jest.fn() },
      sitterService: { findFirstOrThrow: jest.fn() },
      booking: {
        findFirst: jest.fn(),
        findFirstOrThrow: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn((fn: (tx: unknown) => unknown) => fn(prisma)),
    };
    outbox = { add: jest.fn().mockResolvedValue({}), notify: jest.fn() };
    availability = { assertAvailable: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        { provide: PrismaService, useValue: prisma },
        { provide: Outbox, useValue: outbox },
        { provide: AvailabilityService, useValue: availability },
      ],
    }).compile();

    service = module.get(BookingsService);
  });

  it('copies the service price and rejects overlapping sitter times', async () => {
    prisma.pet.findUniqueOrThrow.mockResolvedValue({
      id: 10,
      type: PetType.DOG,
    });
    prisma.sitterService.findFirstOrThrow.mockResolvedValue({
      price: 40,
      type: ServiceType.WALKING,
      petTypes: [PetType.DOG],
    });
    prisma.booking.findFirst.mockResolvedValue(null);
    prisma.booking.create.mockResolvedValue({ id: 1, price: 40 });

    await service.create(1, createDto);

    expect(prisma.sitterService.findFirstOrThrow).toHaveBeenCalledWith({
      where: {
        id: 30,
        sitterProfileId: 20,
        petTypes: { has: PetType.DOG },
        sitterProfile: {
          userId: { not: 1 },
          user: { isActive: true, deletedAt: null },
        },
      },
    });
    expect(prisma.booking.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ price: 40, ownerId: 1 }),
      }),
    );
    expect(outbox.add).toHaveBeenCalledWith(prisma, {
      topic: 'booking.created',
      payload: { bookingId: 1 },
    });
    expect(outbox.notify).toHaveBeenCalledTimes(1);
    expect(availability.assertAvailable).toHaveBeenCalledWith(
      20,
      ServiceType.WALKING,
      new Date(createDto.startTime),
      new Date(createDto.endTime),
    );
    expect(
      prisma.sitterService.findFirstOrThrow.mock.invocationCallOrder[0],
    ).toBeLessThan(availability.assertAvailable.mock.invocationCallOrder[0]);
    expect(
      availability.assertAvailable.mock.invocationCallOrder[0],
    ).toBeLessThan(prisma.booking.findFirst.mock.invocationCallOrder[0]);

    prisma.booking.findFirst.mockResolvedValue({ id: 99 });
    await expect(service.create(1, createDto)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('lists bookings where the caller is the owner or the sitter user', async () => {
    prisma.booking.findMany.mockResolvedValue([]);

    await service.findUserBookings(7);

    expect(prisma.booking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [{ ownerId: 7 }, { sitterProfile: { userId: 7 } }],
        },
      }),
    );
  });

  it('lets the assigned sitter accept and blocks the owner from accepting', async () => {
    prisma.booking.findFirstOrThrow.mockResolvedValue({
      id: 5,
      ownerId: 1,
      status: BookingStatus.PENDING,
      endTime: new Date('2026-10-01T12:00:00.000Z'),
      sitterProfile: { userId: 2 },
    });
    prisma.booking.update.mockResolvedValue({ id: 5 });

    await service.update(5, 2, { status: BookingStatus.ACCEPTED });

    expect(prisma.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 5,
          status: BookingStatus.PENDING,
          sitterProfile: { userId: 2 },
        }),
        data: expect.objectContaining({ status: BookingStatus.ACCEPTED }),
      }),
    );

    await expect(
      service.update(5, 1, { status: BookingStatus.ACCEPTED }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a targeted request the sitter is not available for', async () => {
    prisma.pet.findUniqueOrThrow.mockResolvedValue({
      id: 10,
      type: PetType.DOG,
    });
    prisma.sitterService.findFirstOrThrow.mockResolvedValue({
      price: 40,
      type: ServiceType.WALKING,
      petTypes: [PetType.DOG],
    });
    availability.assertAvailable.mockRejectedValue(
      new ConflictException('Sitter is not available in that time range'),
    );

    await expect(service.create(1, createDto)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prisma.booking.findFirst).not.toHaveBeenCalled();
    expect(prisma.booking.create).not.toHaveBeenCalled();
  });

  it('creates an open request without looking up a sitter or a price', async () => {
    prisma.pet.findUniqueOrThrow.mockResolvedValue({
      id: 10,
      type: PetType.DOG,
    });
    prisma.booking.create.mockResolvedValue({ id: 1 });

    await service.create(1, {
      petId: 10,
      startTime: createDto.startTime,
      endTime: createDto.endTime,
    });

    expect(prisma.sitterService.findFirstOrThrow).not.toHaveBeenCalled();
    expect(availability.assertAvailable).not.toHaveBeenCalled();
    expect(prisma.booking.findFirst).not.toHaveBeenCalled();
    expect(prisma.booking.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          ownerId: 1,
          petId: 10,
          price: undefined,
          sitterProfileId: undefined,
        }),
      }),
    );
  });

  it('rejects an update that changes nothing', async () => {
    prisma.booking.findFirstOrThrow.mockResolvedValue({
      id: 5,
      ownerId: 1,
      status: BookingStatus.PENDING,
      endTime: new Date('2026-10-01T12:00:00.000Z'),
      sitterProfile: { userId: 2 },
    });

    await expect(service.update(5, 1, {})).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.booking.update).not.toHaveBeenCalled();
  });

  it('lets the owner edit notes only while the booking is pending', async () => {
    prisma.booking.findFirstOrThrow.mockResolvedValue({
      id: 5,
      ownerId: 1,
      status: BookingStatus.PENDING,
      endTime: new Date('2026-10-01T12:00:00.000Z'),
      sitterProfile: { userId: 2 },
    });
    prisma.booking.update.mockResolvedValue({ id: 5 });

    await service.update(5, 1, { ownerNotes: 'Gate code 1234' });

    expect(prisma.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ ownerId: 1 }),
        data: expect.objectContaining({ ownerNotes: 'Gate code 1234' }),
      }),
    );

    prisma.booking.findFirstOrThrow.mockResolvedValue({
      id: 5,
      ownerId: 1,
      status: BookingStatus.ACCEPTED,
      endTime: new Date('2026-10-01T12:00:00.000Z'),
      sitterProfile: { userId: 2 },
    });
    await expect(
      service.update(5, 1, { ownerNotes: 'too late' }),
    ).rejects.toBeInstanceOf(BadRequestException);

    prisma.booking.findFirstOrThrow.mockResolvedValue({
      id: 5,
      ownerId: 1,
      status: BookingStatus.PENDING,
      endTime: new Date('2026-10-01T12:00:00.000Z'),
      sitterProfile: { userId: 2 },
    });
    await expect(
      service.update(5, 2, { ownerNotes: 'not the owner' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('lets the sitter edit notes while the booking is pending or accepted', async () => {
    prisma.booking.findFirstOrThrow.mockResolvedValue({
      id: 5,
      ownerId: 1,
      status: BookingStatus.ACCEPTED,
      endTime: new Date('2026-10-01T12:00:00.000Z'),
      sitterProfile: { userId: 2 },
    });
    prisma.booking.update.mockResolvedValue({ id: 5 });

    await service.update(5, 2, { sitterNotes: 'On my way' });

    expect(prisma.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ sitterProfile: { userId: 2 } }),
        data: expect.objectContaining({ sitterNotes: 'On my way' }),
      }),
    );

    prisma.booking.findFirstOrThrow.mockResolvedValue({
      id: 5,
      ownerId: 1,
      status: BookingStatus.PENDING,
      endTime: new Date('2026-10-01T12:00:00.000Z'),
      sitterProfile: { userId: 2 },
    });
    await expect(
      service.update(5, 1, { sitterNotes: 'not the sitter' }),
    ).rejects.toBeInstanceOf(BadRequestException);

    prisma.booking.findFirstOrThrow.mockResolvedValue({
      id: 5,
      ownerId: 1,
      status: BookingStatus.COMPLETED,
      endTime: new Date('2026-10-01T12:00:00.000Z'),
      sitterProfile: { userId: 2 },
    });
    await expect(
      service.update(5, 2, { sitterNotes: 'too late' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('completes an accepted booking once the end time has passed', async () => {
    prisma.booking.findFirstOrThrow.mockResolvedValue({
      id: 5,
      ownerId: 1,
      status: BookingStatus.ACCEPTED,
      endTime: new Date('2020-01-01T00:00:00.000Z'),
      sitterProfile: { userId: 2 },
    });
    prisma.booking.update.mockResolvedValue({ id: 5 });

    await service.update(5, 2, { status: BookingStatus.COMPLETED });

    expect(prisma.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: BookingStatus.COMPLETED }),
      }),
    );
  });

  it('refuses completion before the booking ends', async () => {
    prisma.booking.findFirstOrThrow.mockResolvedValue({
      id: 5,
      ownerId: 1,
      status: BookingStatus.ACCEPTED,
      endTime: new Date('2099-01-01T00:00:00.000Z'),
      sitterProfile: { userId: 2 },
    });

    await expect(
      service.update(5, 2, { status: BookingStatus.COMPLETED }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
