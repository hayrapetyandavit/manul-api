import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { OutboxCron } from './outbox.cron';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [OutboxCron],
})
export class SchedulerModule {}
