import 'dotenv/config';
import express from 'express';
import { MongoClient, Db, Collection } from 'mongodb';
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'crypto';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createWorker } from 'tesseract.js';
import {
  INITIAL_PROBLEMS,
  INITIAL_BOOKINGS,
  INITIAL_CONTRACTS,
  INITIAL_JOBS,
  INITIAL_INVOICES,
  INITIAL_PACKAGES
} from './src/data';
import { resolvePortalRole } from './src/auth';
import { extractReceiptMetadata } from './src/payment';
import type {
  Booking,
  Contract,
  Invoice,
  JobStatus,
  PestProblem,
  PestType,
  PortalRole,
  ServicePackage,
  TechnicianJob,
  TeamMember,
  TeamMemberRole,
  Team
} from './src/types';

const app = express();
const port = Number(process.env.PORT ?? 8787);
const host = '0.0.0.0';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SESSION_COOKIE = 'bugguard_session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 8;

function getMongoUri() {
  if (process.env.MONGODB_URI) return process.env.MONGODB_URI;
  if (process.env.DATABASE_URL?.startsWith('mongodb://') || process.env.DATABASE_URL?.startsWith('mongodb+srv://')) {
    return process.env.DATABASE_URL;
  }
  return null;
}

const mongoUri = getMongoUri();
if (!mongoUri && (process.env.RENDER || process.env.NODE_ENV === 'production')) {
  throw new Error(
    'Missing MongoDB configuration. Set MONGODB_URI on Render, for example mongodb+srv://USER:PASSWORD@CLUSTER.mongodb.net/insect_control_spray_team'
  );
}

const mongoClient = new MongoClient(mongoUri ?? 'mongodb://127.0.0.1:27017/insect_control_spray_team');
await mongoClient.connect();
const database: Db = mongoClient.db(process.env.MONGODB_DB || undefined);

app.use(express.json({ limit: '10mb' }));

const DEFAULT_ACCOUNTS: Array<{ username: string; password: string; role: PortalRole; displayName: string }> = [
  { username: 'user', password: '1234', role: 'user', displayName: 'Admin' },
  { username: 'technician', password: '1234', role: 'technician', displayName: 'Technician' },
  { username: 'customer', password: '1234', role: 'customer', displayName: 'Customer' }
];

// Optional single-user config override. If `data/user.json` exists it can contain:
// { "username": "admin", "password": "pass123", "displayName": "Admin", "role": "user", "enforce": true }
const SINGLE_USER_CONFIG_PATH = path.join(__dirname, 'data', 'user.json');
let SINGLE_USER_CONFIG: any = null;
if (existsSync(SINGLE_USER_CONFIG_PATH)) {
  try {
    const raw = readFileSync(SINGLE_USER_CONFIG_PATH, 'utf8');
    SINGLE_USER_CONFIG = JSON.parse(raw);
  } catch (err) {
    console.warn('Failed to parse data/user.json, ignoring single-user config', err);
  }
}

type SessionRow = {
  sessionId: string;
  role: PortalRole;
  username: string;
  displayName: string;
  expiresAt: number;
  teamRole?: TeamMemberRole;
  teamId?: string;
  teamName?: string;
};

type UserRow = {
  id: string;
  username: string;
  passwordHash: string;
  role: PortalRole;
  displayName: string;
  createdAt: string;
};

type JobDocument = TechnicianJob & { createdAt: string };

const users = database.collection<UserRow>('users');
const sessions = database.collection<SessionRow>('sessions');
const teamMembersCollection = database.collection<TeamMember>('teamMembers');
const teamsCollection = database.collection<Team>('teams');
const packagesCollection = database.collection<ServicePackage>('packages');
const problemsCollection = database.collection<PestProblem>('problems');
const bookingsCollection = database.collection<Booking>('bookings');
const contractsCollection = database.collection<Contract>('contracts');
const jobsCollection = database.collection<JobDocument>('jobs');
const invoicesCollection = database.collection<Invoice>('invoices');

async function analyzeReceiptImage(dataUrl: string) {
  if (!dataUrl.startsWith('data:image/')) {
    return { amount: null, payerName: null, transferTime: null, rawText: '' };
  }

  try {
    const worker = await createWorker('eng');
    const { data } = await worker.recognize(dataUrl);
    await worker.terminate();
    const metadata = extractReceiptMetadata(data.text);
    return {
      amount: metadata.amount,
      payerName: metadata.payerName,
      transferTime: metadata.transferTime,
      rawText: data.text
    };
  } catch (error) {
    console.error('Receipt OCR failed', error);
    return { amount: null, payerName: null, transferTime: null, rawText: '' };
  }
}

