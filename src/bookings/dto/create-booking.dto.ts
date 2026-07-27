import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
import { ServiceType } from 'generated/prisma/client';
import { DateTime } from 'luxon';
import { BookingServiceSelection } from 'src/common/validators/booking-service-selection.validator';
import { DateRange } from 'src/common/validators/date-range.validator';

@BookingServiceSelection()
export class CreateBookingDto {
  @IsInt()
  @IsPositive()
  petId: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  sitterProfileId?: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  sitterServiceId?: number;

  @IsOptional()
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
