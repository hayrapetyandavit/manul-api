import { Test, TestingModule } from '@nestjs/testing';
import { JwtUser } from 'src/auth/types/jwt-payload.type';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let controller: UsersController;
  const usersService = {
    findOne: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };
  const user = { id: 7, email: 'ada@example.com' } as JwtUser;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: usersService }],
    }).compile();

    controller = module.get(UsersController);
  });

  it('uses the token email for the caller and the path id for a public profile', () => {
    controller.me(user);
    controller.findOne(4);
    controller.update(user, { firstName: 'Ada' });
    controller.remove(user);

    expect(usersService.findOne).toHaveBeenCalledWith('ada@example.com');
    expect(usersService.findById).toHaveBeenCalledWith(4);
    expect(usersService.update).toHaveBeenCalledWith('ada@example.com', {
      firstName: 'Ada',
    });
    expect(usersService.remove).toHaveBeenCalledWith('ada@example.com');
  });
});
