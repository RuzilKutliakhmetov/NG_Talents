import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { Public } from '../common/decorators/public.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { RateLimitGuard } from '../common/guards/rate-limit.guard.js';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Post('register')
  @UseGuards(RateLimitGuard)
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Public()
  @Post('login')
  @UseGuards(RateLimitGuard)
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.login(
      dto,
      req.headers['user-agent'],
      req.ip,
    );
    this.setRefreshCookie(res, result.refreshToken, result.refreshExpiresAt);
    return { accessToken: result.accessToken };
  }

  @Public()
  @Post('refresh')
  @UseGuards(RateLimitGuard)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = req.cookies?.[this.cookieName()];
    const result = await this.auth.refresh(token ?? '');
    this.setRefreshCookie(res, result.refreshToken, result.refreshExpiresAt);
    return { accessToken: result.accessToken };
  }

  @Post('logout')
  async logout(
    @CurrentUser() user: { sub: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.auth.logout(user.sub, req.cookies?.[this.cookieName()]);
    res.clearCookie(this.cookieName(), this.cookieOptions());
    return { success: true };
  }

  @Post('logout-all')
  logoutAll(
    @CurrentUser() user: { sub: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    res.clearCookie(this.cookieName(), this.cookieOptions());
    return this.auth.logoutAll(user.sub);
  }

  @Get('me')
  me(@CurrentUser() user: { sub: string }) {
    return this.auth.me(user.sub);
  }

  private cookieName() {
    return this.config.getOrThrow<string>('auth.refreshCookieName');
  }
  private cookieOptions() {
    return {
      httpOnly: true,
      secure: this.config.get<string>('nodeEnv') === 'production',
      sameSite: 'lax' as const,
      path: '/api/v1/auth',
    };
  }
  private setRefreshCookie(res: Response, token: string, expiresAt: Date) {
    res.cookie(this.cookieName(), token, {
      ...this.cookieOptions(),
      expires: expiresAt,
    });
  }
}
