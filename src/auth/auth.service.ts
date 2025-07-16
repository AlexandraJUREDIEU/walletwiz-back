import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { VerifyDto } from './dto/verify.dto';
import { LoginDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly mailService: MailService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString(); // Code 6 chiffres

    const user = await this.usersService.create({
      ...dto,
      password: hashedPassword,
      verificationCode,
    });

    await this.mailService.sendVerificationCode(user.email, verificationCode);

    return {
      message: 'Inscription réussie. Veuillez vérifier votre boîte mail.',
    };
  }

  async verify(dto: VerifyDto) {
    const user = await this.usersService.findByEmail(dto.email);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.emailVerified) {
      throw new BadRequestException('User already verified');
    }

    if (user.verificationCode !== dto.code) {
      throw new UnauthorizedException('Invalid verification code');
    }

    // Mise à jour du user : vérifié + suppression du code
    await this.usersService.update(user.id, {
      emailVerified: true,
      verificationCode: null,
    });

    const payload = { sub: user.id, email: user.email };
    const token = await this.jwtService.signAsync(payload);

    return {
      message: 'Email verified successfully',
      accessToken: token,
      user: {
        id: user.id,
        email: user.email
      }
    };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);

    if (!user) {
      throw new UnauthorizedException('Email ou mot de passe invalide');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Email ou mot de passe invalide');
    }

    if (!user.emailVerified) {
      throw new UnauthorizedException('Veuillez vérifier votre adresse email');
    }

    const payload = { sub: user.id, email: user.email };
    const accessToken = await this.jwtService.signAsync(payload);

    return {
      message: 'Connexion réussie',
      accessToken,
      user: {
        id: user.id,
        email: user.email
      }
    };
  }
}