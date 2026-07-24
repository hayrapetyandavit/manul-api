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
    const hasServiceType = !!dto.serviceType;
    const hasSitterService = !!dto.sitterProfileId && !!dto.sitterServiceId;

    return !(hasServiceType && hasSitterService);
  }

  defaultMessage() {
    return 'Provide either serviceType or sitterProfileId with sitterServiceId, not both.';
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
