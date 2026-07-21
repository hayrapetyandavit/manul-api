import { Test, TestingModule } from '@nestjs/testing';
import { SittersController } from './sitters.controller';
import { SittersService } from './sitters.service';

describe('SittersController', () => {
  let controller: SittersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SittersController],
      providers: [SittersService],
    }).compile();

    controller = module.get<SittersController>(SittersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
