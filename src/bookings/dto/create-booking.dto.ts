import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
import { ServiceType } from 'generated/prisma/client';
import { DateTime } from 'luxon';
import { DateRange } from 'src/common/validators/date-range.validator';

export class CreateBookingDto {
  @IsInt()
  @IsPositive()
  petId: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  sitterServiceId?: number;

  @IsNotEmpty()
  @IsEnum(ServiceType)
  serviceType?: ServiceType;

  @IsDateString()
  @DateRange({
    min: () => DateTime.now(),
    max: () => DateTime.now().plus({ months: 6 }),
  })
  startTime: string;

  @IsDateString()
  @DateRange({
    min: ({ startTime }) => DateTime.fromISO(startTime),
    max: ({ startTime }) => DateTime.fromISO(startTime).plus({ days: 7 }),
  })
  endTime: string;

  @IsOptional()
  @IsString()
  ownerNotes?: string;
}
