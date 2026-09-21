import { describe, expect, it, vi } from 'vitest';
import { EmployerMemberRole } from '../generated/prisma/client.js';
import { EmployerService } from './employer.service.js';

describe('EmployerService', () => {
  it('rejects removal of the last owner', async () => {
    const prisma = {
      employerMember: {
        findUnique: vi
          .fn()
          .mockResolvedValue({ memberRole: EmployerMemberRole.OWNER }),
        findFirst: vi.fn().mockResolvedValue({
          id: 'member-id',
          memberRole: EmployerMemberRole.OWNER,
        }),
        count: vi.fn().mockResolvedValue(0),
      },
    };
    const service = new EmployerService(prisma as never);
    await expect(
      service.removeMember('owner-id', 'EMPLOYER', 'employer-id', 'member-id'),
    ).rejects.toMatchObject({ response: { code: 'EMPLOYER_LAST_OWNER' } });
  });

  it('allows an HR member to be read but not manage members', async () => {
    const prisma = {
      employerMember: {
        findUnique: vi
          .fn()
          .mockResolvedValue({ memberRole: EmployerMemberRole.HR }),
      },
    };
    const service = new EmployerService(prisma as never);
    await expect(
      service.addMember('hr-id', 'EMPLOYER', 'employer-id', {
        userId: 'new-user',
        role: EmployerMemberRole.HR,
      }),
    ).rejects.toMatchObject({ response: { code: 'EMPLOYER_ACCESS_DENIED' } });
  });
});
