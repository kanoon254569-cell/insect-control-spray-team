import React from 'react';
import { Bug, LogOut, Sparkles } from 'lucide-react';
import { PortalRole } from '../types';

interface RouteShellProps {
  role: PortalRole;
  title: string;
  subtitle: string;
  routeLabel: string;
  onLogout: () => void;
  children: React.ReactNode;
}

const ROLE_META: Record<PortalRole, { badge: string; gradient: string }> = {
  customer: {
    badge: 'NP Place Control Co., Ltd.',
    gradient: 'from-amber-600 via-orange-500 to-slate-900'
  },
  technician: {
    badge: 'NP Place Control Co., Ltd.',
    gradient: 'from-slate-900 via-slate-800 to-amber-800'
  },
  user: {
    badge: 'NP Place Control Co., Ltd.',
    gradient: 'from-amber-700 via-slate-900 to-slate-950'
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

      <main className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-8">
        <section className="min-w-0">
          {children}
        </section>
      </main>
    </div>
  );
}
