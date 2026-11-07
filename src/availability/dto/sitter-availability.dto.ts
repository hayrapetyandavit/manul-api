import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsPositive } from 'class-validator';
import { DateTime } from 'luxon';
import { DateRange } from 'src/common/validators/date-range.validator';
import { availabilityHorizonDays } from '../availability-rules';

export class SitterAvailabilityDto {
  @IsDateString()
  from: string;

  @IsDateString()
  @DateRange({
    min: ({ from }) => DateTime.fromISO(from).plus({ milliseconds: 1 }),
    max: ({ from }) =>
      DateTime.fromISO(from).plus({ days: availabilityHorizonDays }),
  })
  to: string;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  sitterServiceId: number;
}
