import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { SittersService } from './sitters.service';
import { CreateSitterProfileDto } from './dto/create-sitter-profile.dto';
import { UpdateSitterProfileDto } from './dto/update-sitter-profile.dto';
import { JwtAuthGuard } from 'src/auth/utils/Guards';
import { CurrentUser } from 'src/auth/decorators/user.decorator';
import { JwtUser } from 'src/auth/types/jwt-payload.type';

@UseGuards(JwtAuthGuard)
@Controller('sitters')
export class SittersController {
  constructor(private readonly sittersService: SittersService) {}

  @Get()
  findAll() {
    return this.sittersService.findAll();
  }

  @Get('profile')
  findProfile(@CurrentUser() user: JwtUser) {
    return this.sittersService.findProfile(user.id);
  }

  @Post('profile')
  createProfile(
    @CurrentUser() user: JwtUser,
    @Body() dto: CreateSitterProfileDto,
  ) {
    return this.sittersService.createProfile(user.id, dto);
  }

  @Patch('profile')
  updateProfile(
    @CurrentUser() user: JwtUser,
    @Body() dto: UpdateSitterProfileDto,
  ) {
    return this.sittersService.updateProfile(user.id, dto);
  }

  @Delete('profile')
  deleteProfile(@CurrentUser() user: JwtUser) {
    return this.sittersService.deleteProfile(user.id);
  }
}
