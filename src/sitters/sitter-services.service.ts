import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateSitterServiceDto } from './dto/create-sitter-service.dto';
import { UpdateSitterServiceDto } from './dto/update-sitter-service.dto';

@Injectable()
export class SitterServicesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllByUser(userId: number) {
    return this.prisma.sitterService.findMany({
      where: {
        sitterProfile: {
          userId,
        },
      },
    });
  }

  async findOneByUser(id: number, userId: number) {
    return this.prisma.sitterService.findUnique({
      where: {
        id,
        sitterProfile: {
          userId,
        },
      },
    });
  }

  async create(userId: number, dto: CreateSitterServiceDto) {
    const profile = await this.prisma.sitterProfile.findUniqueOrThrow({
      where: { userId },
      select: { id: true },
    });

    return this.prisma.sitterService.create({
      data: {
        sitterProfileId: profile.id,
        type: dto.type,
        price: dto.price,
        durationMin: dto.durationMin,
        description: dto.description,
      },
    });
  }

  async update(id: number, userId: number, dto: UpdateSitterServiceDto) {
    return this.prisma.sitterService.update({
      where: {
        id,
        sitterProfile: {
          userId,
        },
      },
      data: dto,
    });
  }

  async remove(id: number, userId: number) {
    return this.prisma.sitterService.delete({
      where: {
        id,
        sitterProfile: {
          userId,
        },
      },
    });
  }
}
