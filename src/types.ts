export type PestType = 'ปลวก' | 'มด' | 'แมลงสาบ' | 'หนู' | 'อื่นๆ';

export type JobStatus = 'กำลังเตรียมตัว' | 'กำลังเดินทาง' | 'เริ่มดำเนินงาน' | 'ส่งงานแล้ว' | 'เสร็จสิ้นและตรวจรับ';

export type TeamMemberRole = 'team_lead' | 'team_member';

export interface TeamMember {
  id: string;
  name: string;
  phone: string;
  email: string;
  username: string;
  passwordHash?: string;
  role: TeamMemberRole;
  teamId?: string;
  teamName?: string;
  createdAt: string;
  status: 'active' | 'inactive';
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
}

export interface PestProblem {
  id: string;
  customerName: string;
  customerPhone: string;
  address: string;
  pestType: PestType;
  description: string;
  urgency: 'ต่ำ' | 'ปานกลาง' | 'สูง' | 'เร่งด่วนที่สุด';
  createdAt: string;
  createdBy?: string;
  status: 'รอดำเนินการ' | 'จัดสรรคิวช่างแล้ว' | 'กำลังดำเนินการ' | 'เสร็จสิ้น';
  assignedTeam?: string;
  appointmentDate?: string;
}

export interface ServicePackage {
  id: string;
  name: string;
  price: number;
  duration: string;
  description: string;
  guarantee: string;
  features: string[];
}

export interface Booking {
  id: string;
  packageId: string;
  packageName: string;
  customerName: string;
  customerPhone: string;
  address: string;
  bookingDate: string;
  price: number;
  status: 'รอชำระเงิน' | 'รอยืนยัน' | 'ชำระเงินแล้ว' | 'กำลังจัดทีมงาน' | 'เสร็จสิ้น';
  invoiceNo?: string;
  createdBy?: string;
}

export interface Contract {
  id: string;
  customerName: string;
  customerPhone: string;
  address: string;
  packageName: string;
  startDate: string;
  endDate: string;
  totalVisits: number;
  completedVisits: number;
  nextVisitDate: string;
  price: number;
  status: 'เปิดใช้งาน' | 'เสร็จสิ้นแล้ว' | 'ระงับชั่วคราว';
  documentNo: string;
  createdBy?: string;
}

export interface TechnicianJob {
  id: string;
  sourceId: string; // references PestProblem.id or Booking.id
  sourceType: 'problem' | 'booking';
  title: string;
  description: string;
  customerName: string;
  customerPhone: string;
  address: string;
  appointmentDate: string;
  assignedTeam: string;
  status: JobStatus;
  notesByTech?: string;
  imageReport?: string; // photo data url or local photo state
  chemicalsUsed?: string[];
  completedAt?: string;
  createdBy?: string;
}

export interface Invoice {
  id: string;
  invoiceNo: string;
  customerName: string;
  customerPhone: string;
  address: string;
  description: string;
  amount: number;
  vat: number;
  totalAmount: number;
  status: 'ค้างชำระ' | 'ชำระเงินแล้ว';
  dueDate: string;
  createdAt: string;
  receiptDataUrl?: string;
  payerName?: string;
  transferTime?: string;
  paymentVerifiedAt?: string;
  paymentReference?: string;
  createdBy?: string;
}

export type PortalRole = 'customer' | 'technician' | 'user';
