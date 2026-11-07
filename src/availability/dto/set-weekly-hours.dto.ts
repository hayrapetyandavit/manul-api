import { Type } from 'class-transformer';
import { IsArray, IsInt, Max, Min, ValidateNested } from 'class-validator';
import { IsGreaterThan } from 'src/common/validators/is-greater-than.validator';
import { MINUTES_PER_DAY } from '../constants';

export class WeeklyHoursWindowDto {
  @IsInt()
  @Min(1)
  @Max(7)
  weekday: number;

  @IsInt()
  @Min(0)
  @Max(MINUTES_PER_DAY - 1)
  startMinute: number;

  @IsInt()
  @Min(1)
  @Max(MINUTES_PER_DAY)
  @IsGreaterThan('startMinute', {
    message: 'A weekly hours window must end after it starts',
  })
  endMinute: number;
}

export class SetWeeklyHoursDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WeeklyHoursWindowDto)
  windows: WeeklyHoursWindowDto[];
}
