import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { GoogleStrategy } from './utils/GoogleStrategy';
import { PassportModule } from '@nestjs/passport';
import { SessionSerializer } from './utils/Serializer';
import { JwtStrategy } from './utils/JwtStrategy';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    PassportModule.register({ session: false }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'default',
        // signOptions: {
        //   expiresIn: configService.get<string>('JWT_EXPIRES_IN') || '3600000',
        // },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    {
      provide: 'AUTH_SERVICE',
      useExisting: AuthService,
    },
    GoogleStrategy,
    JwtStrategy,
    SessionSerializer,
  ],
})
export class AuthModule {}
