import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

export function IsGreaterThan(
  property: string,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isGreaterThan',
      target: object.constructor,
      propertyName,
      constraints: [property],
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          const related = (args.object as Record<string, unknown>)[
            args.constraints[0] as string
          ];
          return (
            typeof value === 'number' &&
            typeof related === 'number' &&
            value > related
          );
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be greater than ${String(args.constraints[0])}`;
        },
      },
    });
  };
}
