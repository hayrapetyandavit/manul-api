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
  const user = { id: 1, email: 'sitter@example.com' } as JwtUser;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SittersController],
      providers: [{ provide: SittersService, useValue: sittersService }],
    }).compile();

    controller = module.get(SittersController);
  });

  it('lists sitters for the current user and returns the rows', async () => {
    sittersService.findAll.mockResolvedValue([{ id: 2 }]);

    await expect(controller.findAll(user)).resolves.toEqual([{ id: 2 }]);
    expect(sittersService.findAll).toHaveBeenCalledWith(1);
  });

  it('loads the current user’s profile', async () => {
    sittersService.findProfile.mockResolvedValue({ id: 10, userId: 1 });

    await expect(controller.findProfile(user)).resolves.toEqual({
      id: 10,
      userId: 1,
    });
    expect(sittersService.findProfile).toHaveBeenCalledWith(1);
  });

  it('creates a profile for the current user', async () => {
    const dto = { description: 'Walks' };
    sittersService.createProfile.mockResolvedValue({ id: 10, userId: 1 });

    await expect(controller.createProfile(user, dto)).resolves.toEqual({
      id: 10,
      userId: 1,
    });
    expect(sittersService.createProfile).toHaveBeenCalledWith(1, dto);
  });

  it('updates only the current user’s profile', async () => {
    sittersService.updateProfile.mockResolvedValue({
      id: 10,
      experienceYears: 2,
    });

    await expect(
      controller.updateProfile(user, { experienceYears: 2 }),
    ).resolves.toEqual({ id: 10, experienceYears: 2 });
    expect(sittersService.updateProfile).toHaveBeenCalledWith(1, {
      experienceYears: 2,
    });
  });

  it('deletes only the current user’s profile', async () => {
    sittersService.deleteProfile.mockResolvedValue({ id: 10 });

    await expect(controller.deleteProfile(user)).resolves.toEqual({ id: 10 });
    expect(sittersService.deleteProfile).toHaveBeenCalledWith(1);
  });
});
