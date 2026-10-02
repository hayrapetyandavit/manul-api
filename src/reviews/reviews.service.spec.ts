import { Test, TestingModule } from '@nestjs/testing';
import { BookingStatus } from 'generated/prisma/enums';
import { PrismaService } from 'src/prisma/prisma.service';
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

  const publicReview = {
    id: 1,
    bookingId: 9,
    rating: 5,
    comment: 'Careful with the leash',
    createdAt: new Date('2026-10-01T00:00:00.000Z'),
    updatedAt: new Date('2026-10-01T00:00:00.000Z'),
  };

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

  it('reviews a completed booking only when the caller is the other party', async () => {
    prisma.booking.findFirstOrThrow.mockResolvedValue({ id: 9 });
    prisma.review.create.mockResolvedValue(publicReview);

    await expect(
      service.create(7, {
        bookingId: 9,
        rating: 5,
        comment: 'Careful with the leash',
      }),
    ).resolves.toEqual(publicReview);

    expect(prisma.booking.findFirstOrThrow).toHaveBeenCalledWith({
      where: {
        id: 9,
        status: BookingStatus.COMPLETED,
        sitterProfileId: { not: null },
        OR: [
          {
            ownerId: 7,
            sitterProfile: { userId: { not: 7 } },
          },
          {
            sitterProfile: { userId: 7 },
            ownerId: { not: 7 },
          },
        ],
      },
    });
    expect(prisma.review.create).toHaveBeenCalledWith({
      data: {
        bookingId: 9,
        reviewerId: 7,
        rating: 5,
        comment: 'Careful with the leash',
      },
      select: {
        id: true,
        bookingId: true,
        rating: true,
        comment: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  });

  it('does not write a review when the booking is not reviewable', async () => {
    prisma.booking.findFirstOrThrow.mockRejectedValue(new Error('not found'));

    await expect(
      service.create(7, { bookingId: 9, rating: 4 }),
    ).rejects.toThrow('not found');
    expect(prisma.review.create).not.toHaveBeenCalled();
  });

  it('returns reviews about a user, excluding ones they wrote, with the average', async () => {
    prisma.review.findMany.mockResolvedValue([publicReview]);
    prisma.review.aggregate.mockResolvedValue({
      _avg: { rating: 4.5 },
      _count: 2,
    });

    await expect(service.findForUser(7)).resolves.toEqual({
      reviews: [publicReview],
      averageRating: 4.5,
      reviewCount: 2,
    });

    const aboutUser = {
      OR: [
        {
          booking: {
            ownerId: 7,
            sitterProfileId: { not: null },
          },
          NOT: { reviewerId: 7 },
        },
        {
          booking: {
            sitterProfile: { userId: 7 },
          },
          NOT: { reviewerId: 7 },
        },
      ],
    };
    expect(prisma.review.findMany).toHaveBeenCalledWith({
      where: aboutUser,
      select: {
        id: true,
        bookingId: true,
        rating: true,
        comment: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    expect(prisma.review.aggregate).toHaveBeenCalledWith({
      where: aboutUser,
      _avg: { rating: true },
      _count: true,
    });
  });
});
