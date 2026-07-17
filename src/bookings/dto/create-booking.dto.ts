import {
  IsDateString,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

export class CreateBookingDto {
  @IsInt()
  @IsPositive()
  petId: number;

  @IsInt()
  @IsPositive()
  serviceId: number;

  @IsDateString()
  startTime: string;

  @IsDateString()
  endTime: string;

  @IsOptional()
  @IsString()
  ownerNotes?: string;
}
