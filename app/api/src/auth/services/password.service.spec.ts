import { describe, expect, it } from 'vitest';
import { PasswordService } from './password.service.js';

describe('PasswordService', () => {
  const service = new PasswordService();

  it('hashes and verifies a password with Argon2id', async () => {
    const hash = await service.hash('correct-password');
    expect(hash).not.toContain('correct-password');
    expect(await service.verify(hash, 'correct-password')).toBe(true);
  });

  it('rejects a wrong password', async () => {
    const hash = await service.hash('correct-password');
    expect(await service.verify(hash, 'wrong-password')).toBe(false);
  });
});
