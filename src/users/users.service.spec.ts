import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma/prisma.service';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: {
    user: {
      findUnique: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(UsersService);
  });

  it('loads a public profile by numeric id', async () => {
    prisma.user.findUniqueOrThrow.mockResolvedValue({
      id: 4,
      firstName: 'Ada',
    });

    await expect(service.findById(4)).resolves.toEqual({
      id: 4,
      firstName: 'Ada',
    });

    expect(prisma.user.findUniqueOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 4, deletedAt: null, isActive: true },
      }),
    );
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('propagates a missing or inactive user', async () => {
    prisma.user.findUniqueOrThrow.mockRejectedValue(new Error('not found'));

    await expect(service.findById(4)).rejects.toThrow('not found');
  });

  it('updates and soft-deletes only an active user', async () => {
    prisma.user.update.mockResolvedValue({ id: 1 });

    await service.update('a@b.c', { firstName: 'Ada' });
    await service.remove('a@b.c');

    expect(prisma.user.update).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: { email: 'a@b.c', deletedAt: null },
      }),
    );
    expect(prisma.user.update).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: { email: 'a@b.c', deletedAt: null },
        data: expect.objectContaining({ isActive: false }),
      }),
    );
  });
});
