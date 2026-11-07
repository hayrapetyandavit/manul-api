import { IsDateString, IsEnum } from 'class-validator';
import { DateTime } from 'luxon';
import { DateOverrideType } from '../../../generated/prisma/client';
import { DateRange } from 'src/common/validators/date-range.validator';

export class CreateAvailabilityOverrideDto {
  @IsDateString()
  startTime: string;

  @IsDateString()
  @DateRange({
    min: ({ startTime }) => {
      const afterStart = DateTime.fromISO(startTime).plus({ milliseconds: 1 });
      const afterNow = DateTime.now().plus({ milliseconds: 1 });
      return afterStart > afterNow ? afterStart : afterNow;
    },
  })
  endTime: string;

  @IsEnum(DateOverrideType)
  type: DateOverrideType;
}
