import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSessionMemberDto } from './dto/create-session-member.dto';
import { v4 as uuidv4 } from 'uuid';
import { MailService } from '../mail/mail.service';
import { MemberRole, InvitationStatus } from '@prisma/client';

@Injectable()
export class SessionMembersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  async invite(sessionId: string, ownerId: string, dto: CreateSessionMemberDto) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        members: true,
        owner: true, // pour vérifier si l'utilisateur est bien le propriétaire
      },
    });

    if (!session) throw new NotFoundException('Session not found');

    const isOwner = session.ownerId === ownerId;
    if (!isOwner) throw new ForbiddenException('Only session owner can invite');

    const alreadyInvited = session.members.find(
      (m) => m.invitedEmail === dto.email,
    );
    if (alreadyInvited) throw new BadRequestException('This email is already invited');

    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    const inviteToken = uuidv4();

    await this.prisma.sessionMember.create({
      data: {
        sessionId,
        userId: existingUser?.id ?? null,
        role: dto.role,
        invitationStatus: InvitationStatus.PENDING,
        invitedEmail: dto.email,
        inviteToken,
      },
    });

    const acceptUrl = `https://wallet-wiz.alexandrajuredieu.fr/invite?token=${inviteToken}`;
    await this.mailService.sendInvitationEmail({
      to: dto.email,
      invitedBy: `${session.owner.firstName} ${session.owner.lastName}`,
      link: acceptUrl,
    });

    return { message: 'Invitation sent', email: dto.email };
  }
}