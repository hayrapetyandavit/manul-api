import { PetType, ServiceType } from '../../../generated/prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';

export enum SitterSort {
  RATING_DESC = 'rating_desc',
  PRICE_ASC = 'price_asc',
  PRICE_DESC = 'price_desc',
}

export class FindSittersQueryDto {
  @IsOptional()
  @IsEnum(ServiceType)
  serviceType?: ServiceType;

  @IsOptional()
  @IsEnum(PetType)
  petType?: PetType;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  minRating?: number;

  @IsOptional()
  @IsEnum(SitterSort)
  sort?: SitterSort;
}
