import { IsEnum, IsOptional, IsString } from 'class-validator';
import { BookingStatus } from 'generated/prisma/enums';

export class UpdateBookingDto {
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;

  @IsOptional()
  @IsString()
  sitterNotes?: string;

  @IsOptional()
  @IsString()
  ownerNotes?: string;
}
