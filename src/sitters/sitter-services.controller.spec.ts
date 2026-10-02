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
  const user = { id: 7, email: 'sitter@example.com' } as JwtUser;
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

  it('passes the service id and the current user into the service', () => {
    controller.findAll(user);
    controller.findOne(4, user);
    controller.create(user, dto);
    controller.update(4, user, { price: 30 });
    controller.remove(4, user);

    expect(sitterServicesService.findAllByUser).toHaveBeenCalledWith(7);
    expect(sitterServicesService.findOneByUser).toHaveBeenCalledWith(4, 7);
    expect(sitterServicesService.create).toHaveBeenCalledWith(7, dto);
    expect(sitterServicesService.update).toHaveBeenCalledWith(4, 7, {
      price: 30,
    });
    expect(sitterServicesService.remove).toHaveBeenCalledWith(4, 7);
  });
});
