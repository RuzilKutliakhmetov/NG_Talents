import { describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service.js';
import { PasswordService } from './services/password.service.js';

describe('AuthService', () => {
  const user = {
    id: 'user-id',
    email: 'person@example.com',
    phone: null,
    passwordHash: 'hash',
    firstName: 'First',
    lastName: 'Last',
    middleName: null,
    role: 'CANDIDATE',
    status: 'ACTIVE',
    emailVerifiedAt: null,
    phoneVerifiedAt: null,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('registers a user without exposing passwordHash', async () => {
    const prisma = {
      user: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue(user),
      },
    };
    const passwords = { hash: vi.fn().mockResolvedValue('argon-hash') };
    const service = new AuthService(
      prisma as never,
      passwords as unknown as PasswordService,
      {} as never,
      {} as never,
      {} as never,
    );
    const result = await service.register({
      email: ' Person@Example.com ',
      password: 'password123',
      firstName: ' First ',
      lastName: ' Last ',
    });
    expect(prisma.user.create).toHaveBeenCalled();
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('rejects invalid credentials without revealing which field failed', async () => {
    const prisma = { user: { findUnique: vi.fn().mockResolvedValue(null) } };
    const service = new AuthService(
      prisma as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
    await expect(
      service.login({ email: 'missing@example.com', password: 'bad' }),
    ).rejects.toMatchObject({ response: { code: 'AUTH_INVALID_CREDENTIALS' } });
  });
});
