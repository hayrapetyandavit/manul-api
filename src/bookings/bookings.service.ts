import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus, Prisma } from '../../generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';

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
    const { sitterId, petId, serviceId, startTime, endTime, ownerNotes } =
      createBookingDto;

    // Verify the pet belongs to the requesting owner
    const pet = await this.prisma.pet.findFirst({
      where: { id: petId, ownerId },
    });
    if (!pet) {
      throw new NotFoundException(`Pet #${petId} not found`);
    }

    // Verify the service exists and belongs to the target sitter
    const service = await this.prisma.service.findFirst({
      where: { id: serviceId, sitterProfile: { userId: sitterId } },
    });
    if (!service) {
      throw new NotFoundException(`Service #${serviceId} not found`);
    }

    if (new Date(startTime) >= new Date(endTime)) {
      throw new BadRequestException('startTime must be before endTime');
    }

    return this.prisma.booking.create({
      data: {
        ownerId,
        sitterId,
        petId,
        serviceId,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        ownerNotes,
      },
      include: this.bookingInclude,
    });
  }

  async findOwnerBookings(ownerId: number) {
    return this.prisma.booking.findMany({
      where: { ownerId },
      include: this.bookingInclude,
    });
  }

  async findSitterBookings(sitterId: number) {
    return this.prisma.booking.findMany({
      where: { sitterId },
      include: this.bookingInclude,
    });
  }

  async update(
    id: number,
    ownerId: number,
    updateBookingDto: UpdateBookingDto,
  ) {
    return this.prisma.booking.update({
      where: { id, ownerId },
      data: updateBookingDto,
    });
  }
}
