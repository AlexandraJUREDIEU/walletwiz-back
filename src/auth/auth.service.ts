import { Injectable, ConflictException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(private usersService: UsersService) {}

  async register(dto: RegisterDto) {
    const userExists = await this.usersService.findByEmail(dto.email);
    if (userExists) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString(); // exemple : 6 chiffres

    const newUser = await this.usersService.create({
      email: dto.email,
      password: hashedPassword,
      verificationCode,
    });

    // TODO : envoyer email avec le code (prochaine étape)

    return {
      message: 'User created. Please check your email to verify your account.',
    };
  }
}