function serializeCookie(
  name: string,
  value: string,
  options: { maxAge?: number; path?: string; httpOnly?: boolean; sameSite?: 'Lax' | 'Strict' | 'None'; secure?: boolean } = {}
) {
  const segments = [`${name}=${encodeURIComponent(value)}`];
  if (typeof options.maxAge === 'number') segments.push(`Max-Age=${Math.floor(options.maxAge / 1000)}`);
  if (options.path) segments.push(`Path=${options.path}`);
  if (options.httpOnly) segments.push('HttpOnly');
  if (options.sameSite) segments.push(`SameSite=${options.sameSite}`);
  if (options.secure) segments.push('Secure');
  return segments.join('; ');
}

function parseCookies(header = '') {
  return header.split(';').reduce<Record<string, string>>((acc, part) => {
    const [name, ...rest] = part.trim().split('=');
    if (!name) return acc;
    acc[name] = decodeURIComponent(rest.join('='));
    return acc;
  }, {});
}

function isPortalRole(value: unknown): value is PortalRole {
  return value === 'user' || value === 'technician' || value === 'customer';
}

function detectRoleFromUsername(username: string): PortalRole {
  const normalized = username.toLowerCase().trim();
  if (normalized === 'user' || normalized === 'admin') return 'user';
  if (normalized === 'technician') return 'technician';
  if (normalized === 'customer') return 'customer';
  return 'customer'; // default
}

function normalizeUsername(username: unknown) {
  return typeof username === 'string' ? username.trim().toLowerCase() : '';
}

function normalizeDisplayName(displayName: unknown, username: string) {
  return typeof displayName === 'string' && displayName.trim().length > 0 ? displayName.trim() : username;
}

function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, storedHash: string) {
  const [salt, hash] = storedHash.split(':');
  if (!salt || !hash) return false;

  const storedBuffer = Buffer.from(hash, 'hex');
  const candidateBuffer = scryptSync(password, salt, storedBuffer.length);
  return storedBuffer.length === candidateBuffer.length && timingSafeEqual(storedBuffer, candidateBuffer);
}

function makeId(prefix: string, base: number, index: number) {
  return `${prefix}-${base + index + 1}`;
}

function cleanMongo<T>(document: T): T {
  const clone = { ...(document as Record<string, unknown>) };
  delete clone._id;
  return clone as T;
}

async function dbCount(collection: { countDocuments: () => Promise<number> }) {
  return collection.countDocuments();
}

async function createIndexes() {
  await Promise.all([
    users.createIndex({ username: 1, role: 1 }, { unique: true }),
    sessions.createIndex({ sessionId: 1 }, { unique: true }),
    sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    teamMembersCollection.createIndex({ id: 1 }, { unique: true }),
    teamsCollection.createIndex({ id: 1 }, { unique: true }),
    teamsCollection.createIndex({ name: 1 }, { unique: true }),
    packagesCollection.createIndex({ id: 1 }, { unique: true }),
    problemsCollection.createIndex({ id: 1 }, { unique: true }),
    bookingsCollection.createIndex({ id: 1 }, { unique: true }),
    contractsCollection.createIndex({ id: 1 }, { unique: true }),
    jobsCollection.createIndex({ id: 1 }, { unique: true }),
    invoicesCollection.createIndex({ id: 1 }, { unique: true })
  ]);
}

async function getSession(req: express.Request) {
  const authHeader = req.get('authorization');
  let sessionId = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  if (!sessionId) {
    const cookies = parseCookies(req.headers.cookie || '');
    sessionId = cookies[SESSION_COOKIE] || null;
  }

  if (!sessionId) return null;

  const row = await sessions.findOne({ sessionId }, { projection: { _id: 0 } });
  if (!row) return null;

  if (row.expiresAt <= Date.now()) {
    await sessions.deleteOne({ sessionId });
    return null;
  }

  return row;
}

async function requireSession(req: express.Request, res: express.Response) {
  const session = await getSession(req);
  if (!session) {
    res.status(401).json({ message: 'ยังไม่ได้เข้าสู่ระบบ' });
    return null;
  }
  return session;
}

