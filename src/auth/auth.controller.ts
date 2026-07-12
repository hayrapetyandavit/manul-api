import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { GoogleAuthGuard } from 'src/auth/utils/Guards';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(GoogleAuthGuard)
  @Get('google/redirect')
  async googleAuthRedirect(@Req() req: Request & { user: any }) {
    const token = await this.authService.generateJwtToken(req.user);
    return token;
  }
}
