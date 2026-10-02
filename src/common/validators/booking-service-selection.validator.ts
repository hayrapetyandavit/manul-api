import {
  registerDecorator,
  ValidationArguments,
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
  validate(_value: unknown, args: ValidationArguments) {
    const dto = args.object as CreateBookingDto;
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
