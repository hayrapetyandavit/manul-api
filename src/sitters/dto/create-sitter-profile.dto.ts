import { IsInt, IsOptional, IsString, IsTimeZone, Min } from 'class-validator';

export class CreateSitterProfileDto {
  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  experienceYears?: number;

  @IsTimeZone()
  timezone: string;
}
