import { PetType } from '../../../generated/prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreatePetDto {
  @IsString()
  name: string;

  @IsEnum(PetType)
  type: PetType;

  @IsOptional()
  @IsString()
  breed?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  age?: number;
}
