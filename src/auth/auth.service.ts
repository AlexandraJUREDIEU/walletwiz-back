import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { VerifyDto } from './dto/verify.dto';
import { LoginDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import { SessionsService } from 'src/sessions/sessions.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly mailService: MailService,
    private readonly jwtService: JwtService,
    private readonly sessionsService: SessionsService,
  ) {}

  async register(dto: RegisterDto) {
    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const verificationCode = Math.floor(
      100000 + Math.random() * 900000,
    ).toString(); // Code 6 chiffres
    const verificationCodeExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const user = await this.usersService.create({
      ...dto,
      password: hashedPassword,
      verificationCode,
      verificationCodeExpiresAt,
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

    if (
      user.verificationCode !== dto.code ||
      !user.verificationCodeExpiresAt ||
      user.verificationCodeExpiresAt < new Date()
    ) {
      throw new UnauthorizedException('Code invalide ou expiré');
    }

    // Mise à jour du user : vérifié + suppression du code
    await this.usersService.update(user.id, {
      emailVerified: true,
      verificationCode: null,
      verificationCodeExpiresAt: null,
    });
    // 🔹 Création de la session par défaut
    await this.sessionsService.create(user.id, user.email, {
      name: 'WalletWiz - Personnel',
    });

    const payload = { sub: user.id, email: user.email };
    const token = await this.jwtService.signAsync(payload);

    return {
      message: 'Email verified successfully',
      accessToken: token,
      user: {
        id: user.id,
        email: user.email,
      },
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
    const sessions = await this.sessionsService.findAllByUser(user.id);
    const payload = { sub: user.id, email: user.email };
    const accessToken = await this.jwtService.signAsync(payload);

    return {
      message: 'Connexion réussie',
      accessToken,
      user: {
        id: user.id,
        email: user.email,
      },
      sessions: sessions.map((session) => ({
        id: session.id,
        name: session.name,
        ownerId: session.ownerId,
        createdAt: session.createdAt,
      })),
    };
  }
}
