import { ServicePackage, PestProblem, Booking, Contract, TechnicianJob, Invoice } from './types';

export const INITIAL_PACKAGES: ServicePackage[] = [
  {
    id: 'pkg-1',
    name: 'แพ็กเกจกำจัดปลวกด้วยระบบเหยื่อ Nemesis (1 ปี)',
    price: 15000,
    duration: '1 ปี (เข้าตรวจเช็กทุก 15 วันในช่วงแรก และทุก 1 เดือนหลังจากรังล่ม)',
    description: 'ระบบสถานีเหยื่อล่อปลวกอันดับหนึ่งจากออสเตรเลีย กำจัดยกรัง (Colony Elimination) โดยไม่ต้องเจาะพื้นผิวบ้าน ปลอดภัยต่อผู้อยู่อาศัยและสัตว์เลี้ยง 100%',
    guarantee: 'รับประกัน 1 ปี (ตรวจพบปลวกจุดใหม่ กำจัดให้ฟรีทันที)',
    features: [
      'ติดตั้งสถานีล่อปลวกรอบบ้านและในบ้าน',
      'ใช้เซลลูโลสพิเศษล่อปลวกประสิทธิภาพสูง',
      'สารออกฤทธิ์ขัดขวางการลอกคราบปลวก (ยกรัง)',
      'บริการตรวจเช็กและเติมเหยื่อทุก 15-30 วัน',
      'รายงานวิเคราะห์ผลการกำจัดทุกครั้งที่เข้าบริการ'
    ]
  },
  {
    id: 'pkg-2',
    name: 'แพ็กเกจฉีดพ่นเคมีป้องกันใต้ดิน (Soil Treatment)',
    price: 8500,
    duration: 'บริการครั้งเดียว พร้อมตรวจเช็กซ้ำในเดือนที่ 6',
    description: 'การอัดน้ำยาเคมีลงท่อใต้บ้าน (Pipe Treatment) ร่วมกับการเจาะอัดและพ่นเคมีเคลือบผิวดินรอบนอกตัวบ้าน ป้องกันปลวกเดินผ่านเข้าสู่ตัวอาคารได้อย่างยั่งยืน',
    guarantee: 'รับประกันคุณภาพและผลงาน 1 ปี',
    features: [
      'อัดน้ำยาเคมีผ่านท่อกำจัดปลวกใต้ฐานรากอาคาร',
      'เจาะอัดน้ำยาบริเวณจุดเสี่ยงที่ไม่มีระบบท่อใต้บ้าน',
      'สเปรย์เคมีเคลือบดินรอบนอกตัวบ้านหนาแน่น',
      'ใช้สารเคมีนำเข้าที่ผ่าน อย. ปลอดภัย ไร้กลิ่นฉุน',
      'แถมฟรีบริการพ่นละอองฝอยกำจัดแมลงรบกวนทั่วไป'
    ]
  },
  {
    id: 'pkg-3',
    name: 'แพ็กเกจป้องกันแมลงรบกวน 4 ชนิด (ปลวก มด แมลงสาบ หนู)',
    price: 12000,
    duration: 'สัญญา 1 ปี (เข้าบริการ 4 ครั้ง / ทุก 3 เดือน)',
    description: 'ดูแลความสะอาดและป้องกันสัตว์รบกวนยอดฮิต 4 ชนิดในบ้านคุณอย่างเป็นระบบ โดยผู้เชี่ยวชาญการใช้สารเคมีและระบบกักดักที่ปลอดภัยที่สุด',
    guarantee: 'รับประกันผลงานตลอดอายุสัญญาบริการ 1 ปี',
    features: [
      'ตรวจเช็กและฉีดพ่นสารเคมีสกัดทางมดและแมลงสาบ',
      'วางเจลกำจัดแมลงสาบจุดสำคัญ เช่น ห้องครัว ตู้ไฟ',
      'วางกล่องเหยื่อกำจัดหนูและกาวดักรอบๆ อาคาร',
      'พ่นหมอกควัน/ละอองฝอยกำจัดยุงตามพุ่มไม้และท่อระบายน้ำ',
      'ทีมช่างเข้าตรวจสอบและแนะนำการปรับปรุงจุดเสี่ยง'
    ]
  }
];

