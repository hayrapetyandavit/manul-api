import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreatePetDto } from './dto/create-pet.dto';
import { UpdatePetDto } from './dto/update-pet.dto';

@Injectable()
export class PetsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(ownerId: number, createPetDto: CreatePetDto) {
    return this.prisma.pet.create({
      data: {
        ...createPetDto,
        ownerId,
      },
    });
  }

  async findAll(ownerId: number) {
    return this.prisma.pet.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number, ownerId: number) {
    const pet = await this.prisma.pet.findUnique({
      where: { id, ownerId },
      include: { owner: true },
    });

    if (!pet) {
      throw new NotFoundException(`Pet #${id} not found`);
    }

    return pet;
  }

  async update(id: number, ownerId: number, updatePetDto: UpdatePetDto) {
    return this.prisma.pet.update({
      where: { id, ownerId },
      data: updatePetDto,
    });
  }

  async remove(id: number, ownerId: number) {
    return this.prisma.pet.delete({ where: { id, ownerId } });
  }
}
