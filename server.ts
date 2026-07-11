import 'dotenv/config';
import express from 'express';
import mysql, { Pool, PoolConnection } from 'mysql2/promise';
import { randomUUID } from 'crypto';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  INITIAL_PROBLEMS,
  INITIAL_BOOKINGS,
  INITIAL_CONTRACTS,
  INITIAL_JOBS,
  INITIAL_INVOICES,
  INITIAL_PACKAGES
} from './src/data';
import type {
  Booking,
  Contract,
  Invoice,
  JobStatus,
  PestProblem,
  PestType,
  PortalRole,
  ServicePackage,
  TechnicianJob
} from './src/types';

const app = express();
const port = Number(process.env.PORT ?? 8787);
const host = '0.0.0.0';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SESSION_COOKIE = 'bugguard_session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 8;

const databaseUrl = process.env.MYSQL_URL ?? process.env.DATABASE_URL;
const pool = databaseUrl
  ? mysql.createPool(databaseUrl)
  : mysql.createPool({
      host: process.env.MYSQL_HOST ?? 'localhost',
      port: Number(process.env.MYSQL_PORT ?? 3306),
      user: process.env.MYSQL_USER ?? 'root',
      password: process.env.MYSQL_PASSWORD ?? '',
      database: process.env.MYSQL_DATABASE ?? 'insect_control_spray_team',
      waitForConnections: true,
      connectionLimit: 10,
      charset: 'utf8mb4'
    });

app.use(express.json({ limit: '10mb' }));

const ACCOUNTS: Record<PortalRole, { password: string; displayName: string }> = {
  user: { password: '1234', displayName: 'User' },
  technician: { password: '1234', displayName: 'Technician' },
  customer: { password: '1234', displayName: 'Customer' }
};

type SessionRow = {
  role: PortalRole;
  username: string;
  displayName: string;
  expiresAt: number;
};

type QueryRunner = Pool | PoolConnection;

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

async function queryAll<T = Record<string, unknown>>(sql: string, params: unknown[] = [], runner: QueryRunner = pool): Promise<T[]> {
  const [rows] = await runner.execute(sql, params as Parameters<QueryRunner['execute']>[1]);
  return rows as T[];
}

async function queryOne<T = Record<string, unknown>>(sql: string, params: unknown[] = [], runner: QueryRunner = pool): Promise<T | null> {
  const rows = await queryAll<T>(sql, params, runner);
  return rows[0] ?? null;
}

async function execute(sql: string, params: unknown[] = [], runner: QueryRunner = pool) {
  await runner.execute(sql, params as Parameters<QueryRunner['execute']>[1]);
}

