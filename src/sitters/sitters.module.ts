import { Module } from '@nestjs/common';
import { SittersService } from './sitters.service';
import { SittersController } from './sitters.controller';

@Module({
  providers: [SittersService],
  controllers: [SittersController],
})
export class SittersModule {}
