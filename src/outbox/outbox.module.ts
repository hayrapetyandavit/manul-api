import { Module } from '@nestjs/common';
import { BookingCreatedHandler } from './handlers/booking-created.handler';
import { OUTBOX_HANDLERS, OutboxHandler } from './handlers/outbox-handler';
import { OutboxProcessor } from './outbox.processor';
import { OutboxService } from './outbox.service';

const handlers = [BookingCreatedHandler];

@Module({
  providers: [
    OutboxService,
    OutboxProcessor,
    ...handlers,
    {
      provide: OUTBOX_HANDLERS,
      useFactory: (...instances: OutboxHandler[]) => instances,
      inject: handlers,
    },
  ],
  exports: [OutboxService, OutboxProcessor],
})
export class OutboxModule {}