async function createSession(role: PortalRole, username: string, teamRole?: TeamMemberRole, teamId?: string, teamName?: string) {
  const sessionId = randomUUID();
  const user = await users.findOne({ username, role }, { projection: { _id: 0 } });
  const session: SessionRow = {
    sessionId,
    role,
    username,
    displayName: user?.displayName ?? username,
    expiresAt: Date.now() + SESSION_TTL_MS,
    teamRole,
    teamId,
    teamName
  };
  await sessions.insertOne(session);
  return session;
}

async function clearSession(sessionId: string | null) {
  if (!sessionId) return;
  await sessions.deleteOne({ sessionId });
}

async function createUser(username: string, password: string, role: PortalRole, displayName: string) {
  const user: UserRow = {
    id: randomUUID(),
    username,
    passwordHash: hashPassword(password),
    role,
    displayName,
    createdAt: new Date().toISOString()
  };

  await users.insertOne(user);
  return user;
}

async function seedDefaultUsers() {
  // If a single-user config is present, seed only that one account and do not create defaults.
  if (SINGLE_USER_CONFIG && SINGLE_USER_CONFIG.username && SINGLE_USER_CONFIG.password) {
    const username = normalizeUsername(SINGLE_USER_CONFIG.username);
    const role: PortalRole = isPortalRole(SINGLE_USER_CONFIG.role) ? (SINGLE_USER_CONFIG.role as PortalRole) : 'user';
    const displayName = normalizeDisplayName(SINGLE_USER_CONFIG.displayName, username);
    const existing = await users.findOne({ username, role });
    if (!existing) {
      await createUser(username, SINGLE_USER_CONFIG.password, role, displayName);
    }
    return;
  }

  for (const account of DEFAULT_ACCOUNTS) {
    const existing = await users.findOne({ username: account.username, role: account.role });
    if (existing) continue;
    await createUser(account.username, account.password, account.role, account.displayName);
  }
}

async function seedDatabase() {
  await createIndexes();
  await seedDefaultUsers();

  if ((await packagesCollection.countDocuments()) > 0) return;

  await packagesCollection.insertMany(INITIAL_PACKAGES);
  await problemsCollection.insertMany(INITIAL_PROBLEMS);
  await bookingsCollection.insertMany(INITIAL_BOOKINGS);
  await contractsCollection.insertMany(INITIAL_CONTRACTS);
  await jobsCollection.insertMany(
    INITIAL_JOBS.map((job) => ({
      ...job,
      chemicalsUsed: job.chemicalsUsed ?? [],
      createdAt: new Date().toISOString()
    }))
  );
  await invoicesCollection.insertMany(INITIAL_INVOICES);
}

async function getState() {
  const [problems, bookings, contracts, jobs, invoices, packages] = await Promise.all([
    problemsCollection.find({}, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray(),
    bookingsCollection.find({}, { projection: { _id: 0 } }).sort({ id: -1 }).toArray(),
    contractsCollection.find({}, { projection: { _id: 0 } }).sort({ startDate: -1 }).toArray(),
    jobsCollection.find({}, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray(),
    invoicesCollection.find({}, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray(),
    packagesCollection.find({}, { projection: { _id: 0 } }).sort({ id: 1 }).toArray()
  ]);

  return {
    problems,
    bookings,
    contracts,
    jobs: jobs.map((job) => cleanMongo(job)),
    invoices,
    packages
  };
}

async function getSourceRecord(sourceType: 'problem' | 'booking', sourceId: string) {
  if (sourceType === 'problem') {
    return problemsCollection.findOne({ id: sourceId }, { projection: { _id: 0 } });
  }
  return bookingsCollection.findOne({ id: sourceId }, { projection: { _id: 0 } });
}

async function syncJobSourceStatus(job: TechnicianJob, status: JobStatus, updates?: Partial<TechnicianJob>) {
  await jobsCollection.updateOne(
    { id: job.id },
    {
      $set: {
        status,
        ...(updates?.notesByTech ? { notesByTech: updates.notesByTech } : {}),
        ...(updates?.imageReport ? { imageReport: updates.imageReport } : {}),
        ...(updates?.chemicalsUsed ? { chemicalsUsed: updates.chemicalsUsed } : {}),
        ...(updates?.completedAt ? { completedAt: updates.completedAt } : {})
      }
    }
  );

  if (job.sourceType === 'problem') {
    const nextStatus = status === 'ส่งงานแล้ว' ? 'กำลังดำเนินการ' : status === 'เสร็จสิ้นและตรวจรับ' ? 'เสร็จสิ้น' : null;
    if (nextStatus) await problemsCollection.updateOne({ id: job.sourceId }, { $set: { status: nextStatus } });
    return;
  }

  const nextStatus = status === 'ส่งงานแล้ว' ? 'กำลังจัดทีมงาน' : status === 'เสร็จสิ้นและตรวจรับ' ? 'เสร็จสิ้น' : null;
  if (nextStatus) await bookingsCollection.updateOne({ id: job.sourceId }, { $set: { status: nextStatus } });
}

await seedDatabase();

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'insect-control-spray-team-auth', database: 'mongodb' });
});

