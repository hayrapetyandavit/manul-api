import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LoggingMiddleware } from './common/middleware/logging.middleware';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import appConfig from './config/app.config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PetsModule } from './pets/pets.module';
import { BookingsModule } from './bookings/bookings.module';
import { SittersModule } from './sitters/sitters.module';
import { ReviewsModule } from './reviews/reviews.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { OutboxModule, OutboxStorage } from '@nestjs/outbox';
import { fromPrisma, PostgresOutboxStore } from '@nestjs/outbox/postgres';
import { PrismaService } from './prisma/prisma.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
    }),
    PrismaModule,
    OutboxModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        relay: {
          enabled: config.get('OUTBOX_RELAY') !== 'off',
          pollInterval: '10s',
          lease: '30s',
          publishTimeout: '10s',
        },
        retry: { attempts: 3, backoff: { delay: '10s', maxDelay: '5m' } },
      }),
    }),
    AuthModule,
    UsersModule,
    PetsModule,
    BookingsModule,
    SittersModule,
    ReviewsModule,
    SchedulerModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: PostgresOutboxStore,
      inject: [PrismaService, OutboxStorage],
      useFactory: (prisma: PrismaService, storage: OutboxStorage) =>
        new PostgresOutboxStore({ executor: fromPrisma(prisma) }, storage),
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggingMiddleware).forRoutes('{*splat}');
  }
}
