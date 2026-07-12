import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Profile } from 'passport';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async validateUser(profile: Profile) {
    return this.prisma.user.upsert({
      where: { googleId: profile.id },
      update: { picture: profile.photos[0].value },
      create: {
        email: profile.emails[0].value,
        googleId: profile.id,
        firstName: profile.name.givenName,
        lastName: profile.name.familyName,
        picture: profile.photos[0].value,
      },
    });
  }

  async findUser(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });
    return user;
  }

  async generateJwtToken(user: any) {
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
