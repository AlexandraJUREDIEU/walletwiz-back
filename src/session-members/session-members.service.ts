import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
  // * Methode pour récupérer les membres d'une session
  async getMembersBySession(sessionId: string, userId: string) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        members: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!session) throw new NotFoundException('Session not found');
    if (!session.members) throw new NotFoundException('No members found for this session');
    if (session.ownerId !== userId) throw new ForbiddenException('You are not the owner of this session');

    const isMember = session.members.some((m) => m.userId === userId);
    if (!isMember) throw new ForbiddenException('You are not a member of this session');

    return session.members.map((member) => ({
      id: member.id,
      email: member.invitedEmail ?? member.user?.email ?? '',
      firstName: member.user?.firstName,
      lastName: member.user?.lastName,
      role: member.role,
      status: member.invitationStatus,
    }));
  }

  // * Methode pour inviter un membre à une session
  async invite(
    sessionId: string,
    ownerId: string,
    dto: CreateSessionMemberDto,
  ) {
    console.log("Tentative d'invitation par userId :", ownerId);
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        members: true,
        owner: true, // pour vérifier si l'utilisateur est bien le propriétaire
      },
    });

    if (!session) throw new NotFoundException('Session not found');

    const isOwner = session.ownerId === ownerId;
    console.log({
      fromToken: ownerId,
      fromSession: session.ownerId,
      equal: ownerId === session.ownerId,
    });
    if (!isOwner) throw new ForbiddenException('Only session owner can invite');

    const alreadyInvited = session.members.find(
      (m) => m.invitedEmail === dto.email,
    );
    if (alreadyInvited)
      throw new BadRequestException('This email is already invited');

    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    const inviteToken = uuidv4();

    await this.prisma.sessionMember.create({
      data: {
        sessionId,
        userId: existingUser?.id ?? null,
        role: dto.role ?? MemberRole.ADULT,
        invitationStatus: InvitationStatus.PENDING,
        invitedEmail: dto.email,
        inviteToken,
      },
    });

    const acceptUrl =
      process.env.NODE_ENV === 'production'
        ? `https://wallet-wiz.alexandrajuredieu.fr/verify-invite?token=${inviteToken}`
        : `http://localhost:5173/verify-invite?token=${inviteToken}`;

    const declinedUrl =
      process.env.NODE_ENV === 'production'
        ? `https://wallet-wiz.alexandrajuredieu.fr/invite-declined?token=${inviteToken}`
        : `http://localhost:5173/invite-declined?token=${inviteToken}`;

    console.log('Invitation accept URL:', acceptUrl);
    console.log('Invitation declined URL:', declinedUrl);
    
    await this.mailService.sendInvitationEmail({
      to: dto.email,
      invitedBy:
        session.owner.firstName || session.owner.lastName
          ? `${session.owner.firstName ?? ''} ${session.owner.lastName ?? ''}`.trim()
          : session.owner.email,
      link: acceptUrl,
      declinedLink: declinedUrl,
    });

    return { message: 'Invitation sent', email: dto.email };
  }

  // * Methode pour récupérer une invitation par son token
  async getInvitationByToken(token: string) {
    const invitation = await this.prisma.sessionMember.findUnique({
      where: { inviteToken: token },
      include: {
        session: true,
      },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found or expired');
    }

    return {
      invitedEmail: invitation.invitedEmail,
      role: invitation.role,
      sessionId: invitation.session.id,
      sessionName: invitation.session.name,
      invitationStatus: invitation.invitationStatus,
    };
  }

  // * Methode pour accepter une invitation
  async acceptInvitationByToken(token: string, userId: string) {
  const invitation = await this.prisma.sessionMember.findUnique({
    where: { inviteToken: token },
  });

  if (!invitation) {
    throw new NotFoundException('Invitation not found or expired');
  }

  if (invitation.invitationStatus === 'ACCEPTED') {
    throw new BadRequestException('Invitation already accepted');
  }

  if (invitation.userId && invitation.userId !== userId) {
    throw new ForbiddenException('This invitation is not for your account');
  }

    // Mise à jour de l'invitation
    await this.prisma.sessionMember.update({
      where: { inviteToken: token },
      data: {
        userId,
        invitationStatus: 'ACCEPTED',
        acceptedAt: new Date(),
      },
    });

    return {
      message: 'Invitation accepted',
      sessionId: invitation.sessionId,
    };
  }

  // * Methode pour refuser une invitation
  async refuseInvitationByToken(token: string, userId?: string) {
    const invitation = await this.prisma.sessionMember.findUnique({
      where: { inviteToken: token },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found or expired');
    }

    if (invitation.invitationStatus === 'ACCEPTED') {
      throw new BadRequestException('Invitation already accepted');
    }

    if (invitation.invitationStatus === 'DECLINED') {
      throw new BadRequestException('Invitation already declined');
    }

    if (invitation.userId && invitation.userId !== userId) {
      throw new ForbiddenException('This invitation is not for your account');
    }

    await this.prisma.sessionMember.update({
      where: { inviteToken: token },
      data: {
        userId,
        invitationStatus: 'DECLINED',
      },
    });

    return {
      message: 'Invitation declined',
      sessionId: invitation.sessionId,
    };
  }
}
