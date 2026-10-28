import { Injectable, Logger } from '@nestjs/common';
import { OnOutboxMessage } from '@nestjs/outbox';
import { BookingEventPayloads } from '../booking-events.types';

@Injectable()
export class BookingCreatedHandler {
  private readonly logger = new Logger(BookingCreatedHandler.name);

  @OnOutboxMessage('booking.created', { consumer: 'booking-created-log' })
  async handle({ bookingId }: BookingEventPayloads['booking.created']) {
    this.logger.log(`Handling booking.created for booking ${bookingId}`);
  }
}
