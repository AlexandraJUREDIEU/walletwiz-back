import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // 🔹 Créer un utilisateur
  async create(data: CreateUserDto) {
    return this.prisma.user.create({
      data,
    });
  }

  // 🔹 Trouver un utilisateur par email
  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  // 🔹 Trouver un utilisateur par ID
  async findById(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }
}