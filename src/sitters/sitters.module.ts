import { Module } from '@nestjs/common';
import { SittersService } from './sitters.service';
import { SittersController } from './sitters.controller';
import { SitterServicesService } from './sitter-services.service';
import { SitterServicesController } from './sitter-services.controller';

@Module({
  providers: [SittersService, SitterServicesService],
  controllers: [SittersController, SitterServicesController],
})
export class SittersModule {}
