import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma/prisma.service';
import { SittersService } from './sitters.service';

describe('SittersService', () => {
  let service: SittersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SittersService, { provide: PrismaService, useValue: {} }],
    }).compile();

    service = module.get<SittersService>(SittersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
