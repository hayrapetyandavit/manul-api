import { Test, TestingModule } from '@nestjs/testing';
import { JwtUser } from 'src/auth/types/jwt-payload.type';
import { CreatePetDto } from './dto/create-pet.dto';
import { PetsController } from './pets.controller';
import { PetsService } from './pets.service';

describe('PetsController', () => {
  let controller: PetsController;
  const petsService = {
    create: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };
  const user = { id: 1, email: 'owner@example.com' } as JwtUser;
  const dto = { name: 'Rex' } as CreatePetDto;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PetsController],
      providers: [{ provide: PetsService, useValue: petsService }],
    }).compile();

    controller = module.get(PetsController);
  });

  it('creates a pet for the current user and returns it', async () => {
    petsService.create.mockResolvedValue({ id: 3, ownerId: 1 });

    await expect(controller.create(user, dto)).resolves.toEqual({
      id: 3,
      ownerId: 1,
    });
    expect(petsService.create).toHaveBeenCalledWith(1, dto);
  });

  it('loads a pet with the current user id, not an id from the body', async () => {
    petsService.findOne.mockResolvedValue({ id: 3, ownerId: 1 });

    await expect(controller.findOne(user, 3)).resolves.toEqual({
      id: 3,
      ownerId: 1,
    });
    expect(petsService.findOne).toHaveBeenCalledWith(3, 1);
  });

  it('updates a pet only as the current user', async () => {
    petsService.update.mockResolvedValue({ id: 3, name: 'Rexy' });

    await expect(controller.update(user, 3, { name: 'Rexy' })).resolves.toEqual(
      {
        id: 3,
        name: 'Rexy',
      },
    );
    expect(petsService.update).toHaveBeenCalledWith(3, 1, { name: 'Rexy' });
  });

  it('deletes a pet only as the current user', async () => {
    petsService.remove.mockResolvedValue({ id: 3 });

    await expect(controller.remove(user, 3)).resolves.toEqual({ id: 3 });
    expect(petsService.remove).toHaveBeenCalledWith(3, 1);
  });
});
