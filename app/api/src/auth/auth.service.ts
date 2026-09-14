import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserRole, UserStatus } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { PasswordService } from './services/password.service.js';
import { SessionService } from './services/session.service.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly password: PasswordService,
    private readonly sessions: SessionService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    const phone = dto.phone?.trim() || undefined;
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email }, ...(phone ? [{ phone }] : [])] },
    });
    if (existing)
      throw new ConflictException({
        code: 'USER_ALREADY_EXISTS',
        message: 'User already exists',
      });
    const user = await this.prisma.user.create({
      data: {
        email,
        phone,
        passwordHash: await this.password.hash(dto.password),
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        middleName: dto.middleName?.trim(),
      },
    });
    return this.publicUser(user);
  }

  async login(dto: LoginDto, userAgent?: string, ipAddress?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.trim().toLowerCase() },
    });
    if (
      !user ||
      user.status !== UserStatus.ACTIVE ||
      !(await this.password.verify(user.passwordHash, dto.password))
    ) {
      throw new UnauthorizedException({
        code: 'AUTH_INVALID_CREDENTIALS',
        message: 'Invalid credentials',
      });
    }
    const session = await this.sessions.create(user.id, userAgent, ipAddress);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    return {
      accessToken: await this.accessToken(user.id, user.role),
      refreshToken: session.token,
      refreshExpiresAt: session.expiresAt,
    };
  }

  async refresh(token: string) {
    const result = await this.sessions.rotate(token);
    if (result.kind === 'reused')
      throw new UnauthorizedException({
        code: 'AUTH_SESSION_REUSED',
        message: 'Session reused',
      });
    if (result.kind === 'expired')
      throw new UnauthorizedException({
        code: 'AUTH_SESSION_EXPIRED',
        message: 'Session expired',
      });
    if (
      result.kind !== 'ok' ||
      result.session.user.status !== UserStatus.ACTIVE
    )
      throw new UnauthorizedException({
        code: 'AUTH_INVALID_REFRESH_TOKEN',
        message: 'Invalid refresh token',
      });
    return {
      accessToken: await this.accessToken(
        result.session.user.id,
        result.session.user.role,
      ),
      refreshToken: result.token,
      refreshExpiresAt: result.expiresAt,
    };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.status !== UserStatus.ACTIVE)
      throw new UnauthorizedException({
        code: 'AUTH_UNAUTHORIZED',
        message: 'Unauthorized',
      });
    return this.publicUser(user);
  }

  async logout(userId: string, token?: string) {
    if (token) {
      const result = await this.sessions.rotate(token);
      if (result.kind === 'ok')
        await this.sessions.invalidate(result.session.id);
    }
    return { success: true };
  }

  logoutAll(userId: string) {
    return this.sessions.invalidateAll(userId).then(() => ({ success: true }));
  }

  private accessToken(userId: string, role: UserRole) {
    return this.jwt.signAsync(
      { sub: userId, role },
      {
        expiresIn: this.config.getOrThrow<string>('jwt.accessExpiresIn') as any,
      },
    );
  }

  private publicUser(user: { passwordHash: string; [key: string]: unknown }) {
    const { passwordHash: _passwordHash, ...safeUser } = user;
    return safeUser;
  }
}
