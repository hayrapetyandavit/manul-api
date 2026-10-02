import { Test, TestingModule } from '@nestjs/testing';
import { PetType, ServiceType } from 'generated/prisma/enums';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateSitterServiceDto } from './dto/create-sitter-service.dto';
import { SitterServicesService } from './sitter-services.service';

describe('SitterServicesService', () => {
  let service: SitterServicesService;
  let prisma: {
    sitterProfile: { findUniqueOrThrow: jest.Mock };
    sitterService: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  const ownedBy = { sitterProfile: { userId: 7 } };
  const dto = {
    type: ServiceType.WALKING,
    petTypes: [PetType.DOG],
    price: 25,
    durationMin: 30,
    description: 'Neighborhood loop',
  } as CreateSitterServiceDto;

  beforeEach(async () => {
    prisma = {
      sitterProfile: { findUniqueOrThrow: jest.fn() },
      sitterService: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SitterServicesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(SitterServicesService);
  });

  it('lists and loads services only through the caller’s profile', async () => {
    prisma.sitterService.findMany.mockResolvedValue([]);
    prisma.sitterService.findUnique.mockResolvedValue(null);

    await service.findAllByUser(7);
    await service.findOneByUser(4, 7);

    expect(prisma.sitterService.findMany).toHaveBeenCalledWith({
      where: ownedBy,
    });
    expect(prisma.sitterService.findUnique).toHaveBeenCalledWith({
      where: { id: 4, ...ownedBy },
    });
  });

  it('attaches a new service to the caller’s profile id', async () => {
    prisma.sitterProfile.findUniqueOrThrow.mockResolvedValue({ id: 12 });
    prisma.sitterService.create.mockResolvedValue({ id: 4 });

    await service.create(7, dto);

    expect(prisma.sitterProfile.findUniqueOrThrow).toHaveBeenCalledWith({
      where: { userId: 7 },
      select: { id: true },
    });
    expect(prisma.sitterService.create).toHaveBeenCalledWith({
      data: {
        sitterProfileId: 12,
        type: dto.type,
        petTypes: dto.petTypes,
        price: dto.price,
        durationMin: dto.durationMin,
        description: dto.description,
      },
    });
  });

  it('updates and deletes a service only when the profile belongs to the caller', async () => {
    prisma.sitterService.update.mockResolvedValue({ id: 4 });
    prisma.sitterService.delete.mockResolvedValue({ id: 4 });

    await service.update(4, 7, { price: 30 });
    await service.remove(4, 7);

    expect(prisma.sitterService.update).toHaveBeenCalledWith({
      where: { id: 4, ...ownedBy },
      data: { price: 30 },
    });
    expect(prisma.sitterService.delete).toHaveBeenCalledWith({
      where: { id: 4, ...ownedBy },
    });
  });
});
