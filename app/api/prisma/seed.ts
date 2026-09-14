import 'dotenv/config';
import * as argon2 from 'argon2';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, UserRole } from '../src/generated/prisma/client.ts';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });
const password = process.env.SEED_PASSWORD ?? 'ChangeMeOnlyForDevelopment123!';

const users = [
  { email: 'admin@ng-talents.local', role: UserRole.ADMIN },
  { email: 'moderator@ng-talents.local', role: UserRole.MODERATOR },
  { email: 'candidate@ng-talents.local', role: UserRole.CANDIDATE },
  { email: 'employer@ng-talents.local', role: UserRole.EMPLOYER },
];

for (const user of users) {
  await prisma.user.upsert({
    where: { email: user.email },
    update: { role: user.role, status: 'ACTIVE' },
    create: { ...user, passwordHash: await argon2.hash(password, { type: argon2.argon2id }), firstName: user.role, lastName: 'Development' },
  });
}

await prisma.$disconnect();
