import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { SitterServicesService } from './sitter-services.service';
import { CreateSitterServiceDto } from './dto/create-sitter-service.dto';
import { UpdateSitterServiceDto } from './dto/update-sitter-service.dto';
import { JwtAuthGuard } from 'src/auth/utils/Guards';
import { CurrentUser } from 'src/auth/decorators/user.decorator';
import { JwtUser } from 'src/auth/types/jwt-payload.type';

@Controller('sitters')
export class SitterServicesController {
  constructor(private readonly sitterServicesService: SitterServicesService) {}

  @UseGuards(JwtAuthGuard)
  @Get('services')
  findAll(@CurrentUser() user: JwtUser) {
    return this.sitterServicesService.findAllByUser(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('services/:id')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: JwtUser) {
    return this.sitterServicesService.findOneByUser(id, user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('services')
  create(@CurrentUser() user: JwtUser, @Body() dto: CreateSitterServiceDto) {
    return this.sitterServicesService.create(user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('services/:id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtUser,
    @Body() dto: UpdateSitterServiceDto,
  ) {
    return this.sitterServicesService.update(id, user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('services/:id')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: JwtUser) {
    return this.sitterServicesService.remove(id, user.id);
  }
}
