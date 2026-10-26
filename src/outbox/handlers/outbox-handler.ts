import { OutboxEvent } from 'generated/prisma/client';
import { OutboxEventPayloads, OutboxEventType } from '../outbox.types';

export const OUTBOX_HANDLERS = Symbol('OUTBOX_HANDLERS');

/**
 * Delivery is at-least-once: an event can be handled again if the process
 * dies or the status update fails after `handle` resolves, so handlers must
 * be idempotent.
 */
export interface OutboxHandler<T extends OutboxEventType = OutboxEventType> {
  readonly eventType: T;
  handle(payload: OutboxEventPayloads[T], event: OutboxEvent): Promise<void>;
}
