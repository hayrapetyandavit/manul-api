import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma/prisma.service';
import { PetsService } from './pets.service';

describe('PetsService', () => {
  let service: PetsService;
  let prisma: { pet: { findMany: jest.Mock } };

  beforeEach(async () => {
    prisma = { pet: { findMany: jest.fn() } };

    const module: TestingModule = await Test.createTestingModule({
      providers: [PetsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<PetsService>(PetsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('lists only the caller pets', async () => {
    prisma.pet.findMany.mockResolvedValue([]);

    await service.findAll(4);

    expect(prisma.pet.findMany).toHaveBeenCalledWith({
      where: { ownerId: 4 },
      orderBy: { createdAt: 'desc' },
    });
  });
});
