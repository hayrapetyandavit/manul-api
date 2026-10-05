import { Test, TestingModule } from '@nestjs/testing';
import { JwtUser } from 'src/auth/types/jwt-payload.type';
import { CreateSitterServiceDto } from './dto/create-sitter-service.dto';
import { SitterServicesController } from './sitter-services.controller';
import { SitterServicesService } from './sitter-services.service';

describe('SitterServicesController', () => {
  let controller: SitterServicesController;
  const sitterServicesService = {
    findAllByUser: jest.fn(),
    findOneByUser: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };
  const user = { id: 1, email: 'sitter@example.com' } as JwtUser;
  const dto = { price: 25 } as CreateSitterServiceDto;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SitterServicesController],
      providers: [
        { provide: SitterServicesService, useValue: sitterServicesService },
      ],
    }).compile();

    controller = module.get(SitterServicesController);
  });

  it("lists the current user's services", async () => {
    sitterServicesService.findAllByUser.mockResolvedValue([{ id: 4 }]);

    await expect(controller.findAll(user)).resolves.toEqual([{ id: 4 }]);
    expect(sitterServicesService.findAllByUser).toHaveBeenCalledWith(1);
  });

  it('loads one service with the route id and the current user', async () => {
    sitterServicesService.findOneByUser.mockResolvedValue({ id: 4 });

    await expect(controller.findOne(4, user)).resolves.toEqual({ id: 4 });
    expect(sitterServicesService.findOneByUser).toHaveBeenCalledWith(4, 1);
  });

  it('creates a service for the current user', async () => {
    sitterServicesService.create.mockResolvedValue({ id: 4 });

    await expect(controller.create(user, dto)).resolves.toEqual({ id: 4 });
    expect(sitterServicesService.create).toHaveBeenCalledWith(1, dto);
  });

  it('updates a service only as the current user', async () => {
    sitterServicesService.update.mockResolvedValue({ id: 4, price: 30 });

    await expect(controller.update(4, user, { price: 30 })).resolves.toEqual({
      id: 4,
      price: 30,
    });
    expect(sitterServicesService.update).toHaveBeenCalledWith(4, 1, {
      price: 30,
    });
  });

  it('deletes a service only as the current user', async () => {
    sitterServicesService.remove.mockResolvedValue({ id: 4 });

    await expect(controller.remove(4, user)).resolves.toEqual({ id: 4 });
    expect(sitterServicesService.remove).toHaveBeenCalledWith(4, 1);
  });
});
