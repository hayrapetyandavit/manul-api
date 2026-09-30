import { BadRequestException } from '@nestjs/common';
import { BookingStatus } from 'generated/prisma/enums';

export type BookingParty = 'owner' | 'sitter';

export const allowedTransitions: Record<
  BookingStatus,
  Partial<Record<BookingParty, readonly BookingStatus[]>>
> = {
  PENDING: {
    owner: [BookingStatus.CANCELLED],
    sitter: [BookingStatus.ACCEPTED, BookingStatus.DECLINED],
  },
  ACCEPTED: {
    owner: [BookingStatus.CANCELLED],
    sitter: [BookingStatus.CANCELLED, BookingStatus.COMPLETED],
  },
  DECLINED: {},
  CANCELLED: {},
  COMPLETED: {},
};

/**
 * Throws a `BadRequestException` when `nextStatus` is not a valid transition
 * from `currentStatus` for `party`.
 */
export function validateStatusTransition(
  currentStatus: BookingStatus,
  nextStatus: BookingStatus,
  party: BookingParty,
): void {
  const allowed = allowedTransitions[currentStatus][party] ?? [];

  if (!allowed.includes(nextStatus)) {
    throw new BadRequestException(
      `Cannot transition booking from ${currentStatus} to ${nextStatus}.`,
    );
  }
}
