import { PartialType } from '@nestjs/mapped-types';
import { CreateSitterServiceDto } from './create-sitter-service.dto';

export class UpdateSitterServiceDto extends PartialType(
  CreateSitterServiceDto,
) {}
