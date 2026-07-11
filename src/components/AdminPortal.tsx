import React, { useState, useEffect } from 'react';
import { 
  Building, 
  TrendingUp, 
  DollarSign, 
  Users, 
  AlertTriangle, 
  PlusCircle, 
  FileText, 
  Calendar, 
  Eye, 
  Printer, 
  Wrench, 
  Briefcase, 
  Clock,
  Droplet
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  AreaChart, 
  Area,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { PestProblem, ServicePackage, Booking, Contract, TechnicianJob, Invoice, TeamMember, TeamMemberRole, Team } from '../types';

type NewTeamMemberPayload = Omit<TeamMember, 'id' | 'createdAt'> & { password: string };

interface AdminPortalProps {
  problems: PestProblem[];
  bookings: Booking[];
  contracts: Contract[];
  jobs: TechnicianJob[];
  invoices: Invoice[];
  packages: ServicePackage[];
  teamMembers: TeamMember[];
  teams: Team[];
  onAssignJob: (sourceId: string, sourceType: 'problem' | 'booking', teamName: string, date: string, title: string, desc: string) => Promise<void> | void;
  onAddInvoice: (invoice: Omit<Invoice, 'id' | 'invoiceNo' | 'createdAt'>) => Promise<void> | void;
  onUpdateInvoiceStatus: (invoiceId: string, status: 'ค้างชำระ' | 'ชำระเงินแล้ว') => Promise<void> | void;
  onApproveJobCompletion: (jobId: string) => Promise<void> | void;
  onAddTeamMember: (member: NewTeamMemberPayload) => Promise<void> | void;
  onUpdateTeamMember: (memberId: string, updates: Partial<TeamMember> & { password?: string }) => Promise<void> | void;
  onDeleteTeamMember: (memberId: string) => Promise<void> | void;
  onAddTeam: (team: Omit<Team, 'id' | 'createdAt'>) => Promise<void> | void;
  onUpdateTeam: (teamId: string, updates: Partial<Team>) => Promise<void> | void;
}

export default function AdminPortal({
  problems,
  bookings,
  contracts,
  jobs,
  invoices,
  packages,
  teamMembers,
  teams,
  onAssignJob,
  onAddInvoice,
  onUpdateInvoiceStatus,
  onApproveJobCompletion,
  onAddTeamMember,
  onUpdateTeamMember,
  onDeleteTeamMember,
  onAddTeam,
  onUpdateTeam
}: AdminPortalProps) {
  const [adminTab, setAdminTab] = useState<'dashboard' | 'assignments' | 'billing' | 'history' | 'team'>('dashboard');

  // Dispatch/Scheduling form states
  const [selectedSourceId, setSelectedSourceId] = useState<string>('');
  const [selectedSourceType, setSelectedSourceType] = useState<'problem' | 'booking'>('problem');
  const [assignedTeam, setAssignedTeam] = useState<string>('');
  const [appointmentDate, setAppointmentDate] = useState<string>('');
  const [dispatchSuccess, setDispatchSuccess] = useState(false);

  useEffect(() => {
    if (!assignedTeam && teams.length > 0) {
      setAssignedTeam(teams[0].name);
    }
  }, [teams, assignedTeam]);

  // Invoice creator form states
  const [invoiceForm, setInvoiceForm] = useState({
    customerName: '',
    customerPhone: '',
    address: '',
    description: 'ค่าบริการสัญญาพ่นสเปรย์กำจัดปลวกประจำปี',
    amount: 12000,
    dueDate: ''
  });
  const [invoiceSuccess, setInvoiceSuccess] = useState(false);

  // Team member form states
  const [teamForm, setTeamForm] = useState({
    name: '',
    phone: '',
    email: '',
    username: '',
    password: '',
    role: 'team_member' as TeamMemberRole,
    teamId: '',
    teamName: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [teamSuccess, setTeamSuccess] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);

  const [teamSectionForm, setTeamSectionForm] = useState({ name: '', description: '' });
  const [teamSectionSuccess, setTeamSectionSuccess] = useState(false);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);

  // Selected Invoice for printing/detail modal
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);
  const [viewJob, setViewJob] = useState<TechnicianJob | null>(null);
  const [expandedJobPhoto, setExpandedJobPhoto] = useState<string | null>(null);

  // Real-time calculation of statistics
  const totalRevenue = invoices
    .filter(inv => inv.status === 'ชำระเงินแล้ว')
    .reduce((sum, inv) => sum + inv.totalAmount, 0);

  const pendingBookings = bookings.filter(b => b.status === 'รอยืนยัน').length;
  const pendingProblems = problems.filter(p => p.status === 'รอดำเนินการ').length;
  const activeJobsCount = jobs.filter(j => j.status !== 'เสร็จสิ้นและตรวจรับ').length;

  // Prepare Recharts Data for Pest Problems Chart
  const pestBreakdownData = [
    { name: 'ปลวก', count: problems.filter(p => p.pestType === 'ปลวก').length },
    { name: 'มด', count: problems.filter(p => p.pestType === 'มด').length },
    { name: 'แมลงสาบ', count: problems.filter(p => p.pestType === 'แมลงสาบ').length },
    { name: 'หนู', count: problems.filter(p => p.pestType === 'หนู').length },
    { name: 'อื่นๆ', count: problems.filter(p => p.pestType === 'อื่นๆ').length }
  ];

  const PEST_COLORS = ['#d97706', '#dc2626', '#475569', '#2563eb', '#8b5cf6'];

  // Prepare Sales/Booking Income Data
  const bookingTrendData = [
    { name: 'พ.ค.', รายรับ: 24000, ยอดจอง: 3 },
    { name: 'มิ.ย.', รายรับ: 35000, ยอดจอง: 4 },
    { name: 'ก.ค.', รายรับ: totalRevenue, ยอดจอง: bookings.length + problems.filter(p => p.status === 'เสร็จสิ้น').length }
  ];

  const handleDispatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSourceId || !appointmentDate) {
      alert('กรุณาเลือกรายการจอง/แจ้งปัญหา และกำหนดวันลงนัดหมาย');
      return;
    }

    let title = '';
    let desc = '';
    
    if (selectedSourceType === 'problem') {
      const prob = problems.find(p => p.id === selectedSourceId);
      if (prob) {
        title = `กำจัด${prob.pestType}หน้างานเร่งด่วน`;
        desc = prob.description;
      }
    } else {
      const book = bookings.find(b => b.id === selectedSourceId);
      if (book) {
        title = `พ่นเคมีบริการติดตั้ง: ${book.packageName.split(' (')[0]}`;
        desc = `ลูกค้าซื้อแพ็กเกจ ${book.packageName} นัดวันประเมินความปลอดภัยครั้งแรก`;
      }
    }

    try {
      await onAssignJob(selectedSourceId, selectedSourceType, assignedTeam, appointmentDate, title, desc);
      setDispatchSuccess(true);
      setTimeout(() => {
        setDispatchSuccess(false);
        setSelectedSourceId('');
        setAppointmentDate('');
      }, 2000);
    } catch {
      alert('จัดคิวงานไม่สำเร็จ');
    }
  };

  const handleInvoiceCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceForm.customerName || !invoiceForm.customerPhone || !invoiceForm.address || !invoiceForm.dueDate) {
      alert('กรุณากรอกข้อมูลเพื่อจัดทำใบแจ้งหนี้ให้ครบถ้วน');
      return;
    }

    const amount = Number(invoiceForm.amount);
    const vat = amount * 0.07;
    const totalAmount = amount + vat;

    try {
      await onAddInvoice({
        customerName: invoiceForm.customerName,
        customerPhone: invoiceForm.customerPhone,
        address: invoiceForm.address,
        description: invoiceForm.description,
        amount,
        vat,
        totalAmount,
        status: 'ค้างชำระ',
        dueDate: invoiceForm.dueDate
      });

      setInvoiceSuccess(true);
      setTimeout(() => {
        setInvoiceSuccess(false);
        setInvoiceForm({
          customerName: '',
          customerPhone: '',
          address: '',
          description: 'ค่าบริการสัญญาพ่นสเปรย์กำจัดปลวกประจำปี',
          amount: 12000,
          dueDate: ''
        });
      }, 2000);
    } catch {
      alert('สร้างใบแจ้งหนี้ไม่สำเร็จ');
    }
  };

  return (
    <div className="space-y-6 text-left" id="admin-portal">
      
      {/* Tab Selectors */}
      <div className="flex border-b border-slate-100 overflow-x-auto whitespace-nowrap">
        <button
          onClick={() => setAdminTab('dashboard')}
          className={`px-5 py-3 text-xs font-bold transition-colors border-b-2 flex items-center space-x-2 ${
            adminTab === 'dashboard'
              ? 'border-amber-600 text-amber-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>แดชบอร์ด & ภาพรวมธุรกิจ</span>
        </button>
        <button
          onClick={() => setAdminTab('assignments')}
          className={`px-5 py-3 text-xs font-bold transition-colors border-b-2 flex items-center space-x-2 ${
            adminTab === 'assignments'
              ? 'border-amber-600 text-amber-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Wrench className="w-4 h-4" />
          <span>การจัดวันลงงานช่าง & สัญญา</span>
          {(pendingProblems > 0 || pendingBookings > 0) && (
            <span className="bg-rose-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold ml-1">
              {pendingProblems + pendingBookings}
            </span>
          )}
        </button>
        <button
          onClick={() => setAdminTab('billing')}
          className={`px-5 py-3 text-xs font-bold transition-colors border-b-2 flex items-center space-x-2 ${
            adminTab === 'billing'
              ? 'border-amber-600 text-amber-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>การออกบิล & ใบเสร็จ</span>
        </button>
        <button
          onClick={() => setAdminTab('history')}
          className={`px-5 py-3 text-xs font-bold transition-colors border-b-2 flex items-center space-x-2 ${
            adminTab === 'history'
              ? 'border-amber-600 text-amber-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>ประวัติงาน & รายงานสารเคมี</span>
        </button>
        <button
          onClick={() => setAdminTab('team')}
          className={`px-5 py-3 text-xs font-bold transition-colors border-b-2 flex items-center space-x-2 ${
            adminTab === 'team'
              ? 'border-amber-600 text-amber-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>ตั้งค่าบัญชี-ลูกน้อง</span>
        </button>
      </div>

      {/* TAB 1: DASHBOARD */}
      {adminTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center space-x-4">
              <div className="p-3 bg-emerald-50 rounded-xl">
                <DollarSign className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">รายรับสุทธิ (ชำระแล้ว)</span>
                <span className="text-xl font-extrabold text-slate-800 font-mono">฿{totalRevenue.toLocaleString()}</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center space-x-4">
              <div className="p-3 bg-amber-50 rounded-xl">
                <Users className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">สัญญาบริการที่ดูแล</span>
                <span className="text-xl font-extrabold text-slate-800 font-mono">{contracts.length} สัญญา</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center space-x-4">
              <div className="p-3 bg-amber-50 rounded-xl">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">ปัญหาค้างจัดสรรทีม</span>
                <span className="text-xl font-extrabold text-red-600 font-mono">{pendingProblems} เรื่อง</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center space-x-4">
              <div className="p-3 bg-indigo-50 rounded-xl">
                <TrendingUp className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">คิวช่างกำลังลงงานวันนี้</span>
                <span className="text-xl font-extrabold text-slate-800 font-mono">{activeJobsCount} คิว</span>
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Chart 1: Sales / Booking Value */}
            <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
              <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-amber-600" />
                <span>แนวโน้มยอดขายและค่าบริการรับเงิน (บาท)</span>
              </h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={bookingTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                    <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '12px' }} formatter={(val) => [`฿${val.toLocaleString()}`, 'รายรับ']} />
                    <Area type="monotone" dataKey="รายรับ" stroke="#d97706" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRevenue)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Pest Type breakdown */}
            <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
              <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>สัดส่วนประเภทศัตรูพืชที่ได้รับแจ้ง</span>
              </h3>
              <div className="h-64 w-full flex flex-col justify-between">
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pestBreakdownData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={5}
                        dataKey="count"
                      >
                        {pestBreakdownData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={PEST_COLORS[index % PEST_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value} รายการ`, 'สัดส่วน']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-5 gap-1 text-center pt-2">
                  {pestBreakdownData.map((entry, idx) => (
                    <div key={entry.name}>
                      <span className="w-2.5 h-2.5 rounded-full inline-block mr-1" style={{ backgroundColor: PEST_COLORS[idx] }}></span>
                      <span className="text-[10px] text-slate-500 block font-bold">{entry.name} ({entry.count})</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* TAB 2: SCHEDULING & ASSIGNMENTS */}
      {adminTab === 'assignments' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Dispatcher Scheduling form */}
          <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs h-fit space-y-4">
            <h3 className="text-sm font-extrabold text-slate-800 pb-2 border-b border-slate-100 flex items-center">
              <Calendar className="w-4.5 h-4.5 text-amber-600 mr-1.5" />
              <span>จัดทีมช่าง & ยืนยันกำหนดการ</span>
            </h3>

            {dispatchSuccess ? (
              <div className="bg-emerald-50 text-emerald-800 p-4 rounded-xl border border-emerald-100 text-xs text-center font-bold">
                จัดส่งคิวช่างสำเร็จ! ช่างเทคนิคจะได้รับแจ้งตารางงานบนแอปช่างทันที
              </div>
            ) : (
              <form onSubmit={handleDispatchSubmit} className="space-y-4">
                
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">เลือกความต้องการของลูกค้า *</label>
                  <select
                    value={`${selectedSourceType}:${selectedSourceId}`}
                    onChange={(e) => {
                      const [type, id] = e.target.value.split(':');
                      setSelectedSourceType(type as any);
                      setSelectedSourceId(id);
                    }}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 text-slate-700"
                  >
                    <option value="">-- เลือกคิวร้องขอที่กำลังรอช่าง --</option>
                    
                    <optgroup label="ปัญหาแจ้งซ่อมเร่งด่วน">
                      {problems.filter(p => p.status === 'รอดำเนินการ').map(p => (
                        <option key={p.id} value={`problem:${p.id}`}>
                          {p.id} - {p.customerName} ({p.pestType})
                        </option>
                      ))}
                    </optgroup>

                    <optgroup label="คิวจองซื้อแพ็กเกจใหม่">
                      {bookings.filter(b => b.status === 'ชำระเงินแล้ว' || b.status === 'รอยืนยัน').map(b => (
                        <option key={b.id} value={`booking:${b.id}`}>
                          {b.id} - {b.customerName} ({b.packageName.split(' (')[0]})
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">จัดสรรทีมช่างรับผิดชอบ *</label>
                  <select
                    value={assignedTeam}
                    onChange={e => setAssignedTeam(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 text-slate-700"
                  >
                    <option value="">-- เลือกทีม --</option>
                    {teams.length === 0 ? (
                      <option value="" disabled>ยังไม่มีทีม กรุณาสร้างทีมก่อน</option>
                    ) : (
                      teams.map((team) => (
                        <option key={team.id} value={team.name}>
                          {team.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ระบุวันนัดหมายเข้าสแกนปลวก *</label>
                  <input
                    type="date"
                    required
                    value={appointmentDate}
                    onChange={e => setAppointmentDate(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs border border-slate-200 rounded-xl text-slate-700"
                  />
                </div>

                <button
                  type="submit"
                  id="btn-confirm-dispatch"
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
                >
                  อนุมัติจัดส่งทีมช่างทันที
                </button>
              </form>
            )}
          </div>

          {/* Queues Table: Waiting problems and packages */}
          <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-6">
            
            {/* Queue 1: Pest Problems Pending */}
            <div>
              <h3 className="text-xs font-extrabold text-red-600 uppercase tracking-wider mb-3 flex items-center">
                <AlertTriangle className="w-4 h-4 mr-1.5" />
                <span>คิวแจ้งเรื่องปัญหาปลวก/แมลงที่รอการจัดสรรช่าง ({pendingProblems} เรื่อง)</span>
              </h3>

              {problems.filter(p => p.status === 'รอดำเนินการ').length === 0 ? (
                <div className="p-4 bg-slate-50 rounded-xl text-xs text-center text-slate-500 border border-slate-100">
                  ไม่มีปัญหาค้างอยู่ ทุกเรื่องได้รับการจัดสรรคิวช่างดูแลเรียบร้อยแล้ว
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-100 rounded-xl">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 text-slate-600 text-left border-b border-slate-100">
                      <tr>
                        <th className="p-3">รหัสแจ้งเรื่อง</th>
                        <th className="p-3">ลูกค้า</th>
                        <th className="p-3">ชนิดที่พบ</th>
                        <th className="p-3">ระดับความรุนแรง</th>
                        <th className="p-3">วันที่แจ้ง</th>
                        <th className="p-3">การจัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {problems.filter(p => p.status === 'รอดำเนินการ').map((prob) => (
                        <tr key={prob.id} className="hover:bg-slate-50/55">
                          <td className="p-3 font-mono font-bold text-slate-700">{prob.id}</td>
                          <td className="p-3">
                            <div className="font-semibold text-slate-800">{prob.customerName}</div>
                            <div className="text-[10px] text-slate-500">{prob.customerPhone}</div>
                          </td>
                          <td className="p-3">
                            <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-bold">
                              {prob.pestType}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                              prob.urgency === 'เร่งด่วนที่สุด' 
                                ? 'bg-red-100 text-red-800' 
                                : prob.urgency === 'สูง' 
                                  ? 'bg-orange-100 text-orange-800' 
                                  : 'bg-slate-100 text-slate-600'
                            }`}>
                              {prob.urgency}
                            </span>
                          </td>
                          <td className="p-3 text-slate-500">{new Date(prob.createdAt).toLocaleDateString('th-TH')}</td>
                          <td className="p-3">
                            <button
                              onClick={() => {
                                setSelectedSourceType('problem');
                                setSelectedSourceId(prob.id);
                                setAppointmentDate(new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]); // Default tomorrow
                              }}
                              className="bg-amber-50 text-amber-800 px-2.5 py-1.5 rounded-lg font-bold text-[11px] hover:bg-amber-100 cursor-pointer"
                            >
                              จัดช่าง
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Queue 2: Package Booking requests */}
            <div>
              <h3 className="text-xs font-extrabold text-indigo-700 uppercase tracking-wider mb-3 flex items-center">
                <Briefcase className="w-4 h-4 mr-1.5" />
                <span>คิวคำสั่งซื้อแพ็กเกจที่ลูกค้ารอแจ้งคิวพ่นยา ({pendingBookings} เรื่อง)</span>
              </h3>

              {bookings.filter(b => b.status === 'รอยืนยัน' || b.status === 'ชำระเงินแล้ว').length === 0 ? (
                <div className="p-4 bg-slate-50 rounded-xl text-xs text-center text-slate-500 border border-slate-100">
                  ไม่มีคิวจองซื้อแพ็กเกจค้างอยู่คิวช่าง
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-100 rounded-xl">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 text-slate-600 text-left border-b border-slate-100">
                      <tr>
                        <th className="p-3">เลขที่จอง</th>
                        <th className="p-3">ลูกค้า</th>
                        <th className="p-3">บริการที่สั่งซื้อ</th>
                        <th className="p-3">ยอดชำระ</th>
                        <th className="p-3">สถานะเงิน</th>
                        <th className="p-3">การจัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {bookings.filter(b => b.status === 'รอยืนยัน' || b.status === 'ชำระเงินแล้ว').map((book) => (
                        <tr key={book.id} className="hover:bg-slate-50/55">
                          <td className="p-3 font-mono font-bold text-slate-700">{book.id}</td>
                          <td className="p-3">
                            <div className="font-semibold text-slate-800">{book.customerName}</div>
                            <div className="text-[10px] text-slate-500">{book.customerPhone}</div>
                          </td>
                          <td className="p-3 font-bold text-slate-700 truncate max-w-[150px]">{book.packageName}</td>
                          <td className="p-3 font-mono font-bold">฿{book.price.toLocaleString()}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              book.status === 'ชำระเงินแล้ว' 
                                ? 'bg-emerald-50 text-emerald-800' 
                                : 'bg-amber-100 text-amber-900'
                            }`}>
                              {book.status}
                            </span>
                          </td>
                          <td className="p-3">
                            <button
                              onClick={() => {
                                setSelectedSourceType('booking');
                                setSelectedSourceId(book.id);
                                setAppointmentDate(book.bookingDate);
                              }}
                              className="bg-indigo-50 text-indigo-800 px-2.5 py-1.5 rounded-lg font-bold text-[11px] hover:bg-indigo-100 cursor-pointer"
                            >
                              นัดวันช่าง
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* TAB 3: BILLING & INVOICING */}
      {adminTab === 'billing' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Form to issue/generate invoice */}
          <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs h-fit space-y-4">
            <h3 className="text-sm font-extrabold text-slate-800 pb-2 border-b border-slate-100 flex items-center">
              <PlusCircle className="w-4.5 h-4.5 text-amber-600 mr-1.5" />
              <span>สร้างใบแจ้งหนี้ / ใบวางบิลใหม่</span>
            </h3>

            {invoiceSuccess ? (
              <div className="bg-emerald-50 text-emerald-800 p-4 rounded-xl border border-emerald-100 text-xs text-center font-bold">
                จัดทำใบแจ้งหนี้สำเร็จ! บันทึกลงระบบตรวจสอบบัญชีเรียบร้อย
              </div>
            ) : (
              <form onSubmit={handleInvoiceCreateSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ชื่อลูกค้าผู้รับบิล *</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น คุณณรงค์ รักสะอาด"
                    value={invoiceForm.customerName}
                    onChange={e => setInvoiceForm({ ...invoiceForm, customerName: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">เบอร์โทรศัพท์ติดต่อ *</label>
                  <input
                    type="tel"
                    required
                    placeholder="เช่น 0891234567"
                    value={invoiceForm.customerPhone}
                    onChange={e => setInvoiceForm({ ...invoiceForm, customerPhone: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ที่อยู่ออกใบกำกับภาษี *</label>
                  <textarea
                    required
                    rows={2}
                    placeholder="เลขที่อาคาร ถนน แขวง/เขต"
                    value={invoiceForm.address}
                    onChange={e => setInvoiceForm({ ...invoiceForm, address: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">รายการคำอธิบายบริการ *</label>
                  <input
                    type="text"
                    required
                    value={invoiceForm.description}
                    onChange={e => setInvoiceForm({ ...invoiceForm, description: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">ราคาฐาน (ไม่รวม Vat) *</label>
                    <input
                      type="number"
                      required
                      value={invoiceForm.amount}
                      onChange={e => setInvoiceForm({ ...invoiceForm, amount: Number(e.target.value) })}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl text-slate-700 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">กำหนดชำระเงิน *</label>
                    <input
                      type="date"
                      required
                      value={invoiceForm.dueDate}
                      onChange={e => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl text-slate-700"
                    />
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg text-[10px] text-slate-500 space-y-1">
                  <div className="flex justify-between">
                    <span>ภาษีมูลค่าเพิ่ม VAT 7%:</span>
                    <span>฿{(invoiceForm.amount * 0.07).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-700">
                    <span>ยอดสุทธิเรียกเก็บทั้งหมด:</span>
                    <span>฿{(invoiceForm.amount * 1.07).toLocaleString()}</span>
                  </div>
                </div>

                <button
                  type="submit"
                  id="btn-confirm-invoice"
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 rounded-xl text-xs cursor-pointer"
                >
                  ออกเอกสารและแจ้งหนี้
                </button>
              </form>
            )}
          </div>

          {/* Invoice Master Ledger */}
          <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
            <h3 className="text-sm font-extrabold text-slate-800 pb-2 border-b border-slate-100">
              ทะเบียนคุมเอกสารบัญชีและการออกบิล
            </h3>

            <div className="overflow-x-auto border border-slate-100 rounded-xl">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-slate-600 text-left border-b border-slate-100">
                  <tr>
                    <th className="p-3">เลขที่เอกสาร</th>
                    <th className="p-3">ชื่อลูกค้า</th>
                    <th className="p-3">ยอดสุทธิ (Vat 7%)</th>
                    <th className="p-3">กำหนดชำระ</th>
                    <th className="p-3">สถานะบัญชี</th>
                    <th className="p-3">เปิดดูบิล/ตรวจรับ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/55">
                      <td className="p-3 font-mono font-bold text-slate-800">{inv.invoiceNo}</td>
                      <td className="p-3 font-semibold">{inv.customerName}</td>
                      <td className="p-3 font-mono font-bold text-slate-700">฿{inv.totalAmount.toLocaleString()}</td>
                      <td className="p-3 text-slate-500">{inv.dueDate}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          inv.status === 'ชำระเงินแล้ว'
                            ? 'bg-emerald-50 text-emerald-800'
                            : 'bg-rose-50 text-rose-800'
                        }`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="p-3 flex space-x-2">
                        <button
                          onClick={() => setViewInvoice(inv)}
                          className="p-1 text-amber-700 hover:bg-amber-50 rounded"
                          title="ดูใบแจ้งหนี้แบบพิมพ์"
                        >
                          <Eye className="w-4.5 h-4.5" />
                        </button>
                        
                        {inv.status === 'ค้างชำระ' && (
                          <button
                            onClick={async () => {
                              try {
                                await onUpdateInvoiceStatus(inv.id, 'ชำระเงินแล้ว');
                              } catch {
                                alert('อัปเดตสถานะใบแจ้งหนี้ไม่สำเร็จ');
                              }
                            }}
                            className="text-[10px] bg-emerald-500 text-white font-bold px-2 py-1 rounded hover:bg-emerald-600"
                          >
                            รับเงิน
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* TAB 4: JOB HISTORY & CHEMISTRY USE */}
      {adminTab === 'history' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <h3 className="text-sm font-extrabold text-slate-800">ประวัติการเข้าปฏิบัติงานของทีมช่างทั้งหมด</h3>
            <span className="text-xs text-slate-400">สรุปรายงานการใช้เคมีป้องกันกำจัดแมลงและปลวกย้อนหลัง</span>
          </div>

          <div className="overflow-x-auto border border-slate-100 rounded-xl">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-600 text-left border-b border-slate-100">
                <tr>
                  <th className="p-3">รหัสงาน</th>
                  <th className="p-3">ทีมช่าง</th>
                  <th className="p-3">ชื่องานและนัดหมาย</th>
                  <th className="p-3">ลูกค้า / ที่อยู่</th>
                  <th className="p-3">สถานะส่งงาน</th>
                  <th className="p-3">เคมีภัณฑ์ที่ใช้พ่น</th>
                  <th className="p-3">การตรวจสอบ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-50/55">
                    <td className="p-3 font-mono font-bold text-slate-600">{job.id}</td>
                    <td className="p-3 font-bold text-slate-700">{job.assignedTeam.split(' (')[0]}</td>
                    <td className="p-3">
                      <div className="font-semibold text-slate-800">{job.title}</div>
                      <div className="text-[10px] text-amber-700 font-bold">{job.appointmentDate}</div>
                    </td>
                    <td className="p-3">
                      <div className="font-semibold">{job.customerName}</div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[140px]">{job.address}</div>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        job.status === 'เสร็จสิ้นและตรวจรับ'
                          ? 'bg-emerald-50 text-emerald-800'
                          : job.status === 'ส่งงานแล้ว'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-600'
                      }`}>
                        {job.status}
                      </span>
                    </td>
                    <td className="p-3">
                      {job.chemicalsUsed && job.chemicalsUsed.length > 0 ? (
                        <div className="flex flex-wrap gap-1 max-w-[150px]">
                          {job.chemicalsUsed.map((chem, idx) => (
                            <span key={idx} className="bg-slate-100 text-slate-600 text-[8px] font-semibold px-1 rounded-sm flex items-center">
                              <Droplet className="w-2 h-2 mr-0.5 text-blue-500" />
                              {chem.split(' ')[0]}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400">ยังไม่ระบุเคมี</span>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-col gap-1.5">
                        <button
                          type="button"
                          onClick={() => setViewJob(job)}
                          className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-600 hover:border-amber-300 hover:text-amber-700"
                        >
                          <Eye className="mr-1 h-3 w-3" />
                          ดูรายละเอียด
                        </button>
                        {job.status === 'ส่งงานแล้ว' ? (
                          <button
                            onClick={async () => {
                              try {
                                await onApproveJobCompletion(job.id);
                              } catch {
                                alert('ตรวจรับงานไม่สำเร็จ');
                              }
                            }}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[10px] px-2 py-1 rounded-md"
                          >
                            ตรวจรับงาน
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-medium">ตรวจรับเสร็จสมบูรณ์</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: TEAM MANAGEMENT */}
      {adminTab === 'team' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Team Creation / Edit Section */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
              <h3 className="text-sm font-extrabold text-slate-800 mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-600" />
                {editingTeamId ? 'แก้ไขข้อมูลทีม' : 'สร้างทีมใหม่'}
              </h3>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!teamSectionForm.name) {
                    alert('กรุณากรอกชื่อทีม');
                    return;
                  }
                  try {
                    if (editingTeamId) {
                      await onUpdateTeam(editingTeamId, {
                        name: teamSectionForm.name,
                        description: teamSectionForm.description
                      });
                      setEditingTeamId(null);
                    } else {
                      await onAddTeam({
                        name: teamSectionForm.name,
                        description: teamSectionForm.description
                      });
                    }
                    setTeamSectionSuccess(true);
                    setTimeout(() => setTeamSectionSuccess(false), 2000);
                    setTeamSectionForm({ name: '', description: '' });
                  } catch {
                    alert('บันทึกข้อมูลทีมไม่สำเร็จ');
                  }
                }}
                className="space-y-4"
              >
                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">ชื่อทีม</span>
                  <input
                    value={teamSectionForm.name}
                    onChange={(e) => setTeamSectionForm((prev) => ({ ...prev, name: e.target.value }))}
                    required
                    className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-amber-400"
                    placeholder="เช่น ทีมช่าง A (กรุงเทพฯ)"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">รายละเอียดทีม (ไม่บังคับ)</span>
                  <textarea
                    value={teamSectionForm.description}
                    onChange={(e) => setTeamSectionForm((prev) => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-amber-400"
                    placeholder="เช่น ดูแลพื้นที่กรุงเทพฝั่งตะวันตกและปริมณฑล"
                  />
                </label>

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm py-2.5 rounded-xl transition"
                  >
                    {editingTeamId ? 'อัปเดตทีม' : 'สร้างทีมใหม่'}
                  </button>
                  {editingTeamId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTeamId(null);
                        setTeamSectionForm({ name: '', description: '' });
                      }}
                      className="px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition"
                    >
                      ยกเลิก
                    </button>
                  )}
                </div>

                {teamSectionSuccess && (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-xs font-semibold">
                    ✓ บันทึกข้อมูลทีมสำเร็จ
                  </div>
                )}
              </form>

              <div className="mt-6">
                <h4 className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400 mb-3">ทีมที่สร้างไว้</h4>
                {teams.length === 0 ? (
                  <p className="text-xs text-slate-500">ยังไม่มีทีม กรุณาสร้างทีมก่อนเพิ่มสมาชิก</p>
                ) : (
                  <div className="space-y-3">
                    {teams.map((team) => (
                      <div key={team.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-3 flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold text-slate-800">{team.name}</div>
                          <div className="text-[11px] text-slate-500 mt-1">{team.description || 'ไม่มีรายละเอียดเพิ่มเติม'}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingTeamId(team.id);
                            setTeamSectionForm({ name: team.name, description: team.description || '' });
                          }}
                          className="text-[10px] font-bold text-amber-700 bg-amber-100 px-3 py-1 rounded-full"
                        >
                          แก้ไขทีม
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Add/Edit Team Member Form */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
              <h3 className="text-sm font-extrabold text-slate-800 mb-4 flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-amber-600" />
                {editingMemberId ? 'แก้ไขสมาชิกทีมงาน' : 'เพิ่มสมาชิกทีมงานใหม่'}
              </h3>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!teamForm.name || !teamForm.phone || !teamForm.email || !teamForm.username || !teamForm.teamId) {
                    alert('กรุณากรอกข้อมูลทั้งหมดและเลือกทีม');
                    return;
                  }
                  if (!editingMemberId && !teamForm.password) {
                    alert('กรุณากรอกรหัสผ่าน');
                    return;
                  }
                  if (!editingMemberId && teamForm.password.length < 6) {
                    alert('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
                    return;
                  }
                  try {
                    if (editingMemberId) {
                      const updateData: Partial<TeamMember> & { password?: string } = {
                        name: teamForm.name,
                        phone: teamForm.phone,
                        email: teamForm.email,
                        role: teamForm.role,
                        teamId: teamForm.teamId,
                        teamName: teamForm.teamName
                      };
                      if (teamForm.password) {
                        updateData.password = teamForm.password;
                      }
                      await onUpdateTeamMember(editingMemberId, updateData);
                      setEditingMemberId(null);
                    } else {
                      await onAddTeamMember({
                        name: teamForm.name,
                        phone: teamForm.phone,
                        email: teamForm.email,
                        username: teamForm.username,
                        password: teamForm.password,
                        role: teamForm.role,
                        teamId: teamForm.teamId,
                        teamName: teamForm.teamName,
                        status: 'active'
                      });
                    }
                    setTeamSuccess(true);
                    setTimeout(() => setTeamSuccess(false), 2000);
                    setTeamForm({ name: '', phone: '', email: '', username: '', password: '', role: 'team_member', teamId: '', teamName: '' });
                  } catch {
                    alert('บันทึกข้อมูลไม่สำเร็จ');
                  }
                }}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">ชื่อ-นามสกุล</span>
                    <input
                      value={teamForm.name}
                      onChange={(e) => setTeamForm((prev) => ({ ...prev, name: e.target.value }))}
                      required
                      className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-amber-400"
                      placeholder="เช่น สมชาย ใจกระเด้"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">เบอร์โทรศัพท์</span>
                    <input
                      value={teamForm.phone}
                      onChange={(e) => setTeamForm((prev) => ({ ...prev, phone: e.target.value }))}
                      required
                      className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-amber-400"
                      placeholder="เช่น 081-234-5678"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">อีเมล</span>
                    <input
                      type="email"
                      value={teamForm.email}
                      onChange={(e) => setTeamForm((prev) => ({ ...prev, email: e.target.value }))}
                      required
                      className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-amber-400"
                      placeholder="example@mail.com"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">ทีมที่มอบหมาย</span>
                    <select
                      value={teamForm.teamId}
                      onChange={(e) => {
                        const selected = teams.find((team) => team.id === e.target.value);
                        setTeamForm((prev) => ({
                          ...prev,
                          teamId: selected?.id || '',
                          teamName: selected?.name || ''
                        }));
                      }}
                      required
                      className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-amber-400"
                    >
                      <option value="">-- เลือกทีม --</option>
                      {teams.map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">บทบาท</span>
                    <select
                      value={teamForm.role}
                      onChange={(e) => setTeamForm((prev) => ({ ...prev, role: e.target.value as TeamMemberRole }))}
                      className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-amber-400"
                    >
                      <option value="team_lead">หัวหน้าทีม (Team Lead) - ดูทุกข้อมูล + ส่งงาน</option>
                      <option value="team_member">สมาชิกทีม (Team Member) - ดูปัญหา + เวลางาน เท่านั้น</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Username (ชื่อผู้ใช้)</span>
                    <input
                      value={teamForm.username}
                      onChange={(e) => setTeamForm((prev) => ({ ...prev, username: e.target.value }))}
                      required
                      disabled={!!editingMemberId}
                      className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-amber-400 disabled:bg-slate-50 disabled:text-slate-400"
                      placeholder="เช่น dasd (ใช้สำหรับเข้าสู่ระบบ)"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">รหัสผ่าน {editingMemberId && '(ว่างไว้ = ไม่เปลี่ยน)'}</span>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={teamForm.password}
                        onChange={(e) => setTeamForm((prev) => ({ ...prev, password: e.target.value }))}
                        required={!editingMemberId}
                        className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 pr-12 text-sm font-semibold text-slate-900 outline-none focus:border-amber-400"
                        placeholder={editingMemberId ? 'ว่างไว้เพื่อไม่เปลี่ยนรหัสผ่าน' : 'อย่างน้อย 6 ตัวอักษร'}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((current) => !current)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                      >
                        {showPassword ? '🙈' : '👁️'}
                      </button>
                    </div>
                  </label>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm py-2.5 rounded-xl transition"
                  >
                    {editingMemberId ? 'อัปเดตข้อมูล' : 'เพิ่มสมาชิกใหม่'}
                  </button>
                  {editingMemberId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingMemberId(null);
                        setTeamForm({ name: '', phone: '', email: '', username: '', password: '', role: 'team_member', teamId: '', teamName: '' });
                      }}
                      className="px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition"
                    >
                      ยกเลิก
                    </button>
                  )}
                </div>

                {teamSuccess && (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-xs font-semibold">
                    ✓ บันทึกข้อมูลสำเร็จ
                  </div>
                )}
              </form>
            </div>
          </div>

          {/* Team Members List */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
            <h3 className="text-sm font-extrabold text-slate-800 mb-4">รายชื่อสมาชิกทีมงานทั้งหมด ({teamMembers.length})</h3>

            {teamMembers.length === 0 ? (
              <p className="text-xs text-slate-500 italic">ยังไม่มีสมาชิกทีมงาน</p>
            ) : (
              <div className="overflow-x-auto border border-slate-100 rounded-xl">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 text-slate-600 text-left border-b border-slate-100">
                    <tr>
                      <th className="p-3">ชื่อ-นามสกุล</th>
                      <th className="p-3">เบอร์โทร</th>
                      <th className="p-3">อีเมล</th>
                      <th className="p-3">ทีม</th>
                      <th className="p-3">บทบาท</th>
                      <th className="p-3">สถานะ</th>
                      <th className="p-3">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {teamMembers.map((member) => (
                      <tr key={member.id} className="hover:bg-slate-50">
                        <td className="p-3 font-semibold text-slate-800">{member.name}</td>
                        <td className="p-3 font-mono text-slate-600">{member.phone}</td>
                        <td className="p-3 text-slate-600">{member.email}</td>
                        <td className="p-3 text-slate-600">{member.teamName || '-'}</td>
                        <td className="p-3">
                          <span className={`inline-block px-2 py-1 rounded-full text-[9px] font-bold ${member.role === 'team_lead' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-800'}`}>
                            {member.role === 'team_lead' ? 'หัวหน้าทีม' : 'สมาชิกทีม'}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`inline-block px-2 py-1 rounded-full text-[9px] font-bold ${member.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                            {member.status === 'active' ? 'ใช้งาน' : 'ปิดใช้งาน'}
                          </span>
                        </td>
                        <td className="p-3 flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingMemberId(member.id);
                              setTeamForm({
                                name: member.name,
                                phone: member.phone,
                                email: member.email,
                                username: member.username,
                                password: '',
                                role: member.role,
                                teamId: member.teamId || '',
                                teamName: member.teamName || ''
                              });
                            }}
                            className="px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 font-bold rounded text-[9px]"
                          >
                            แก้ไข
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              if (confirm(`คุณแน่ใจที่จะลบ ${member.name} ออกจากระบบหรือไม่?`)) {
                                try {
                                  await onDeleteTeamMember(member.id);
                                } catch {
                                  alert('ลบข้อมูลไม่สำเร็จ');
                                }
                              }
                            }}
                            className="px-2 py-1 bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold rounded text-[9px]"
                          >
                            ลบ
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Permission Guide */}
          <div className="bg-blue-50 p-6 rounded-2xl border border-blue-200">
            <h4 className="font-extrabold text-blue-900 text-sm mb-3">ℹ️ คู่มือสิทธิการเข้าถึง</h4>
            <div className="space-y-2 text-xs text-blue-800">
              <div>
                <span className="font-bold">หัวหน้าทีม (Team Lead):</span>
                <ul className="ml-4 mt-1 space-y-1 list-disc text-blue-700">
                  <li>ดูข้อมูลปัญหา จองบริการ สัญญา งาน และใบแจ้งหนี้ทั้งหมด</li>
                  <li>สามารถส่งงาน และอัปเดตสถานะงานได้</li>
                  <li>เข้าถึง Admin Panel ได้บางส่วน</li>
                </ul>
              </div>
              <div>
                <span className="font-bold">สมาชิกทีม (Team Member):</span>
                <ul className="ml-4 mt-1 space-y-1 list-disc text-blue-700">
                  <li>ดูเฉพาะปัญหา และเวลางานที่มอบหมายให้เท่านั้น</li>
                  <li>ไม่สามารถส่งงาน หรือแก้ไขข้อมูลได้</li>
                  <li>ไม่มีสิทธิเข้า Admin Panel</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* JOB REPORT DETAIL MODAL */}
      {viewJob && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 md:p-8 shadow-2xl border border-slate-100 relative max-h-[92vh] overflow-y-auto text-slate-800">
            <button
              type="button"
              onClick={() => setViewJob(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-mono text-xl"
            >
              &times;
            </button>

            <div className="space-y-5">
              <div className="border-b border-slate-100 pb-4">
                <span className="text-[10px] font-mono font-bold text-slate-400">รหัสงาน: {viewJob.id}</span>
                <h3 className="mt-1 text-lg font-extrabold text-slate-800">{viewJob.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">{viewJob.description}</p>
              </div>

              <div className="grid grid-cols-1 gap-3 text-xs md:grid-cols-2">
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <span className="block font-bold text-slate-400">ทีมช่าง / นัดหมาย</span>
                  <p className="mt-1 font-extrabold text-slate-800">{viewJob.assignedTeam}</p>
                  <p className="font-bold text-amber-700">{viewJob.appointmentDate}</p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <span className="block font-bold text-slate-400">ลูกค้า / ที่อยู่</span>
                  <p className="mt-1 font-extrabold text-slate-800">{viewJob.customerName}</p>
                  <p className="leading-relaxed text-slate-500">{viewJob.address}</p>
                </div>
              </div>

              {viewJob.imageReport ? (
                <button
                  type="button"
                  onClick={() => setExpandedJobPhoto(viewJob.imageReport || null)}
                  className="group relative block w-full overflow-hidden rounded-2xl border border-slate-100 bg-slate-100 text-left"
                >
                  <img
                    src={viewJob.imageReport}
                    alt="หลักฐานการปฏิบัติงาน"
                    className="h-72 w-full object-cover transition group-hover:scale-[1.01]"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute bottom-3 left-3 rounded-full bg-slate-900/75 px-3 py-1 text-[10px] font-bold text-white">
                    กดเพื่อดูรูปเต็ม
                  </div>
                </button>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-xs font-bold text-slate-400">
                  ยังไม่มีรูปหลักฐานแนบในงานนี้
                </div>
              )}

              <div className="rounded-2xl bg-emerald-50/60 p-4 text-xs text-emerald-900">
                <div className="font-extrabold">สรุปเคมีและจุดลงงาน</div>
                <p className="mt-2 leading-relaxed">{viewJob.notesByTech || 'ไม่มีบันทึกเพิ่มเติมจากช่าง'}</p>
                {viewJob.chemicalsUsed && viewJob.chemicalsUsed.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {viewJob.chemicalsUsed.map((chem, idx) => (
                      <span key={idx} className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold text-emerald-800">
                        <Droplet className="mr-1 h-3 w-3 text-emerald-600" />
                        {chem}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {expandedJobPhoto && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/90 p-4">
          <button
            type="button"
            onClick={() => setExpandedJobPhoto(null)}
            className="absolute right-4 top-4 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/20"
          >
            ปิด
          </button>
          <img
            src={expandedJobPhoto}
            alt="รูปหลักฐานขนาดเต็ม"
            className="max-h-[90vh] max-w-full rounded-2xl object-contain shadow-2xl"
            referrerPolicy="no-referrer"
          />
        </div>
      )}

      {/* PRINTABLE BILL DETAIL MODAL */}
      {viewInvoice && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 md:p-8 shadow-2xl border border-slate-100 relative max-h-[92vh] overflow-y-auto text-slate-800">
            <button
              onClick={() => setViewInvoice(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-mono text-xl"
            >
              &times;
            </button>

            {/* Simulated Print Layout */}
            <div className="space-y-6" id="printable-area">
              {/* Receipt Header */}
              <div className="flex justify-between items-start border-b-2 border-slate-100 pb-5">
                <div>
                  <h2 className="text-md font-extrabold text-slate-800 uppercase flex items-center">
                    <Building className="w-5 h-5 mr-1.5 text-amber-600" />
                    <span>NP Place Control Co., Ltd.</span>
                  </h2>
                  <p className="text-[10px] text-slate-400 mt-1">12/99 ถนนรัชดาภิเษก แขวงห้วยขวาง กรุงเทพฯ 10310</p>
                  <p className="text-[10px] text-slate-400">โทร. 02-123-4567 | เลขประจำตัวผู้เสียภาษี: 0105566023841</p>
                </div>
                <div className="text-right">
                  <h3 className="text-sm font-black text-amber-600 uppercase">ใบกำกับภาษี / ใบเสร็จรับเงิน</h3>
                  <span className="text-xs font-mono font-bold block text-slate-600 mt-1">เลขเอกสาร: {viewInvoice.invoiceNo}</span>
                  <span className="text-[10px] text-slate-400 block">วันที่จัดทำ: {viewInvoice.createdAt}</span>
                </div>
              </div>

              {/* Bill to details */}
              <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div>
                  <span className="text-slate-400 block font-bold">ข้อมูลลูกค้า / ผู้รับบริการ:</span>
                  <p className="font-bold text-slate-700 mt-1">{viewInvoice.customerName}</p>
                  <p className="text-slate-600">{viewInvoice.customerPhone}</p>
                  <p className="text-slate-500 mt-0.5 leading-normal max-w-xs">{viewInvoice.address}</p>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block font-bold">กำหนดวันชำระเงิน:</span>
                  <p className="font-extrabold text-amber-700 mt-1">{viewInvoice.dueDate}</p>
                  <div className="mt-3">
                    <span className="text-slate-400 block font-bold">สถานะบิล:</span>
                    <span className={`inline-block mt-0.5 px-3 py-1 text-[10px] font-black rounded-full ${
                      viewInvoice.status === 'ชำระเงินแล้ว' 
                        ? 'bg-emerald-100 text-emerald-800' 
                        : 'bg-rose-100 text-rose-800'
                    }`}>
                      {viewInvoice.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-100 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="p-3">ลำดับ & รายการอธิบาย</th>
                      <th className="p-3 text-right">จำนวน</th>
                      <th className="p-3 text-right">ราคาต่อหน่วย</th>
                      <th className="p-3 text-right">จำนวนเงิน (บาท)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-100">
                      <td className="p-3 font-semibold text-slate-800">{viewInvoice.description}</td>
                      <td className="p-3 text-right font-mono">1</td>
                      <td className="p-3 text-right font-mono">฿{viewInvoice.amount.toLocaleString()}</td>
                      <td className="p-3 text-right font-mono">฿{viewInvoice.amount.toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Invoice Calculations */}
              <div className="flex justify-end text-xs">
                <div className="w-1/2 space-y-1.5 border-t border-slate-100 pt-3 text-right font-medium text-slate-600">
                  <div className="flex justify-between">
                    <span>มูลค่าฐานสินค้า (Subtotal):</span>
                    <span className="font-mono">฿{viewInvoice.amount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ภาษีมูลค่าเพิ่ม VAT 7%:</span>
                    <span className="font-mono">฿{viewInvoice.vat.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-extrabold text-slate-800 text-sm border-t border-dashed border-slate-200 pt-2">
                    <span>ยอดสุทธิเรียกเก็บทั้งหมด:</span>
                    <span className="font-mono text-amber-600">฿{viewInvoice.totalAmount.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Signature / corporate seals */}
              <div className="pt-6 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400 text-center">
                <div className="w-1/3">
                  <p>.......................................................</p>
                  <p className="mt-1">ผู้จ่ายเงิน / ลูกค้า</p>
                </div>
                <div className="w-1/3 relative flex flex-col items-center">
                  {/* Decorative circular corporate stamp */}
                  <div className="absolute -top-4 w-12 h-12 rounded-full border-2 border-red-500/35 flex items-center justify-center text-[7px] text-red-500/50 font-bold rotate-12">
                    STAMP
                  </div>
                  <p className="pt-4">.......................................................</p>
                  <p className="mt-1">ผู้มีอำนาจลงนาม / ฝ่ายรับเงิน</p>
                </div>
              </div>

            </div>

            <div className="mt-6 flex space-x-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setViewInvoice(null)}
                className="w-1/2 py-2 text-xs font-bold border border-slate-200 text-slate-500 rounded-xl hover:bg-slate-50"
              >
                ปิดหน้าต่าง
              </button>
              <button
                type="button"
                onClick={() => {
                  window.print();
                }}
                className="w-1/2 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>สั่งพิมพ์เอกสาร</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
