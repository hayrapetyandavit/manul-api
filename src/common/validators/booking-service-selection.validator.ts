import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { CreateBookingDto } from 'src/bookings/dto/create-booking.dto';

@ValidatorConstraint({
  name: 'BookingServiceSelection',
  async: false,
})
export class BookingServiceSelectionValidator implements ValidatorConstraintInterface {
  validate(dto: CreateBookingDto) {
    const hasSitterProfileId = dto.sitterProfileId != null;
    const hasSitterServiceId = dto.sitterServiceId != null;

    return hasSitterProfileId === hasSitterServiceId;
  }

  defaultMessage() {
    return 'Provide both sitterProfileId and sitterServiceId, or neither.';
  }
}
export function BookingServiceSelection(validationOptions?: ValidationOptions) {
  return function (constructor: abstract new (...args: any[]) => any) {
    registerDecorator({
      target: constructor,
      propertyName: '',
      options: validationOptions,
      validator: BookingServiceSelectionValidator,
    });
  };
}
