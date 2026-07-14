import React, { useState, useEffect, lazy, Suspense } from 'react';
import { 
  CheckCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import LoginPage from './components/LoginPage';
import RouteShell from './components/RouteShell';

const CustomerPortal = lazy(() => import('./components/CustomerPortal'));
const TechnicianPortal = lazy(() => import('./components/TechnicianPortal'));
const AdminPortal = lazy(() => import('./components/AdminPortal'));

// Seed & types
import { PortalRole, PestProblem, Booking, Contract, TechnicianJob, Invoice, JobStatus, PestType, TeamMember, TeamMemberRole, Team } from './types';
import { resolvePortalRole } from './auth';
import { 
  INITIAL_PACKAGES 
} from './data';

type AuthSession = {
  role: PortalRole;
  username: string;
  displayName: string;
  token: string;
  teamRole?: TeamMemberRole;
  teamId?: string;
  teamName?: string;
};

type AppPath = '/login' | '/user' | '/technician' | '/customer';

const ROLE_TO_PATH: Record<PortalRole, Exclude<AppPath, '/login'>> = {
  user: '/user',
  technician: '/technician',
  customer: '/customer'
};

const PATHS = new Set<AppPath>(['/login', '/user', '/technician', '/customer']);

function normalizePath(pathname: string): AppPath {
  const cleanPath = pathname.replace(/\/+$/, '') || '/login';
  return PATHS.has(cleanPath as AppPath) ? (cleanPath as AppPath) : '/login';
}

export default function App() {
  const [route, setRoute] = useState<AppPath>(() => normalizePath(window.location.pathname));
  const [session, setSession] = useState<AuthSession | null>(null);
  const [sessionRole, setSessionRole] = useState<PortalRole | null>(null);
  const [bootLoading, setBootLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Server-backed app data mirrored into React state for rendering.
  const [problems, setProblems] = useState<PestProblem[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [jobs, setJobs] = useState<TechnicianJob[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [packages, setPackages] = useState(INITIAL_PACKAGES);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);

  useEffect(() => {
    const handlePopState = () => {
      setRoute(normalizePath(window.location.pathname));
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    let active = true;

    const syncSession = async () => {
      try {
        const response = await fetch('/api/me', { credentials: 'include' });
        if (!response.ok) {
          if (active) setSession(null);
          return;
        }

        const data = await response.json();
        if (active) {
          const resolvedRole = resolvePortalRole(data.teamRole);
          const effectiveRole = data.role === 'user' && data.teamRole ? resolvedRole : data.role;
          setSessionRole(effectiveRole);
          setSession({
            role: effectiveRole,
            username: data.username,
            displayName: data.displayName,
            token: data.token,
            teamRole: data.teamRole,
            teamId: data.teamId,
            teamName: data.teamName
          });
          try {
            await loadServerState();
          } catch {
            setProblems([]);
            setBookings([]);
            setContracts([]);
            setJobs([]);
            setInvoices([]);
            setPackages(INITIAL_PACKAGES);
          }
        }
      } catch {
        if (active) setSession(null);
      } finally {
        if (active) setBootLoading(false);
      }
    };

    syncSession();

    return () => {
      active = false;
    };
  }, []);

  // Notifications or toast indicator state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);
  const [teamSuccessMessage, setTeamSuccessMessage] = useState<string | null>(null);

  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadServerState = async () => {
    const [stateRes, teamRes, teamsRes] = await Promise.all([
      fetch('/api/state', { credentials: 'include' }),
      fetch('/api/team-members', { credentials: 'include' }),
      fetch('/api/teams', { credentials: 'include' })
    ]);

    if (!stateRes.ok) {
      throw new Error('ไม่สามารถโหลดข้อมูลจากเซิร์ฟเวอร์ได้');
    }

    const data = await stateRes.json();
    setProblems(data.problems || []);
    setBookings(data.bookings || []);
    setContracts(data.contracts || []);
    setJobs(data.jobs || []);
    setInvoices(data.invoices || []);
    setPackages(data.packages || INITIAL_PACKAGES);

    if (teamRes.ok) {
      const teamData = await teamRes.json();
      setTeamMembers(teamData.members || []);
    }
    if (teamsRes.ok) {
      const teamsData = await teamsRes.json();
      setTeams(teamsData.teams || []);
    }
  }

  const navigate = (path: AppPath, replace = false) => {
    const method = replace ? 'replaceState' : 'pushState';
    window.history[method]({}, '', path);
    setRoute(path);
  };

  const loginViaApi = async (username: string, password: string) => {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ username, password })
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.message || 'เข้าสู่ระบบไม่สำเร็จ');
    }

    return response.json();
  };

  const registerViaApi = async (values: { username: string; password: string; displayName: string }) => {
    const response = await fetch('/api/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify(values)
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.message || 'สมัครบัญชีไม่สำเร็จ');
    }

    return response.json();
  };

  const handleLogin = async (values: { username: string; password: string }) => {
    setLoginLoading(true);
    setAuthError(null);
    try {
      const result = await loginViaApi(values.username, values.password);
      const effectiveRole = result.role === 'user' && result.teamRole ? resolvePortalRole(result.teamRole) : result.role;
      setSessionRole(effectiveRole);
      setSession({
        role: effectiveRole,
        username: result.username,
        displayName: result.displayName,
        token: result.token,
        teamRole: result.teamRole,
        teamId: result.teamId,
        teamName: result.teamName
      });
      try {
        await loadServerState();
      } catch {
        setProblems([]);
        setBookings([]);
        setContracts([]);
        setJobs([]);
        setInvoices([]);
        setPackages(INITIAL_PACKAGES);
        setTeamMembers([]);
      }
      navigate(ROLE_TO_PATH[effectiveRole], true);
      showToast(`ยินดีต้อนรับ ${result.displayName}`, 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'เข้าสู่ระบบไม่สำเร็จ';
      setAuthError(message);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async (values: { username: string; password: string; displayName: string }) => {
    setLoginLoading(true);
    setAuthError(null);
    try {
      const result = await registerViaApi(values);
      const effectiveRole = result.role === 'user' && result.teamRole ? resolvePortalRole(result.teamRole) : result.role;
      setSessionRole(effectiveRole);
      setSession({
        role: effectiveRole,
        username: result.username,
        displayName: result.displayName,
        token: result.token,
        teamRole: result.teamRole,
        teamId: result.teamId,
        teamName: result.teamName
      });
      try {
        await loadServerState();
      } catch {
        setProblems([]);
        setBookings([]);
        setContracts([]);
        setJobs([]);
        setInvoices([]);
        setPackages(INITIAL_PACKAGES);
        setTeamMembers([]);
      }
      navigate(ROLE_TO_PATH[effectiveRole], true);
      showToast(`สมัครบัญชีและเข้าสู่ระบบสำเร็จ: ${result.displayName}`, 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'สมัครบัญชีไม่สำเร็จ';
      setAuthError(message);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    fetch('/api/logout', {
      method: 'POST',
      credentials: 'include'
    }).finally(() => {
      setSession(null);
      setSessionRole(null);
      navigate('/login', true);
    });
  };

  const expectedRoute = session ? ROLE_TO_PATH[session.role] : null;
  const routeIsAllowed = !session
    ? route === '/login'
    : route === expectedRoute;

  useEffect(() => {
    if (bootLoading) return;

    if (!session && route !== '/login') {
      navigate('/login', true);
      return;
    }

    if (session) {
      const expectedRoute = ROLE_TO_PATH[session.role];
      if (route === '/login') {
        navigate(expectedRoute, true);
        return;
      }

      if (route !== expectedRoute) {
        navigate(expectedRoute, true);
      }
    }
  }, [bootLoading, route, session]);

  // --- ACTIONS INTERFACES ---

  // 1. Customer: Add Pest Problem Ticket
  const handleUploadPaymentReceipt = async (
    invoiceId: string,
    payload: { amount: number; payerName: string; transferTime: string; receiptDataUrl: string }
  ) => {
    const response = await fetch(`/api/invoices/${invoiceId}/receipt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.message || 'อัปโหลดสลิปไม่สำเร็จ');
    }

    const data = await response.json();
    await loadServerState();
    showToast(data.message || 'สลิปถูกยืนยันและสถานะชำระเงินอัปเดตแล้ว', 'success');
  };

  const handleAddProblem = async (newProb: {
    customerName: string;
    customerPhone: string;
    address: string;
    pestType: PestType;
    description: string;
    urgency: 'ต่ำ' | 'ปานกลาง' | 'สูง' | 'เร่งด่วนที่สุด';
  }) => {
    const response = await fetch('/api/problems', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(newProb)
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.message || 'เพิ่มรายการไม่สำเร็จ');
    }

    const data = await response.json();
    await loadServerState();
    showToast(`ส่งรายงานแจ้งเรื่องปลวก/แมลงรหัส ${data.problem.id} สำเร็จ!`);
  };

  // 2. Customer: Book Service Package
  const handleAddBooking = async (newBook: {
    packageId: string;
    packageName: string;
    customerName: string;
    customerPhone: string;
    address: string;
    bookingDate: string;
    price: number;
  }) => {
    const response = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(newBook)
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.message || 'จองบริการไม่สำเร็จ');
    }

    const data = await response.json();
    await loadServerState();
    showToast(`จองคิวบริการและออกบิลเลขที่ ${data.invoice.invoiceNo} สำเร็จ!`);
  };

  // 3. Admin: Assign/Dispatch technician team
  const handleAssignJob = async (
    sourceId: string, 
    sourceType: 'problem' | 'booking', 
    teamName: string, 
    date: string,
    title: string,
    desc: string
  ) => {
    const response = await fetch('/api/jobs/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ sourceId, sourceType, teamName, date, title, desc })
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.message || 'จัดคิวช่างไม่สำเร็จ');
    }

    const data = await response.json();
    await loadServerState();
    showToast(`จัดส่งคิวงานช่าง ${data.job.id} มอบหมายให้ ${teamName} เรียบร้อย`, 'info');
  };

  // 4. Technician: Update status in real time
  const handleUpdateJobStatus = async (jobId: string, status: JobStatus, updates?: Partial<TechnicianJob>) => {
    const response = await fetch(`/api/jobs/${jobId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ status, updates })
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.message || 'อัปเดตสถานะงานไม่สำเร็จ');
    }

    await loadServerState();
    showToast(`อัปเดตสถานะงาน ${jobId} เป็น: ${status}`, 'success');
  };

  // 5. Admin: Approve Job and activate contract
  const handleApproveJobCompletion = async (jobId: string) => {
    const response = await fetch(`/api/jobs/${jobId}/approve`, {
      method: 'POST',
      credentials: 'include'
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.message || 'ตรวจรับงานไม่สำเร็จ');
    }

    const data = await response.json();
    await loadServerState();
    showToast(`แอดมินตรวจรับสำเร็จ! เปิดสัญญารับประกันเลขที่ ${data.contract.documentNo} ดูแลระยะยาว 1 ปีให้ลูกค้าเรียบร้อย`);
  };

  // 6. Admin: Manual Invoice creation
  const handleAddInvoice = async (newInv: Omit<Invoice, 'id' | 'invoiceNo' | 'createdAt'>) => {
    const response = await fetch('/api/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(newInv)
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.message || 'สร้างใบวางบิลไม่สำเร็จ');
    }

    const data = await response.json();
    await loadServerState();
    showToast(`สร้างใบวางบิลคุมบัญชี ${data.invoice.invoiceNo} เรียบร้อย`);
  };

  // 7. Admin: Update Invoice Status (Receive Money)
  const handleUpdateInvoiceStatus = async (invoiceId: string, status: 'ค้างชำระ' | 'ชำระเงินแล้ว') => {
    const response = await fetch(`/api/invoices/${invoiceId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ status })
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.message || 'อัปเดตใบแจ้งหนี้ไม่สำเร็จ');
    }

    await loadServerState();
    showToast(`อัปเดตยอดชำระเงินเรียบร้อย บันทึกเข้าบัญชีส่วนกลาง`);
  };

  // 8. Admin: Add Team Member
  type NewTeamMemberPayload = Omit<TeamMember, 'id' | 'createdAt'> & { password: string };

  const handleAddTeamMember = async (member: NewTeamMemberPayload) => {
    const response = await fetch('/api/team-members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(member)
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.message || 'เพิ่มสมาชิกทีมไม่สำเร็จ');
    }

    await loadServerState();
    showToast(`เพิ่ม ${member.name} เข้าทีมงานเรียบร้อย`);
  };

  const handleAddTeam = async (team: Omit<Team, 'id' | 'createdAt'>) => {
    const response = await fetch('/api/teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(team)
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.message || 'สร้างทีมไม่สำเร็จ');
    }

    await loadServerState();
    showToast(`สร้างทีม '${team.name}' สำเร็จ`);
  };

  const handleUpdateTeam = async (teamId: string, updates: Partial<Team>) => {
    const response = await fetch(`/api/teams/${teamId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.message || 'อัปเดตทีมไม่สำเร็จ');
    }

    await loadServerState();
    showToast('อัปเดตข้อมูลทีมสำเร็จ');
  };

  // 9. Admin: Update Team Member
  const handleUpdateTeamMember = async (memberId: string, updates: Partial<TeamMember>) => {
    const response = await fetch(`/api/team-members/${memberId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.message || 'อัปเดตข้อมูลสมาชิกไม่สำเร็จ');
    }

    await loadServerState();
    showToast(`อัปเดตข้อมูลสมาชิกทีมเรียบร้อย`);
  };

  // 10. Admin: Delete Team Member
  const handleDeleteTeamMember = async (memberId: string) => {
    const response = await fetch(`/api/team-members/${memberId}`, {
      method: 'DELETE',
      credentials: 'include'
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.message || 'ลบสมาชิกทีมไม่สำเร็จ');
    }

    await loadServerState();
    showToast(`ลบสมาชิกทีมออกเรียบร้อย`);
  };

  if (bootLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#fff6db_0%,#f8fafc_35%,#eef2ff_100%)] text-slate-700">
        <div className="rounded-[28px] border border-black/10 bg-white/80 px-6 py-5 text-center shadow-xl backdrop-blur">
          <div className="mx-auto mb-3 h-10 w-10 animate-pulse rounded-2xl bg-amber-600" />
          <div className="text-sm font-extrabold">กำลังตรวจสอบเซสชัน...</div>
          <div className="mt-1 text-xs text-slate-500">เชื่อมต่อ backend และตรวจ token จาก cookie</div>
        </div>
      </div>
    );
  }

  if (!session) {
    if (route !== '/login') {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#fff6db_0%,#f8fafc_35%,#eef2ff_100%)] text-slate-700">
          <div className="rounded-[28px] border border-black/10 bg-white/80 px-6 py-5 text-center shadow-xl backdrop-blur">
            <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-2xl border-4 border-amber-200 border-t-amber-600" />
            <div className="text-sm font-extrabold">กำลังพากลับหน้า login...</div>
            <div className="mt-1 text-xs text-slate-500">หน้านี้ต้องเข้าสู่ระบบก่อนใช้งาน</div>
          </div>
        </div>
      );
    }

    return (
      <LoginPage onLogin={handleLogin} onRegister={handleRegister} loading={loginLoading} error={authError} />
    );
  }

  if (!routeIsAllowed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#fff6db_0%,#f8fafc_35%,#eef2ff_100%)] text-slate-700">
        <div className="rounded-[28px] border border-black/10 bg-white/80 px-6 py-5 text-center shadow-xl backdrop-blur">
          <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-2xl border-4 border-amber-200 border-t-amber-600" />
          <div className="text-sm font-extrabold">กำลังเปลี่ยนเส้นทาง...</div>
          <div className="mt-1 text-xs text-slate-500">กำลังตรวจสิทธิ์ของเซสชันนี้</div>
        </div>
      </div>
    );
  }

  const routeShellConfig = {
    customer: {
      title: 'NP Place Control Co., Ltd.',
      subtitle: 'งานแจ้งปัญหา จองบริการ และติดตามงานทั้งหมด',
      routeLabel: '/customer'
    },
    technician: {
      title: 'NP Place Control Co., Ltd.',
      subtitle: 'ตารางงานช่าง รายงานหน้างาน และอัปเดตสถานะ',
      routeLabel: '/technician'
    },
    user: {
      title: 'NP Place Control Co., Ltd.',
      subtitle: 'ศูนย์ควบคุมคำสั่งงาน แผนงาน และการเงิน',
      routeLabel: '/user'
    }
  }[session.role];

  return (
    <>
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-4 left-4 sm:left-auto sm:max-w-md bg-slate-900 text-white p-4 rounded-2xl shadow-xl z-50 border border-slate-800 flex items-center space-x-3 text-left"
          >
            <CheckCircle className="w-6 h-6 text-emerald-400 shrink-0" />
            <div>
              <p className="text-xs font-extrabold">{toast.message}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">ระบบจะซิงค์ข้อมูลลงฐานความจำเบราว์เซอร์อัตโนมัติ</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <RouteShell
        role={session.role}
        title={routeShellConfig.title}
        subtitle={routeShellConfig.subtitle}
        routeLabel={routeShellConfig.routeLabel}
        onLogout={handleLogout}
      >
        <Suspense
          fallback={
            <div className="flex min-h-[50vh] items-center justify-center rounded-[28px] border border-black/10 bg-white/80 p-6 text-slate-600 shadow-panel backdrop-blur">
              <div className="text-sm font-semibold">กำลังโหลดหน้าที่ต้องใช้งาน...</div>
            </div>
          }
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={`${session.role}-${route}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
            >
              {session.role === 'customer' && (
                <CustomerPortal
                  problems={problems}
                  onAddProblem={handleAddProblem}
                  packages={packages}
                  bookings={bookings}
                  onAddBooking={handleAddBooking}
                  contracts={contracts}
                  jobs={jobs}
                  invoices={invoices}
                  onUploadPaymentReceipt={handleUploadPaymentReceipt}
                />
              )}

              {session.role === 'technician' && (
                <TechnicianPortal
                  jobs={jobs}
                  teamRole={session.teamRole}
                  teamName={session.teamName}
                  onUpdateJobStatus={handleUpdateJobStatus}
                />
              )}

              {session.role === 'user' && (
                <AdminPortal
                  problems={problems}
                  bookings={bookings}
                  contracts={contracts}
                  jobs={jobs}
                  invoices={invoices}
                  packages={packages}
                  teamMembers={teamMembers}
                  teams={teams}
                  onAssignJob={handleAssignJob}
                  onAddInvoice={handleAddInvoice}
                  onUpdateInvoiceStatus={handleUpdateInvoiceStatus}
                  onApproveJobCompletion={handleApproveJobCompletion}
                  onAddTeamMember={handleAddTeamMember}
                  onUpdateTeamMember={handleUpdateTeamMember}
                  onDeleteTeamMember={handleDeleteTeamMember}
                  onAddTeam={handleAddTeam}
                  onUpdateTeam={handleUpdateTeam}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </Suspense>
      </RouteShell>
    </>
  );
}
