import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from 'generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateSitterProfileDto } from './dto/create-sitter-profile.dto';
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

  const userId = 1;
  const otherUserId = 2;

  function missingRecord() {
    return new Prisma.PrismaClientKnownRequestError('Record not found', {
      code: 'P2025',
      clientVersion: 'test',
    });
  }

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

    await expect(service.findAll(userId)).resolves.toEqual([]);

    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: {
        id: { not: userId },
        deletedAt: null,
        isActive: true,
        sitterProfile: { isNot: null },
      },
      include: {
        sitterProfile: { include: { sitterServices: true } },
      },
    });
  });

  it('loads the caller’s profile and not another user’s', async () => {
    const profile = { id: 10, userId, description: 'Walks' };
    prisma.sitterProfile.findUniqueOrThrow.mockResolvedValue(profile);

    await expect(service.findProfile(userId)).resolves.toBe(profile);
    expect(prisma.sitterProfile.findUniqueOrThrow).toHaveBeenCalledWith({
      where: { userId },
      include: { sitterServices: true },
    });

    prisma.sitterProfile.findUniqueOrThrow.mockRejectedValue(missingRecord());
    await expect(service.findProfile(otherUserId)).rejects.toMatchObject({
      code: 'P2025',
    });
    expect(prisma.sitterProfile.findUniqueOrThrow).toHaveBeenLastCalledWith({
      where: { userId: otherUserId },
      include: { sitterServices: true },
    });
  });

  it('creates a profile for the caller and ignores a forged user id', async () => {
    prisma.sitterProfile.create.mockResolvedValue({ id: 10, userId });

    await service.createProfile(userId, {
      description: 'Walks',
      experienceYears: 3,
      userId: otherUserId,
    } as CreateSitterProfileDto);

    expect(prisma.sitterProfile.create).toHaveBeenCalledWith({
      data: {
        userId,
        description: 'Walks',
        experienceYears: 3,
      },
      include: { sitterServices: true },
    });
  });

  it('lets the caller edit their own profile', async () => {
    prisma.sitterProfile.update.mockResolvedValue({
      id: 10,
      userId,
      description: 'Daycare',
    });

    await expect(
      service.updateProfile(userId, { description: 'Daycare' }),
    ).resolves.toMatchObject({ description: 'Daycare' });

    expect(prisma.sitterProfile.update).toHaveBeenCalledWith({
      where: { userId },
      data: { description: 'Daycare' },
      include: { sitterServices: true },
    });
  });

  it("user A cannot edit user B's sitter profile", async () => {
    prisma.sitterProfile.update.mockRejectedValue(missingRecord());

    await expect(
      service.updateProfile(otherUserId, { description: 'Stolen' }),
    ).rejects.toMatchObject({ code: 'P2025' });

    expect(prisma.sitterProfile.update).toHaveBeenCalledTimes(1);
    expect(prisma.sitterProfile.update).toHaveBeenCalledWith({
      where: { userId: otherUserId },
      data: { description: 'Stolen' },
      include: { sitterServices: true },
    });
  });

  it("lets the caller delete their profile and blocks another user's", async () => {
    prisma.sitterProfile.delete.mockResolvedValueOnce({ id: 10, userId });

    await expect(service.deleteProfile(userId)).resolves.toMatchObject({
      id: 10,
    });
    expect(prisma.sitterProfile.delete).toHaveBeenCalledWith({
      where: { userId },
    });

    prisma.sitterProfile.delete.mockRejectedValueOnce(missingRecord());
    await expect(service.deleteProfile(otherUserId)).rejects.toMatchObject({
      code: 'P2025',
    });
    expect(prisma.sitterProfile.delete).toHaveBeenLastCalledWith({
      where: { userId: otherUserId },
    });
  });
});
