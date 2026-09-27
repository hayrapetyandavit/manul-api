import { Prisma } from 'generated/prisma/client';
import { numberRange, omitEmpty } from 'src/common/prisma/where';
import { FindSittersQueryDto, SitterSort } from './dto/find-sitters-query.dto';

export function buildSitterServiceWhere(
  query: FindSittersQueryDto,
): Prisma.SitterServiceWhereInput | undefined {
  const price = numberRange(query.minPrice, query.maxPrice);

  return omitEmpty({
    ...(query.serviceType && { type: query.serviceType }),
    ...(query.petType && { petTypes: { has: query.petType } }),
    ...(price && { price }),
  });
}

export function buildSitterListQuery(
  userId: number,
  query: FindSittersQueryDto,
) {
  const serviceWhere = buildSitterServiceWhere(query);
  const priceDirection = priceSortDirection(query.sort);

  return {
    where: {
      id: { not: userId },
      deletedAt: null,
      sitterProfile: {
        is: {
          ...(query.minRating !== undefined && {
            averageRating: { gte: query.minRating },
          }),
          ...(serviceWhere && {
            sitterServices: { some: serviceWhere },
          }),
        },
      },
    },
    include: {
      sitterProfile: {
        include: {
          sitterServices: {
            ...(serviceWhere && { where: serviceWhere }),
            ...(priceDirection && { orderBy: { price: priceDirection } }),
          },
        },
      },
    },
    ...(query.sort === SitterSort.RATING_DESC && {
      orderBy: {
        sitterProfile: {
          averageRating: { sort: 'desc' as const, nulls: 'last' as const },
        },
      },
    }),
  } satisfies Prisma.UserFindManyArgs;
}

export function sortByListedPrice<
  T extends {
    sitterProfile: { sitterServices: { price: Prisma.Decimal }[] } | null;
  },
>(sitters: T[], sort: SitterSort.PRICE_ASC | SitterSort.PRICE_DESC): T[] {
  const direction = sort === SitterSort.PRICE_DESC ? -1 : 1;
  const missing =
    sort === SitterSort.PRICE_DESC
      ? Number.NEGATIVE_INFINITY
      : Number.POSITIVE_INFINITY;

  return [...sitters].sort((a, b) => {
    const aPrice = Number(a.sitterProfile?.sitterServices[0]?.price ?? missing);
    const bPrice = Number(b.sitterProfile?.sitterServices[0]?.price ?? missing);
    return (aPrice - bPrice) * direction;
  });
}

function priceSortDirection(sort?: SitterSort): Prisma.SortOrder | undefined {
  if (sort === SitterSort.PRICE_ASC) return 'asc';
  if (sort === SitterSort.PRICE_DESC) return 'desc';
  return undefined;
}
