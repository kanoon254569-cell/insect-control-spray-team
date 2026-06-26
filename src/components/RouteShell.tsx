import React from 'react';
import { motion } from 'motion/react';
import { Bug, ChevronRight, LogOut, Shield, Sparkles, User, Wrench, ShieldAlert } from 'lucide-react';
import { PortalRole } from '../types';

interface RouteShellProps {
  role: PortalRole;
  title: string;
  subtitle: string;
  routeLabel: string;
  onLogout: () => void;
  children: React.ReactNode;
}

const ROLE_META: Record<PortalRole, { badge: string; icon: React.ReactNode; gradient: string; accent: string }> = {
  customer: {
    badge: 'Customer Workspace',
    icon: <User className="h-4 w-4" />,
    gradient: 'from-amber-600 via-orange-500 to-slate-900',
    accent: 'text-amber-700'
  },
  technician: {
    badge: 'Technician Workspace',
    icon: <Wrench className="h-4 w-4" />,
    gradient: 'from-slate-900 via-slate-800 to-amber-800',
    accent: 'text-slate-700'
  },
  user: {
    badge: 'User Workspace',
    icon: <ShieldAlert className="h-4 w-4" />,
    gradient: 'from-amber-700 via-slate-900 to-slate-950',
    accent: 'text-amber-800'
  }
};

export default function RouteShell({ role, title, subtitle, routeLabel, onLogout, children }: RouteShellProps) {
  const meta = ROLE_META[role];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fff8e7_0%,#f8fafc_30%,#eef2ff_100%)] text-slate-900">
      <div className={`border-b border-black/10 bg-gradient-to-r ${meta.gradient} text-white`}>
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 backdrop-blur">
              <Bug className="h-6 w-6 text-amber-300" />
            </div>
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.28em] text-amber-200/80">
                {meta.badge}
              </div>
              <h1 className="text-xl font-black tracking-tight">{title}</h1>
              <p className="text-sm text-white/75">{subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold text-white/90 md:flex">
              <Sparkles className="h-4 w-4 text-amber-300" />
              <span>{routeLabel}</span>
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm font-bold text-slate-900 transition hover:-translate-y-0.5 hover:bg-amber-50"
            >
              <LogOut className="h-4 w-4" />
              ออกจากระบบ
            </button>
          </div>
        </div>
      </div>

      <main className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[280px_1fr] lg:px-8">
        <aside className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[28px] border border-black/10 bg-white/85 p-5 shadow-panel backdrop-blur"
          >
            <div className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Current Route</div>
            <div className={`mt-2 flex items-center gap-2 text-lg font-black ${meta.accent}`}>
              {meta.icon}
              <span>{routeLabel}</span>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              หน้านี้แยก shell ชัดเจนสำหรับบทบาทนี้ เพื่อให้การใช้งานและการอนุญาตดูเป็นระบบมากขึ้น
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-[28px] border border-black/10 bg-white/85 p-5 shadow-panel backdrop-blur"
          >
            <div className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Route Tips</div>
            <div className="mt-3 space-y-3 text-sm text-slate-700">
              <div className="flex gap-2">
                <ChevronRight className="mt-0.5 h-4 w-4 text-amber-600" />
                <span>ระบบจะกันเข้าหน้านี้ถ้ายังไม่ล็อกอิน</span>
              </div>
              <div className="flex gap-2">
                <ChevronRight className="mt-0.5 h-4 w-4 text-amber-600" />
                <span>ข้อมูลทุกชุดมาจาก backend API เดียวกัน</span>
              </div>
              <div className="flex gap-2">
                <ChevronRight className="mt-0.5 h-4 w-4 text-amber-600" />
                <span>session เก็บไว้ใน cookie แบบ HttpOnly</span>
              </div>
            </div>
          </motion.div>
        </aside>

        <section className="min-w-0">
          {children}
        </section>
      </main>
    </div>
  );
}
