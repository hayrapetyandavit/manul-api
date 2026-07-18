import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { Prisma } from 'generated/prisma/client';
import { validateStatusTransition } from './booking-status.transitions';
import { CreateBookingDto } from './dto/create-booking.dto';

@Injectable()
export class BookingsService {
  private readonly bookingInclude = {
    pet: true,
    service: true,
    owner: {
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    },
    sitter: {
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    },
  } satisfies Prisma.BookingInclude;

  constructor(private readonly prisma: PrismaService) {}

  async create(ownerId: number, createBookingDto: CreateBookingDto) {
    const { petId, serviceId, startTime, endTime, ownerNotes } =
      createBookingDto;

    await Promise.all([
      this.prisma.service.findUniqueOrThrow({
        where: { id: serviceId },
      }),
      this.prisma.pet.findUniqueOrThrow({
        where: { id: petId, ownerId },
      }),
    ]);

    return this.prisma.booking.create({
      data: {
        ownerId,
        petId,
        serviceId,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        ownerNotes,
      },
      include: this.bookingInclude,
    });
  }

  async findUserBookings(userId: number) {
    return this.prisma.booking.findMany({
      where: {
        OR: [{ ownerId: userId }, { sitterId: userId }],
      },
      include: this.bookingInclude,
    });
  }

  async update(
    id: number,
    ownerId: number,
    updateBookingDto: UpdateBookingDto,
  ) {
    const booking = await this.prisma.booking.findUniqueOrThrow({
      where: { id },
    });

    if (updateBookingDto.status) {
      validateStatusTransition(booking.status, updateBookingDto.status);
    }

    return this.prisma.booking.update({
      where: { id },
      data: updateBookingDto,
      include: this.bookingInclude,
    });
  }
}
