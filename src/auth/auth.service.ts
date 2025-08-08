import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { LoginDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt'
import { SignupDto } from './dto/signup.dto';

@Injectable()
export class AuthService {
  constructor(
    private jwt: JwtService,
    private prisma: PrismaService, 
  ) {}

  async signup(dto: SignupDto) {
    const existing = await this.prisma.users.findUnique({
      where: { email: dto.email },
    })
    if (existing) throw new ForbiddenException('Email déjà utilisé')

    const hashedPassword = await bcrypt.hash(dto.password, 10)

    const user = await this.prisma.users.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        firstName: dto.firstName,
        lastName: dto.lastName,
      },
    })

    const payload = { sub: user.id, email: user.email }

    return {
      access_token: await this.jwt.signAsync(payload),
    }
  }
  
  async validateUser(email: string, password: string) {
    const user = await this.prisma.users.findUnique({ where: { email } })
    if (!user) throw new UnauthorizedException('Email incorrect')

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) throw new UnauthorizedException('Mot de passe incorrect')

    return user
  }

  async login(dto: LoginDto) {
    const user = await this.validateUser(dto.email, dto.password)

    const payload = {
      sub: user.id,
      email: user.email,
    }

    return {
      access_token: await this.jwt.signAsync(payload),
    }
  }
}

