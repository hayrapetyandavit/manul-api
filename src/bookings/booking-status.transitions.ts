import { BadRequestException } from '@nestjs/common';
import { BookingStatus } from 'generated/prisma/enums';

export const allowedTransitions: Record<BookingStatus, BookingStatus[]> = {
  PENDING: ['ACCEPTED', 'DECLINED', 'CANCELLED'],
  ACCEPTED: ['COMPLETED', 'CANCELLED'],
  DECLINED: [],
  CANCELLED: [],
  COMPLETED: [],
};

/**
 * Throws a `BadRequestException` when `nextStatus` is not a valid transition
 * from `currentStatus`, so callers never need scattered if-statements.
 */
export function validateStatusTransition(
  currentStatus: BookingStatus,
  nextStatus: BookingStatus,
): void {
  const allowed = allowedTransitions[currentStatus];

  if (!allowed.includes(nextStatus)) {
    throw new BadRequestException(
      `Cannot transition booking from ${currentStatus} to ${nextStatus}. `,
    );
  }
}
