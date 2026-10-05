import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Profile } from 'passport';
import { PrismaService } from 'src/prisma/prisma.service';
import { JwtUser } from './types/jwt-payload.type';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async validateUser(profile: Profile) {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      throw new UnauthorizedException('Google account has no email');
    }

    const picture = profile.photos?.[0]?.value;

    return this.prisma.user.upsert({
      where: { googleId: profile.id },
      update: { picture },
      create: {
        email,
        googleId: profile.id,
        firstName: profile.name?.givenName,
        lastName: profile.name?.familyName,
        picture,
      },
    });
  }

  async findUser(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });
    return user;
  }

  async generateJwtToken(user: JwtUser) {
    const payload = { sub: user.id, email: user.email };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
      },
    };
  }
}
