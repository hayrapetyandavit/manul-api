import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { DateTime } from 'luxon';

export interface ValidateDateRangeConstraints {
  min?: (object?: Record<string, any>) => DateTime;
  max?: (object?: Record<string, any>) => DateTime;
}

interface DateRangeValidationArguments extends ValidationArguments {
  constraints: [ValidateDateRangeConstraints];
  object: Record<string, any>;
}

@ValidatorConstraint({ async: false })
export class DateRangeValidator implements ValidatorConstraintInterface {
  validate(
    value: string,
    validationArgs: DateRangeValidationArguments,
  ): boolean {
    if (!value) {
      return false;
    }

    const { constraints, object } = validationArgs;
    const [{ min, max }] = constraints;

    const date = DateTime.fromISO(value);

    if (!date.isValid) {
      return false;
    }

    if (min && date < min(object)) {
      return false;
    }

    if (max && date > max(object)) {
      return false;
    }

    return true;
  }

  defaultMessage(validationArgs: DateRangeValidationArguments) {
    const { constraints, object, value } = validationArgs;
    const [{ min, max }] = constraints;

    const limits: string[] = [];

    if (min) {
      limits.push(`min: ${min(object).toISO()}`);
    }

    if (max) {
      limits.push(`max: ${max(object).toISO()}`);
    }

    return (
      `${validationArgs.property} must be within date range. ` +
      `Received: ${value}. Expected: ${limits.join(', ')}`
    );
  }
}

export function DateRange(
  dateRange: ValidateDateRangeConstraints,
  validationOptions?: ValidationOptions,
) {
  return function (object: Record<string, any>, propertyName: string | symbol) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      constraints: [dateRange],
      validator: DateRangeValidator,
    });
  };
}
