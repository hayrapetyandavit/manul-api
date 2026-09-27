import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreatePetDto } from './dto/create-pet.dto';
import { UpdatePetDto } from './dto/update-pet.dto';

@Injectable()
export class PetsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(ownerId: number, createPetDto: CreatePetDto) {
    const { birthDate, vetName, vetPhone, vetAddress, ...requiredFields } =
      createPetDto;

    return this.prisma.pet.create({
      data: {
        ...requiredFields,
        birthDate: new Date(birthDate),
        ownerId,
        vetName,
        vetPhone,
        vetAddress,
      },
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
    const { birthDate, ...fields } = updatePetDto;

    return this.prisma.pet.update({
      where: { id, ownerId },
      data: {
        ...fields,
        ...(birthDate !== undefined && { birthDate: new Date(birthDate) }),
      },
    });
  }

  async remove(id: number, ownerId: number) {
    return this.prisma.pet.delete({ where: { id, ownerId } });
  }
}
