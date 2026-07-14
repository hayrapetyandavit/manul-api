import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from 'src/auth/utils/Guards';
import { CurrentUser } from 'src/auth/decorators/user.decorator';
import { JwtUser } from 'src/auth/types/jwt-payload.type';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  me(@CurrentUser() user: JwtUser) {
    return this.usersService.findOne(user.email);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch('me')
  update(@CurrentUser() user: JwtUser, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(user.email, updateUserDto);
  }

  @Delete('me')
  remove(@CurrentUser() user: JwtUser) {
    return this.usersService.remove(user.email);
  }
}
