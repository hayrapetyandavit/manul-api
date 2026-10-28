import { Module } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { BookingCreatedHandler } from './handlers/booking-created.handler';

@Module({
  controllers: [BookingsController],
  providers: [BookingsService, BookingCreatedHandler],
})
export class BookingsModule {}
