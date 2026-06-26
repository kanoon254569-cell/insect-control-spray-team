import express from 'express';
import initSqlJs from 'sql.js';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
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
const port = process.env.PORT || 8787;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, 'data');
const dbPath = path.join(dataDir, 'bugguard.sqlite');
const sqlJsDistDir = path.join(__dirname, 'node_modules', 'sql.js', 'dist');
const SESSION_COOKIE = 'bugguard_session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 8;

mkdirSync(dataDir, { recursive: true });

const SQL = await initSqlJs({
  locateFile: (file) => path.join(sqlJsDistDir, file)
});

const database = existsSync(dbPath)
  ? new SQL.Database(new Uint8Array(readFileSync(dbPath)))
  : new SQL.Database();

app.use(express.json());

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

function queryAll<T = Record<string, unknown>>(sql: string, params: unknown[] = []): T[] {
  const statement = database.prepare(sql);
  statement.bind(params);
  const rows: T[] = [];
  while (statement.step()) {
    rows.push(statement.getAsObject() as T);
  }
  statement.free();
  return rows;
}

function queryOne<T = Record<string, unknown>>(sql: string, params: unknown[] = []): T | null {
  return queryAll<T>(sql, params)[0] ?? null;
}

function execute(sql: string, params: unknown[] = []) {
  const statement = database.prepare(sql);
  statement.run(params);
  statement.free();
}

function persistDb() {
  writeFileSync(dbPath, Buffer.from(database.export()));
}

function transaction<T>(fn: () => T): T {
  execute('BEGIN');
  try {
    const result = fn();
    execute('COMMIT');
    persistDb();
    return result;
  } catch (error) {
    execute('ROLLBACK');
    throw error;
  }
}

function makeId(prefix: string, base: number, index: number) {
  return `${prefix}-${base + index + 1}`;
}

