import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt'
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
    const hashedPassword = await bcrypt.hash(dto.password, 10)

    return this.prisma.users.create({
      data: {
        ...dto,
        password: hashedPassword,
      },
    })
  }

  async getMe(userId: string) {
  const user = await this.prisma.users.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      avatarUrl: true,
      emailVerified: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  if (!user) throw new NotFoundException('Utilisateur non trouvé')

  return user
}

  async findAll() {
    return this.prisma.users.findMany();
  }

  async findOne(id: string) {
    const user = await this.prisma.users.findUnique({ where: { id } })
    if (!user) throw new NotFoundException('User not found')
    return user
  }

  async updateMe(userId: string, dto: UpdateProfileDto) {
    return this.prisma.users.update({
      where: { id: userId },
      data: {
        ...dto,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    })
  }
  
  async update(id: string, dto: UpdateUserDto) {
    return this.prisma.users.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    return this.prisma.users.delete({ where: { id } });
  }
}
