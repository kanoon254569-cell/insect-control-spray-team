import React, { useState } from 'react';
import { 
  AlertTriangle, 
  Calendar, 
  FileText, 
  CheckCircle, 
  Clock, 
  Package, 
  Check, 
  Info,
  Shield,
  Activity,
  ArrowRight,
  Clipboard,
  Droplet
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PestProblem, ServicePackage, Booking, Contract, TechnicianJob, PestType } from '../types';

interface CustomerPortalProps {
  problems: PestProblem[];
  onAddProblem: (problem: {
    customerName: string;
    customerPhone: string;
    address: string;
    pestType: PestType;
    description: string;
    urgency: 'ต่ำ' | 'ปานกลาง' | 'สูง' | 'เร่งด่วนที่สุด';
  }) => Promise<void> | void;
  packages: ServicePackage[];
  bookings: Booking[];
  onAddBooking: (booking: {
    packageId: string;
    packageName: string;
    customerName: string;
    customerPhone: string;
    address: string;
    bookingDate: string;
    price: number;
  }) => Promise<void> | void;
  contracts: Contract[];
  jobs: TechnicianJob[];
}

export default function CustomerPortal({
  problems,
  onAddProblem,
  packages,
  bookings,
  onAddBooking,
  contracts,
  jobs
}: CustomerPortalProps) {
  const [activeTab, setActiveTab] = useState<'catalog' | 'report' | 'tracking' | 'contracts'>('catalog');
  
  // State for Problem Report Form
  const [reportForm, setReportForm] = useState({
    customerName: '',
    customerPhone: '',
    address: '',
    pestType: 'ปลวก' as PestType,
    description: '',
    urgency: 'ปานกลาง' as 'ต่ำ' | 'ปานกลาง' | 'สูง' | 'เร่งด่วนที่สุด'
  });
  const [reportSuccess, setReportSuccess] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);

  // State for Booking Package Form / Dialog
  const [selectedPkg, setSelectedPkg] = useState<ServicePackage | null>(null);
  const [bookingForm, setBookingForm] = useState({
    customerName: '',
    customerPhone: '',
    address: '',
    bookingDate: ''
  });
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);

  // Selected job for tracking details
  const [selectedTrackJobId, setSelectedTrackJobId] = useState<string | null>(null);
  const [expandedReportPhoto, setExpandedReportPhoto] = useState<string | null>(null);

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reportLoading) return;
    if (!reportForm.customerName || !reportForm.customerPhone || !reportForm.address || !reportForm.description) {
      alert('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }
    try {
      setReportLoading(true);
      await onAddProblem(reportForm);
      setReportSuccess(true);
      setTimeout(() => {
        setReportSuccess(false);
        setReportForm({
          customerName: '',
          customerPhone: '',
          address: '',
          pestType: 'ปลวก',
          description: '',
          urgency: 'ปานกลาง'
        });
        setActiveTab('tracking');
      }, 2000);
    } catch {
      alert('ส่งรายงานไม่สำเร็จ');
    } finally {
      setReportLoading(false);
    }
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (bookingLoading) return;
    if (!selectedPkg) return;
    if (!bookingForm.customerName || !bookingForm.customerPhone || !bookingForm.address || !bookingForm.bookingDate) {
      alert('กรุณากรอกข้อมูลจองคิวให้ครบถ้วน');
      return;
    }
    try {
      setBookingLoading(true);
      await onAddBooking({
        packageId: selectedPkg.id,
        packageName: selectedPkg.name,
        customerName: bookingForm.customerName,
        customerPhone: bookingForm.customerPhone,
        address: bookingForm.address,
        bookingDate: bookingForm.bookingDate,
        price: selectedPkg.price
      });
      setBookingSuccess(true);
      setTimeout(() => {
        setBookingSuccess(false);
        setSelectedPkg(null);
        setBookingForm({
          customerName: '',
          customerPhone: '',
          address: '',
          bookingDate: ''
        });
        setActiveTab('tracking');
      }, 2000);
    } catch {
      alert('จองบริการไม่สำเร็จ');
    } finally {
      setBookingLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" id="customer-portal">
      {/* Navigation Submenu */}
      <div className="lg:col-span-3 flex flex-col space-y-2">
        <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-100">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 px-2">เมนูบริการสำหรับลูกค้า</h3>
          <nav className="flex flex-col space-y-1">
            <button
              id="tab-catalog"
              onClick={() => setActiveTab('catalog')}
              className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'catalog'
                  ? 'bg-amber-50 text-amber-700 border-l-4 border-amber-600 pl-3'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Package className="w-4 h-4 text-amber-600" />
              <span>เลือกซื้อแพ็กเกจ / บริการ</span>
            </button>
            
            <button
              id="tab-report"
              onClick={() => setActiveTab('report')}
              className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'report'
                  ? 'bg-amber-50 text-amber-700 border-l-4 border-amber-600 pl-3'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>แจ้งปัญหาปลวก / แมลง</span>
            </button>
            
            <button
              id="tab-tracking"
              onClick={() => {
                setActiveTab('tracking');
                if (problems.length > 0 && !selectedTrackJobId) {
                  setSelectedTrackJobId(problems[0].id);
                }
              }}
              className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'tracking'
                  ? 'bg-amber-50 text-amber-700 border-l-4 border-amber-600 pl-3'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Clock className="w-4 h-4 text-amber-600" />
              <span className="flex-1 text-left">ติดตามสถานะงาน</span>
              {(problems.filter(p => p.status !== 'เสร็จสิ้น').length > 0 || bookings.filter(b => b.status !== 'เสร็จสิ้น').length > 0) && (
                <span className="bg-amber-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                  {problems.filter(p => p.status !== 'เสร็จสิ้น').length + bookings.filter(b => b.status !== 'เสร็จสิ้น').length}
                </span>
              )}
            </button>
            
            <button
              id="tab-contracts"
              onClick={() => setActiveTab('contracts')}
              className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'contracts'
                  ? 'bg-amber-50 text-amber-700 border-l-4 border-amber-600 pl-3'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <FileText className="w-4 h-4 text-amber-600" />
              <span>สัญญาบริการของฉัน</span>
            </button>
          </nav>
        </div>

        <div className="bg-amber-950 text-amber-100 p-5 rounded-2xl border border-amber-850 hidden lg:block">
          <div className="flex items-center space-x-2 text-amber-400 mb-3">
            <Shield className="w-5 h-5" />
            <span className="font-semibold text-sm">รับประกัน 100%</span>
          </div>
          <p className="text-xs text-amber-200/90 leading-relaxed">
            ทุกงานกำจัดปลวกด้วยทีมงานมืออาชีพของเรา ผ่านการรับรองความปลอดภัย ใช้เคมีที่ไม่ทำลายสุขภาพ และเครื่องมือสแกนปลวกใต้พื้นดินด้วยระบบเรดาร์
          </p>
          <div className="mt-4 pt-4 border-t border-amber-900 flex items-center justify-between text-xs text-amber-400">
            <span>สายด่วน 24 ชม.</span>
            <span className="font-mono font-bold">02-123-4567</span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="lg:col-span-9">
        <AnimatePresence mode="wait">
          {/* TAB 1: SERVICE CATALOG */}
          {activeTab === 'catalog' && (
            <motion.div
              key="catalog"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-2xl font-bold text-slate-800 font-sans tracking-tight">บริการกำจัดปลวกและแมลงรบกวน</h2>
                <p className="text-slate-500 text-sm mt-1">เลือกแพ็กเกจการปกป้องบ้านของคุณอย่างมีประสิทธิภาพ สัญญาดูแลรายปีและฉีดพ่นระยะสั้น</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {packages.map((pkg) => (
                  <div key={pkg.id} className="bg-white rounded-2xl border border-slate-100 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between overflow-hidden">
                    <div className="p-6">
                      <div className="inline-block px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-semibold mb-3">
                        {pkg.duration}
                      </div>
                      <h3 className="text-lg font-bold text-slate-800 leading-snug min-h-[3.5rem] flex items-start">{pkg.name}</h3>
                      <div className="my-4 flex items-baseline">
                        <span className="text-2xl font-extrabold text-amber-600 font-mono">
                          {pkg.price.toLocaleString()}
                        </span>
                        <span className="text-slate-400 text-xs ml-1">บาท / ปี</span>
                      </div>
                      <p className="text-slate-500 text-xs leading-relaxed mb-6 border-b border-slate-50 pb-4">
                        {pkg.description}
                      </p>
                      
                      <div className="space-y-2 mb-6">
                        <span className="text-xs font-semibold text-slate-600 block">สิทธิประโยชน์ในแพ็กเกจ:</span>
                        {pkg.features.map((feat, idx) => (
                          <div key={idx} className="flex items-start space-x-2 text-xs text-slate-600">
                            <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                            <span>{feat}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-slate-50 p-4 border-t border-slate-100 flex flex-col space-y-2">
                      <div className="flex items-center text-[10px] text-slate-500">
                        <Shield className="w-3.5 h-3.5 text-amber-600 mr-1 shrink-0" />
                        <span>{pkg.guarantee}</span>
                      </div>
                      <button
                        id={`btn-buy-${pkg.id}`}
                        onClick={() => {
                          setSelectedPkg(pkg);
                          setBookingForm(prev => ({
                            ...prev,
                            bookingDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0] // Default tomorrow
                          }));
                        }}
                        className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2.5 rounded-xl text-xs transition-colors flex items-center justify-center space-x-1"
                      >
                        <span>สั่งซื้อแพ็กเกจ / นัดหมาย</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* BOOKING MODAL SIMULATION */}
              {selectedPkg && (
                <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                  <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-xl border border-slate-100 relative max-h-[90vh] overflow-y-auto"
                  >
                    <button 
                      onClick={() => setSelectedPkg(null)}
                      className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-mono text-xl"
                    >
                      &times;
                    </button>
                    
                    <div className="mb-6">
                      <div className="flex items-center space-x-2 text-amber-600 mb-2">
                        <Package className="w-5 h-5" />
                        <span className="text-xs font-bold uppercase tracking-wider">ยืนยันทำรายการซื้อแพ็กเกจ</span>
                      </div>
                      <h3 className="text-lg font-extrabold text-slate-800">{selectedPkg.name}</h3>
                      <p className="text-xs text-amber-600 font-mono mt-1 font-semibold">ราคา: {selectedPkg.price.toLocaleString()} บาท (ประกัน 1 ปี)</p>
                    </div>

                    {bookingSuccess ? (
                      <div className="bg-emerald-50 text-emerald-800 p-6 rounded-2xl text-center space-y-3 border border-emerald-100">
                        <CheckCircle className="w-12 h-12 text-emerald-600 mx-auto" />
                        <h4 className="text-md font-bold">สั่งซื้อและนัดวันสำเร็จ!</h4>
                        <p className="text-xs text-emerald-700">ระบบได้ส่งใบแจ้งหนี้ไปยังหน้าประวัติของคุณแล้ว ช่างเทคนิคจะติดต่อเพื่อเข้าบริการในวันนัดหมาย</p>
                      </div>
                    ) : (
                      <form onSubmit={handleBookingSubmit} className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">ชื่อผู้ติดต่อ / ลูกค้า *</label>
                          <input 
                            type="text"
                            required
                            placeholder="ระบุชื่อ-นามสกุล ของท่าน"
                            value={bookingForm.customerName}
                            onChange={e => setBookingForm({ ...bookingForm, customerName: e.target.value })}
                            className="w-full px-4 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">เบอร์โทรศัพท์ติดต่อ *</label>
                          <input 
                            type="tel"
                            required
                            placeholder="เช่น 0812345678"
                            value={bookingForm.customerPhone}
                            onChange={e => setBookingForm({ ...bookingForm, customerPhone: e.target.value })}
                            className="w-full px-4 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">ที่อยู่อาคารสถานที่เข้ากำจัดปลวก *</label>
                          <textarea 
                            required
                            rows={3}
                            placeholder="ระบุ บ้านเลขที่ ซอย ถนน แขวง/ตำบล เขต/อำเภอ จังหวัด รหัสไปรษณีย์"
                            value={bookingForm.address}
                            onChange={e => setBookingForm({ ...bookingForm, address: e.target.value })}
                            className="w-full px-4 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">ระบุนัดวันลงงานติดตั้ง / ฉีดพ่นครั้งแรก *</label>
                          <div className="relative">
                            <input 
                              type="date"
                              required
                              value={bookingForm.bookingDate}
                              onChange={e => setBookingForm({ ...bookingForm, bookingDate: e.target.value })}
                              className="w-full px-4 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                            />
                          </div>
                          <span className="text-[10px] text-slate-400 mt-1 block">ทีมช่างจะเข้าปฏิบัติงานในช่วงเวลา 09:00 - 15:00 น. ของวันที่ระบุ</span>
                        </div>

                        <div className="pt-4 flex space-x-3">
                          <button
                            type="button"
                            onClick={() => setSelectedPkg(null)}
                            className="w-1/2 py-2.5 text-xs font-bold border border-slate-200 text-slate-500 rounded-xl hover:bg-slate-50 transition-colors"
                          >
                            ยกเลิก
                          </button>
                          <button
                            type="submit"
                            id="btn-confirm-booking"
                            disabled={bookingLoading}
                            className="w-1/2 py-2.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl transition-colors disabled:cursor-not-allowed disabled:opacity-70"
                          >
                            {bookingLoading ? 'กำลังยืนยัน...' : 'ยืนยันการสั่งจองคิว'}
                          </button>
                        </div>
                      </form>
                    )}
                  </motion.div>
                </div>
              )}
            </motion.div>
          )}

          {/* TAB 2: PROBLEM REPORTING FORM */}
          {activeTab === 'report' && (
            <motion.div
              key="report"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="max-w-2xl bg-white rounded-2xl border border-slate-100 shadow-xs p-6 md:p-8"
            >
              <div className="mb-6">
                <h2 className="text-xl font-bold text-slate-800 flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  <span>แจ้งพบปัญหา ปลวก / มด / แมลงสาบ / หนู</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">ส่งพิกัดรายละเอียดเพื่อให้ทีมงานวิเคราะห์และติดต่อกลับด่วนที่สุด ช่างจะจัดเตรียมสารเคมีตามหน้างานจริง</p>
              </div>

              {reportSuccess ? (
                <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 p-6 rounded-xl text-center space-y-3">
                  <CheckCircle className="w-12 h-12 text-emerald-600 mx-auto" />
                  <h4 className="text-md font-bold">บันทึกข้อมูลการแจ้งปัญหาสำเร็จ!</h4>
                  <p className="text-xs text-emerald-700">ระบบได้นำส่งคิวไปส่วนกลางแล้ว เจ้าหน้าที่กำลังเร่งส่งทีมช่างเพื่อประเมินหน้างานในทันที</p>
                </div>
              ) : (
                <form onSubmit={handleReportSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">ชื่อ-นามสกุล ผู้แจ้งเรื่อง *</label>
                      <input 
                        type="text"
                        required
                        placeholder="ระบุชื่อผู้ติดต่อ"
                        value={reportForm.customerName}
                        onChange={e => setReportForm({ ...reportForm, customerName: e.target.value })}
                        className="w-full px-4 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">เบอร์โทรศัพท์มือถือ *</label>
                      <input 
                        type="tel"
                        required
                        placeholder="เพื่อจัดส่ง SMS ยืนยันและการติดต่อ"
                        value={reportForm.customerPhone}
                        onChange={e => setReportForm({ ...reportForm, customerPhone: e.target.value })}
                        className="w-full px-4 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">ประเภทศัตรูพืชที่พบ *</label>
                      <select
                        value={reportForm.pestType}
                        onChange={e => setReportForm({ ...reportForm, pestType: e.target.value as PestType })}
                        className="w-full px-4 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                      >
                        <option value="ปลวก">ปลวก (พบเศษดิน/ท่อทางเดินปลวก/กรอบไม้ผุ)</option>
                        <option value="มด">มด (มดแดง/มดคันไฟ/มดดำขึ้นปริมาณมาก)</option>
                        <option value="แมลงสาบ">แมลงสาบ (ตามห้องน้ำ/ท่อระบาย/เคาน์เตอร์ครัว)</option>
                        <option value="หนู">หนู (ได้ยินเสียงบนฝ้า/พบคราบขี้หนู/กัดสายไฟ)</option>
                        <option value="อื่นๆ">อื่นๆ (เห็บ หมัด แมงมุม หรือแมลงไม่ทราบประเภท)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">ระดับความรุนแรงของปัญหา *</label>
                      <select
                        value={reportForm.urgency}
                        onChange={e => setReportForm({ ...reportForm, urgency: e.target.value as any })}
                        className="w-full px-4 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                      >
                        <option value="ต่ำ">ต่ำ (พบประปราย ไม่เสียหายมาก)</option>
                        <option value="ปานกลาง">ปานกลาง (มีจุดทำรังรบกวนถาวร)</option>
                        <option value="สูง">สูง (โครงสร้างไม้เริ่มผุกร่อน/แมลงแพร่กระจายกว้าง)</option>
                        <option value="เร่งด่วนที่สุด">เร่งด่วนที่สุด (ปลวกกินโครงสร้างหลัก/หนูกัดทำลายระบบไฟ)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">ระบุรายละเอียดปัญหา / จุดที่พบเพิ่มเติม *</label>
                    <textarea 
                      required
                      rows={4}
                      placeholder="อธิบายพฤติกรรม เช่น พบคราบดินบริเวณฐานเสาบ้านใต้ฝ้า หรือเจอมดจำนวนมากบริเวณหลังครัว เป็นต้น"
                      value={reportForm.description}
                      onChange={e => setReportForm({ ...reportForm, description: e.target.value })}
                      className="w-full px-4 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">สถานที่ทำงาน (กรอกพิกัด และที่อยู่สำหรับจัดส่งช่าง) *</label>
                    <textarea 
                      required
                      rows={2}
                      placeholder="กรอกบ้านเลขที่ ซอย ถนน แขวง/ตำบล เขต/อำเภอ จังหวัด"
                      value={reportForm.address}
                      onChange={e => setReportForm({ ...reportForm, address: e.target.value })}
                      className="w-full px-4 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl flex items-start space-x-2.5 border border-slate-100">
                    <Info className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      * หลังส่งข้อมูล แอดมินจะจัดวันทำการนัดหมายให้โดยเร็วที่สุด ท่านจะได้รับการติดต่อทางโทรศัพท์เพื่อส่งมอบคิวช่างเทคนิค และติดตามงานผ่านหน้า "ติดตามสถานะงาน" ในพอร์ทัลนี้ได้แบบเรียลไทม์
                    </p>
                  </div>

                  <button
                    type="submit"
                    id="btn-submit-report"
                    disabled={reportLoading}
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 rounded-xl text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {reportLoading ? 'กำลังส่ง...' : 'ส่งข้อมูลแจ้งปัญหาทันที'}
                  </button>
                </form>
              )}
            </motion.div>
          )}

          {/* TAB 3: WORK TRACKING */}
          {activeTab === 'tracking' && (
            <motion.div
              key="tracking"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-xl font-bold text-slate-800">ติดตามสถานะการกำจัดปลวก</h2>
                <p className="text-xs text-slate-500 mt-1">ตรวจสอบสถานะการแจ้งงาน คิวช่างนัดหมาย และรูปภาพผลงานการฉีดพ่นสารเคมี</p>
              </div>

              {problems.length === 0 && bookings.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-slate-400">
                  <Clipboard className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                  <p className="text-sm">ไม่พบประวัติการแจ้งปัญหาหรือประวัติจองแพ็กเกจของคุณในขณะนี้</p>
                  <button 
                    onClick={() => setActiveTab('report')}
                    className="mt-4 bg-amber-600 text-white text-xs font-semibold px-4 py-2 rounded-xl"
                  >
                    เริ่มแจ้งปัญหาปลวกที่นี่
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  {/* Left Column: Job/Request List */}
                  <div className="md:col-span-5 space-y-3">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">รายการแจ้งงานของฉัน</h3>
                    
                    {/* Render Problem Tickets */}
                    {problems.map((prob) => {
                      const isActive = selectedTrackJobId === prob.id;
                      return (
                        <div
                          key={prob.id}
                          onClick={() => setSelectedTrackJobId(prob.id)}
                          className={`p-4 rounded-xl border transition-all cursor-pointer text-left ${
                            isActive
                              ? 'bg-amber-50/50 border-amber-300 shadow-xs'
                              : 'bg-white border-slate-100 hover:border-slate-200'
                          }`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-[10px] font-mono font-bold text-slate-400">TICKET: {prob.id}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                              prob.status === 'เสร็จสิ้น' 
                                ? 'bg-emerald-50 text-emerald-700' 
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {prob.status}
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-slate-800 flex items-center space-x-1.5">
                            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
                            <span>แจ้งปัญหา: {prob.pestType}</span>
                          </h4>
                          <p className="text-xs text-slate-500 truncate mt-1">{prob.description}</p>
                          <div className="mt-2 pt-2 border-t border-slate-50 flex justify-between items-center text-[10px] text-slate-400">
                            <span>ผู้แจ้ง: {prob.customerName}</span>
                            <span>{new Date(prob.createdAt).toLocaleDateString('th-TH')}</span>
                          </div>
                        </div>
                      );
                    })}

                    {/* Render Bookings */}
                    {bookings.map((book) => {
                      const isActive = selectedTrackJobId === book.id;
                      return (
                        <div
                          key={book.id}
                          onClick={() => setSelectedTrackJobId(book.id)}
                          className={`p-4 rounded-xl border transition-all cursor-pointer text-left ${
                            isActive
                              ? 'bg-amber-50/50 border-amber-300 shadow-xs'
                              : 'bg-white border-slate-100 hover:border-slate-200'
                          }`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-[10px] font-mono font-bold text-slate-400">ORDER: {book.id}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                              book.status === 'เสร็จสิ้น' 
                                ? 'bg-emerald-50 text-emerald-700' 
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {book.status}
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-slate-800 flex items-center space-x-1.5">
                            <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>
                            <span>ซื้อบริการ: {book.packageName.split(' (')[0]}</span>
                          </h4>
                          <p className="text-xs text-slate-500 truncate mt-1">ที่อยู่: {book.address}</p>
                          <div className="mt-2 pt-2 border-t border-slate-50 flex justify-between items-center text-[10px] text-slate-400">
                            <span>วันนัดหมาย: {new Date(book.bookingDate).toLocaleDateString('th-TH')}</span>
                            <span className="font-bold text-slate-600">{book.price.toLocaleString()}.-</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Right Column: Dynamic Status Stepper & Detailed Technical Report */}
                  <div className="md:col-span-7 bg-white rounded-2xl border border-slate-100 p-6 space-y-6">
                    {(() => {
                      if (!selectedTrackJobId) {
                        return (
                          <div className="h-full flex flex-col items-center justify-center text-slate-400 py-12">
                            <Info className="w-8 h-8 text-slate-300 mb-2" />
                            <p className="text-xs">เลือกรายการงานด้านซ้าย เพื่อดูสถานะรายละเอียดการลงงาน</p>
                          </div>
                        );
                      }

                      const selectedProblem = problems.find(p => p.id === selectedTrackJobId);
                      const selectedBooking = bookings.find(b => b.id === selectedTrackJobId);
                      
                      // Find corresponding technician job
                      const matchedJob = jobs.find(j => j.sourceId === selectedTrackJobId);

                      const title = selectedProblem 
                        ? `แจ้งปัญหา: ${selectedProblem.pestType}` 
                        : `บริการ: ${selectedBooking?.packageName}`;
                      
                      const detailDesc = selectedProblem 
                        ? selectedProblem.description 
                        : `สั่งซื้อแพ็กเกจบริการความคุ้มครอง คาดนัดหมายเข้าปฏิบัติการครั้งแรก`;

                      const customerName = selectedProblem ? selectedProblem.customerName : selectedBooking?.customerName;
                      const address = selectedProblem ? selectedProblem.address : selectedBooking?.address;
                      const apptDate = selectedProblem ? selectedProblem.appointmentDate : selectedBooking?.bookingDate;

                      // Calculate Stepper State:
                      // 0: รอยืนยัน/รอดำเนินการ, 1: จัดคิวแล้ว/กำลังเตรียม, 2: เดินทาง, 3: เริ่มทำงาน, 4: ส่งงานพ่นเสร็จ, 5: ตรวจรับเสร็จสิ้น
                      let stepIndex = 0;
                      if (selectedProblem) {
                        if (selectedProblem.status === 'รอดำเนินการ') stepIndex = 0;
                        else if (selectedProblem.status === 'จัดสรรคิวช่างแล้ว') stepIndex = 1;
                        else if (selectedProblem.status === 'กำลังดำเนินการ') {
                          if (matchedJob?.status === 'กำลังเดินทาง') stepIndex = 2;
                          else if (matchedJob?.status === 'เริ่มดำเนินงาน') stepIndex = 3;
                          else if (matchedJob?.status === 'ส่งงานแล้ว') stepIndex = 4;
                        } else if (selectedProblem.status === 'เสร็จสิ้น') stepIndex = 5;
                      } else if (selectedBooking) {
                        if (selectedBooking.status === 'รอยืนยัน') stepIndex = 0;
                        else if (selectedBooking.status === 'ชำระเงินแล้ว') stepIndex = 1;
                        else if (selectedBooking.status === 'กำลังจัดทีมงาน') {
                          if (matchedJob?.status === 'กำลังเดินทาง') stepIndex = 2;
                          else if (matchedJob?.status === 'เริ่มดำเนินงาน') stepIndex = 3;
                          else if (matchedJob?.status === 'ส่งงานแล้ว') stepIndex = 4;
                          else stepIndex = 1;
                        } else if (selectedBooking.status === 'เสร็จสิ้น') stepIndex = 5;
                      }

                      // Adjust step based on tech job if present
                      if (matchedJob) {
                        if (matchedJob.status === 'กำลังเดินทาง') stepIndex = 2;
                        else if (matchedJob.status === 'เริ่มดำเนินงาน') stepIndex = 3;
                        else if (matchedJob.status === 'ส่งงานแล้ว') stepIndex = 4;
                        else if (matchedJob.status === 'เสร็จสิ้นและตรวจรับ') stepIndex = 5;
                      }

                      const steps = [
                        { label: 'แจ้งความต้องการ', desc: 'ส่งเรื่องเข้าระบบสำเร็จ' },
                        { label: 'จัดสรรคิวช่าง', desc: 'ล็อควันลงนัดหมายสำเร็จ' },
                        { label: 'กำลังเดินทาง', desc: 'ทีมช่างกำลังออกเดินทาง' },
                        { label: 'เริ่มหน้างาน', desc: 'กำลังฉีดพ่น/วางเคมี' },
                        { label: 'ส่งงาน', desc: 'ช่างอัปเดตรายงานพร้อมรูป' },
                        { label: 'เสร็จสมบูรณ์', desc: 'เจ้าของบ้านประเมินผ่าน' }
                      ];

                      return (
                        <div className="space-y-6 text-left">
                          {/* Header Details */}
                          <div className="border-b border-slate-100 pb-4">
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md font-mono font-bold">
                              ID: {selectedTrackJobId}
                            </span>
                            <h3 className="text-lg font-bold text-slate-800 mt-2">{title}</h3>
                            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                              {detailDesc}
                            </p>
                          </div>

                          {/* Stepper Component */}
                          <div>
                            <span className="text-xs font-bold text-slate-700 block mb-3">สถานะความคืบหน้าเรียลไทม์:</span>
                            <div className="relative pl-6 space-y-4">
                              {/* Connector Line */}
                              <div className="absolute left-[9px] top-2 bottom-2 w-0.5 bg-slate-100">
                                <div 
                                  className="w-full bg-amber-500 transition-all duration-500" 
                                  style={{ height: `${(stepIndex / (steps.length - 1)) * 100}%` }}
                                />
                              </div>

                              {steps.map((st, idx) => {
                                const isCompleted = idx < stepIndex;
                                const isCurrent = idx === stepIndex;
                                return (
                                  <div key={idx} className="flex items-start space-x-3 text-left">
                                    <div className={`relative z-10 w-5 h-5 rounded-full flex items-center justify-center border transition-colors ${
                                      isCompleted 
                                        ? 'bg-emerald-500 border-emerald-500 text-white' 
                                        : isCurrent
                                          ? 'bg-amber-500 border-amber-500 text-white ring-4 ring-amber-100'
                                          : 'bg-white border-slate-200 text-slate-400'
                                    }`}>
                                      {isCompleted ? (
                                        <Check className="w-3 h-3" />
                                      ) : (
                                        <span className="text-[10px] font-bold">{idx + 1}</span>
                                      )}
                                    </div>
                                    <div className="flex-1">
                                      <h5 className={`text-xs font-bold ${isCurrent ? 'text-amber-700 font-extrabold' : isCompleted ? 'text-slate-700 font-semibold' : 'text-slate-400'}`}>
                                        {st.label}
                                      </h5>
                                      <p className="text-[10px] text-slate-400 mt-0.5">{st.desc}</p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Detail of Assigned Team */}
                          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs text-slate-600 space-y-2">
                            <div className="flex justify-between">
                              <span className="text-slate-400">ทีมช่างที่รับผิดชอบ:</span>
                              <span className="font-bold text-slate-800">{matchedJob?.assignedTeam || 'อยู่ระหว่างจัดทีมงานจากส่วนกลาง'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">วันเข้างานที่นัดหมาย:</span>
                              <span className="font-bold text-amber-600 flex items-center">
                                <Calendar className="w-3.5 h-3.5 mr-1" />
                                {apptDate ? new Date(apptDate).toLocaleDateString('th-TH') : 'รอระบุคิวลงงาน'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">ชื่อลูกค้าหน้างาน:</span>
                              <span className="font-semibold text-slate-800">{customerName}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">ที่ตั้งสถานประกอบการ:</span>
                              <span className="font-semibold text-slate-800 text-right max-w-xs">{address}</span>
                            </div>
                          </div>

                          {/* Report Submission from Technician with photos */}
                          {matchedJob && (matchedJob.status === 'ส่งงานแล้ว' || matchedJob.status === 'เสร็จสิ้นและตรวจรับ') && (
                            <div className="border-t border-slate-100 pt-4 space-y-3">
                              <span className="text-xs font-bold text-emerald-800 flex items-center">
                                <Activity className="w-4 h-4 mr-1 text-emerald-600" />
                                <span>รายงานพ่นยาสำเร็จ จากช่างหน้างาน</span>
                              </span>
                              
                              {matchedJob.imageReport && (
                                <button
                                  type="button"
                                  onClick={() => setExpandedReportPhoto(matchedJob.imageReport || null)}
                                  className="group relative block w-full overflow-hidden rounded-xl border border-slate-100 text-left"
                                >
                                  <img 
                                    src={matchedJob.imageReport} 
                                    alt="Work evidence" 
                                    className="w-full h-40 object-cover transition group-hover:scale-[1.01]"
                                    referrerPolicy="no-referrer"
                                  />
                                  <div className="absolute bottom-2 left-2 bg-slate-900/70 text-white text-[9px] px-2 py-0.5 rounded">
                                    หลักฐานการปฏิบัติงานพ่นเคมี - กดดูรูปเต็ม
                                  </div>
                                </button>
                              )}

                              <div className="space-y-1 bg-emerald-50/50 p-3 rounded-lg text-xs text-emerald-900">
                                <div className="font-bold">สรุปเคมีและจุดลงงาน:</div>
                                <p className="text-emerald-800 text-[11px] leading-relaxed">
                                  {matchedJob.notesByTech || 'ไม่มีบันทึกเพิ่มเติมจากช่าง'}
                                </p>
                                {matchedJob.chemicalsUsed && matchedJob.chemicalsUsed.length > 0 && (
                                  <div className="pt-2 flex flex-wrap gap-1">
                                    {matchedJob.chemicalsUsed.map((chem, i) => (
                                      <span key={i} className="bg-emerald-100 text-emerald-800 text-[9px] px-2 py-0.5 rounded-full font-semibold flex items-center">
                                        <Droplet className="w-2.5 h-2.5 mr-0.5 text-emerald-600" />
                                        {chem}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {matchedJob && matchedJob.status === 'เสร็จสิ้นและตรวจรับ' && (
                            <div className="border-t border-slate-100 pt-4 bg-emerald-50/30 p-4 rounded-xl border border-emerald-100">
                              <span className="text-xs font-bold text-emerald-700 flex items-center mb-1">
                                <CheckCircle className="w-4.5 h-4.5 mr-1.5 text-emerald-600" />
                                <span>งานบริการนี้เสร็จสมบูรณ์เรียบร้อย</span>
                              </span>
                              <p className="text-[11px] text-slate-500 leading-relaxed">
                                ขอบคุณที่เลือกใช้บริการทีมงานกำจัดปลวกของเรา ระบบได้เปลี่ยนสัญญางานนี้เป็น 'สัญญาปกติ' พร้อมประกันดูแลต่อเนื่องเป็นระยะเวลา 1 ปี
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* TAB 4: SERVICE CONTRACTS */}
          {activeTab === 'contracts' && (
            <motion.div
              key="contracts"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-xl font-bold text-slate-800">สัญญาบริการคุ้มครองบ้านของฉัน</h2>
                <p className="text-xs text-slate-500 mt-1">รายละเอียดเอกสารสัญญากำจัดปลวกประจำปี จำนวนรอบเข้าตรวจสอบความปลอดภัยรอบบ้าน</p>
              </div>

              {contracts.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-slate-400">
                  <FileText className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                  <p className="text-sm">ไม่พบเอกสารสัญญาบริการที่เปิดใช้งานในขณะนี้</p>
                  <p className="text-xs text-slate-400 mt-1">เมื่อสั่งจองแพ็กเกจดูแลรายปีและพ่นยารอบแรกสำเร็จ สัญญาจะขึ้นแสดงทันที</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {contracts.map((con) => {
                    const progressPercent = (con.completedVisits / con.totalVisits) * 100;
                    return (
                      <div key={con.id} className="bg-white rounded-2xl border border-slate-100 shadow-xs p-6 space-y-4 text-left">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[10px] font-mono font-bold text-slate-400 block">เลขที่เอกสาร: {con.documentNo}</span>
                            <h3 className="text-md font-bold text-slate-800 mt-1">{con.packageName}</h3>
                          </div>
                          <span className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full font-bold">
                            {con.status}
                          </span>
                        </div>

                        {/* Customer & House details */}
                        <div className="bg-slate-50 p-3 rounded-xl text-xs space-y-1.5 text-slate-600">
                          <div className="flex justify-between">
                            <span className="text-slate-400">ผู้ถือสัญญา:</span>
                            <span className="font-bold text-slate-800">{con.customerName}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">ระยะสัญญาเริ่มต้น:</span>
                            <span className="font-semibold text-slate-800">{new Date(con.startDate).toLocaleDateString('th-TH')}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">วันหมดอายุสัญญา:</span>
                            <span className="font-semibold text-red-600">{new Date(con.endDate).toLocaleDateString('th-TH')}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">ราคาดูแลทั้งหมด:</span>
                            <span className="font-bold text-slate-800">{con.price.toLocaleString()} บาท</span>
                          </div>
                        </div>

                        {/* Visit Progress Bars */}
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs font-bold text-slate-700">
                            <span>จำนวนครั้งที่เข้าพ่นสเปรย์แล้ว:</span>
                            <span className="text-amber-600">{con.completedVisits} / {con.totalVisits} ครั้ง</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2">
                            <div 
                              className="bg-amber-500 h-2 rounded-full transition-all duration-500"
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                        </div>

                        {/* Next Scheduled date */}
                        <div className="pt-3 border-t border-slate-50 flex justify-between items-center text-xs">
                          <div>
                            <span className="text-slate-400 block text-[10px]">นัดหมายรอบประเมินถัดไป:</span>
                            <span className="font-bold text-slate-800">{new Date(con.nextVisitDate).toLocaleDateString('th-TH')}</span>
                          </div>
                          <div className="bg-amber-50 text-amber-800 p-2 rounded-lg text-[11px] font-semibold flex items-center">
                            <Calendar className="w-3.5 h-3.5 mr-1 text-amber-600" />
                            <span>สแกนตรวจซ้ำอัตโนมัติ</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {expandedReportPhoto && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/90 p-4">
          <button
            type="button"
            onClick={() => setExpandedReportPhoto(null)}
            className="absolute right-4 top-4 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/20"
          >
            ปิด
          </button>
          <img
            src={expandedReportPhoto}
            alt="รูปหลักฐานขนาดเต็ม"
            className="max-h-[90vh] max-w-full rounded-2xl object-contain shadow-2xl"
            referrerPolicy="no-referrer"
          />
        </div>
      )}
    </div>
  );
}
