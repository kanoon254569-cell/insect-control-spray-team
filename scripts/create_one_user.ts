import 'dotenv/config';
import { MongoClient } from 'mongodb';
import { randomBytes, randomUUID, scryptSync } from 'crypto';

function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

async function main() {
  const mongoUri = process.env.MONGODB_URI || process.env.DATABASE_URL || 'mongodb://127.0.0.1:27017/insect_control_spray_team';
  const client = new MongoClient(mongoUri);
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || undefined);
  const users = db.collection('users');

  const username = process.env.SEED_USERNAME || 'admin';
  const password = process.env.SEED_PASSWORD || 'admin1234';
  const role = (process.env.SEED_ROLE as any) || 'user';
  const displayName = process.env.SEED_DISPLAYNAME || 'Administrator';

  const normalized = username.trim().toLowerCase();
  const existing = await users.findOne({ username: normalized, role });
  if (existing) {
    console.log('User already exists, updating password/displayName');
    await users.updateOne({ username: normalized, role }, { $set: { passwordHash: hashPassword(password), displayName } });
    console.log('Updated existing user.');
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

  await users.insertOne(user);
  console.log('Inserted user', normalized);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
