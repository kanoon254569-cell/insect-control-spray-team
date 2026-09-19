import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { randomBytes, randomUUID, scryptSync } from 'crypto';

function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:5432/insect_control_spray_team?schema=public';
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });

  const username = process.env.SEED_USERNAME || 'admin';
  const password = process.env.SEED_PASSWORD || 'admin1234';
  const role = (process.env.SEED_ROLE as any) || 'user';
  const displayName = process.env.SEED_DISPLAYNAME || 'Administrator';

  const normalized = username.trim().toLowerCase();
  const existing = await prisma.user.findFirst({ where: { username: normalized, role } });
  if (existing) {
    console.log('User already exists, updating password/displayName');
    await prisma.user.update({
      where: { username_role: { username: normalized, role } },
      data: { passwordHash: hashPassword(password), displayName }
    });
    console.log('Updated existing user.');
    await prisma.$disconnect();
    process.exit(0);
  }

  const user = {
    id: randomUUID(),
    username: normalized,
    passwordHash: hashPassword(password),
    role,
    displayName,
    createdAt: new Date().toISOString()
  };

  await prisma.user.create({ data: user });
  console.log('Inserted user', normalized);
  await prisma.$disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
