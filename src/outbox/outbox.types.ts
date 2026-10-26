export type OutboxEventPayloads = {
  'booking.created': { bookingId: number };
};

export type OutboxEventType = keyof OutboxEventPayloads;

export type NewOutboxEvent = {
  [T in OutboxEventType]: {
    aggregateType: string;
    aggregateId: number;
    eventType: T;
    payload: OutboxEventPayloads[T];
  };
}[OutboxEventType];
