import { registerDecorator, ValidationOptions, ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator'

@ValidatorConstraint({ async: false })
export class IsPositiveNumberStringConstraint implements ValidatorConstraintInterface {
  validate (value: any, args: ValidationArguments): boolean {
    if (!isNaN(value) && Number(value) >= 0) {
      return true
    }
    return false
  }

  defaultMessage (args: ValidationArguments): string {
    return '$property must be a positive number string'
  }
}

export function IsPositiveNumberString (validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsPositiveNumberStringConstraint
    })
  }
}
