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
  const user = { id: 7, email: 'owner@example.com' } as JwtUser;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReviewsController],
      providers: [{ provide: ReviewsService, useValue: reviewsService }],
    }).compile();

    controller = module.get(ReviewsController);
  });

  it('attributes a new review to the current user', () => {
    const dto = { bookingId: 9, rating: 5 } as CreateReviewDto;

    controller.create(user, dto);
    controller.findForUser(4);

    expect(reviewsService.create).toHaveBeenCalledWith(7, dto);
    expect(reviewsService.findForUser).toHaveBeenCalledWith(4);
  });
});