async function transaction<T>(fn: (connection: PoolConnection) => Promise<T>): Promise<T> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await fn(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

function makeId(prefix: string, base: number, index: number) {
  return `${prefix}-${base + index + 1}`;
}

function optionalString(value: unknown) {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function parseJsonArray<T>(value: unknown, fallback: T[] = []): T[] {
  if (Array.isArray(value)) return value as T[];
  if (typeof value !== 'string' || value.length === 0) return fallback;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
}

function toProblem(row: Record<string, unknown>): PestProblem {
  return {
    id: String(row.id),
    customerName: String(row.customerName),
    customerPhone: String(row.customerPhone),
    address: String(row.address),
    pestType: row.pestType as PestType,
    description: String(row.description),
    urgency: row.urgency as PestProblem['urgency'],
    createdAt: String(row.createdAt),
    status: row.status as PestProblem['status'],
    assignedTeam: optionalString(row.assignedTeam),
    appointmentDate: optionalString(row.appointmentDate)
  };
}

function toBooking(row: Record<string, unknown>): Booking {
  return {
    id: String(row.id),
    packageId: String(row.packageId),
    packageName: String(row.packageName),
    customerName: String(row.customerName),
    customerPhone: String(row.customerPhone),
    address: String(row.address),
    bookingDate: String(row.bookingDate),
    price: Number(row.price),
    status: row.status as Booking['status'],
    invoiceNo: optionalString(row.invoiceNo)
  };
}

function toContract(row: Record<string, unknown>): Contract {
  return {
    id: String(row.id),
    customerName: String(row.customerName),
    customerPhone: String(row.customerPhone),
    address: String(row.address),
    packageName: String(row.packageName),
    startDate: String(row.startDate),
    endDate: String(row.endDate),
    totalVisits: Number(row.totalVisits),
    completedVisits: Number(row.completedVisits),
    nextVisitDate: String(row.nextVisitDate),
    price: Number(row.price),
    status: row.status as Contract['status'],
    documentNo: String(row.documentNo)
  };
}

function toJob(row: Record<string, unknown>): TechnicianJob {
  return {
    id: String(row.id),
    sourceId: String(row.sourceId),
    sourceType: row.sourceType as TechnicianJob['sourceType'],
    title: String(row.title),
    description: String(row.description),
    customerName: String(row.customerName),
    customerPhone: String(row.customerPhone),
    address: String(row.address),
    appointmentDate: String(row.appointmentDate),
    assignedTeam: String(row.assignedTeam),
    status: row.status as JobStatus,
    notesByTech: optionalString(row.notesByTech),
    imageReport: optionalString(row.imageReport),
    chemicalsUsed: parseJsonArray<string>(row.chemicalsUsed),
    completedAt: optionalString(row.completedAt)
  };
}

function toInvoice(row: Record<string, unknown>): Invoice {
  return {
    id: String(row.id),
    invoiceNo: String(row.invoiceNo),
    customerName: String(row.customerName),
    customerPhone: String(row.customerPhone),
    address: String(row.address),
    description: String(row.description),
    amount: Number(row.amount),
    vat: Number(row.vat),
    totalAmount: Number(row.totalAmount),
    status: row.status as Invoice['status'],
    dueDate: String(row.dueDate),
    createdAt: String(row.createdAt)
  };
}

function toPackage(row: Record<string, unknown>): ServicePackage {
  return {
    id: String(row.id),
    name: String(row.name),
    price: Number(row.price),
    duration: String(row.duration),
    description: String(row.description),
    guarantee: String(row.guarantee),
    features: parseJsonArray<string>(row.features)
  };
}

async function dbCount(table: string, runner: QueryRunner = pool) {
  const row = await queryOne<{ count: number }>(`SELECT COUNT(*) as count FROM ${table}`, [], runner);
  return Number(row?.count ?? 0);
}

async function createSchema() {
  await execute(
    'CREATE TABLE IF NOT EXISTS sessions (sessionId VARCHAR(64) PRIMARY KEY, role VARCHAR(32) NOT NULL, username VARCHAR(255) NOT NULL, displayName VARCHAR(255) NOT NULL, expiresAt BIGINT NOT NULL) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci'
  );
  await execute(
    'CREATE TABLE IF NOT EXISTS packages (id VARCHAR(64) PRIMARY KEY, name TEXT NOT NULL, price INT NOT NULL, duration TEXT NOT NULL, description TEXT NOT NULL, guarantee TEXT NOT NULL, features JSON NOT NULL) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci'
  );
  await execute(
    'CREATE TABLE IF NOT EXISTS problems (id VARCHAR(64) PRIMARY KEY, customerName TEXT NOT NULL, customerPhone TEXT NOT NULL, address TEXT NOT NULL, pestType VARCHAR(64) NOT NULL, description TEXT NOT NULL, urgency VARCHAR(64) NOT NULL, createdAt VARCHAR(64) NOT NULL, status VARCHAR(64) NOT NULL, assignedTeam TEXT, appointmentDate VARCHAR(64)) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci'
  );
  await execute(
    'CREATE TABLE IF NOT EXISTS bookings (id VARCHAR(64) PRIMARY KEY, packageId VARCHAR(64) NOT NULL, packageName TEXT NOT NULL, customerName TEXT NOT NULL, customerPhone TEXT NOT NULL, address TEXT NOT NULL, bookingDate VARCHAR(64) NOT NULL, price INT NOT NULL, status VARCHAR(64) NOT NULL, invoiceNo VARCHAR(64)) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci'
  );
  await execute(
    'CREATE TABLE IF NOT EXISTS contracts (id VARCHAR(64) PRIMARY KEY, customerName TEXT NOT NULL, customerPhone TEXT NOT NULL, address TEXT NOT NULL, packageName TEXT NOT NULL, startDate VARCHAR(64) NOT NULL, endDate VARCHAR(64) NOT NULL, totalVisits INT NOT NULL, completedVisits INT NOT NULL, nextVisitDate VARCHAR(64) NOT NULL, price INT NOT NULL, status VARCHAR(64) NOT NULL, documentNo VARCHAR(64) NOT NULL) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci'
  );
  await execute(
    'CREATE TABLE IF NOT EXISTS jobs (id VARCHAR(64) PRIMARY KEY, sourceId VARCHAR(64) NOT NULL, sourceType VARCHAR(32) NOT NULL, title TEXT NOT NULL, description TEXT NOT NULL, customerName TEXT NOT NULL, customerPhone TEXT NOT NULL, address TEXT NOT NULL, appointmentDate VARCHAR(64) NOT NULL, assignedTeam TEXT NOT NULL, status VARCHAR(64) NOT NULL, notesByTech TEXT, imageReport LONGTEXT, chemicalsUsed JSON, completedAt VARCHAR(64), createdAt VARCHAR(64) NOT NULL) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci'
  );
  await execute(
    'CREATE TABLE IF NOT EXISTS invoices (id VARCHAR(64) PRIMARY KEY, invoiceNo VARCHAR(64) NOT NULL, customerName TEXT NOT NULL, customerPhone TEXT NOT NULL, address TEXT NOT NULL, description TEXT NOT NULL, amount INT NOT NULL, vat INT NOT NULL, totalAmount INT NOT NULL, status VARCHAR(64) NOT NULL, dueDate VARCHAR(64) NOT NULL, createdAt VARCHAR(64) NOT NULL) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci'
  );
}

async function getSession(req: express.Request) {
  const authHeader = req.get('authorization');
  let sessionId = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  if (!sessionId) {
    const cookies = parseCookies(req.headers.cookie || '');
    sessionId = cookies[SESSION_COOKIE] || null;
  }

  if (!sessionId) return null;

  const row = await queryOne<Record<string, unknown>>(
    'SELECT sessionId, role, username, displayName, expiresAt FROM sessions WHERE sessionId = ?',
    [sessionId]
  );

  if (!row) return null;
  if (Number(row.expiresAt) <= Date.now()) {
    await execute('DELETE FROM sessions WHERE sessionId = ?', [sessionId]);
    return null;
  }

  return {
    sessionId: String(row.sessionId),
    role: row.role as PortalRole,
    username: String(row.username),
    displayName: String(row.displayName),
    expiresAt: Number(row.expiresAt)
  } satisfies SessionRow & { sessionId: string };
}

async function requireSession(req: express.Request, res: express.Response) {
  const session = await getSession(req);
  if (!session) {
    res.status(401).json({ message: 'ยังไม่ได้เข้าสู่ระบบ' });
    return null;
  }
  return session;
}

async function createSession(role: PortalRole, username: string) {
  const sessionId = randomUUID();
  const displayName = ACCOUNTS[role].displayName;
  const expiresAt = Date.now() + SESSION_TTL_MS;
  await execute(
    'INSERT INTO sessions (sessionId, role, username, displayName, expiresAt) VALUES (?, ?, ?, ?, ?)',
    [sessionId, role, username, displayName, expiresAt]
  );
  return { sessionId, role, username, displayName, expiresAt };
}

async function clearSession(sessionId: string | null) {
  if (!sessionId) return;
  await execute('DELETE FROM sessions WHERE sessionId = ?', [sessionId]);
}

async function seedDatabase() {
  await createSchema();
  if ((await dbCount('packages')) > 0) return;

  await transaction(async (connection) => {
    for (const pkg of INITIAL_PACKAGES) {
      await execute(
        'INSERT INTO packages (id, name, price, duration, description, guarantee, features) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [pkg.id, pkg.name, pkg.price, pkg.duration, pkg.description, pkg.guarantee, JSON.stringify(pkg.features)],
        connection
      );
    }

    for (const problem of INITIAL_PROBLEMS) {
      await execute(
        'INSERT INTO problems (id, customerName, customerPhone, address, pestType, description, urgency, createdAt, status, assignedTeam, appointmentDate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          problem.id,
          problem.customerName,
          problem.customerPhone,
          problem.address,
          problem.pestType,
          problem.description,
          problem.urgency,
          problem.createdAt,
          problem.status,
          problem.assignedTeam ?? null,
          problem.appointmentDate ?? null
        ],
        connection
      );
    }

    for (const booking of INITIAL_BOOKINGS) {
      await execute(
        'INSERT INTO bookings (id, packageId, packageName, customerName, customerPhone, address, bookingDate, price, status, invoiceNo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          booking.id,
          booking.packageId,
          booking.packageName,
          booking.customerName,
          booking.customerPhone,
          booking.address,
          booking.bookingDate,
          booking.price,
          booking.status,
          booking.invoiceNo ?? null
        ],
        connection
      );
    }

    for (const contract of INITIAL_CONTRACTS) {
      await execute(
        'INSERT INTO contracts (id, customerName, customerPhone, address, packageName, startDate, endDate, totalVisits, completedVisits, nextVisitDate, price, status, documentNo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          contract.id,
          contract.customerName,
          contract.customerPhone,
          contract.address,
          contract.packageName,
          contract.startDate,
          contract.endDate,
          contract.totalVisits,
          contract.completedVisits,
          contract.nextVisitDate,
          contract.price,
          contract.status,
          contract.documentNo
        ],
        connection
      );
    }

    for (const job of INITIAL_JOBS) {
      await execute(
        'INSERT INTO jobs (id, sourceId, sourceType, title, description, customerName, customerPhone, address, appointmentDate, assignedTeam, status, notesByTech, imageReport, chemicalsUsed, completedAt, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          job.id,
          job.sourceId,
          job.sourceType,
          job.title,
          job.description,
          job.customerName,
          job.customerPhone,
          job.address,
          job.appointmentDate,
          job.assignedTeam,
          job.status,
          job.notesByTech ?? null,
          job.imageReport ?? null,
          JSON.stringify(job.chemicalsUsed ?? []),
          job.completedAt ?? null,
          new Date().toISOString()
        ],
        connection
      );
    }

    for (const invoice of INITIAL_INVOICES) {
      await execute(
        'INSERT INTO invoices (id, invoiceNo, customerName, customerPhone, address, description, amount, vat, totalAmount, status, dueDate, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          invoice.id,
          invoice.invoiceNo,
          invoice.customerName,
          invoice.customerPhone,
          invoice.address,
          invoice.description,
          invoice.amount,
          invoice.vat,
          invoice.totalAmount,
          invoice.status,
          invoice.dueDate,
          invoice.createdAt
        ],
        connection
      );
    }
  });
}