function optionalString(value: unknown) {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function parseJsonArray<T>(value: unknown, fallback: T[] = []): T[] {
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

function dbCount(table: string) {
  const row = queryOne<{ count: number }>(`SELECT COUNT(*) as count FROM ${table}`);
  return Number(row?.count ?? 0);
}

function createSchema() {
  execute(
    'CREATE TABLE IF NOT EXISTS sessions (session_id TEXT PRIMARY KEY, role TEXT NOT NULL, username TEXT NOT NULL, display_name TEXT NOT NULL, expires_at INTEGER NOT NULL)'
  );
  execute(
    'CREATE TABLE IF NOT EXISTS packages (id TEXT PRIMARY KEY, name TEXT NOT NULL, price INTEGER NOT NULL, duration TEXT NOT NULL, description TEXT NOT NULL, guarantee TEXT NOT NULL, features TEXT NOT NULL)'
  );
  execute(
    'CREATE TABLE IF NOT EXISTS problems (id TEXT PRIMARY KEY, customerName TEXT NOT NULL, customerPhone TEXT NOT NULL, address TEXT NOT NULL, pestType TEXT NOT NULL, description TEXT NOT NULL, urgency TEXT NOT NULL, createdAt TEXT NOT NULL, status TEXT NOT NULL, assignedTeam TEXT, appointmentDate TEXT)'
  );
  execute(
    'CREATE TABLE IF NOT EXISTS bookings (id TEXT PRIMARY KEY, packageId TEXT NOT NULL, packageName TEXT NOT NULL, customerName TEXT NOT NULL, customerPhone TEXT NOT NULL, address TEXT NOT NULL, bookingDate TEXT NOT NULL, price INTEGER NOT NULL, status TEXT NOT NULL, invoiceNo TEXT)'
  );
  execute(
    'CREATE TABLE IF NOT EXISTS contracts (id TEXT PRIMARY KEY, customerName TEXT NOT NULL, customerPhone TEXT NOT NULL, address TEXT NOT NULL, packageName TEXT NOT NULL, startDate TEXT NOT NULL, endDate TEXT NOT NULL, totalVisits INTEGER NOT NULL, completedVisits INTEGER NOT NULL, nextVisitDate TEXT NOT NULL, price INTEGER NOT NULL, status TEXT NOT NULL, documentNo TEXT NOT NULL)'
  );
  execute(
    'CREATE TABLE IF NOT EXISTS jobs (id TEXT PRIMARY KEY, sourceId TEXT NOT NULL, sourceType TEXT NOT NULL, title TEXT NOT NULL, description TEXT NOT NULL, customerName TEXT NOT NULL, customerPhone TEXT NOT NULL, address TEXT NOT NULL, appointmentDate TEXT NOT NULL, assignedTeam TEXT NOT NULL, status TEXT NOT NULL, notesByTech TEXT, imageReport TEXT, chemicalsUsed TEXT, completedAt TEXT, createdAt TEXT NOT NULL)'
  );
  execute(
    'CREATE TABLE IF NOT EXISTS invoices (id TEXT PRIMARY KEY, invoiceNo TEXT NOT NULL, customerName TEXT NOT NULL, customerPhone TEXT NOT NULL, address TEXT NOT NULL, description TEXT NOT NULL, amount INTEGER NOT NULL, vat INTEGER NOT NULL, totalAmount INTEGER NOT NULL, status TEXT NOT NULL, dueDate TEXT NOT NULL, createdAt TEXT NOT NULL)'
  );
}

function getSession(req: express.Request) {
  const authHeader = req.get('authorization');
  let sessionId = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  if (!sessionId) {
    const cookies = parseCookies(req.headers.cookie || '');
    sessionId = cookies[SESSION_COOKIE] || null;
  }

  if (!sessionId) return null;

  const row = queryOne<Record<string, unknown>>(
    'SELECT session_id as sessionId, role, username, display_name as displayName, expires_at as expiresAt FROM sessions WHERE session_id = ?',
    [sessionId]
  );

  if (!row) return null;
  if (Number(row.expiresAt) <= Date.now()) {
    execute('DELETE FROM sessions WHERE session_id = ?', [sessionId]);
    persistDb();
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

function requireSession(req: express.Request, res: express.Response) {
  const session = getSession(req);
  if (!session) {
    res.status(401).json({ message: 'ยังไม่ได้เข้าสู่ระบบ' });
    return null;
  }
  return session;
}

function createSession(role: PortalRole, username: string) {
  const sessionId = randomUUID();
  const displayName = ACCOUNTS[role].displayName;
  const expiresAt = Date.now() + SESSION_TTL_MS;
  execute(
    'INSERT INTO sessions (session_id, role, username, display_name, expires_at) VALUES (?, ?, ?, ?, ?)',
    [sessionId, role, username, displayName, expiresAt]
  );
  persistDb();
  return { sessionId, role, username, displayName, expiresAt };
}

function clearSession(sessionId: string | null) {
  if (!sessionId) return;
  execute('DELETE FROM sessions WHERE session_id = ?', [sessionId]);
  persistDb();
}

function seedDatabase() {
  createSchema();
  if (dbCount('packages') > 0) return;

  transaction(() => {
    INITIAL_PACKAGES.forEach((pkg) => {
      execute(
        'INSERT INTO packages (id, name, price, duration, description, guarantee, features) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [pkg.id, pkg.name, pkg.price, pkg.duration, pkg.description, pkg.guarantee, JSON.stringify(pkg.features)]
      );
    });

    INITIAL_PROBLEMS.forEach((problem) => {
      execute(
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
        ]
      );
    });

    INITIAL_BOOKINGS.forEach((booking) => {
      execute(
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
        ]
      );
    });

    INITIAL_CONTRACTS.forEach((contract) => {
      execute(
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
        ]
      );
    });

    INITIAL_JOBS.forEach((job) => {
      execute(
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
        ]
      );
    });

    INITIAL_INVOICES.forEach((invoice) => {
      execute(
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
    });
  });
}

function getState() {
  return {
    problems: queryAll('SELECT * FROM problems ORDER BY createdAt DESC').map(toProblem),
    bookings: queryAll('SELECT * FROM bookings ORDER BY rowid DESC').map(toBooking),
    contracts: queryAll('SELECT * FROM contracts ORDER BY startDate DESC').map(toContract),
    jobs: queryAll('SELECT * FROM jobs ORDER BY rowid DESC').map(toJob),
    invoices: queryAll('SELECT * FROM invoices ORDER BY createdAt DESC').map(toInvoice),
    packages: queryAll('SELECT * FROM packages ORDER BY id ASC').map(toPackage)
  };
}

function getSourceRecord(sourceType: 'problem' | 'booking', sourceId: string) {
  if (sourceType === 'problem') {
    return queryOne<Record<string, unknown>>('SELECT * FROM problems WHERE id = ?', [sourceId]);
  }
  return queryOne<Record<string, unknown>>('SELECT * FROM bookings WHERE id = ?', [sourceId]);
}

function syncJobSourceStatus(job: TechnicianJob, status: JobStatus, updates?: Partial<TechnicianJob>) {
  execute(
    'UPDATE jobs SET status = ?, notesByTech = COALESCE(?, notesByTech), imageReport = COALESCE(?, imageReport), chemicalsUsed = COALESCE(?, chemicalsUsed), completedAt = COALESCE(?, completedAt) WHERE id = ?',
    [
      status,
      updates?.notesByTech ?? null,
      updates?.imageReport ?? null,
      updates?.chemicalsUsed ? JSON.stringify(updates.chemicalsUsed) : null,
      updates?.completedAt ?? null,
      job.id
    ]
  );

  if (job.sourceType === 'problem') {
    const nextStatus = status === 'ส่งงานแล้ว' ? 'กำลังดำเนินการ' : status === 'เสร็จสิ้นและตรวจรับ' ? 'เสร็จสิ้น' : null;
    if (nextStatus) {
      execute('UPDATE problems SET status = ? WHERE id = ?', [nextStatus, job.sourceId]);
    }
    return;
  }

  const nextStatus = status === 'ส่งงานแล้ว' ? 'กำลังจัดทีมงาน' : status === 'เสร็จสิ้นและตรวจรับ' ? 'เสร็จสิ้น' : null;
  if (nextStatus) {
    execute('UPDATE bookings SET status = ? WHERE id = ?', [nextStatus, job.sourceId]);
  }
}

function refreshAfterMutation() {
  persistDb();
  return getState();
}

seedDatabase();

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'insect-control-spray-team-auth', database: 'sqlite' });
});

