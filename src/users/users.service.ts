import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt'
import { UpdateProfileDto } from './dto/update-profile.dto';
import { userPublicSelect } from './user.select';

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
      select: userPublicSelect
    })
  }

  async getMe(userId: string) {
  const user = await this.prisma.users.findUnique({
    where: { id: userId },
    select: userPublicSelect
  })

  if (!user) throw new NotFoundException('❌ Utilisateur non trouvé')

  return user
}

  async findAll() {
    return this.prisma.users.findMany({
      select: userPublicSelect
    })
  }

  async findOne(id: string) {
    const user = await this.prisma.users.findUnique({ where: { id }, select: userPublicSelect })
    if (!user) throw new NotFoundException('❌ User not found')
    return user
  }

  async updateMe(userId: string, dto: UpdateProfileDto) {
    return this.prisma.users.update({
      where: { id: userId },
      data: {
        ...dto,
      },
      select: userPublicSelect,
    })
  }
  
  async update(requestingUserId: string, targetUserId: string, dto: UpdateUserDto) {
    if (requestingUserId !== targetUserId) {
      throw new ForbiddenException("❌ Vous n'êtes pas autorisé à modifier ce profil.")
    }

    return this.prisma.users.update({
      where: { id: targetUserId },
      data: { ...dto },
      select: userPublicSelect,
    })
  }

  async remove(id: string) {
    const user = await this.prisma.users.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    await this.prisma.users.delete({ where: { id } });
    return { message: `✅ Utilisateur (${user.email}) supprimé avec succès` };
  }
}
