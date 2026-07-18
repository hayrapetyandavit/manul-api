import {
  IsDateString,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
import { DateTime } from 'luxon';
import { DateRange } from 'src/common/validators/date-range.validator';

export class CreateBookingDto {
  @IsInt()
  @IsPositive()
  petId: number;

  @IsInt()
  @IsPositive()
  serviceId: number;

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
