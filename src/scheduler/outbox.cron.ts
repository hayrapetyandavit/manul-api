import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OutboxProcessor } from 'src/outbox/outbox.processor';

@Injectable()
export class OutboxCron {
  constructor(private readonly processor: OutboxProcessor) {}

  @Cron(CronExpression.EVERY_10_SECONDS, {
    name: 'outbox_drain',
  })
  run() {
    void this.processor.process();
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM, {
    name: 'outbox_purge',
  })
  purge() {
    void this.processor.purgePublished();
  }
}
