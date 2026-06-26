import React, { useState, useEffect } from 'react';
import { 
  Bug, 
  User, 
  Wrench, 
  ShieldAlert, 
  CheckCircle,
  Clock,
  Info,
  Layers,
  ChevronRight,
  Shield,
  BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Portal components
import CustomerPortal from './components/CustomerPortal';
import TechnicianPortal from './components/TechnicianPortal';
import AdminPortal from './components/AdminPortal';

// Seed & types
import { PortalRole, PestProblem, Booking, Contract, TechnicianJob, Invoice, JobStatus, PestType } from './types';
import { 
  INITIAL_PROBLEMS, 
  INITIAL_BOOKINGS, 
  INITIAL_CONTRACTS, 
  INITIAL_JOBS, 
  INITIAL_INVOICES, 
  INITIAL_PACKAGES 
} from './data';

export default function App() {
  const [role, setRole] = useState<PortalRole>('customer');

  // Load and sync unified local state from localStorage with fallback to Seed Data
  const [problems, setProblems] = useState<PestProblem[]>(() => {
    const saved = localStorage.getItem('bugguard_problems');
    return saved ? JSON.parse(saved) : INITIAL_PROBLEMS;
  });

  const [bookings, setBookings] = useState<Booking[]>(() => {
    const saved = localStorage.getItem('bugguard_bookings');
    return saved ? JSON.parse(saved) : INITIAL_BOOKINGS;
  });

  const [contracts, setContracts] = useState<Contract[]>(() => {
    const saved = localStorage.getItem('bugguard_contracts');
    return saved ? JSON.parse(saved) : INITIAL_CONTRACTS;
  });

  const [jobs, setJobs] = useState<TechnicianJob[]>(() => {
    const saved = localStorage.getItem('bugguard_jobs');
    return saved ? JSON.parse(saved) : INITIAL_JOBS;
  });

  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    const saved = localStorage.getItem('bugguard_invoices');
    return saved ? JSON.parse(saved) : INITIAL_INVOICES;
  });

  // Persist states automatically on change
  useEffect(() => {
    localStorage.setItem('bugguard_problems', JSON.stringify(problems));
  }, [problems]);

  useEffect(() => {
    localStorage.setItem('bugguard_bookings', JSON.stringify(bookings));
  }, [bookings]);

  useEffect(() => {
    localStorage.setItem('bugguard_contracts', JSON.stringify(contracts));
  }, [contracts]);

  useEffect(() => {
    localStorage.setItem('bugguard_jobs', JSON.stringify(jobs));
  }, [jobs]);

  useEffect(() => {
    localStorage.setItem('bugguard_invoices', JSON.stringify(invoices));
  }, [invoices]);

  // Notifications or toast indicator state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // --- ACTIONS INTERFACES ---

  // 1. Customer: Add Pest Problem Ticket
  const handleAddProblem = (newProb: {
    customerName: string;
    customerPhone: string;
    address: string;
    pestType: PestType;
    description: string;
    urgency: 'ต่ำ' | 'ปานกลาง' | 'สูง' | 'เร่งด่วนที่สุด';
  }) => {
    const nextId = `prob-${100 + problems.length + 1}`;
    const entry: PestProblem = {
      ...newProb,
      id: nextId,
      createdAt: new Date().toISOString(),
      status: 'รอดำเนินการ'
    };
    setProblems(prev => [entry, ...prev]);
    showToast(`ส่งรายงานแจ้งเรื่องปลวก/แมลงรหัส ${nextId} สำเร็จ!`);
  };

  // 2. Customer: Book Service Package
  const handleAddBooking = (newBook: {
    packageId: string;
    packageName: string;
    customerName: string;
    customerPhone: string;
    address: string;
    bookingDate: string;
    price: number;
  }) => {
    const nextBookId = `book-${200 + bookings.length + 1}`;
    const nextInvoiceNo = `INV-2026-00${invoices.length + 1}`;
    
    // Register Booking
    const entry: Booking = {
      id: nextBookId,
      ...newBook,
      status: 'ชำระเงินแล้ว', // Simulating instant online credit card/mobile banking success
      invoiceNo: nextInvoiceNo
    };

    // Auto-generate corresponding Invoice
    const invoiceEntry: Invoice = {
      id: `inv-${400 + invoices.length + 1}`,
      invoiceNo: nextInvoiceNo,
      customerName: newBook.customerName,
      customerPhone: newBook.customerPhone,
      address: newBook.address,
      description: `ชำระค่าซื้อบริการแพ็กเกจ ${newBook.packageName}`,
      amount: newBook.price,
      vat: Math.round(newBook.price * 0.07),
      totalAmount: Math.round(newBook.price * 1.07),
      status: 'ชำระเงินแล้ว',
      dueDate: newBook.bookingDate,
      createdAt: new Date().toISOString().split('T')[0]
    };

    setBookings(prev => [entry, ...prev]);
    setInvoices(prev => [invoiceEntry, ...prev]);
    showToast(`จองคิวบริการและออกบิลเลขที่ ${nextInvoiceNo} สำเร็จ!`);
  };

  // 3. Admin: Assign/Dispatch technician team
  const handleAssignJob = (
    sourceId: string, 
    sourceType: 'problem' | 'booking', 
    teamName: string, 
    date: string,
    title: string,
    desc: string
  ) => {
    // Generate new Tech Job
    const nextJobId = `job-${500 + jobs.length + 1}`;
    const sourceObjName = sourceType === 'problem' 
      ? (problems.find(p => p.id === sourceId)?.customerName || '')
      : (bookings.find(b => b.id === sourceId)?.customerName || '');

    const sourcePhone = sourceType === 'problem' 
      ? (problems.find(p => p.id === sourceId)?.customerPhone || '')
      : (bookings.find(b => b.id === sourceId)?.customerPhone || '');

    const sourceAddress = sourceType === 'problem' 
      ? (problems.find(p => p.id === sourceId)?.address || '')
      : (bookings.find(b => b.id === sourceId)?.address || '');

    const newJob: TechnicianJob = {
      id: nextJobId,
      sourceId,
      sourceType,
      title,
      description: desc,
      customerName: sourceObjName,
      customerPhone: sourcePhone,
      address: sourceAddress,
      appointmentDate: date,
      assignedTeam: teamName,
      status: 'กำลังเตรียมตัว'
    };

    setJobs(prev => [newJob, ...prev]);

    // Update Source Status
    if (sourceType === 'problem') {
      setProblems(prev => prev.map(p => p.id === sourceId ? {
        ...p,
        status: 'จัดสรรคิวช่างแล้ว',
        assignedTeam: teamName,
        appointmentDate: date
      } : p));
    } else {
      setBookings(prev => prev.map(b => b.id === sourceId ? {
        ...b,
        status: 'กำลังจัดทีมงาน'
      } : b));
    }

    showToast(`จัดส่งคิวงานช่าง ${nextJobId} มอบหมายให้ ${teamName} เรียบร้อย`, 'info');
  };

  // 4. Technician: Update status in real time
  const handleUpdateJobStatus = (jobId: string, status: JobStatus, updates?: Partial<TechnicianJob>) => {
    setJobs(prev => prev.map(job => {
      if (job.id === jobId) {
        const updatedJob = { ...job, status, ...updates };
        
        // Sync with source Problem or Booking Statuses
        if (job.sourceType === 'problem') {
          setProblems(problemsPrev => problemsPrev.map(p => p.id === job.sourceId ? {
            ...p,
            status: status === 'ส่งงานแล้ว' ? 'กำลังดำเนินการ' : p.status
          } : p));
        } else {
          setBookings(bookingsPrev => bookingsPrev.map(b => b.id === job.sourceId ? {
            ...b,
            status: status === 'ส่งงานแล้ว' ? 'กำลังจัดทีมงาน' : b.status
          } : b));
        }

        return updatedJob;
      }
      return job;
    }));

    showToast(`อัปเดตสถานะงาน ${jobId} เป็น: ${status}`, 'success');
  };

  // 5. Admin: Approve Job and activate contract
  const handleApproveJobCompletion = (jobId: string) => {
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;

    // Move Job to completed
    setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: 'เสร็จสิ้นและตรวจรับ' } : j));

    // Update parent sources
    if (job.sourceType === 'problem') {
      setProblems(prev => prev.map(p => p.id === job.sourceId ? { ...p, status: 'เสร็จสิ้น' } : p));
    } else {
      setBookings(prev => prev.map(b => b.id === job.sourceId ? { ...b, status: 'เสร็จสิ้น' } : b));
    }

    // Auto-spawn annual contract for customer if it is a new booking
    const contractNo = `CONT-2026-${300 + contracts.length + 1}`;
    const nextYearDate = new Date();
    nextYearDate.setFullYear(nextYearDate.getFullYear() + 1);

    const newContract: Contract = {
      id: `cont-${300 + contracts.length + 1}`,
      customerName: job.customerName,
      customerPhone: job.customerPhone,
      address: job.address,
      packageName: job.title.includes('พ่นเคมี') ? 'สัญญาฉีดพ่นเคมีป้องกันใต้ดิน (Soil Treatment)' : 'สัญญาบริการป้องกันกำจัดแมลงและปลวกระบบเหยื่อ Nemesis (1 ปี)',
      startDate: new Date().toISOString().split('T')[0],
      endDate: nextYearDate.toISOString().split('T')[0],
      totalVisits: job.title.includes('พ่นเคมี') ? 2 : 12,
      completedVisits: 1,
      nextVisitDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Next month check
      price: job.title.includes('พ่นเคมี') ? 8500 : 15000,
      status: 'เปิดใช้งาน',
      documentNo: contractNo
    };

    setContracts(prev => [newContract, ...prev]);
    showToast(`แอดมินตรวจรับสำเร็จ! เปิดสัญญารับประกันเลขที่ ${contractNo} ดูแลระยะยาว 1 ปีให้ลูกค้าเรียบร้อย`);
  };

  // 6. Admin: Manual Invoice creation
  const handleAddInvoice = (newInv: Omit<Invoice, 'id' | 'invoiceNo' | 'createdAt'>) => {
    const nextInvNo = `INV-2026-00${invoices.length + 1}`;
    const entry: Invoice = {
      id: `inv-${400 + invoices.length + 1}`,
      invoiceNo: nextInvNo,
      ...newInv,
      createdAt: new Date().toISOString().split('T')[0]
    };
    setInvoices(prev => [entry, ...prev]);
    showToast(`สร้างใบวางบิลคุมบัญชี ${nextInvNo} เรียบร้อย`);
  };

  // 7. Admin: Update Invoice Status (Receive Money)
  const handleUpdateInvoiceStatus = (invoiceId: string, status: 'ค้างชำระ' | 'ชำระเงินแล้ว') => {
    setInvoices(prev => prev.map(inv => inv.id === invoiceId ? { ...inv, status } : inv));
    showToast(`อัปเดตยอดชำระเงินเรียบร้อย บันทึกเข้าบัญชีส่วนกลาง`);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans" id="app-root">
      
      {/* 1. Header Navigation & Multi-user Role Switcher Widget */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 py-3.5 flex flex-col sm:flex-row justify-between items-center gap-4">
          
          {/* Logo Brand */}
          <div className="flex items-center space-x-3">
            <div className="bg-amber-600 p-2.5 rounded-xl text-white shadow-sm flex items-center justify-center">
              <Bug className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-md font-extrabold text-slate-800 tracking-tight flex items-center">
                <span>ทีมงานกำจัดปลวก</span>
                <span className="text-xs bg-amber-100 text-amber-800 font-black px-2 py-0.5 rounded-md ml-2 font-mono">BugGuard Control</span>
              </h1>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">ระบบบริหารจัดการพ่นยาและสัญญาบริการครบวงจร</p>
            </div>
          </div>

          {/* User Role Switcher - Essential for testing the complete interactive loop on preview */}
          <div className="bg-slate-100 p-1 rounded-2xl flex items-center border border-slate-200">
            <span className="text-[10px] font-bold text-slate-400 px-3 hidden md:inline uppercase">จำลองผู้ใช้งาน:</span>
            
            <button
              id="switch-customer"
              onClick={() => setRole('customer')}
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                role === 'customer'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>ลูกค้า</span>
            </button>

            <button
              id="switch-technician"
              onClick={() => setRole('technician')}
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                role === 'technician'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>ช่างหน้างาน</span>
            </button>

            <button
              id="switch-admin"
              onClick={() => setRole('admin')}
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                role === 'admin'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>แอดมิน</span>
            </button>
          </div>

        </div>
      </header>

      {/* 2. Unified Status Toast Notification Block */}
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

      {/* 3. Main Application Stage */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        
        {/* Dynamic Role Explanation Banner */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-4 mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start space-x-3 text-left">
            <div className="bg-amber-50 p-2.5 rounded-xl shrink-0">
              <Layers className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h4 className="text-xs font-extrabold text-slate-800">
                {role === 'customer' && '👤 ส่วนระบบลูกค้า: ใช้ค้นหาแพ็กเกจ จองคิวบริการ แจ้งเรื่องปัญหามดปลวก และส่องสัญญา'}
                {role === 'technician' && '🛠️ ส่วนระบบช่างพ่นสารเคมี: ใช้เปิดเช็กตารางงานของแต่ละทีม อัปพิกัดแผนที่ กดเดินทาง เริ่มงาน และอัปรูปเคมีรายงานผล'}
                {role === 'admin' && '🔑 ส่วนผู้ดูแลระบบส่วนกลาง: สำหรับเปิดกระดานควบคุม อนุมัติคิวช่าง จัดคิวทำรายงาน ตรวจรับภาพผลงานช่าง และเคาะออกใบเสร็จ'}
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                {role === 'customer' && 'ท่านสามารถกดเลือกแพ็กเกจ Nemesis หรือแจ้งปัญหามดเพื่อทดสอบ จากนั้นสลับบทบาทเป็น แอดมิน เพื่อส่งงานต่อให้ช่างได้ทันที'}
                {role === 'technician' && 'ท่านสามารถเลือกเปลี่ยนทีมช่าง เช่น "ทีมช่าง A (กรุงเทพฯ)" เพื่อตรวจสอบคิวที่แอดมินมอบหมายเข้ามา กดนำทาง และบันทึกพ่นเคมี'}
                {role === 'admin' && 'จัดการคำสั่งจองแพ็กเกจของลูกค้า หรือจัดช่างลงตรวจสอบ และกด ตรวจรับงาน เพื่อเปิดใช้สัญญารับประกัน 1 ปีเข้าสู่ลูกค้าโดยสมบูรณ์'}
              </p>
            </div>
          </div>
          
          <div className="shrink-0 flex items-center space-x-1 bg-amber-50 text-amber-800 text-[10px] font-black px-2.5 py-1.5 rounded-lg border border-amber-100">
            <Shield className="w-3.5 h-3.5 text-amber-600" />
            <span>ระบบจำลองเวิร์กโฟลว์ 3 มิติ</span>
          </div>
        </div>

        {/* Portals Router view */}
        <AnimatePresence mode="wait">
          <motion.div
            key={role}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
          >
            {role === 'customer' && (
              <CustomerPortal
                problems={problems}
                onAddProblem={handleAddProblem}
                packages={INITIAL_PACKAGES}
                bookings={bookings}
                onAddBooking={handleAddBooking}
                contracts={contracts}
                jobs={jobs}
              />
            )}

            {role === 'technician' && (
              <TechnicianPortal
                jobs={jobs}
                onUpdateJobStatus={handleUpdateJobStatus}
              />
            )}

            {role === 'admin' && (
              <AdminPortal
                problems={problems}
                bookings={bookings}
                contracts={contracts}
                jobs={jobs}
                invoices={invoices}
                packages={INITIAL_PACKAGES}
                onAssignJob={handleAssignJob}
                onAddInvoice={handleAddInvoice}
                onUpdateInvoiceStatus={handleUpdateInvoiceStatus}
                onApproveJobCompletion={handleApproveJobCompletion}
              />
            )}
          </motion.div>
        </AnimatePresence>

      </main>

      {/* 4. Elegant Footer with structural rules */}
      <footer className="bg-white border-t border-slate-100 mt-12 py-6 text-center text-slate-400 text-xs">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center space-x-1.5">
            <Bug className="w-4 h-4 text-amber-600" />
            <span className="font-bold text-slate-700">ทีมงานกำจัดปลวก Insect Control Spray Portal</span>
          </div>
          <div className="text-[11px] text-slate-400">
            ระบบจำลองงานและพิกัดแผนที่ • สิทธิ์คุ้มครองสัญญาสารเคมี อย. ปลอดภัย 100% • © 2026
          </div>
        </div>
      </footer>

    </div>
  );
}
