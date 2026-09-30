import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { BookingStatus, Prisma } from 'generated/prisma/client';
import {
  BookingParty,
  validateStatusTransition,
} from './booking-status.transitions';
import { CreateBookingDto } from './dto/create-booking.dto';
import { DateTime } from 'luxon';

@Injectable()
export class BookingsService {
  private readonly bookingInclude = {
    pet: true,
    sitterService: true,
    owner: {
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    },
    sitterProfile: {
      select: {
        id: true,
        userId: true,
      },
    },
  } satisfies Prisma.BookingInclude;

  constructor(private readonly prisma: PrismaService) {}

  async create(ownerId: number, createBookingDto: CreateBookingDto) {
    const {
      petId,
      sitterProfileId,
      sitterServiceId,
      startTime,
      endTime,
      ownerNotes,
    } = createBookingDto;

    const pet = await this.prisma.pet.findUniqueOrThrow({
      where: { id: petId, ownerId },
    });

    const start = new Date(startTime);
    const end = new Date(endTime);
    let price: Prisma.Decimal | undefined;

    if (sitterProfileId && sitterServiceId) {
      const service = await this.prisma.sitterService.findFirstOrThrow({
        where: {
          id: sitterServiceId,
          sitterProfileId,
          petTypes: { has: pet.type },
          sitterProfile: {
            userId: { not: ownerId },
            user: { isActive: true, deletedAt: null },
          },
        },
      });

      price = service.price;
    }

    if (sitterProfileId) {
      const overlap = await this.prisma.booking.findFirst({
        where: {
          sitterProfileId,
          status: { in: [BookingStatus.PENDING, BookingStatus.ACCEPTED] },
          startTime: { lt: end },
          endTime: { gt: start },
        },
        select: { id: true },
      });

      if (overlap) {
        throw new ConflictException(
          'Sitter already has a booking in that time range',
        );
      }
    }

    return this.prisma.booking.create({
      data: {
        ownerId,
        petId,
        sitterProfileId,
        sitterServiceId,
        price,
        startTime: start,
        endTime: end,
        ownerNotes,
      },
      include: this.bookingInclude,
    });
  }

  async findUserBookings(userId: number) {
    return this.prisma.booking.findMany({
      where: {
        OR: [{ ownerId: userId }, { sitterProfile: { userId } }],
      },
      include: this.bookingInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: number, userId: number, updateBookingDto: UpdateBookingDto) {
    const booking = await this.prisma.booking.findFirstOrThrow({
      where: {
        id,
        OR: [
          {
            ownerId: userId,
            NOT: { sitterProfile: { userId } },
          },
          {
            ownerId: { not: userId },
            sitterProfile: { userId },
          },
        ],
      },
    });

    const party: BookingParty = booking.ownerId === userId ? 'owner' : 'sitter';
    const { status, ownerNotes, sitterNotes } = updateBookingDto;

    if (
      status === undefined &&
      ownerNotes === undefined &&
      sitterNotes === undefined
    ) {
      throw new BadRequestException('No booking changes were provided');
    }

    const ownerNotesNotAllowed =
      ownerNotes !== undefined &&
      (party !== 'owner' || booking.status !== BookingStatus.PENDING);

    const sitterNotesNotAllowed =
      sitterNotes !== undefined &&
      (party !== 'sitter' ||
        (booking.status !== BookingStatus.PENDING &&
          booking.status !== BookingStatus.ACCEPTED));

    if (ownerNotesNotAllowed || sitterNotesNotAllowed) {
      throw new BadRequestException('Notes cannot be changed for this booking');
    }

    if (status) {
      validateStatusTransition(booking.status, status, party);

      if (
        status === BookingStatus.COMPLETED &&
        DateTime.now() < DateTime.fromJSDate(booking.endTime)
      ) {
        throw new BadRequestException(
          'Booking can be completed only after it ends',
        );
      }
    }

    return this.prisma.booking.update({
      where: {
        id,
        status: booking.status,
        ...(party === 'owner'
          ? { ownerId: userId }
          : { sitterProfile: { userId } }),
      },
      data: { status, ownerNotes, sitterNotes },
      include: this.bookingInclude,
    });
  }
}
