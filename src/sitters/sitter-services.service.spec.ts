import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from 'generated/prisma/client';
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

  const userId = 1;
  const otherUserId = 2;
  const ownedBy = (owner: number) => ({
    sitterProfile: { userId: owner },
  });
  const dto = {
    type: ServiceType.WALKING,
    petTypes: [PetType.DOG],
    price: 25,
    durationMin: 30,
    description: 'Neighborhood loop',
  } as CreateSitterServiceDto;

  function missingRecord() {
    return new Prisma.PrismaClientKnownRequestError('Record not found', {
      code: 'P2025',
      clientVersion: 'test',
    });
  }

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

  it("lists only the caller's services", async () => {
    const rows = [{ id: 4, sitterProfileId: 12 }];
    prisma.sitterService.findMany.mockResolvedValue(rows);

    await expect(service.findAllByUser(userId)).resolves.toBe(rows);
    expect(prisma.sitterService.findMany).toHaveBeenCalledWith({
      where: ownedBy(userId),
    });
  });

  it("loads a service only through the caller's profile", async () => {
    const row = { id: 4, sitterProfileId: 12 };
    prisma.sitterService.findUnique.mockResolvedValue(row);

    await expect(service.findOneByUser(4, userId)).resolves.toBe(row);
    expect(prisma.sitterService.findUnique).toHaveBeenCalledWith({
      where: { id: 4, ...ownedBy(userId) },
    });
  });

  it('returns nothing when the service belongs to another sitter', async () => {
    prisma.sitterService.findUnique.mockResolvedValue(null);

    await expect(service.findOneByUser(4, otherUserId)).resolves.toBeNull();
    expect(prisma.sitterService.findUnique).toHaveBeenCalledWith({
      where: { id: 4, ...ownedBy(otherUserId) },
    });
  });

  it("attaches a new service to the caller's profile, not a body profile id", async () => {
    prisma.sitterProfile.findUniqueOrThrow.mockResolvedValue({ id: 12 });
    prisma.sitterService.create.mockResolvedValue({
      id: 4,
      sitterProfileId: 12,
    });

    await service.create(userId, {
      ...dto,
      sitterProfileId: 99,
    } as CreateSitterServiceDto);

    expect(prisma.sitterProfile.findUniqueOrThrow).toHaveBeenCalledWith({
      where: { userId },
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

  it('does not insert a service when the caller has no profile', async () => {
    prisma.sitterProfile.findUniqueOrThrow.mockRejectedValue(missingRecord());

    await expect(service.create(userId, dto)).rejects.toMatchObject({
      code: 'P2025',
    });
    expect(prisma.sitterService.create).not.toHaveBeenCalled();
  });

  it('lets the caller change the price of their service', async () => {
    prisma.sitterService.update.mockResolvedValue({ id: 4, price: 30 });

    await expect(
      service.update(4, userId, { price: 30 }),
    ).resolves.toMatchObject({ price: 30 });
    expect(prisma.sitterService.update).toHaveBeenCalledWith({
      where: { id: 4, ...ownedBy(userId) },
      data: { price: 30 },
    });
  });

  it("user A cannot edit user B's sitter service", async () => {
    prisma.sitterService.update.mockRejectedValue(missingRecord());

    await expect(
      service.update(4, otherUserId, { price: 1 }),
    ).rejects.toMatchObject({ code: 'P2025' });

    expect(prisma.sitterService.update).toHaveBeenCalledTimes(1);
    expect(prisma.sitterService.update).toHaveBeenCalledWith({
      where: { id: 4, ...ownedBy(otherUserId) },
      data: { price: 1 },
    });
  });

  it("lets the caller delete their service and blocks another sitter's", async () => {
    prisma.sitterService.delete.mockResolvedValueOnce({ id: 4 });

    await expect(service.remove(4, userId)).resolves.toMatchObject({ id: 4 });
    expect(prisma.sitterService.delete).toHaveBeenCalledWith({
      where: { id: 4, ...ownedBy(userId) },
    });

    prisma.sitterService.delete.mockRejectedValueOnce(missingRecord());
    await expect(service.remove(4, otherUserId)).rejects.toMatchObject({
      code: 'P2025',
    });
    expect(prisma.sitterService.delete).toHaveBeenLastCalledWith({
      where: { id: 4, ...ownedBy(otherUserId) },
    });
    expect(prisma.sitterService.update).not.toHaveBeenCalled();
  });
});
