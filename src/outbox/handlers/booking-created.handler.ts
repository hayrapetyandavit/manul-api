import { Injectable, Logger } from '@nestjs/common';
import { OutboxEventPayloads } from '../outbox.types';
import { OutboxHandler } from './outbox-handler';

@Injectable()
export class BookingCreatedHandler implements OutboxHandler<'booking.created'> {
  readonly eventType = 'booking.created';
  private readonly logger = new Logger(BookingCreatedHandler.name);

  async handle({ bookingId }: OutboxEventPayloads['booking.created']) {
    this.logger.log(`Handling booking.created for booking ${bookingId}`);
  }
}
