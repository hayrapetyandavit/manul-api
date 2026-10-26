import { Inject, Injectable, Logger } from '@nestjs/common';
import { OutboxEvent, OutboxStatus } from 'generated/prisma/client';
import { DateTime } from 'luxon';
import { PrismaService } from 'src/prisma/prisma.service';
import { OUTBOX_HANDLERS, OutboxHandler } from './handlers/outbox-handler';
import { OutboxEventPayloads, OutboxEventType } from './outbox.types';

export const OUTBOX_BATCH_SIZE = 100;
export const OUTBOX_MAX_ATTEMPTS = 3;
export const OUTBOX_RETENTION_DAYS = 7;

/** Same period as the outbox drain cron. Retries wait 1 period, then 2, 4, … */
const DRAIN_INTERVAL_SECONDS = 10;
const MAX_ERROR_LENGTH = 1000;

@Injectable()
export class OutboxProcessor {
  private readonly logger = new Logger(OutboxProcessor.name);
  private readonly handlers: Map<string, OutboxHandler>;
  private draining = false;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(OUTBOX_HANDLERS) handlers: OutboxHandler[],
  ) {
    this.handlers = new Map();
    for (const handler of handlers) {
      if (this.handlers.has(handler.eventType)) {
        throw new Error(`Duplicate outbox handler for "${handler.eventType}"`);
      }
      this.handlers.set(handler.eventType, handler);
    }
  }

  /**
   * One API instance only. A second server should publish from its own
   * worker (for example Lambda) instead of running this drain as well.
   */
  async process() {
    if (this.draining) return;

    this.draining = true;
    try {
      for (const event of await this.loadDueEvents()) {
        await this.publish(event);
      }
    } finally {
      this.draining = false;
    }
  }

  async purgePublished() {
    const cutoff = DateTime.now()
      .minus({ days: OUTBOX_RETENTION_DAYS })
      .toJSDate();

    try {
      const { count } = await this.prisma.outboxEvent.deleteMany({
        where: { status: OutboxStatus.PUBLISHED, publishedAt: { lt: cutoff } },
      });
      this.logger.log(`Purged ${count} published outbox events`);
      return count;
    } catch (error) {
      this.logger.error(`Outbox purge failed: ${this.errorMessage(error)}`);
      return 0;
    }
  }

  /** Pending rows are due immediately. A failed row is due only at its retry time. */
  private async loadDueEvents() {
    const now = new Date();

    try {
      const events = await this.prisma.outboxEvent.findMany({
        where: {
          OR: [
            {
              status: OutboxStatus.PENDING,
              OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }],
            },
            {
              status: OutboxStatus.FAILED,
              attempts: { lt: OUTBOX_MAX_ATTEMPTS },
              nextAttemptAt: { lte: now },
            },
          ],
        },
        orderBy: { createdAt: 'asc' },
        take: OUTBOX_BATCH_SIZE,
      });

      return events.sort(
        (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
      );
    } catch (error) {
      this.logger.error(
        `Could not load outbox events: ${this.errorMessage(error)}`,
      );
      return [];
    }
  }

  private async publish(event: OutboxEvent) {
    const attempt = { ...event, attempts: event.attempts + 1 };

    try {
      const handler = this.handlers.get(attempt.eventType);

      if (!handler) {
        this.logger.error(
          `No outbox handler for "${attempt.eventType}" (event ${attempt.id})`,
        );
        await this.markFailed(
          attempt,
          `No handler for "${attempt.eventType}"`,
          null,
        );
        return;
      }

      try {
        await handler.handle(
          attempt.payload as OutboxEventPayloads[OutboxEventType],
          attempt,
        );
      } catch (error) {
        await this.handleFailure(attempt, error);
        return;
      }

      await this.markPublished(attempt);
    } catch (error) {
      this.logger.error(
        `Could not record result of outbox event ${attempt.id}: ${this.errorMessage(error)}`,
      );
    }
  }

  private async handleFailure(event: OutboxEvent, error: unknown) {
    const message = this.errorMessage(error).slice(0, MAX_ERROR_LENGTH);
    const nextAttemptAt =
      event.attempts >= OUTBOX_MAX_ATTEMPTS
        ? null
        : DateTime.now()
            .plus({
              seconds: DRAIN_INTERVAL_SECONDS * 2 ** (event.attempts - 1),
            })
            .toJSDate();

    this.logger.error(
      `Outbox event ${event.id} (${event.eventType}) failed on attempt ${event.attempts}${nextAttemptAt ? '' : ', giving up'}: ${message}`,
    );
    await this.markFailed(event, message, nextAttemptAt);
  }

  private async markPublished(event: OutboxEvent) {
    await this.prisma.outboxEvent.update({
      where: { id: event.id },
      data: {
        status: OutboxStatus.PUBLISHED,
        publishedAt: new Date(),
        attempts: event.attempts,
      },
    });
  }

  private async markFailed(
    event: OutboxEvent,
    lastError: string,
    nextAttemptAt: Date | null,
  ) {
    await this.prisma.outboxEvent.update({
      where: { id: event.id },
      data: {
        status: OutboxStatus.FAILED,
        lastError,
        nextAttemptAt,
        attempts: event.attempts,
      },
    });
  }

  private errorMessage(error: unknown) {
    return error instanceof Error ? error.message : String(error);
  }
}
