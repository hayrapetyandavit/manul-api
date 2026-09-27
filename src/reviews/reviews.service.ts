import { Injectable } from '@nestjs/common';
import { BookingStatus, Prisma } from 'generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';

const reviewPublicSelect = {
  id: true,
  bookingId: true,
  rating: true,
  comment: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(reviewerId: number, createReviewDto: CreateReviewDto) {
    const { bookingId, rating, comment } = createReviewDto;

    await this.prisma.booking.findFirstOrThrow({
      where: {
        id: bookingId,
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
      },
    });

    return this.prisma.review.create({
      data: {
        bookingId,
        reviewerId,
        rating,
        comment,
      },
      select: reviewPublicSelect,
    });
  }

  async findForUser(userId: number) {
    const where: Prisma.ReviewWhereInput = {
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

    const [reviews, aggregate] = await Promise.all([
      this.prisma.review.findMany({
        where,
        select: reviewPublicSelect,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.review.aggregate({
        where,
        _avg: { rating: true },
        _count: true,
      }),
    ]);

    return {
      reviews,
      averageRating: aggregate._avg.rating,
      reviewCount: aggregate._count,
    };
  }
}
