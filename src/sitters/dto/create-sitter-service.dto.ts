import { PetType, ServiceType } from '../../../generated/prisma/client';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateSitterServiceDto {
  @IsEnum(ServiceType)
  type: ServiceType;

  @IsArray()
  @IsEnum(PetType, { each: true })
  @IsNotEmpty()
  petTypes: PetType[];

  @IsPositive()
  price: number;

  @IsOptional()
  @IsInt()
  @Min(15)
  durationMin?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
