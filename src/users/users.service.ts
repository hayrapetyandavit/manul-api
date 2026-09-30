import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(email: string) {
    return this.prisma.user.findUnique({
      where: { email, deletedAt: null },
      include: {
        pets: true,
        sitterProfile: { include: { sitterServices: true } },
      },
    });
  }

  async findById(id: number) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id, deletedAt: null, isActive: true },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        picture: true,
        sitterProfile: { include: { sitterServices: true } },
      },
    });
  }

  async update(email: string, updateUserDto: UpdateUserDto) {
    return this.prisma.user.update({
      where: { email, deletedAt: null },
      data: updateUserDto,
    });
  }

  async remove(email: string) {
    return this.prisma.user.update({
      where: { email, deletedAt: null },
      data: { isActive: false, deletedAt: new Date() },
    });
  }
}
