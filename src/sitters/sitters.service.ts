import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateSitterProfileDto } from './dto/create-sitter-profile.dto';
import { UpdateSitterProfileDto } from './dto/update-sitter-profile.dto';

@Injectable()
export class SittersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.user.findMany({
      where: {
        deletedAt: null,
        sitterProfile: { isNot: null },
      },
      include: {
        sitterProfile: { include: { sitterServices: true } },
      },
    });
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
