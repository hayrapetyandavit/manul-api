import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma/prisma.service';
import { SittersService } from './sitters.service';

describe('SittersService', () => {
  let service: SittersService;
  let prisma: {
    user: { findMany: jest.Mock };
    sitterProfile: {
      findUniqueOrThrow: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      user: { findMany: jest.fn() },
      sitterProfile: {
        findUniqueOrThrow: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [SittersService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(SittersService);
  });

  it('lists other active sitters and skips the caller', async () => {
    prisma.user.findMany.mockResolvedValue([]);

    await service.findAll(7);

    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: {
        id: { not: 7 },
        deletedAt: null,
        isActive: true,
        sitterProfile: { isNot: null },
      },
      include: {
        sitterProfile: { include: { sitterServices: true } },
      },
    });
  });

  it('loads, creates, updates, and deletes the caller’s profile by user id', async () => {
    const dto = { description: 'Walks', experienceYears: 3 };
    prisma.sitterProfile.findUniqueOrThrow.mockResolvedValue({ id: 1 });
    prisma.sitterProfile.create.mockResolvedValue({ id: 1 });
    prisma.sitterProfile.update.mockResolvedValue({ id: 1 });
    prisma.sitterProfile.delete.mockResolvedValue({ id: 1 });

    await service.findProfile(7);
    await service.createProfile(7, dto);
    await service.updateProfile(7, { description: 'Daycare' });
    await service.deleteProfile(7);

    expect(prisma.sitterProfile.findUniqueOrThrow).toHaveBeenCalledWith({
      where: { userId: 7 },
      include: { sitterServices: true },
    });
    expect(prisma.sitterProfile.create).toHaveBeenCalledWith({
      data: { userId: 7, description: 'Walks', experienceYears: 3 },
      include: { sitterServices: true },
    });
    expect(prisma.sitterProfile.update).toHaveBeenCalledWith({
      where: { userId: 7 },
      data: { description: 'Daycare' },
      include: { sitterServices: true },
    });
    expect(prisma.sitterProfile.delete).toHaveBeenCalledWith({
      where: { userId: 7 },
    });
  });
});
