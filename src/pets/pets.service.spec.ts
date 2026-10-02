import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
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

  const createDto = { name: 'Rex', type: PetType.DOG } as CreatePetDto;

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

  it('stores a pet against the caller, not a client-supplied owner', async () => {
    prisma.pet.create.mockResolvedValue({ id: 1, ownerId: 7 });

    await service.create(7, createDto);

    expect(prisma.pet.create).toHaveBeenCalledWith({
      data: { ...createDto, ownerId: 7 },
    });
  });

  it('returns a pet only when it belongs to the caller', async () => {
    const pet = { id: 3, ownerId: 7 };
    prisma.pet.findUnique.mockResolvedValue(pet);

    await expect(service.findOne(3, 7)).resolves.toBe(pet);
    expect(prisma.pet.findUnique).toHaveBeenCalledWith({
      where: { id: 3, ownerId: 7 },
      include: { owner: true },
    });
  });

  it('hides another owner’s pet as not found', async () => {
    prisma.pet.findUnique.mockResolvedValue(null);

    await expect(service.findOne(3, 7)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('updates and deletes only the caller’s pet', async () => {
    prisma.pet.update.mockResolvedValue({ id: 3 });
    prisma.pet.delete.mockResolvedValue({ id: 3 });

    await service.update(3, 7, { name: 'Rexy' });
    await service.remove(3, 7);

    expect(prisma.pet.update).toHaveBeenCalledWith({
      where: { id: 3, ownerId: 7 },
      data: { name: 'Rexy' },
    });
    expect(prisma.pet.delete).toHaveBeenCalledWith({
      where: { id: 3, ownerId: 7 },
    });
  });
});
