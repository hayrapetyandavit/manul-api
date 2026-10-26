import { OutboxEvent, OutboxStatus } from 'generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { OutboxHandler } from './handlers/outbox-handler';
import { OUTBOX_MAX_ATTEMPTS, OutboxProcessor } from './outbox.processor';

describe('OutboxProcessor', () => {
  let prisma: {
    outboxEvent: {
      findMany: jest.Mock;
      update: jest.Mock;
      deleteMany: jest.Mock;
    };
  };
  let handler: OutboxHandler & { handle: jest.Mock };
  let processor: OutboxProcessor;

  function outboxEvent(overrides: Partial<OutboxEvent> = {}): OutboxEvent {
    return {
      id: '0192f0c4-0000-7000-8000-000000000001',
      aggregateType: 'booking',
      aggregateId: 42,
      eventType: 'booking.created',
      payload: { bookingId: 42 },
      status: OutboxStatus.PENDING,
      attempts: 1,
      lastError: null,
      createdAt: new Date(),
      nextAttemptAt: new Date(),
      publishedAt: null,
      ...overrides,
    };
  }

  beforeEach(() => {
    prisma = {
      outboxEvent: {
        findMany: jest.fn(),
        update: jest.fn(),
        deleteMany: jest.fn(),
      },
    };
    handler = {
      eventType: 'booking.created',
      handle: jest.fn().mockResolvedValue(undefined),
    };
    processor = new OutboxProcessor(prisma as unknown as PrismaService, [
      handler,
    ]);
  });

  it('passes each claimed event to its handler and marks it published', async () => {
    const event = outboxEvent();
    prisma.outboxEvent.findMany.mockResolvedValue([event]);

    await processor.process();

    expect(handler.handle).toHaveBeenCalledWith(event.payload, {
      ...event,
      attempts: event.attempts + 1,
    });
    expect(prisma.outboxEvent.update).toHaveBeenCalledWith({
      where: { id: event.id },
      data: {
        status: OutboxStatus.PUBLISHED,
        publishedAt: expect.any(Date),
        attempts: event.attempts + 1,
      },
    });
  });

  it('handles claimed events in creation order', async () => {
    const older = outboxEvent({ id: 'older', createdAt: new Date(1000) });
    const newer = outboxEvent({ id: 'newer', createdAt: new Date(2000) });
    prisma.outboxEvent.findMany.mockResolvedValue([newer, older]);

    await processor.process();

    expect(handler.handle.mock.calls.map(([, e]) => e.id)).toEqual([
      'older',
      'newer',
    ]);
  });

  it('marks events without a handler as failed', async () => {
    const event = outboxEvent({ eventType: 'booking.unknown' });
    prisma.outboxEvent.findMany.mockResolvedValue([event]);

    await processor.process();

    expect(handler.handle).not.toHaveBeenCalled();
    expect(prisma.outboxEvent.update).toHaveBeenCalledWith({
      where: { id: event.id },
      data: {
        status: OutboxStatus.FAILED,
        lastError: 'No handler for "booking.unknown"',
        nextAttemptAt: null,
        attempts: event.attempts + 1,
      },
    });
  });

  it('reschedules a failed event with backoff and continues with the next one', async () => {
    const failing = outboxEvent({ id: 'failing', attempts: 1 });
    const next = outboxEvent({ id: 'next' });
    prisma.outboxEvent.findMany.mockResolvedValue([failing, next]);
    handler.handle.mockRejectedValueOnce(new Error('SMTP unavailable'));
    const before = Date.now();

    await processor.process();

    const failingUpdate = prisma.outboxEvent.update.mock.calls[0][0];
    expect(failingUpdate.where).toEqual({ id: 'failing' });
    expect(failingUpdate.data.lastError).toBe('SMTP unavailable');
    expect(failingUpdate.data.status).toBe(OutboxStatus.FAILED);
    expect(failingUpdate.data.attempts).toBe(failing.attempts + 1);
    const delayMs = 10_000 * 2 ** failing.attempts;
    expect(failingUpdate.data.nextAttemptAt.getTime()).toBeGreaterThanOrEqual(
      before + delayMs,
    );
    expect(failingUpdate.data.nextAttemptAt.getTime()).toBeLessThanOrEqual(
      Date.now() + delayMs,
    );
    expect(prisma.outboxEvent.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'next' },
        data: expect.objectContaining({ status: OutboxStatus.PUBLISHED }),
      }),
    );
  });

  it('gives up after the maximum number of attempts', async () => {
    const event = outboxEvent({ attempts: OUTBOX_MAX_ATTEMPTS - 1 });
    prisma.outboxEvent.findMany.mockResolvedValue([event]);
    handler.handle.mockRejectedValue(new Error('still down'));

    await processor.process();

    expect(prisma.outboxEvent.update).toHaveBeenCalledWith({
      where: { id: event.id },
      data: {
        status: OutboxStatus.FAILED,
        lastError: 'still down',
        nextAttemptAt: null,
        attempts: OUTBOX_MAX_ATTEMPTS,
      },
    });
  });

  it('skips a tick while a drain is already running', async () => {
    prisma.outboxEvent.findMany.mockResolvedValue([outboxEvent()]);

    const first = processor.process();
    await processor.process();
    await first;

    expect(prisma.outboxEvent.findMany).toHaveBeenCalledTimes(1);
  });

  it('logs and continues when loading events fails', async () => {
    prisma.outboxEvent.findMany.mockRejectedValue(new Error('connection lost'));

    await expect(processor.process()).resolves.toBeUndefined();
  });

  it('keeps going when recording a result fails', async () => {
    prisma.outboxEvent.findMany.mockResolvedValue([
      outboxEvent({ id: 'a' }),
      outboxEvent({ id: 'b' }),
    ]);
    prisma.outboxEvent.update.mockRejectedValueOnce(new Error('db blip'));

    await processor.process();

    expect(handler.handle).toHaveBeenCalledTimes(2);
  });

  it('rejects two handlers for the same event type', () => {
    expect(
      () =>
        new OutboxProcessor(prisma as unknown as PrismaService, [
          handler,
          { ...handler },
        ]),
    ).toThrow('Duplicate outbox handler for "booking.created"');
  });

  it('purges only published events past retention', async () => {
    prisma.outboxEvent.deleteMany.mockResolvedValue({ count: 3 });

    await expect(processor.purgePublished()).resolves.toBe(3);
    expect(prisma.outboxEvent.deleteMany).toHaveBeenCalledWith({
      where: {
        status: OutboxStatus.PUBLISHED,
        publishedAt: { lt: expect.any(Date) },
      },
    });
  });

  it('logs and continues when purge fails', async () => {
    prisma.outboxEvent.deleteMany.mockRejectedValue(new Error('timeout'));

    await expect(processor.purgePublished()).resolves.toBe(0);
  });
});
