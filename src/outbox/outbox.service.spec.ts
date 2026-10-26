import { Prisma } from 'generated/prisma/client';
import { OutboxService } from './outbox.service';
import { NewOutboxEvent } from './outbox.types';

describe('OutboxService', () => {
  it('writes the event through the caller transaction', async () => {
    const tx = { outboxEvent: { create: jest.fn().mockResolvedValue({}) } };
    const event: NewOutboxEvent = {
      aggregateType: 'booking',
      aggregateId: 42,
      eventType: 'booking.created',
      payload: { bookingId: 42 },
    };

    await new OutboxService().add(
      tx as unknown as Prisma.TransactionClient,
      event,
    );

    expect(tx.outboxEvent.create).toHaveBeenCalledWith({ data: event });
  });
});
