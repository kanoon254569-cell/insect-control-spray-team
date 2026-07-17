import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Bug,
  ArrowRight,
  Eye,
  EyeOff
} from 'lucide-react';

type LoginValues = {
  username: string;
  password: string;
  displayName: string;
};

interface LoginPageProps {
  onLogin: (values: LoginValues) => Promise<void>;
  onRegister: (values: LoginValues) => Promise<void>;
  loading: boolean;
  error: string | null;
}

export default function LoginPage({ onLogin, onRegister, loading, error }: LoginPageProps) {
  const [registerAllowed, setRegisterAllowed] = useState(true);

  React.useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/config');
        if (!res.ok) return;
        const data = await res.json();
        if (active && typeof data.registrationDisabled === 'boolean') {
          setRegisterAllowed(!data.registrationDisabled);
        }
      } catch {}
    })();
    return () => { active = false; };
  }, []);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [values, setValues] = useState<LoginValues>({
    username: '',
    password: '',
    displayName: ''
  });
  const [showPassword, setShowPassword] = useState(false);

  const [formLoading, setFormLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formLoading) return;
    setFormLoading(true);
    try {
      if (mode === 'register') {
        await onRegister(values);
      } else {
        await onLogin(values);
      }
    } finally {
      setFormLoading(false);
    }
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
                NP Place Control Co., Ltd.
              </div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900">
                {mode === 'register' ? 'สมัครบัญชี' : 'เข้าสู่ระบบ'}
              </h1>
            </div>
          </div>

          <div className="mb-5 grid grid-cols-2 gap-2 rounded-2xl border border-black/10 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => !loading && setMode('login')}
              className={`rounded-xl px-3 py-2 text-xs font-extrabold transition ${
                mode === 'login' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              เข้าสู่ระบบ
            </button>
            <button
              type="button"
              onClick={() => !loading && registerAllowed && setMode('register')}
              className={`rounded-xl px-3 py-2 text-xs font-extrabold transition ${
                mode === 'register' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              } ${!registerAllowed ? 'opacity-40 cursor-not-allowed' : ''}`}
              disabled={!registerAllowed}
            >
              สมัครบัญชี
            </button>
          </div>
          {!registerAllowed && (
            <div className="mb-4 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
              ระบบถูกตั้งค่าให้มีบัญชีเดียวเท่านั้น การสมัครใหม่ถูกปิดไว้
            </div>
          )}

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            {mode === 'register' && (
              <>
                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Display Name
                  </span>
                  <input
                    value={values.displayName}
                    onChange={(e) => setValues((prev) => ({ ...prev, displayName: e.target.value }))}
                    disabled={loading}
                    className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none ring-0 placeholder:text-slate-400 focus:border-amber-400"
                    placeholder="ชื่อที่จะแสดงในระบบ"
                  />
                </label>
                <p className="text-xs text-slate-500">Display Name นี้จะแสดงแทนชื่อผู้ใช้ในระบบ และจะใช้เป็นข้อมูลโปรไฟล์ของคุณ</p>
              </>
            )}

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
                  placeholder={mode === 'register' ? 'ตั้งรหัสผ่านอย่างน้อย 6 ตัวอักษร' : 'กรอกรหัสผ่าน'}
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
              disabled={loading || formLoading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-600 px-5 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-amber-900/20 transition hover:-translate-y-0.5 hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading || formLoading
                ? mode === 'register'
                  ? 'กำลังสมัครบัญชี...'
                  : 'กำลังเข้าสู่ระบบ...'
                : mode === 'register'
                  ? 'สมัครบัญชีและเข้าสู่ระบบ'
                  : 'เข้าสู่ระบบ'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
