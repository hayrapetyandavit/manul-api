import { Injectable, NotFoundException } from '@nestjs/common';
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
        sitterProfile: { include: { services: true } },
      },
    });
  }

  async update(email: string, updateUserDto: UpdateUserDto) {
    return this.prisma.user.update({
      where: { email },
      data: updateUserDto,
    });
  }

  async remove(email: string) {
    return this.prisma.user.update({
      where: { email },
      data: { isActive: false, deletedAt: new Date() },
    });
  }
}
