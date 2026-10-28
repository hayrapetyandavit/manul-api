import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OutboxInbox } from '@nestjs/outbox';

@Injectable()
export class OutboxCron {
  constructor(private readonly inbox: OutboxInbox) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM, {
    name: 'outbox_inbox_prune',
  })
  prune() {
    void this.inbox.prune('30d');
  }
}
