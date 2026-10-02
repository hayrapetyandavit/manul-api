import { Test, TestingModule } from '@nestjs/testing';
import { JwtUser } from 'src/auth/types/jwt-payload.type';
import { SittersController } from './sitters.controller';
import { SittersService } from './sitters.service';

describe('SittersController', () => {
  let controller: SittersController;
  const sittersService = {
    findAll: jest.fn(),
    findProfile: jest.fn(),
    createProfile: jest.fn(),
    updateProfile: jest.fn(),
    deleteProfile: jest.fn(),
  };
  const user = { id: 7, email: 'sitter@example.com' } as JwtUser;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SittersController],
      providers: [{ provide: SittersService, useValue: sittersService }],
    }).compile();

    controller = module.get(SittersController);
  });

  it('scopes every profile route to the current user', () => {
    const dto = { description: 'Walks' };

    controller.findAll(user);
    controller.findProfile(user);
    controller.createProfile(user, dto);
    controller.updateProfile(user, { experienceYears: 2 });
    controller.deleteProfile(user);

    expect(sittersService.findAll).toHaveBeenCalledWith(7);
    expect(sittersService.findProfile).toHaveBeenCalledWith(7);
    expect(sittersService.createProfile).toHaveBeenCalledWith(7, dto);
    expect(sittersService.updateProfile).toHaveBeenCalledWith(7, {
      experienceYears: 2,
    });
    expect(sittersService.deleteProfile).toHaveBeenCalledWith(7);
  });
});
