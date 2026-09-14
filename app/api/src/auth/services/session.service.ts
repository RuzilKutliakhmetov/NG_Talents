import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class SessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private hash(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }
  private days() {
    return this.config.getOrThrow<number>('auth.refreshExpiresInDays');
  }

  async create(userId: string, userAgent?: string, ipAddress?: string) {
    const id = randomBytes(16).toString('hex');
    const token = `${id}.${randomBytes(64).toString('base64url')}`;
    const expiresAt = new Date(Date.now() + this.days() * 86400000);
    await this.prisma.session.create({
      data: {
        id: this.uuidFromHex(id),
        userId,
        refreshTokenHash: this.hash(token),
        userAgent,
        ipAddress,
        expiresAt,
      },
    });
    return { token, expiresAt };
  }

  async rotate(token: string) {
    const id = token.split('.')[0];
    if (!/^[a-f0-9]{32}$/.test(id)) return { kind: 'invalid' as const };
    const session = await this.prisma.session.findUnique({
      where: { id: this.uuidFromHex(id) },
      include: { user: true },
    });
    if (!session) return { kind: 'invalid' as const };
    if (session.refreshTokenHash !== this.hash(token)) {
      await this.invalidate(session.id);
      return { kind: 'reused' as const };
    }
    if (session.expiresAt <= new Date()) {
      await this.invalidate(session.id);
      return { kind: 'expired' as const };
    }
    const next = `${id}.${randomBytes(64).toString('base64url')}`;
    const expiresAt = new Date(Date.now() + this.days() * 86400000);
    await this.prisma.session.update({
      where: { id: session.id },
      data: {
        refreshTokenHash: this.hash(next),
        lastUsedAt: new Date(),
        expiresAt,
      },
    });
    return { kind: 'ok' as const, session, token: next, expiresAt };
  }

  invalidate(id: string) {
    return this.prisma.session.deleteMany({ where: { id } });
  }
  invalidateAll(userId: string) {
    return this.prisma.session.deleteMany({ where: { userId } });
  }

  private uuidFromHex(value: string) {
    return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
  }
}
