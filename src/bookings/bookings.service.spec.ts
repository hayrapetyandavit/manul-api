import { BadRequestException, ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { BookingStatus, PetType } from 'generated/prisma/enums';
import { PrismaService } from 'src/prisma/prisma.service';
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
  };

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
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        { provide: PrismaService, useValue: prisma },
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

  it('returns a booking to the owner or assigned sitter and hides it from others', async () => {
    const booking = { id: 5, ownerId: 1 };
    prisma.booking.findFirstOrThrow.mockResolvedValue(booking);

    await expect(service.findOne(5, 1)).resolves.toEqual(booking);
    expect(prisma.booking.findFirstOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 5,
          OR: [{ ownerId: 1 }, { sitterProfile: { userId: 1 } }],
        },
      }),
    );

    prisma.booking.findFirstOrThrow.mockRejectedValue(new Error('P2025'));
    await expect(service.findOne(5, 9)).rejects.toThrow('P2025');
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