app.get('/api/me', async (req, res) => {
  const session = await getSession(req);
  if (!session) {
    return res.status(401).json({ message: 'ยังไม่ได้เข้าสู่ระบบ' });
  }

  return res.json({
    token: session.sessionId,
    role: session.role,
    username: session.username,
    displayName: session.displayName,
    teamRole: session.teamRole,
    teamId: session.teamId,
    teamName: session.teamName
  });
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body ?? {};
  if (!username || !password) {
    return res.status(400).json({ message: 'กรุณากรอกข้อมูลเข้าสู่ระบบให้ครบถ้วน' });
  }

  const normalizedUsername = normalizeUsername(username);
  
  // First check if user is a team member
  const teamMember = await teamMembersCollection.findOne({ username: normalizedUsername }, { projection: { _id: 0 } });
  if (teamMember && teamMember.status === 'active' && teamMember.passwordHash) {
    if (typeof password !== 'string' || !verifyPassword(password, teamMember.passwordHash)) {
      return res.status(401).json({ message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
    }
    
    // Create session for team member and preserve their team role and team assignment
    const role = resolvePortalRole(teamMember.role);
    const session = await createSession(role, normalizedUsername, teamMember.role, teamMember.teamId, teamMember.teamName);
    res.setHeader(
      'Set-Cookie',
      serializeCookie(SESSION_COOKIE, session.sessionId, {
        httpOnly: true,
        sameSite: 'Lax',
        path: '/',
        maxAge: SESSION_TTL_MS
      })
    );
    
    return res.json({
      token: session.sessionId,
      role: session.role,
      username: session.username,
      displayName: session.displayName,
      teamRole: session.teamRole,
      teamId: session.teamId,
      teamName: session.teamName
    });
  }

  // Then check regular users
  const role = detectRoleFromUsername(normalizedUsername);
  const user = await users.findOne({ username: normalizedUsername, role }, { projection: { _id: 0 } });
  if (!user || typeof password !== 'string' || !verifyPassword(password, user.passwordHash)) {
    return res.status(401).json({ message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
  }

  const session = await createSession(role, normalizedUsername);
  res.setHeader(
    'Set-Cookie',
    serializeCookie(SESSION_COOKIE, session.sessionId, {
      httpOnly: true,
      sameSite: 'Lax',
      path: '/',
      maxAge: SESSION_TTL_MS
    })
  );

  return res.json({
    token: session.sessionId,
    role: session.role,
    username: session.username,
    displayName: session.displayName
  });
});

app.post('/api/register', async (req, res) => {
  const { username, password, displayName } = req.body ?? {};
  const normalizedUsername = normalizeUsername(username);
  const role = detectRoleFromUsername(normalizedUsername);

  if (!normalizedUsername || typeof password !== 'string' || !password) {
    return res.status(400).json({ message: 'กรุณากรอกข้อมูลสมัครบัญชีให้ครบถ้วน' });
  }

  if (normalizedUsername.length < 3) {
    return res.status(400).json({ message: 'Username ต้องมีอย่างน้อย 3 ตัวอักษร' });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' });
  }
  // If a single-user config is present and enforces a single account, disable registration.
  if (SINGLE_USER_CONFIG && SINGLE_USER_CONFIG.enforce) {
    return res.status(403).json({ message: 'การสมัครบัญชีถูกปิดสำหรับระบบนี้' });
  }

  const existing = await users.findOne({ username: normalizedUsername, role });
  if (existing) {
    return res.status(409).json({ message: 'มีบัญชีนี้ในระบบแล้ว' });
  }

  const user = await createUser(normalizedUsername, password, role, normalizeDisplayName(displayName, normalizedUsername));
  const session = await createSession(user.role, user.username);
  res.setHeader(
    'Set-Cookie',
    serializeCookie(SESSION_COOKIE, session.sessionId, {
      httpOnly: true,
      sameSite: 'Lax',
      path: '/',
      maxAge: SESSION_TTL_MS
    })
  );

  return res.status(201).json({
    token: session.sessionId,
    role: session.role,
    username: session.username,
    displayName: session.displayName
  });
});

// Expose minimal config to the frontend so UI can hide registration when disabled
app.get('/api/config', async (_req, res) => {
  return res.json({ registrationDisabled: Boolean(SINGLE_USER_CONFIG && SINGLE_USER_CONFIG.enforce) });
});

app.post('/api/logout', async (req, res) => {
  const sessionId = (() => {
    const authHeader = req.get('authorization');
    if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7).trim();
    const cookies = parseCookies(req.headers.cookie || '');
    return cookies[SESSION_COOKIE] || null;
  })();

  await clearSession(sessionId);
  res.setHeader(
    'Set-Cookie',
    serializeCookie(SESSION_COOKIE, '', {
      httpOnly: true,
      sameSite: 'Lax',
      path: '/',
      maxAge: 0
    })
  );

  return res.json({ ok: true });
});

app.get('/api/state', async (req, res) => {
  const session = await requireSession(req, res);
  if (!session) return;

  const state = await getState();

  if (session.teamRole === 'team_member' || session.teamRole === 'team_lead') {
    const filteredJobs = state.jobs.filter((job) => job.assignedTeam === session.teamName);
    return res.json({
      problems: state.problems,
      bookings: state.bookings,
      contracts: state.contracts,
      jobs: filteredJobs,
      invoices: state.invoices,
      packages: state.packages
    });
  }

  return res.json(state);
});

app.post('/api/problems', async (req, res) => {
  if (!(await requireSession(req, res))) return;
  const { customerName, customerPhone, address, pestType, description, urgency } = req.body ?? {};

  if (!customerName || !customerPhone || !address || !pestType || !description || !urgency) {
    return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
  }

  const entry: PestProblem = {
    id: makeId('prob', 100, await dbCount(problemsCollection)),
    customerName,
    customerPhone,
    address,
    pestType,
    description,
    urgency,
    createdAt: new Date().toISOString(),
    status: 'รอดำเนินการ'
  };

  await problemsCollection.insertOne(entry);

  return res.json({ ok: true, problem: entry });
});

app.post('/api/bookings', async (req, res) => {
  if (!(await requireSession(req, res))) return;
  const { packageId, packageName, customerName, customerPhone, address, bookingDate, price } = req.body ?? {};

  if (!packageId || !packageName || !customerName || !customerPhone || !address || !bookingDate || typeof price !== 'number') {
    return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
  }

  const bookingCount = await dbCount(bookingsCollection);
  const invoiceCount = await dbCount(invoicesCollection);
  const booking: Booking = {
    id: makeId('book', 200, bookingCount),
    packageId,
    packageName,
    customerName,
    customerPhone,
    address,
    bookingDate,
    price,
    status: 'รอชำระเงิน',
    invoiceNo: `INV-2026-00${invoiceCount + 1}`
  };

  const invoice: Invoice = {
    id: makeId('inv', 400, invoiceCount),
    invoiceNo: booking.invoiceNo!,
    customerName,
    customerPhone,
    address,
    description: `ชำระค่าซื้อบริการแพ็กเกจ ${packageName}`,
    amount: price,
    vat: Math.round(price * 0.07),
    totalAmount: Math.round(price * 1.07),
    status: 'ค้างชำระ',
    dueDate: bookingDate,
    createdAt: new Date().toISOString().split('T')[0]
  };

  await bookingsCollection.insertOne(booking);
  await invoicesCollection.insertOne(invoice);

  return res.json({ ok: true, booking, invoice });
});

app.post('/api/receipts/ocr', async (req, res) => {
  const { dataUrl } = req.body ?? {};

  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
    return res.status(400).json({ message: 'กรุณาอัปโหลดภาพสลิปก่อน' });
  }

  const metadata = await analyzeReceiptImage(dataUrl);
  return res.json({ ok: true, metadata });
});

app.post('/api/invoices/:invoiceId/receipt', async (req, res) => {
  if (!(await requireSession(req, res))) return;

  const { invoiceId } = req.params;
  const { amount, payerName, transferTime, receiptDataUrl } = req.body ?? {};
  const numericAmount = Number(amount);

  if (!invoiceId || !payerName || !transferTime || !receiptDataUrl || Number.isNaN(numericAmount)) {
    return res.status(400).json({ message: 'กรุณากรอกข้อมูลสลิปให้ครบถ้วน' });
  }

  const invoice = await invoicesCollection.findOne({ id: invoiceId }, { projection: { _id: 0 } });
  if (!invoice) {
    return res.status(404).json({ message: 'ไม่พบใบแจ้งหนี้นี้' });
  }

  const amountMatches = Math.abs(numericAmount - invoice.totalAmount) <= 50;
  if (!amountMatches) {
    return res.status(400).json({ message: 'จำนวนเงินในสลิปไม่ตรงกับใบแจ้งหนี้' });
  }

  await invoicesCollection.updateOne(
    { id: invoiceId },
    {
      $set: {
        status: 'ชำระเงินแล้ว',
        receiptDataUrl,
        payerName,
        transferTime,
        paymentVerifiedAt: new Date().toISOString(),
        paymentReference: `OCR-${Date.now()}`
      }
    }
  );

  return res.json({ ok: true, message: 'สลิปตรวจสอบแล้วและสถานะชำระเงินอัปเดตเป็น Paid แล้ว' });
});

app.post('/api/jobs/assign', async (req, res) => {
  if (!(await requireSession(req, res))) return;
  const { sourceId, sourceType, teamName, date, title, desc } = req.body ?? {};
  if (!sourceId || !sourceType || !teamName || !date || !title || !desc) {
    return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
  }

  const source = await getSourceRecord(sourceType, sourceId);
  if (!source) {
    return res.status(404).json({ message: 'ไม่พบรายการต้นทาง' });
  }

  const job: JobDocument = {
    id: makeId('job', 500, await dbCount(jobsCollection)),
    sourceId,
    sourceType,
    title,
    description: desc,
    customerName: source.customerName,
    customerPhone: source.customerPhone,
    address: source.address,
    appointmentDate: date,
    assignedTeam: teamName,
    status: 'กำลังเตรียมตัว',
    chemicalsUsed: [],
    createdAt: new Date().toISOString()
  };

  await jobsCollection.insertOne(job);

  if (sourceType === 'problem') {
    await problemsCollection.updateOne(
      { id: sourceId },
      { $set: { status: 'จัดสรรคิวช่างแล้ว', assignedTeam: teamName, appointmentDate: date } }
    );
  } else {
    await bookingsCollection.updateOne({ id: sourceId }, { $set: { status: 'กำลังจัดทีมงาน' } });
  }

  return res.json({ ok: true, job: cleanMongo(job) });
});

app.patch('/api/jobs/:jobId/status', async (req, res) => {
  const session = await requireSession(req, res);
  if (!session) return;
  if (session.teamRole === 'team_member') {
    return res.status(403).json({ message: 'สมาชิกทีมยังไม่สามารถส่งงานได้' });
  }

  const { jobId } = req.params;
  const { status, updates } = req.body ?? {};
  if (!status) {
    return res.status(400).json({ message: 'กรุณาระบุสถานะงาน' });
  }

  const job = await jobsCollection.findOne({ id: jobId }, { projection: { _id: 0 } });
  if (!job) {
    return res.status(404).json({ message: 'ไม่พบงานช่าง' });
  }

  await syncJobSourceStatus(job, status as JobStatus, updates);

  return res.json({ ok: true, job: await jobsCollection.findOne({ id: jobId }, { projection: { _id: 0 } }) });
});

app.post('/api/jobs/:jobId/approve', async (req, res) => {
  if (!(await requireSession(req, res))) return;
  const { jobId } = req.params;
  const job = await jobsCollection.findOne({ id: jobId }, { projection: { _id: 0 } });
  if (!job) {
    return res.status(404).json({ message: 'ไม่พบงานช่าง' });
  }

  const contractCount = await dbCount(contractsCollection);
  const contract: Contract = {
    id: makeId('cont', 300, contractCount),
    customerName: job.customerName,
    customerPhone: job.customerPhone,
    address: job.address,
    packageName: job.title.includes('พ่นเคมี')
      ? 'สัญญาฉีดพ่นเคมีป้องกันใต้ดิน (Soil Treatment)'
      : 'สัญญาบริการป้องกันกำจัดแมลงและปลวกระบบเหยื่อ Nemesis (1 ปี)',
    startDate: new Date().toISOString().split('T')[0],
    endDate: (() => {
      const nextYear = new Date();
      nextYear.setFullYear(nextYear.getFullYear() + 1);
      return nextYear.toISOString().split('T')[0];
    })(),
    totalVisits: job.title.includes('พ่นเคมี') ? 2 : 12,
    completedVisits: 1,
    nextVisitDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    price: job.title.includes('พ่นเคมี') ? 8500 : 15000,
    status: 'เปิดใช้งาน',
    documentNo: `CONT-2026-${300 + contractCount + 1}`
  };

  await jobsCollection.updateOne({ id: jobId }, { $set: { status: 'เสร็จสิ้นและตรวจรับ' } });
  if (job.sourceType === 'problem') {
    await problemsCollection.updateOne({ id: job.sourceId }, { $set: { status: 'เสร็จสิ้น' } });
  } else {
    await bookingsCollection.updateOne({ id: job.sourceId }, { $set: { status: 'เสร็จสิ้น' } });
  }
  await contractsCollection.insertOne(contract);

  return res.json({ ok: true, contract });
});

app.post('/api/invoices', async (req, res) => {
  if (!(await requireSession(req, res))) return;
  const { customerName, customerPhone, address, description, amount, vat, totalAmount, status, dueDate } = req.body ?? {};
  if (
    !customerName ||
    !customerPhone ||
    !address ||
    !description ||
    typeof amount !== 'number' ||
    typeof vat !== 'number' ||
    typeof totalAmount !== 'number' ||
    !status ||
    !dueDate
  ) {
    return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
  }

  const invoiceCount = await dbCount(invoicesCollection);
  const invoice: Invoice = {
    id: makeId('inv', 400, invoiceCount),
    invoiceNo: `INV-2026-00${invoiceCount + 1}`,
    customerName,
    customerPhone,
    address,
    description,
    amount,
    vat,
    totalAmount,
    status,
    dueDate,
    createdAt: new Date().toISOString().split('T')[0]
  };

  await invoicesCollection.insertOne(invoice);

  return res.json({ ok: true, invoice });
});

app.patch('/api/invoices/:invoiceId/status', async (req, res) => {
  if (!(await requireSession(req, res))) return;
  const { invoiceId } = req.params;
  const { status } = req.body ?? {};
  if (!status) {
    return res.status(400).json({ message: 'กรุณาระบุสถานะใบแจ้งหนี้' });
  }

  await invoicesCollection.updateOne({ id: invoiceId }, { $set: { status } });

  return res.json({ ok: true });
});

// Team Members Management APIs
app.get('/api/team-members', async (req, res) => {
  const session = await requireSession(req, res);
  if (!session) return;

  const query: Record<string, unknown> = {};
  if (session.teamRole === 'team_member' || session.teamRole === 'team_lead') {
    if (session.teamId) {
      query.teamId = session.teamId;
    } else {
      // If team member exists without a team, return empty list
      return res.json({ members: [] });
    }
  }

  const members = await teamMembersCollection.find(query, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray();
  return res.json({ members });
});

app.get('/api/teams', async (req, res) => {
  const session = await requireSession(req, res);
  if (!session) return;

  const query: Record<string, unknown> = {};
  if (session.teamRole === 'team_member' || session.teamRole === 'team_lead') {
    if (session.teamId) {
      query.id = session.teamId;
    } else {
      return res.json({ teams: [] });
    }
  }

  const teams = await teamsCollection.find(query, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray();
  return res.json({ teams });
});

app.post('/api/teams', async (req, res) => {
  if (!(await requireSession(req, res))) return;
  const { name, description } = req.body ?? {};

  if (!name) {
    return res.status(400).json({ message: 'กรุณากรอกชื่อทีม' });
  }

  const existing = await teamsCollection.findOne({ name });
  if (existing) {
    return res.status(409).json({ message: 'มีทีมชื่อเดียวกันแล้ว' });
  }

  const teamCount = await dbCount(teamsCollection);
  const team: Team = {
    id: makeId('team', 100, teamCount),
    name,
    description,
    createdAt: new Date().toISOString()
  };

  await teamsCollection.insertOne(team);
  return res.status(201).json({ team });
});

app.patch('/api/teams/:teamId', async (req, res) => {
  if (!(await requireSession(req, res))) return;
  const { teamId } = req.params;
  const { name, description } = req.body ?? {};

  if (!name && !description) {
    return res.status(400).json({ message: 'ไม่มีข้อมูลที่จะอัปเดต' });
  }

  if (name) {
    const existing = await teamsCollection.findOne({ name, id: { $ne: teamId } });
    if (existing) {
      return res.status(409).json({ message: 'มีทีมชื่อเดียวกันแล้ว' });
    }
  }

  await teamsCollection.updateOne({ id: teamId }, { $set: { ...(name ? { name } : {}), ...(description ? { description } : {}) } });
  return res.json({ ok: true });
});

app.post('/api/team-members', async (req, res) => {
  if (!(await requireSession(req, res))) return;
  const { name, phone, email, username, password, role, status, teamId, teamName } = req.body ?? {};

  if (!name || !phone || !email || !username || !password || !role || !teamId || !teamName) {
    return res.status(400).json({ message: 'กรุณากรอกข้อมูลทั้งหมด' });
  }

  if (role !== 'team_lead' && role !== 'team_member') {
    return res.status(400).json({ message: 'บทบาทไม่ถูกต้อง' });
  }

  if (username.length < 3) {
    return res.status(400).json({ message: 'Username ต้องมีอย่างน้อย 3 ตัวอักษร' });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' });
  }

  // Check if username already exists
  const existing = await teamMembersCollection.findOne({ username: username.toLowerCase() });
  if (existing) {
    return res.status(409).json({ message: 'Username นี้ถูกใช้งานแล้ว' });
  }

  const membersCount = await dbCount(teamMembersCollection);
  const member: TeamMember = {
    id: makeId('tm', 1000, membersCount),
    name,
    phone,
    email,
    username: username.toLowerCase(),
    passwordHash: hashPassword(password),
    role,
    teamId,
    teamName,
    createdAt: new Date().toISOString(),
    status: 'active'
  };

  await teamMembersCollection.insertOne(member);
  return res.status(201).json({ member });
});

app.patch('/api/team-members/:memberId', async (req, res) => {
  if (!(await requireSession(req, res))) return;
  const { memberId } = req.params;
  const { name, phone, email, password, role, status, teamId, teamName } = req.body ?? {};

  const updateData: Record<string, unknown> = {};
  if (name) updateData.name = name;
  if (phone) updateData.phone = phone;
  if (email) updateData.email = email;
  if (teamId) updateData.teamId = teamId;
  if (teamName) updateData.teamName = teamName;
  if (password) {
    if (password.length < 6) {
      return res.status(400).json({ message: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' });
    }
    updateData.passwordHash = hashPassword(password);
  }
  if (role && (role === 'team_lead' || role === 'team_member')) updateData.role = role;
  if (status && (status === 'active' || status === 'inactive')) updateData.status = status;

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ message: 'ไม่มีข้อมูลที่จะอัปเดต' });
  }

  await teamMembersCollection.updateOne({ id: memberId }, { $set: updateData });
  return res.json({ ok: true });
});

app.delete('/api/team-members/:memberId', async (req, res) => {
  if (!(await requireSession(req, res))) return;
  const { memberId } = req.params;

  await teamMembersCollection.deleteOne({ id: memberId });
  return res.json({ ok: true });
});

// Contract Management Endpoints
app.patch('/api/contracts/:contractId', async (req, res) => {
  if (!(await requireSession(req, res))) return;
  const { contractId } = req.params;
  const updates = req.body ?? {};

  await contractsCollection.updateOne({ id: contractId }, { $set: updates });
  return res.json({ ok: true });
});

app.delete('/api/contracts/:contractId', async (req, res) => {
  if (!(await requireSession(req, res))) return;
  const { contractId } = req.params;

  await contractsCollection.deleteOne({ id: contractId });
  return res.json({ ok: true });
});

app.post('/api/reload', async (req, res) => {
  if (!(await requireSession(req, res))) return;
  return res.json(await getState());
});

if (existsSync(path.join(__dirname, 'dist', 'index.html'))) {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get(/^\/(?!api).*/, (_req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

app.listen(port, host, () => {
  console.log(`Auth API listening on http://${host}:${port}`);
});
