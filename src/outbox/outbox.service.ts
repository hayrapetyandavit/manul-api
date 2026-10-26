import { Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { NewOutboxEvent } from './outbox.types';

@Injectable()
export class OutboxService {
  add(tx: Prisma.TransactionClient, event: NewOutboxEvent) {
    return tx.outboxEvent.create({ data: event });
  }
}
