import { IsDateString, IsOptional } from 'class-validator';
import { DateTime } from 'luxon';
import { DateRange } from 'src/common/validators/date-range.validator';

export class ListAvailabilityOverridesDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  @DateRange({
    min: ({ from }) =>
      from
        ? DateTime.fromISO(from).plus({ milliseconds: 1 })
        : DateTime.fromMillis(0),
  })
  to?: string;
}
