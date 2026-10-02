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
  const user = { id: 7, email: 'owner@example.com' } as JwtUser;
  const dto = { name: 'Rex' } as CreatePetDto;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PetsController],
      providers: [{ provide: PetsService, useValue: petsService }],
    }).compile();

    controller = module.get(PetsController);
  });

  it('passes the current user id into every pet operation', () => {
    controller.create(user, dto);
    controller.findOne(user, 3);
    controller.update(user, 3, { name: 'Rexy' });
    controller.remove(user, 3);

    expect(petsService.create).toHaveBeenCalledWith(7, dto);
    expect(petsService.findOne).toHaveBeenCalledWith(3, 7);
    expect(petsService.update).toHaveBeenCalledWith(3, 7, { name: 'Rexy' });
    expect(petsService.remove).toHaveBeenCalledWith(3, 7);
  });
});
