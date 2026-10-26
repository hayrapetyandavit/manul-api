import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { OutboxModule } from 'src/outbox/outbox.module';
import { OutboxCron } from './outbox.cron';

@Module({
  imports: [ScheduleModule.forRoot(), OutboxModule],
  providers: [OutboxCron],
})
export class SchedulerModule {}