async function getState() {
  return {
    problems: (await queryAll('SELECT * FROM problems ORDER BY createdAt DESC')).map(toProblem),
    bookings: (await queryAll('SELECT * FROM bookings ORDER BY id DESC')).map(toBooking),
    contracts: (await queryAll('SELECT * FROM contracts ORDER BY startDate DESC')).map(toContract),
    jobs: (await queryAll('SELECT * FROM jobs ORDER BY createdAt DESC')).map(toJob),
    invoices: (await queryAll('SELECT * FROM invoices ORDER BY createdAt DESC')).map(toInvoice),
    packages: (await queryAll('SELECT * FROM packages ORDER BY id ASC')).map(toPackage)
  };
}

async function getSourceRecord(sourceType: 'problem' | 'booking', sourceId: string) {
  if (sourceType === 'problem') {
    return queryOne<Record<string, unknown>>('SELECT * FROM problems WHERE id = ?', [sourceId]);
  }
  return queryOne<Record<string, unknown>>('SELECT * FROM bookings WHERE id = ?', [sourceId]);
}

async function syncJobSourceStatus(job: TechnicianJob, status: JobStatus, updates: Partial<TechnicianJob> | undefined, runner: QueryRunner) {
  await execute(
    'UPDATE jobs SET status = ?, notesByTech = COALESCE(?, notesByTech), imageReport = COALESCE(?, imageReport), chemicalsUsed = COALESCE(?, chemicalsUsed), completedAt = COALESCE(?, completedAt) WHERE id = ?',
    [
      status,
      updates?.notesByTech ?? null,
      updates?.imageReport ?? null,
      updates?.chemicalsUsed ? JSON.stringify(updates.chemicalsUsed) : null,
      updates?.completedAt ?? null,
      job.id
    ],
    runner
  );

  if (job.sourceType === 'problem') {
    const nextStatus = status === 'ส่งงานแล้ว' ? 'กำลังดำเนินการ' : status === 'เสร็จสิ้นและตรวจรับ' ? 'เสร็จสิ้น' : null;
    if (nextStatus) {
      await execute('UPDATE problems SET status = ? WHERE id = ?', [nextStatus, job.sourceId], runner);
    }
    return;
  }

  const nextStatus = status === 'ส่งงานแล้ว' ? 'กำลังจัดทีมงาน' : status === 'เสร็จสิ้นและตรวจรับ' ? 'เสร็จสิ้น' : null;
  if (nextStatus) {
    await execute('UPDATE bookings SET status = ? WHERE id = ?', [nextStatus, job.sourceId], runner);
  }
}

