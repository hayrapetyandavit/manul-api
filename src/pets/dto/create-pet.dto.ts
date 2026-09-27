import {
  PetCoat,
  PetGender,
  PetGeneralHealth,
  PetTemperament,
  PetType,
} from '../../../generated/prisma/client';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreatePetDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsEnum(PetType)
  type: PetType;

  @IsString()
  @MaxLength(100)
  breed: string;

  @IsDateString()
  birthDate: string;

  @IsEnum(PetCoat)
  coat: PetCoat;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  weightKg: number;

  @IsEnum(PetGeneralHealth)
  generalHealth: PetGeneralHealth;

  @IsEnum(PetTemperament)
  temperament: PetTemperament;

  @IsEnum(PetGender)
  gender: PetGender;

  @IsBoolean()
  neuteredSpayed: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  vetName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  vetPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  vetAddress?: string;
}
