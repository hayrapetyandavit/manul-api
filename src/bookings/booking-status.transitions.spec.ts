import { BadRequestException } from '@nestjs/common';
import { BookingStatus } from 'generated/prisma/enums';
import { validateStatusTransition } from './booking-status.transitions';

describe('validateStatusTransition', () => {
  it('lets a sitter accept or decline a pending booking', () => {
    expect(() =>
      validateStatusTransition(
        BookingStatus.PENDING,
        BookingStatus.ACCEPTED,
        'sitter',
      ),
    ).not.toThrow();

    expect(() =>
      validateStatusTransition(
        BookingStatus.PENDING,
        BookingStatus.DECLINED,
        'sitter',
      ),
    ).not.toThrow();
  });

  it('lets an owner cancel a pending or accepted booking', () => {
    expect(() =>
      validateStatusTransition(
        BookingStatus.PENDING,
        BookingStatus.CANCELLED,
        'owner',
      ),
    ).not.toThrow();

    expect(() =>
      validateStatusTransition(
        BookingStatus.ACCEPTED,
        BookingStatus.CANCELLED,
        'owner',
      ),
    ).not.toThrow();
  });

  it('rejects an owner accepting or completing a booking', () => {
    expect(() =>
      validateStatusTransition(
        BookingStatus.PENDING,
        BookingStatus.ACCEPTED,
        'owner',
      ),
    ).toThrow(BadRequestException);

    expect(() =>
      validateStatusTransition(
        BookingStatus.ACCEPTED,
        BookingStatus.COMPLETED,
        'owner',
      ),
    ).toThrow(BadRequestException);
  });

  it('lets a sitter cancel or complete an accepted booking', () => {
    expect(() =>
      validateStatusTransition(
        BookingStatus.ACCEPTED,
        BookingStatus.CANCELLED,
        'sitter',
      ),
    ).not.toThrow();

    expect(() =>
      validateStatusTransition(
        BookingStatus.ACCEPTED,
        BookingStatus.COMPLETED,
        'sitter',
      ),
    ).not.toThrow();
  });

  it('rejects transitions out of a terminal status', () => {
    expect(() =>
      validateStatusTransition(
        BookingStatus.DECLINED,
        BookingStatus.ACCEPTED,
        'sitter',
      ),
    ).toThrow(BadRequestException);
  });
});
