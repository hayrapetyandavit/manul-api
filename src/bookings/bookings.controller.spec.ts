import { Test, TestingModule } from '@nestjs/testing';
import { BookingStatus } from 'generated/prisma/enums';
import { JwtUser } from 'src/auth/types/jwt-payload.type';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';

describe('BookingsController', () => {
  let controller: BookingsController;
  const bookingsService = {
    create: jest.fn(),
    findUserBookings: jest.fn(),
    update: jest.fn(),
  };
  const user = { id: 7, email: 'owner@example.com' } as JwtUser;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BookingsController],
      providers: [{ provide: BookingsService, useValue: bookingsService }],
    }).compile();

    controller = module.get(BookingsController);
  });

  it('passes the current user id into create, list, and update', () => {
    const createDto = { petId: 10 } as CreateBookingDto;
    const updateDto = { status: BookingStatus.CANCELLED };

    controller.create(user, createDto);
    controller.findUserBookings(user);
    controller.update(user, 5, updateDto);

    expect(bookingsService.create).toHaveBeenCalledWith(7, createDto);
    expect(bookingsService.findUserBookings).toHaveBeenCalledWith(7);
    expect(bookingsService.update).toHaveBeenCalledWith(5, 7, updateDto);
  });
});