await seedDatabase();

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'insect-control-spray-team-auth', database: 'mysql' });
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
    displayName: session.displayName
  });
});

app.post('/api/login', async (req, res) => {
  const { username, password, role } = req.body ?? {};
  if (!username || !password || !role) {
    return res.status(400).json({ message: 'กรุณากรอกข้อมูลเข้าสู่ระบบให้ครบถ้วน' });
  }

  const account = ACCOUNTS[role as PortalRole];
  if (!account) {
    return res.status(400).json({ message: 'ไม่พบบทบาทผู้ใช้งาน' });
  }

  if (username !== role || password !== account.password) {
    return res.status(401).json({ message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
  }

  const session = await createSession(role as PortalRole, username);
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
  if (!(await requireSession(req, res))) return;
  return res.json(await getState());
});

app.post('/api/problems', async (req, res) => {
  if (!(await requireSession(req, res))) return;
  const { customerName, customerPhone, address, pestType, description, urgency } = req.body ?? {};

  if (!customerName || !customerPhone || !address || !pestType || !description || !urgency) {
    return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
  }

  const entry: PestProblem = {
    id: makeId('prob', 100, await dbCount('problems')),
    customerName,
    customerPhone,
    address,
    pestType,
    description,
    urgency,
    createdAt: new Date().toISOString(),
    status: 'รอดำเนินการ'
  };

  await execute(
    'INSERT INTO problems (id, customerName, customerPhone, address, pestType, description, urgency, createdAt, status, assignedTeam, appointmentDate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      entry.id,
      entry.customerName,
      entry.customerPhone,
      entry.address,
      entry.pestType,
      entry.description,
      entry.urgency,
      entry.createdAt,
      entry.status,
      null,
      null
    ]
  );

  return res.json({ ok: true, problem: entry });
});

app.post('/api/bookings', async (req, res) => {
  if (!(await requireSession(req, res))) return;
  const { packageId, packageName, customerName, customerPhone, address, bookingDate, price } = req.body ?? {};

  if (!packageId || !packageName || !customerName || !customerPhone || !address || !bookingDate || typeof price !== 'number') {
    return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
  }

  const bookingCount = await dbCount('bookings');
  const invoiceCount = await dbCount('invoices');
  const booking: Booking = {
    id: makeId('book', 200, bookingCount),
    packageId,
    packageName,
    customerName,
    customerPhone,
    address,
    bookingDate,
    price,
    status: 'ชำระเงินแล้ว',
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
    status: 'ชำระเงินแล้ว',
    dueDate: bookingDate,
    createdAt: new Date().toISOString().split('T')[0]
  };

  await transaction(async (connection) => {
    await execute(
      'INSERT INTO bookings (id, packageId, packageName, customerName, customerPhone, address, bookingDate, price, status, invoiceNo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        booking.id,
        booking.packageId,
        booking.packageName,
        booking.customerName,
        booking.customerPhone,
        booking.address,
        booking.bookingDate,
        booking.price,
        booking.status,
        booking.invoiceNo
      ],
      connection
    );

    await execute(
      'INSERT INTO invoices (id, invoiceNo, customerName, customerPhone, address, description, amount, vat, totalAmount, status, dueDate, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        invoice.id,
        invoice.invoiceNo,
        invoice.customerName,
        invoice.customerPhone,
        invoice.address,
        invoice.description,
        invoice.amount,
        invoice.vat,
        invoice.totalAmount,
        invoice.status,
        invoice.dueDate,
        invoice.createdAt
      ],
      connection
    );
  });

  return res.json({ ok: true, booking, invoice });
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

  const job: TechnicianJob = {
    id: makeId('job', 500, await dbCount('jobs')),
    sourceId,
    sourceType,
    title,
    description: desc,
    customerName: String(source.customerName),
    customerPhone: String(source.customerPhone),
    address: String(source.address),
    appointmentDate: date,
    assignedTeam: teamName,
    status: 'กำลังเตรียมตัว'
  };

  await transaction(async (connection) => {
    await execute(
      'INSERT INTO jobs (id, sourceId, sourceType, title, description, customerName, customerPhone, address, appointmentDate, assignedTeam, status, notesByTech, imageReport, chemicalsUsed, completedAt, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        job.id,
        job.sourceId,
        job.sourceType,
        job.title,
        job.description,
        job.customerName,
        job.customerPhone,
        job.address,
        job.appointmentDate,
        job.assignedTeam,
        job.status,
        null,
        null,
        JSON.stringify([]),
        null,
        new Date().toISOString()
      ],
      connection
    );

    if (sourceType === 'problem') {
      await execute('UPDATE problems SET status = ?, assignedTeam = ?, appointmentDate = ? WHERE id = ?', [
        'จัดสรรคิวช่างแล้ว',
        teamName,
        date,
        sourceId
      ], connection);
    } else {
      await execute('UPDATE bookings SET status = ? WHERE id = ?', ['กำลังจัดทีมงาน', sourceId], connection);
    }
  });

  return res.json({ ok: true, job });
});

