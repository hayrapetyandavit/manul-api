import { Module } from '@nestjs/common';
import { OutboxModule } from 'src/outbox/outbox.module';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';

@Module({
  imports: [OutboxModule],
  controllers: [BookingsController],
  providers: [BookingsService],
})
export class BookingsModule {}
