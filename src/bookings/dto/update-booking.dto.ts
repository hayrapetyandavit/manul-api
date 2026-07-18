import { PartialType } from '@nestjs/mapped-types';
import { CreateBookingDto } from './create-booking.dto';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { BookingStatus } from 'generated/prisma/enums';

export class UpdateBookingDto extends PartialType(CreateBookingDto) {
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