export const INITIAL_PROBLEMS: PestProblem[] = [
  {
    id: 'prob-101',
    customerName: 'คุณสมชาย รักดี',
    customerPhone: '081-234-5678',
    address: '123/45 หมู่บ้านพฤกษา แขวงคลองจั่น เขตบางกะปิ กรุงเทพฯ 10240',
    pestType: 'ปลวก',
    description: 'พบรังปลวกกินกรอบประตูไม้และฝ้าเพดานบริเวณห้องครัวหลังบ้าน มีคราบดินขึ้นตามแนวผนังค่อนข้างหนา เกรงว่าโครงสร้างฝ้าจะทรุดลงมาครับ',
    urgency: 'เร่งด่วนที่สุด',
    createdAt: '2026-06-25T08:30:00Z',
    status: 'จัดสรรคิวช่างแล้ว',
    assignedTeam: 'ทีมช่าง A (กรุงเทพฯ)',
    appointmentDate: '2026-06-27'
  },
  {
    id: 'prob-102',
    customerName: 'คุณวิภา พูลทรัพย์',
    customerPhone: '089-876-5432',
    address: '88/12 ซอยประชาราษฎร์ 3 ตำบลตลาดขวัญ อำเภอเมือง นนทบุรี 11000',
    pestType: 'มด',
    description: 'มีฝูงมดดำขนาดใหญ่ขึ้นบริเวณเคาน์เตอร์ครัวและในห้องนั่งเล่น ซื้อยาผงมาโรยเองแล้วก็ยังกลับมาอีก อยากให้ทีมงานเข้ามาตรวจสอบจุดทำรังค่ะ',
    urgency: 'ปานกลาง',
    createdAt: '2026-06-25T11:15:00Z',
    status: 'รอดำเนินการ'
  },
  {
    id: 'prob-103',
    customerName: 'คุณอนันต์ แสนคำ',
    customerPhone: '082-345-6789',
    address: '12 ซอยสุขุมวิท 101/1 แขวงบางจาก เขตพระโขนง กรุงเทพฯ 10260',
    pestType: 'หนู',
    description: 'ได้ยินเสียงหนูวิ่งบนฝ้าเพดานตอนกลางคืนบ่อยมาก และพบรอยเท้าและขี้หนูตามตู้เก็บของชั้นสอง รบกวนส่งเจ้าหน้าที่เข้ามาวางยาและดักจับด่วนครับ',
    urgency: 'สูง',
    createdAt: '2026-06-26T02:10:00Z',
    status: 'รอดำเนินการ'
  }
];

export const INITIAL_BOOKINGS: Booking[] = [
  {
    id: 'book-201',
    packageId: 'pkg-2',
    packageName: 'แพ็กเกจฉีดพ่นเคมีป้องกันใต้ดิน (Soil Treatment)',
    customerName: 'คุณมนัส ใจแก้ว',
    customerPhone: '085-555-1234',
    address: '45/8 หมู่บ้านลัดดาวัลย์ ถนนบรมราชชนนี แขวงตลิ่งชัน เขตตลิ่งชัน กรุงเทพฯ 10170',
    bookingDate: '2026-06-28',
    price: 8500,
    status: 'ชำระเงินแล้ว',
    invoiceNo: 'INV-2026-001'
  },
  {
    id: 'book-202',
    packageId: 'pkg-1',
    packageName: 'แพ็กเกจกำจัดปลวกด้วยระบบเหยื่อ Nemesis (1 ปี)',
    customerName: 'คุณรวีวรรณ อมรินทร์',
    customerPhone: '086-777-8899',
    address: '999/2 ปากเกร็ด นนทบุรี 11120',
    bookingDate: '2026-06-29',
    price: 15000,
    status: 'รอยืนยัน'
  }
];

export const INITIAL_CONTRACTS: Contract[] = [
  {
    id: 'cont-301',
    customerName: 'คุณสมเกียรติ มั่นคง',
    customerPhone: '081-999-4444',
    address: '321/9 ถนนรามคำแหง แขวงสะพานสูง เขตสะพานสูง กรุงเทพฯ 10240',
    packageName: 'แพ็กเกจบริการป้องกันแมลงรบกวน 4 ชนิด (ปลวก มด แมลงสาบ หนู)',
    startDate: '2026-01-10',
    endDate: '2027-01-10',
    totalVisits: 4,
    completedVisits: 2,
    nextVisitDate: '2026-07-15',
    price: 12000,
    status: 'เปิดใช้งาน',
    documentNo: 'CONT-2026-481'
  }
];

