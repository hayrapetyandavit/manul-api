import { Module } from '@nestjs/common';
import { AvailabilityModule } from 'src/availability/availability.module';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { BookingCreatedHandler } from './handlers/booking-created.handler';

@Module({
  imports: [AvailabilityModule],
  controllers: [BookingsController],
  providers: [BookingsService, BookingCreatedHandler],
})
export class BookingsModule {}
