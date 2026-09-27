import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateSitterProfileDto } from './dto/create-sitter-profile.dto';
import { FindSittersQueryDto, SitterSort } from './dto/find-sitters-query.dto';
import { UpdateSitterProfileDto } from './dto/update-sitter-profile.dto';
import { buildSitterListQuery, sortByListedPrice } from './sitter-list.query';

@Injectable()
export class SittersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: number, query: FindSittersQueryDto = {}) {
    const sitters = await this.prisma.user.findMany(
      buildSitterListQuery(userId, query),
    );

    if (
      query.sort === SitterSort.PRICE_ASC ||
      query.sort === SitterSort.PRICE_DESC
    ) {
      return sortByListedPrice(sitters, query.sort);
    }

    return sitters;
  }

  async findProfile(userId: number) {
    return this.prisma.sitterProfile.findUniqueOrThrow({
      where: { userId },
      include: { sitterServices: true },
    });
  }

  async createProfile(userId: number, dto: CreateSitterProfileDto) {
    return this.prisma.sitterProfile.create({
      data: {
        userId,
        description: dto.description,
        experienceYears: dto.experienceYears,
      },
      include: { sitterServices: true },
    });
  }

  async updateProfile(userId: number, dto: UpdateSitterProfileDto) {
    return this.prisma.sitterProfile.update({
      where: { userId },
      data: dto,
      include: { sitterServices: true },
    });
  }

  async deleteProfile(userId: number) {
    return this.prisma.sitterProfile.delete({
      where: { userId },
    });
  }
}
