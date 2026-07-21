import { Test, TestingModule } from '@nestjs/testing';
import { SittersService } from './sitters.service';

describe('SittersService', () => {
  let service: SittersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SittersService],
    }).compile();

    service = module.get<SittersService>(SittersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
