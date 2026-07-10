import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  Bug,
  User,
  Wrench,
  ShieldAlert,
  ArrowRight,
  Eye,
  EyeOff
} from 'lucide-react';
import { PortalRole } from '../types';

type LoginValues = {
  username: string;
  password: string;
  role: PortalRole;
};

interface LoginPageProps {
  onLogin: (values: LoginValues) => Promise<void>;
  loading: boolean;
  error: string | null;
}

const ROLE_OPTIONS: Array<{
  role: PortalRole;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  hint: string;
}> = [
  {
    role: 'user',
    title: 'Admin',
    subtitle: 'งานจัดการระบบ งานอนุมัติ และสรุปรายงาน',
    icon: <ShieldAlert className="h-5 w-5" />,
    hint: 'user / 1234'
  },
  {
    role: 'technician',
    title: 'Technician',
    subtitle: 'คิวงานช่าง อัปเดตสถานะ และส่งรายงานหน้างาน',
    icon: <Wrench className="h-5 w-5" />,
    hint: 'technician / 1234'
  },
  {
    role: 'customer',
    title: 'Customer',
    subtitle: 'แจ้งปัญหา จองแพ็กเกจ และติดตามงานบริการ',
    icon: <User className="h-5 w-5" />,
    hint: 'customer / 1234'
  }
];

export default function LoginPage({ onLogin, loading, error }: LoginPageProps) {
  const [values, setValues] = useState<LoginValues>({
    username: 'user',
    password: '1234',
    role: 'user'
  });
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const selected = ROLE_OPTIONS.find((item) => item.role === values.role);
    if (selected) {
      setValues((prev) => ({
        ...prev,
        username: selected.role,
        password: '1234'
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values.role]);

  const activeRole = useMemo(
    () => ROLE_OPTIONS.find((item) => item.role === values.role) ?? ROLE_OPTIONS[0],
    [values.role]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onLogin(values);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fff6db_0%,#f8fafc_35%,#eef2ff_100%)] px-4 py-8 text-slate-900">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-lg items-center"
      >
        <div className="w-full rounded-[32px] border border-black/10 bg-white/90 p-6 shadow-[0_25px_80px_rgba(15,23,42,0.12)] backdrop-blur-xl sm:p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-600 text-white shadow-sm">
              <Bug className="h-6 w-6" />
            </div>
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">
                Insect Control Spray Team
              </div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900">
                เข้าสู่ระบบ
              </h1>
            </div>
          </div>

          <div className="mb-6 rounded-2xl border border-black/10 bg-slate-50 px-4 py-3">
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Current Role</div>
            <div className="mt-1 flex items-center gap-2 text-sm font-extrabold text-slate-800">
              {values.role === 'user' && <ShieldAlert className="h-4 w-4 text-amber-600" />}
              {values.role === 'technician' && <Wrench className="h-4 w-4 text-amber-600" />}
              {values.role === 'customer' && <User className="h-4 w-4 text-amber-600" />}
              <span>{activeRole.title}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {ROLE_OPTIONS.map((item) => (
              <button
                key={item.role}
                type="button"
                onClick={() => !loading && setValues((prev) => ({ ...prev, role: item.role }))}
                disabled={loading}
                className={`rounded-2xl border px-3 py-2 text-xs font-bold transition ${
                  values.role === item.role
                    ? 'border-amber-500 bg-amber-50 text-amber-700'
                    : 'border-black/10 bg-white text-slate-600 hover:border-black/20'
                }`}
              >
                {item.title}
              </button>
            ))}
          </div>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Username
              </span>
              <input
                value={values.username}
                onChange={(e) => setValues((prev) => ({ ...prev, username: e.target.value }))}
                disabled={loading}
                className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none ring-0 placeholder:text-slate-400 focus:border-amber-400"
                placeholder="กรอก username"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Password
              </span>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={values.password}
                  onChange={(e) => setValues((prev) => ({ ...prev, password: e.target.value }))}
                  disabled={loading}
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 pr-12 text-sm font-semibold text-slate-900 outline-none ring-0 placeholder:text-slate-400 focus:border-amber-400"
                  placeholder="กรอกรหัสผ่าน"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-800"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>

            {error && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-600 px-5 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-amber-900/20 transition hover:-translate-y-0.5 hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
