import React, { useState } from 'react';
import { 
  MapPin, 
  Phone, 
  CheckCircle, 
  Camera, 
  Check, 
  Truck, 
  Wrench, 
  Sliders,
  AlertTriangle,
  Clipboard,
  Navigation,
  Droplet
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TechnicianJob, JobStatus } from '../types';
import { PRESET_CHEMICALS, PRESET_PHOTOS } from '../data';

interface TechnicianPortalProps {
  jobs: TechnicianJob[];
  onUpdateJobStatus: (jobId: string, status: JobStatus, updates?: Partial<TechnicianJob>) => Promise<void> | void;
}

export default function TechnicianPortal({ jobs, onUpdateJobStatus }: TechnicianPortalProps) {
  // Simulate active technician team
  const [selectedTeam, setSelectedTeam] = useState<string>('ทีมช่าง A (กรุงเทพฯ)');
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  // Form states for submitting job report
  const [reportNotes, setReportNotes] = useState('');
  const [selectedChemicals, setSelectedChemicals] = useState<string[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<string>('');
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  // Filter jobs by team
  const filteredJobs = jobs.filter(job => job.assignedTeam === selectedTeam);
  const activeJob = jobs.find(job => job.id === selectedJobId);

  const toggleChemical = (chem: string) => {
    if (selectedChemicals.includes(chem)) {
      setSelectedChemicals(selectedChemicals.filter(c => c !== chem));
    } else {
      setSelectedChemicals([...selectedChemicals, chem]);
    }
  };

  const handleStatusChange = async (jobId: string, currentStatus: JobStatus) => {
    let nextStatus: JobStatus;
    if (currentStatus === 'กำลังเตรียมตัว') nextStatus = 'กำลังเดินทาง';
    else if (currentStatus === 'กำลังเดินทาง') nextStatus = 'เริ่มดำเนินงาน';
    else if (currentStatus === 'เริ่มดำเนินงาน') {
      // Prompt photo and notes before submission
      const job = jobs.find(j => j.id === jobId);
      if (job) {
        setReportNotes(job.notesByTech || '');
        setSelectedChemicals(job.chemicalsUsed || []);
        setSelectedPhoto(job.imageReport || PRESET_PHOTOS[0].url);
        setShowSubmitModal(true);
        return;
      }
      return;
    } else {
      return;
    }

    try {
      await onUpdateJobStatus(jobId, nextStatus);
    } catch {
      alert('อัปเดตสถานะงานไม่สำเร็จ');
    }
  };

  const submitJobReport = async () => {
    if (!selectedJobId) return;
    if (!reportNotes.trim()) {
      alert('กรุณากรอกรายละเอียดบันทึกผลงานการกำจัดปลวก');
      return;
    }
    if (selectedChemicals.length === 0) {
      alert('กรุณาเลือกสารเคมี/เหยื่อล่อที่ใช้งานอย่างน้อย 1 ชนิด');
      return;
    }

    try {
      await onUpdateJobStatus(selectedJobId, 'ส่งงานแล้ว', {
        notesByTech: reportNotes,
        chemicalsUsed: selectedChemicals,
        imageReport: selectedPhoto,
        completedAt: new Date().toISOString()
      });

      setShowSubmitModal(false);
      setReportNotes('');
      setSelectedChemicals([]);
      setSelectedPhoto('');
    } catch {
      alert('ส่งรายงานงานช่างไม่สำเร็จ');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-left" id="technician-portal">
      {/* Sidebar: Team Selector & Job List */}
      <div className="lg:col-span-4 space-y-4">
        {/* Team Filter selector */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center">
            <Sliders className="w-3.5 h-3.5 mr-1.5 text-amber-600" />
            <span>เลือกทีมปฏิบัติงานช่าง</span>
          </label>
          <select
            value={selectedTeam}
            onChange={(e) => {
              setSelectedTeam(e.target.value);
              setSelectedJobId(null);
            }}
            className="w-full px-3 py-2.5 text-xs font-semibold border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-amber-500 text-slate-700"
          >
            <option value="ทีมช่าง A (กรุงเทพฯ)">ทีมช่าง A (กรุงเทพฯ - ปริมณฑล)</option>
            <option value="ทีมช่าง B (นนทบุรี)">ทีมช่าง B (นนทบุรี - ปทุมธานี)</option>
            <option value="ทีมช่าง C (สมุทรปราการ)">ทีมช่าง C (สมุทรปราการ - ตะวันออก)</option>
          </select>
        </div>

        {/* Assigned Job List */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-slate-50">
            <h3 className="text-sm font-extrabold text-slate-800">ตารางงานของทีมวันนี้</h3>
            <span className="bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
              {filteredJobs.length} งาน
            </span>
          </div>

          {filteredJobs.length === 0 ? (
            <div className="py-8 text-center text-slate-400">
              <Clipboard className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="text-xs">ไม่มีงานที่ได้รับมอบหมายสำหรับทีมนี้ในวันนี้</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredJobs.map((job) => {
                const isSelected = selectedJobId === job.id;
                
                // Color mapping for current status
                let statusColor = 'bg-slate-100 text-slate-700';
                if (job.status === 'กำลังเดินทาง') statusColor = 'bg-blue-100 text-blue-800';
                else if (job.status === 'เริ่มดำเนินงาน') statusColor = 'bg-amber-100 text-amber-800';
                else if (job.status === 'ส่งงานแล้ว') statusColor = 'bg-orange-100 text-orange-800';
                else if (job.status === 'เสร็จสิ้นและตรวจรับ') statusColor = 'bg-emerald-100 text-emerald-800';

                return (
                  <div
                    key={job.id}
                    onClick={() => setSelectedJobId(job.id)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer text-left ${
                      isSelected 
                        ? 'bg-amber-50/50 border-amber-400 ring-1 ring-amber-400 shadow-xs' 
                        : 'bg-white border-slate-100 hover:border-slate-200'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[9px] font-mono font-extrabold text-slate-400">{job.id}</span>
                      <span className={`text-[9px] px-2 py-0.5 rounded font-bold ${statusColor}`}>
                        {job.status}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-slate-800 leading-snug line-clamp-2">
                      {job.title}
                    </h4>

                    <div className="mt-3 space-y-1.5 text-[11px] text-slate-500">
                      <div className="flex items-center">
                        <MapPin className="w-3 h-3 text-slate-400 mr-1 shrink-0" />
                        <span className="truncate">{job.address}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600 font-semibold">{job.customerName}</span>
                        <span className="text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded font-mono text-[9px]">
                          {job.appointmentDate}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Main Panel: Interactive Workspace */}
      <div className="lg:col-span-8">
        {activeJob ? (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-xs p-6 md:p-8 space-y-6">
            
            {/* Header / Active Status Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-100">
              <div>
                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono font-bold">
                  งานรหัส: {activeJob.id}
                </span>
                <h2 className="text-lg font-bold text-slate-800 mt-1">{activeJob.title}</h2>
                <span className="text-xs text-slate-500">ต้นทางเรื่อง: {activeJob.sourceType === 'problem' ? 'แจ้งปัญหาแมลงรบกวน' : 'คิวซื้อแพ็กเกจบริการ'}</span>
              </div>

              {/* Status Action Buttons */}
              <div className="flex items-center space-x-2 shrink-0">
                {activeJob.status !== 'ส่งงานแล้ว' && activeJob.status !== 'เสร็จสิ้นและตรวจรับ' ? (
                  <button
                    onClick={() => handleStatusChange(activeJob.id, activeJob.status)}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center space-x-1.5 transition-all cursor-pointer shadow-xs"
                  >
                    {activeJob.status === 'กำลังเตรียมตัว' && (
                      <>
                        <Truck className="w-3.5 h-3.5" />
                        <span>กดเพื่อออกเดินทาง (On the Way)</span>
                      </>
                    )}
                    {activeJob.status === 'กำลังเดินทาง' && (
                      <>
                        <Wrench className="w-3.5 h-3.5" />
                        <span>กดเพื่อเริ่มปฎิบัติงานหน้างาน</span>
                      </>
                    )}
                    {activeJob.status === 'เริ่มดำเนินงาน' && (
                      <>
                        <Camera className="w-3.5 h-3.5" />
                        <span>กรอกสารเคมีและอัปรูปเพื่อส่งงาน</span>
                      </>
                    )}
                  </button>
                ) : (
                  <div className="flex items-center text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100 text-xs font-bold">
                    <CheckCircle className="w-4 h-4 mr-1.5 text-emerald-600" />
                    <span>{activeJob.status === 'ส่งงานแล้ว' ? 'ส่งรายงานเคมีเรียบร้อย (รอตรวจรับ)' : 'ตรวจรับงานเรียบร้อยแล้ว'}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Grid Layout for Job Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Box 1: Customer Info & Pest Details */}
              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                  <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider border-b border-slate-200 pb-2">
                    ข้อมูลผู้รับบริการและการนัดหมาย
                  </h3>
                  
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">ลูกค้า:</span>
                      <span className="font-bold text-slate-800">{activeJob.customerName}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">เบอร์ติดต่อ:</span>
                      <a 
                        href={`tel:${activeJob.customerPhone}`}
                        className="font-mono font-bold text-amber-700 hover:underline flex items-center"
                      >
                        <Phone className="w-3 h-3 mr-1" />
                        {activeJob.customerPhone}
                      </a>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">วันเข้าปฏิบัติงาน:</span>
                      <span className="font-bold text-slate-800 font-mono">{activeJob.appointmentDate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">ทีมจัดสรรช่าง:</span>
                      <span className="font-semibold text-slate-800">{activeJob.assignedTeam}</span>
                    </div>
                  </div>
                </div>

                {/* Pest Problems & Symptoms Description */}
                <div className="bg-amber-50/40 p-4 rounded-2xl border border-amber-100 space-y-3">
                  <h3 className="text-xs font-extrabold text-amber-900 uppercase tracking-wider flex items-center">
                    <AlertTriangle className="w-4 h-4 text-amber-600 mr-1.5 shrink-0" />
                    <span>ปัญหาจุดรบกวนหน้างาน</span>
                  </h3>
                  <div className="text-xs leading-relaxed text-slate-700 space-y-2">
                    <p>
                      <strong>รายละเอียดที่แจ้งเข้ามา:</strong><br />
                      {activeJob.description}
                    </p>
                    <div className="pt-2 border-t border-amber-100/50 flex justify-between items-center text-[11px]">
                      <span className="text-amber-800">ประเภทศัตรูพืช:</span>
                      <span className="font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                        {activeJob.title.includes('มด') ? 'มด' : activeJob.title.includes('หนู') ? 'หนู' : 'ปลวก'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Box 2: Worksite Location with Simulated Mini-Map */}
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-100 space-y-3 flex flex-col justify-between h-full">
                  <div>
                    <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider border-b border-slate-200 pb-2 flex items-center justify-between">
                      <span>สถานที่ทำงานปฏิบัติการ</span>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(activeJob.address);
                          alert('คัดลอกที่อยู่ไปยังคลิปบอร์ดเรียบร้อย');
                        }}
                        className="text-[10px] text-amber-700 hover:underline font-bold"
                      >
                        คัดลอกที่อยู่
                      </button>
                    </h3>
                    <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                      {activeJob.address}
                    </p>
                  </div>

                  {/* Simulated interactive mini map */}
                  <div className="relative bg-slate-100 rounded-xl overflow-hidden h-36 border border-slate-200 flex items-center justify-center mt-3">
                    {/* Grid texture background simulating map */}
                    <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle, #334155 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center space-y-1.5 z-10">
                      <div className="bg-amber-600 p-2 rounded-full inline-block shadow-lg animate-bounce">
                        <MapPin className="w-5 h-5 text-white" />
                      </div>
                      <div className="bg-slate-900/80 text-white text-[9px] px-2 py-0.5 rounded-full font-bold">
                        พิกัดลูกค้า: บางกะปิ / กรุงเทพฯ
                      </div>
                    </div>

                    <div className="absolute bottom-2 right-2 flex space-x-1">
                      <a 
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activeJob.address)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="bg-white hover:bg-slate-50 text-slate-800 text-[9px] font-bold px-2 py-1 rounded shadow-xs border border-slate-200 flex items-center space-x-0.5"
                      >
                        <Navigation className="w-2.5 h-2.5 text-blue-600" />
                        <span>เปิด Google Maps</span>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Display Report details if completed */}
            {(activeJob.status === 'ส่งงานแล้ว' || activeJob.status === 'เสร็จสิ้นและตรวจรับ') && (
              <div className="bg-emerald-50/40 p-5 rounded-2xl border border-emerald-100 space-y-4">
                <h3 className="text-sm font-extrabold text-emerald-900 flex items-center">
                  <CheckCircle className="w-4.5 h-4.5 text-emerald-600 mr-2 shrink-0" />
                  <span>รายงานสรุปสารเคมีและผลงานที่ส่งมอบ</span>
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-slate-400 block mb-1">บันทึกหน้างานของช่าง:</span>
                      <p className="bg-white p-3 rounded-xl border border-slate-100 text-slate-700 leading-relaxed font-medium">
                        {activeJob.notesByTech}
                      </p>
                    </div>

                    <div>
                      <span className="text-slate-400 block mb-1">สารเคมีเคมีภัณฑ์และระบบเหยื่อที่ติดตั้ง:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {activeJob.chemicalsUsed?.map((chem, idx) => (
                          <span key={idx} className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center">
                            <Droplet className="w-3 h-3 mr-1 text-emerald-600" />
                            {chem}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    {activeJob.imageReport && (
                      <div className="rounded-xl overflow-hidden border border-slate-200 relative">
                        <img 
                          src={activeJob.imageReport} 
                          alt="Submitted report photo" 
                          className="w-full h-44 object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute bottom-2 left-2 bg-slate-900/75 text-white text-[9px] px-2 py-0.5 rounded">
                          รูปถ่ายตรวจพ่นจริง
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-xs p-12 text-center text-slate-400">
            <Clipboard className="w-16 h-16 mx-auto text-slate-300 mb-3" />
            <p className="text-sm font-semibold text-slate-600">กรุณาเลือกตารางงานที่มอบหมายจากแถบด้านซ้าย</p>
            <p className="text-xs text-slate-400 mt-1">ช่างสามารถดูพิกัด แผนที่ทางเดินปลวก และอัปเดตสถานะแบบเรียลไทม์เพื่อแจ้งเตือนให้แอดมินและลูกค้าทราบได้ทันที</p>
          </div>
        )}
      </div>

      {/* REPORT SUBMISSION AND PRESENTS ATTACHMENT MODAL */}
      <AnimatePresence>
        {showSubmitModal && activeJob && (
          <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl max-w-2xl w-full p-6 md:p-8 shadow-xl border border-slate-100 max-h-[92vh] overflow-y-auto"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center space-x-2">
                  <Camera className="w-5 h-5 text-amber-600" />
                  <h3 className="text-lg font-extrabold text-slate-800">ส่งงานพ่นสารเคมี และแนบภาพรายงาน</h3>
                </div>
                <button 
                  onClick={() => setShowSubmitModal(false)}
                  className="text-slate-400 hover:text-slate-600 font-mono text-xl"
                >
                  &times;
                </button>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl text-xs space-y-1 mb-4">
                <p><strong>ผู้รับบริการ:</strong> {activeJob.customerName}</p>
                <p><strong>สถานที่หน้างาน:</strong> {activeJob.address}</p>
              </div>

              <div className="space-y-4">
                
                {/* Chemicals checkboxes */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-2">
                    เลือกสารเคมีเคมีภัณฑ์หรือระบบเหยื่อที่ใช้งานจริง *
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {PRESET_CHEMICALS.map((chem) => (
                      <button
                        key={chem}
                        type="button"
                        onClick={() => toggleChemical(chem)}
                        className={`px-3 py-2 text-left rounded-xl text-xs border transition-all flex items-center space-x-2 ${
                          selectedChemicals.includes(chem)
                            ? 'bg-emerald-50 border-emerald-400 text-emerald-800 font-bold'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <span className={`w-3.5 h-3.5 rounded flex items-center justify-center border text-white ${
                          selectedChemicals.includes(chem) ? 'bg-emerald-600 border-emerald-600' : 'border-slate-300'
                        }`}>
                          {selectedChemicals.includes(chem) && <Check className="w-2.5 h-2.5" />}
                        </span>
                        <span className="truncate">{chem}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Technical notes */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">
                    บันทึกผลงานการบริการกำจัดปลวกเพิ่มเติม *
                  </label>
                  <textarea
                    rows={3}
                    placeholder="เช่น ดำเนินการอัดน้ำยาเคมีลงท่อใต้ถุนบ้าน 200 ลิตร พร้อมเจาะพื้นพ่นสกัดขอบบิ้วอินครัว 2 จุด ตรวจสแกนเสาบ้านซ้ำไม่พบปลวกมีชีวิต"
                    value={reportNotes}
                    onChange={(e) => setReportNotes(e.target.value)}
                    className="w-full px-4 py-2.5 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Attached Work Photo Selection Presets */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">
                    แนบรูปถ่ายปฏิบัติงานพ่นสารเคมี (เลือกจากภาพจำลองหน้างานจริง) *
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                    {PRESET_PHOTOS.map((photo, index) => (
                      <div
                        key={index}
                        onClick={() => setSelectedPhoto(photo.url)}
                        className={`relative rounded-xl overflow-hidden cursor-pointer border-2 transition-all h-20 ${
                          selectedPhoto === photo.url
                            ? 'border-emerald-600 ring-2 ring-emerald-100'
                            : 'border-slate-100 hover:border-slate-300'
                        }`}
                      >
                        <img 
                          src={photo.url} 
                          alt={photo.name} 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-end p-1">
                          <span className="text-[8px] text-white font-bold leading-tight truncate w-full">{photo.name}</span>
                        </div>
                        {selectedPhoto === photo.url && (
                          <div className="absolute top-1 right-1 bg-emerald-600 p-0.5 rounded-full text-white">
                            <Check className="w-2.5 h-2.5" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 flex space-x-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowSubmitModal(false)}
                    className="w-1/2 py-2.5 text-xs font-bold border border-slate-200 text-slate-500 rounded-xl hover:bg-slate-50"
                  >
                    ย้อนกลับ
                  </button>
                  <button
                    type="button"
                    onClick={submitJobReport}
                    className="w-1/2 py-2.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl"
                  >
                    ส่งรายงานพ่นยาทันที
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
