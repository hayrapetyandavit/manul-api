import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { PetsService } from './pets.service';
import { CreatePetDto } from './dto/create-pet.dto';
import { UpdatePetDto } from './dto/update-pet.dto';
import { JwtAuthGuard } from 'src/auth/utils/Guards';
import { JwtUser } from 'src/auth/types/jwt-payload.type';
import { CurrentUser } from 'src/auth/decorators/user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('pets')
export class PetsController {
  constructor(private readonly petsService: PetsService) {}

  @Post()
  create(@CurrentUser() user: JwtUser, @Body() createPetDto: CreatePetDto) {
    return this.petsService.create(user.id, createPetDto);
  }

  @Get(':id')
  findOne(@CurrentUser() user: JwtUser, @Param('id', ParseIntPipe) id: number) {
    return this.petsService.findOne(id, user.id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePetDto: UpdatePetDto,
  ) {
    return this.petsService.update(id, user.id, updatePetDto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: JwtUser, @Param('id', ParseIntPipe) id: number) {
    return this.petsService.remove(id, user.id);
  }
}
