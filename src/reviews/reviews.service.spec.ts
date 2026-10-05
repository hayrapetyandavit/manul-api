import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from 'generated/prisma/client';
import { BookingStatus } from 'generated/prisma/enums';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReviewsService } from './reviews.service';

describe('ReviewsService', () => {
  let service: ReviewsService;
  let prisma: {
    booking: { findFirstOrThrow: jest.Mock };
    review: {
      create: jest.Mock;
      findMany: jest.Mock;
      aggregate: jest.Mock;
    };
  };

  const ownerId = 1;
  const sitterUserId = 2;
  const strangerId = 3;
  const publicSelect = {
    id: true,
    bookingId: true,
    rating: true,
    comment: true,
    createdAt: true,
    updatedAt: true,
  };
  const publicReview = {
    id: 1,
    bookingId: 9,
    rating: 5,
    comment: 'Careful with the leash',
    createdAt: new Date('2026-10-01T00:00:00.000Z'),
    updatedAt: new Date('2026-10-01T00:00:00.000Z'),
  };

  function reviewableBy(reviewerId: number) {
    return {
      id: 9,
      status: BookingStatus.COMPLETED,
      sitterProfileId: { not: null },
      OR: [
        {
          ownerId: reviewerId,
          sitterProfile: { userId: { not: reviewerId } },
        },
        {
          sitterProfile: { userId: reviewerId },
          ownerId: { not: reviewerId },
        },
      ],
    };
  }

  function aboutUser(userId: number) {
    return {
      OR: [
        {
          booking: {
            ownerId: userId,
            sitterProfileId: { not: null },
          },
          NOT: { reviewerId: userId },
        },
        {
          booking: {
            sitterProfile: { userId },
          },
          NOT: { reviewerId: userId },
        },
      ],
    };
  }

  beforeEach(async () => {
    prisma = {
      booking: { findFirstOrThrow: jest.fn() },
      review: {
        create: jest.fn(),
        findMany: jest.fn(),
        aggregate: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ReviewsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(ReviewsService);
  });

  it('lets the owner review a completed booking and stores the caller as reviewer', async () => {
    prisma.booking.findFirstOrThrow.mockResolvedValue({ id: 9 });
    prisma.review.create.mockResolvedValue(publicReview);

    await expect(
      service.create(ownerId, {
        bookingId: 9,
        rating: 5,
        comment: 'Careful with the leash',
        reviewerId: strangerId,
      } as CreateReviewDto),
    ).resolves.toEqual(publicReview);

    expect(prisma.booking.findFirstOrThrow).toHaveBeenCalledWith({
      where: reviewableBy(ownerId),
    });
    expect(prisma.review.create).toHaveBeenCalledWith({
      data: {
        bookingId: 9,
        reviewerId: ownerId,
        rating: 5,
        comment: 'Careful with the leash',
      },
      select: publicSelect,
    });
  });

  it('lets the assigned sitter review the same completed booking', async () => {
    prisma.booking.findFirstOrThrow.mockResolvedValue({ id: 9 });
    prisma.review.create.mockResolvedValue({
      ...publicReview,
      rating: 4,
      comment: undefined,
    });

    await service.create(sitterUserId, { bookingId: 9, rating: 4 });

    expect(prisma.booking.findFirstOrThrow).toHaveBeenCalledWith({
      where: reviewableBy(sitterUserId),
    });
    expect(prisma.review.create).toHaveBeenCalledWith({
      data: {
        bookingId: 9,
        reviewerId: sitterUserId,
        rating: 4,
        comment: undefined,
      },
      select: publicSelect,
    });
  });

  it('does not write a review when the caller is not the other party', async () => {
    prisma.booking.findFirstOrThrow.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Record not found', {
        code: 'P2025',
        clientVersion: 'test',
      }),
    );

    await expect(
      service.create(strangerId, { bookingId: 9, rating: 5 }),
    ).rejects.toMatchObject({ code: 'P2025' });

    expect(prisma.booking.findFirstOrThrow).toHaveBeenCalledWith({
      where: reviewableBy(strangerId),
    });
    expect(prisma.review.create).not.toHaveBeenCalled();
  });

  it('returns reviews about a user, excluding ones they wrote, with the average', async () => {
    prisma.review.findMany.mockResolvedValue([publicReview]);
    prisma.review.aggregate.mockResolvedValue({
      _avg: { rating: 4.5 },
      _count: 2,
    });

    await expect(service.findForUser(sitterUserId)).resolves.toEqual({
      reviews: [publicReview],
      averageRating: 4.5,
      reviewCount: 2,
    });

    expect(prisma.review.findMany).toHaveBeenCalledWith({
      where: aboutUser(sitterUserId),
      select: publicSelect,
      orderBy: { createdAt: 'desc' },
    });
    expect(prisma.review.aggregate).toHaveBeenCalledWith({
      where: aboutUser(sitterUserId),
      _avg: { rating: true },
      _count: true,
    });
  });

  it('returns an empty summary when the user has no reviews about them', async () => {
    prisma.review.findMany.mockResolvedValue([]);
    prisma.review.aggregate.mockResolvedValue({
      _avg: { rating: null },
      _count: 0,
    });

    await expect(service.findForUser(ownerId)).resolves.toEqual({
      reviews: [],
      averageRating: null,
      reviewCount: 0,
    });
    expect(prisma.review.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: aboutUser(ownerId) }),
    );
  });
});