app.get('/api/me', (req, res) => {
  const session = getSession(req);
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

app.post('/api/login', (req, res) => {
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

  const session = createSession(role as PortalRole, username);
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

app.post('/api/logout', (req, res) => {
  const sessionId = (() => {
    const authHeader = req.get('authorization');
    if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7).trim();
    const cookies = parseCookies(req.headers.cookie || '');
    return cookies[SESSION_COOKIE] || null;
  })();

  clearSession(sessionId);
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

app.get('/api/state', (req, res) => {
  if (!requireSession(req, res)) return;
  return res.json(getState());
});

app.post('/api/problems', (req, res) => {
  if (!requireSession(req, res)) return;
  const { customerName, customerPhone, address, pestType, description, urgency } = req.body ?? {};

  if (!customerName || !customerPhone || !address || !pestType || !description || !urgency) {
    return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
  }

  const entry: PestProblem = {
    id: makeId('prob', 100, dbCount('problems')),
    customerName,
    customerPhone,
    address,
    pestType,
    description,
    urgency,
    createdAt: new Date().toISOString(),
    status: 'รอดำเนินการ'
  };

  transaction(() => {
    execute(
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
  });

  return res.json({ ok: true, problem: entry });
});

app.post('/api/bookings', (req, res) => {
  if (!requireSession(req, res)) return;
  const { packageId, packageName, customerName, customerPhone, address, bookingDate, price } = req.body ?? {};

  if (!packageId || !packageName || !customerName || !customerPhone || !address || !bookingDate || typeof price !== 'number') {
    return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
  }

  const booking: Booking = {
    id: makeId('book', 200, dbCount('bookings')),
    packageId,
    packageName,
    customerName,
    customerPhone,
    address,
    bookingDate,
    price,
    status: 'ชำระเงินแล้ว',
    invoiceNo: `INV-2026-00${dbCount('invoices') + 1}`
  };

  const invoice: Invoice = {
    id: makeId('inv', 400, dbCount('invoices')),
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

  transaction(() => {
    execute(
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
      ]
    );

    execute(
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
  });

  return res.json({ ok: true, booking, invoice });
});

app.post('/api/jobs/assign', (req, res) => {
  if (!requireSession(req, res)) return;
  const { sourceId, sourceType, teamName, date, title, desc } = req.body ?? {};
  if (!sourceId || !sourceType || !teamName || !date || !title || !desc) {
    return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
  }

  const source = getSourceRecord(sourceType, sourceId);
  if (!source) {
    return res.status(404).json({ message: 'ไม่พบรายการต้นทาง' });
  }

  const job: TechnicianJob = {
    id: makeId('job', 500, dbCount('jobs')),
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

  transaction(() => {
    execute(
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
      ]
    );

    if (sourceType === 'problem') {
      execute('UPDATE problems SET status = ?, assignedTeam = ?, appointmentDate = ? WHERE id = ?', [
        'จัดสรรคิวช่างแล้ว',
        teamName,
        date,
        sourceId
      ]);
    } else {
      execute('UPDATE bookings SET status = ? WHERE id = ?', ['กำลังจัดทีมงาน', sourceId]);
    }
  });

  return res.json({ ok: true, job });
});

app.patch('/api/jobs/:jobId/status', (req, res) => {
  if (!requireSession(req, res)) return;
  const { jobId } = req.params;
  const { status, updates } = req.body ?? {};
  if (!status) {
    return res.status(400).json({ message: 'กรุณาระบุสถานะงาน' });
  }

  const job = queryOne<Record<string, unknown>>('SELECT * FROM jobs WHERE id = ?', [jobId]);
  if (!job) {
    return res.status(404).json({ message: 'ไม่พบงานช่าง' });
  }

  transaction(() => {
    syncJobSourceStatus(toJob(job), status as JobStatus, updates);
  });

  return res.json({ ok: true, job: queryOne<Record<string, unknown>>('SELECT * FROM jobs WHERE id = ?', [jobId]) });
});

app.post('/api/jobs/:jobId/approve', (req, res) => {
  if (!requireSession(req, res)) return;
  const { jobId } = req.params;
  const jobRow = queryOne<Record<string, unknown>>('SELECT * FROM jobs WHERE id = ?', [jobId]);
  if (!jobRow) {
    return res.status(404).json({ message: 'ไม่พบงานช่าง' });
  }

  const job = toJob(jobRow);
  const contract: Contract = {
    id: makeId('cont', 300, dbCount('contracts')),
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
    documentNo: `CONT-2026-${300 + dbCount('contracts') + 1}`
  };

  transaction(() => {
    execute('UPDATE jobs SET status = ? WHERE id = ?', ['เสร็จสิ้นและตรวจรับ', jobId]);
    if (job.sourceType === 'problem') {
      execute('UPDATE problems SET status = ? WHERE id = ?', ['เสร็จสิ้น', job.sourceId]);
    } else {
      execute('UPDATE bookings SET status = ? WHERE id = ?', ['เสร็จสิ้น', job.sourceId]);
    }

    execute(
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
      ]
    );
  });

  return res.json({ ok: true, contract });
});

app.post('/api/invoices', (req, res) => {
  if (!requireSession(req, res)) return;
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

  const invoice: Invoice = {
    id: makeId('inv', 400, dbCount('invoices')),
    invoiceNo: `INV-2026-00${dbCount('invoices') + 1}`,
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

  transaction(() => {
    execute(
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
  });

  return res.json({ ok: true, invoice });
});

app.patch('/api/invoices/:invoiceId/status', (req, res) => {
  if (!requireSession(req, res)) return;
  const { invoiceId } = req.params;
  const { status } = req.body ?? {};
  if (!status) {
    return res.status(400).json({ message: 'กรุณาระบุสถานะใบแจ้งหนี้' });
  }

  transaction(() => {
    execute('UPDATE invoices SET status = ? WHERE id = ?', [status, invoiceId]);
  });

  return res.json({ ok: true });
});

app.post('/api/reload', (req, res) => {
  if (!requireSession(req, res)) return;
  return res.json(getState());
});

if (existsSync(path.join(__dirname, 'dist', 'index.html'))) {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get(/^\/(?!api).*/, (_req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

persistDb();

app.listen(Number(port), '127.0.0.1', () => {
  console.log(`Auth API listening on http://127.0.0.1:${port}`);
});
