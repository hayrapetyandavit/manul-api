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

    const booking = await this.prisma.booking.findFirstOrThrow({
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
      select: { sitterProfileId: true },
    });

    const aggregate = await this.prisma.review.aggregate({
      where: { booking: { sitterProfileId: booking.sitterProfileId } },
      _avg: { rating: true },
      _count: { rating: true },
    });

    const averageRating = this.calculateAverageRating(
      Number(aggregate._avg.rating ?? 0),
      aggregate._count.rating,
      rating,
    );

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        reviews: {
          create: {
            reviewerId,
            rating,
            comment,
          },
        },
        sitterProfile: {
          update: { averageRating },
        },
      },
      select: {
        reviews: {
          where: { reviewerId },
          select: reviewPublicSelect,
          orderBy: { id: 'desc' },
          take: 1,
        },
      },
    });

    return updated.reviews[0];
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

  private calculateAverageRating(
    currentAverage: number,
    reviewCount: number,
    rating: number,
  ): number {
    if (reviewCount === 0) {
      return rating;
    }

    return (
      Math.round(
        ((currentAverage * reviewCount + rating) / (reviewCount + 1)) * 100,
      ) / 100
    );
  }
}
