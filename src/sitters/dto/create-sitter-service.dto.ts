import { ServiceType } from '../../../generated/prisma/client';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateSitterServiceDto {
  @IsEnum(ServiceType)
  type: ServiceType;

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