export const INITIAL_JOBS: TechnicianJob[] = [
  {
    id: 'job-501',
    sourceId: 'prob-101',
    sourceType: 'problem',
    title: 'กำจัดรังปลวกเร่งด่วนที่ฝ้าเพดานครัว',
    description: 'พบรังปลวกกินกรอบประตูไม้และฝ้าเพดานบริเวณห้องครัวหลังบ้าน ตรวจสอบสถานีปลวกและเตรียมอุปกรณ์เคมีฉีดพ่น',
    customerName: 'คุณสมชาย รักดี',
    customerPhone: '081-234-5678',
    address: '123/45 หมู่บ้านพฤกษา แขวงคลองจั่น เขตบางกะปิ กรุงเทพฯ 10240',
    appointmentDate: '2026-06-27',
    assignedTeam: 'ทีมช่าง A (กรุงเทพฯ)',
    status: 'กำลังเตรียมตัว'
  },
  {
    id: 'job-502',
    sourceId: 'book-201',
    sourceType: 'booking',
    title: 'ฉีดอัดน้ำยาเคมีใต้พื้นดิน (Soil Treatment)',
    description: 'จองซื้อแพ็กเกจอัดน้ำยาเคมีใต้อาคาร พร้อมสเปรย์เคมีรอบแนวคานคอดิน เตรียมสายยางอัดความดันและสาร Fipronil 5%',
    customerName: 'คุณมนัส ใจแก้ว',
    customerPhone: '085-555-1234',
    address: '45/8 หมู่บ้านลัดดาวัลย์ ถนนบรมราชชนนี แขวงตลิ่งชัน เขตตลิ่งชัน กรุงเทพฯ 10170',
    appointmentDate: '2026-06-28',
    assignedTeam: 'ทีมช่าง B (นนทบุรี)',
    status: 'กำลังเตรียมตัว'
  }
];

export const INITIAL_INVOICES: Invoice[] = [
  {
    id: 'inv-401',
    invoiceNo: 'INV-2026-001',
    customerName: 'คุณมนัส ใจแก้ว',
    customerPhone: '085-555-1234',
    address: '45/8 หมู่บ้านลัดดาวัลย์ ถนนบรมราชชนนี แขวงตลิ่งชัน เขตตลิ่งชัน กรุงเทพฯ 10170',
    description: 'ชำระค่าบริการแพ็กเกจฉีดพ่นเคมีป้องกันใต้ดิน (Soil Treatment)',
    amount: 8500,
    vat: 595,
    totalAmount: 9095,
    status: 'ชำระเงินแล้ว',
    dueDate: '2026-06-28',
    createdAt: '2026-06-25'
  },
  {
    id: 'inv-402',
    invoiceNo: 'INV-2026-002',
    customerName: 'คุณรวีวรรณ อมรินทร์',
    customerPhone: '086-777-8899',
    address: '999/2 ปากเกร็ด นนทบุรี 11120',
    description: 'มัดจำค่าบริการแพ็กเกจกำจัดปลวกด้วยระบบเหยื่อ Nemesis (1 ปี)',
    amount: 15000,
    vat: 1050,
    totalAmount: 16050,
    status: 'ค้างชำระ',
    dueDate: '2026-06-29',
    createdAt: '2026-06-26'
  }
];

export const PRESET_CHEMICALS = [
  'Fipronil 5% SC (กำจัดปลวกแบบไม่ขับไล่ ยกรัง)',
  'Bifenthrin 10% MC (ฉีดป้องกันรอบดิน ระยะยาว)',
  'Chlorantraniliprole (สารปลอดภัยสูง พ่นในบ้าน)',
  'Imidacloprid 10% WP (กำจัดปลวกและมด)',
  'เหยื่อพิษสำเร็จรูป Nemesis Bait (เซลลูโลสบริสุทธิ์)',
  'เจลกำจัดแมลงสาบ Fipronil 0.05% Gel',
  'ก้อนยาเบื่อหนู Bromadiolone Bait'
];

export const PRESET_PHOTOS = [
  {
    name: 'สเปรย์เคมีแนวขอบประตู',
    url: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=400',
    category: 'spraying'
  },
  {
    name: 'อัดน้ำยาลงท่อใต้บ้าน',
    url: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&q=80&w=400',
    category: 'soil_treatment'
  },
  {
    name: 'ติดตั้งสถานีเหยื่อ Nemesis',
    url: 'https://images.unsplash.com/photo-1595225476474-87563907a212?auto=format&fit=crop&q=80&w=400',
    category: 'baiting'
  },
  {
    name: 'พ่นละอองฝอยในท่อระบายน้ำ',
    url: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&q=80&w=400',
    category: 'disinfection'
  }
];
