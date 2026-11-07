import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from 'src/auth/decorators/user.decorator';
import { JwtUser } from 'src/auth/types/jwt-payload.type';
import { JwtAuthGuard } from 'src/auth/utils/Guards';
import { AvailabilityService } from './availability.service';
import { SetWeeklyHoursDto } from './dto/set-weekly-hours.dto';
import { CreateAvailabilityOverrideDto } from './dto/create-availability-override.dto';
import { ListAvailabilityOverridesDto } from './dto/list-availability-overrides.dto';
import { SitterAvailabilityDto } from './dto/sitter-availability.dto';

@UseGuards(JwtAuthGuard)
@Controller('sitters')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Get('availability/weekly-hours')
  getWeeklyHours(@CurrentUser() user: JwtUser) {
    return this.availabilityService.getWeeklyHours(user.id);
  }

  @Put('availability/weekly-hours')
  setWeeklyHours(@CurrentUser() user: JwtUser, @Body() dto: SetWeeklyHoursDto) {
    return this.availabilityService.setWeeklyHours(user.id, dto);
  }

  @Get('availability/overrides')
  listOverrides(
    @CurrentUser() user: JwtUser,
    @Query() query: ListAvailabilityOverridesDto,
  ) {
    return this.availabilityService.listOverrides(user.id, query);
  }

  @Post('availability/overrides')
  createOverride(
    @CurrentUser() user: JwtUser,
    @Body() dto: CreateAvailabilityOverrideDto,
  ) {
    return this.availabilityService.createOverride(user.id, dto);
  }

  @Delete('availability/overrides/:id')
  removeOverride(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtUser,
  ) {
    return this.availabilityService.removeOverride(id, user.id);
  }

  @Get(':sitterProfileId/availability')
  getSitterAvailability(
    @Param('sitterProfileId', ParseIntPipe) sitterProfileId: number,
    @Query() query: SitterAvailabilityDto,
  ) {
    return this.availabilityService.getSitterAvailability(
      sitterProfileId,
      query,
    );
  }
}
