import { Test, TestingModule } from '@nestjs/testing';
import { JwtUser } from 'src/auth/types/jwt-payload.type';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';

describe('ReviewsController', () => {
  let controller: ReviewsController;
  const reviewsService = {
    create: jest.fn(),
    findForUser: jest.fn(),
  };
  const user = { id: 1, email: 'owner@example.com' } as JwtUser;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReviewsController],
      providers: [{ provide: ReviewsService, useValue: reviewsService }],
    }).compile();

    controller = module.get(ReviewsController);
  });

  it('attributes a new review to the current user and returns it', async () => {
    const dto = { bookingId: 9, rating: 5 } as CreateReviewDto;
    reviewsService.create.mockResolvedValue({ id: 1, rating: 5 });

    await expect(controller.create(user, dto)).resolves.toEqual({
      id: 1,
      rating: 5,
    });
    expect(reviewsService.create).toHaveBeenCalledWith(1, dto);
  });

  it('loads reviews for the path user, not the caller', async () => {
    const summary = { reviews: [], averageRating: null, reviewCount: 0 };
    reviewsService.findForUser.mockResolvedValue(summary);

    await expect(controller.findForUser(4)).resolves.toEqual(summary);
    expect(reviewsService.findForUser).toHaveBeenCalledWith(4);
    expect(reviewsService.findForUser).not.toHaveBeenCalledWith(user.id);
  });
});