app.patch('/api/jobs/:jobId/status', async (req, res) => {
  if (!(await requireSession(req, res))) return;
  const { jobId } = req.params;
  const { status, updates } = req.body ?? {};
  if (!status) {
    return res.status(400).json({ message: 'กรุณาระบุสถานะงาน' });
  }

  const job = await queryOne<Record<string, unknown>>('SELECT * FROM jobs WHERE id = ?', [jobId]);
  if (!job) {
    return res.status(404).json({ message: 'ไม่พบงานช่าง' });
  }

  await transaction(async (connection) => {
    await syncJobSourceStatus(toJob(job), status as JobStatus, updates, connection);
  });

  return res.json({ ok: true, job: await queryOne<Record<string, unknown>>('SELECT * FROM jobs WHERE id = ?', [jobId]) });
});

app.post('/api/jobs/:jobId/approve', async (req, res) => {
  if (!(await requireSession(req, res))) return;
  const { jobId } = req.params;
  const jobRow = await queryOne<Record<string, unknown>>('SELECT * FROM jobs WHERE id = ?', [jobId]);
  if (!jobRow) {
    return res.status(404).json({ message: 'ไม่พบงานช่าง' });
  }

  const job = toJob(jobRow);
  const contractCount = await dbCount('contracts');
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

  await transaction(async (connection) => {
    await execute('UPDATE jobs SET status = ? WHERE id = ?', ['เสร็จสิ้นและตรวจรับ', jobId], connection);
    if (job.sourceType === 'problem') {
      await execute('UPDATE problems SET status = ? WHERE id = ?', ['เสร็จสิ้น', job.sourceId], connection);
    } else {
      await execute('UPDATE bookings SET status = ? WHERE id = ?', ['เสร็จสิ้น', job.sourceId], connection);
    }

    await execute(
      'INSERT INTO contracts (id, customerName, customerPhone, address, packageName, startDate, endDate, totalVisits, completedVisits, nextVisitDate, price, status, documentNo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        contract.id,
        contract.customerName,
        contract.customerPhone,
        contract.address,
        contract.packageName,
        contract.startDate,
        contract.endDate,
        contract.totalVisits,
        contract.completedVisits,
        contract.nextVisitDate,
        contract.price,
        contract.status,
        contract.documentNo
      ],
      connection
    );
  });

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

  const invoiceCount = await dbCount('invoices');
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

  await execute(
    'INSERT INTO invoices (id, invoiceNo, customerName, customerPhone, address, description, amount, vat, totalAmount, status, dueDate, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      invoice.id,
      invoice.invoiceNo,
      invoice.customerName,
      invoice.customerPhone,
      invoice.address,
      invoice.description,
      invoice.amount,
      invoice.vat,
      invoice.totalAmount,
      invoice.status,
      invoice.dueDate,
      invoice.createdAt
    ]
  );

  return res.json({ ok: true, invoice });
});

app.patch('/api/invoices/:invoiceId/status', async (req, res) => {
  if (!(await requireSession(req, res))) return;
  const { invoiceId } = req.params;
  const { status } = req.body ?? {};
  if (!status) {
    return res.status(400).json({ message: 'กรุณาระบุสถานะใบแจ้งหนี้' });
  }

  await execute('UPDATE invoices SET status = ? WHERE id = ?', [status, invoiceId]);

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
