import { ValidationArguments } from 'class-validator';
import { BookingServiceSelectionValidator } from './booking-service-selection.validator';
import { CreateBookingDto } from 'src/bookings/dto/create-booking.dto';

describe('BookingServiceSelectionValidator', () => {
  const validator = new BookingServiceSelectionValidator();

  function args(
    sitterProfileId?: number,
    sitterServiceId?: number,
  ): ValidationArguments {
    return {
      value: undefined,
      constraints: [],
      object: { sitterProfileId, sitterServiceId } as CreateBookingDto,
      property: '',
      targetName: 'CreateBookingDto',
    };
  }

  it('requires both sitter ids or neither', () => {
    expect(validator.validate(undefined, args(20, 30))).toBe(true);
    expect(validator.validate(undefined, args())).toBe(true);
    expect(validator.validate(undefined, args(20))).toBe(false);
    expect(validator.validate(undefined, args(undefined, 30))).toBe(false);
  });

  it('explains that the two ids must be chosen together', () => {
    expect(validator.defaultMessage()).toBe(
      'Provide both sitterProfileId and sitterServiceId, or neither.',
    );
  });
});
