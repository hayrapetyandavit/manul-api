import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from 'generated/prisma/client';
import { PetType } from 'generated/prisma/enums';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreatePetDto } from './dto/create-pet.dto';
import { PetsService } from './pets.service';

describe('PetsService', () => {
  let service: PetsService;
  let prisma: {
    pet: {
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  const ownerId = 1;
  const otherUserId = 2;
  const createDto = { name: 'Rex', type: PetType.DOG } as CreatePetDto;

  function missingRecord() {
    return new Prisma.PrismaClientKnownRequestError('Record not found', {
      code: 'P2025',
      clientVersion: 'test',
    });
  }

  beforeEach(async () => {
    prisma = {
      pet: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [PetsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(PetsService);
  });

  it('stores a pet on the caller even when the body names another owner', async () => {
    prisma.pet.create.mockResolvedValue({ id: 3, ownerId });

    await service.create(ownerId, {
      ...createDto,
      ownerId: otherUserId,
    } as CreatePetDto);

    expect(prisma.pet.create).toHaveBeenCalledWith({
      data: { ...createDto, ownerId },
    });
  });

  it('returns a pet only when it belongs to the caller', async () => {
    const pet = { id: 3, ownerId, name: 'Rex' };
    prisma.pet.findUnique.mockResolvedValue(pet);

    await expect(service.findOne(3, ownerId)).resolves.toBe(pet);
    expect(prisma.pet.findUnique).toHaveBeenCalledWith({
      where: { id: 3, ownerId },
      include: { owner: true },
    });
  });

  it("hides another owner's pet as not found", async () => {
    prisma.pet.findUnique.mockResolvedValue(null);

    await expect(service.findOne(3, otherUserId)).rejects.toThrow(
      new NotFoundException('Pet #3 not found'),
    );
    expect(prisma.pet.findUnique).toHaveBeenCalledWith({
      where: { id: 3, ownerId: otherUserId },
      include: { owner: true },
    });
  });

  it('lets the owner rename their pet', async () => {
    prisma.pet.update.mockResolvedValue({ id: 3, ownerId, name: 'Rexy' });

    await expect(
      service.update(3, ownerId, { name: 'Rexy' }),
    ).resolves.toMatchObject({ id: 3, name: 'Rexy' });

    expect(prisma.pet.update).toHaveBeenCalledWith({
      where: { id: 3, ownerId },
      data: { name: 'Rexy' },
    });
  });

  it("user A cannot edit user B's pet", async () => {
    prisma.pet.update.mockRejectedValue(missingRecord());

    await expect(
      service.update(3, otherUserId, { name: 'Stolen' }),
    ).rejects.toMatchObject({ code: 'P2025' });

    expect(prisma.pet.update).toHaveBeenCalledTimes(1);
    expect(prisma.pet.update).toHaveBeenCalledWith({
      where: { id: 3, ownerId: otherUserId },
      data: { name: 'Stolen' },
    });
  });

  it('lets the owner delete their pet', async () => {
    prisma.pet.delete.mockResolvedValue({ id: 3, ownerId });

    await expect(service.remove(3, ownerId)).resolves.toMatchObject({ id: 3 });
    expect(prisma.pet.delete).toHaveBeenCalledWith({
      where: { id: 3, ownerId },
    });
  });

  it("user A cannot delete user B's pet", async () => {
    prisma.pet.delete.mockRejectedValue(missingRecord());

    await expect(service.remove(3, otherUserId)).rejects.toMatchObject({
      code: 'P2025',
    });

    expect(prisma.pet.delete).toHaveBeenCalledTimes(1);
    expect(prisma.pet.delete).toHaveBeenCalledWith({
      where: { id: 3, ownerId: otherUserId },
    });
    expect(prisma.pet.update).not.toHaveBeenCalled();
  });
});
