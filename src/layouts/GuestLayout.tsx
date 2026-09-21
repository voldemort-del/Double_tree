import type { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { RouterLink, navigate } from '@/utils/router';
import { hotelInfo } from '@/data/mockData';
import { LogOut, Home, MessageCircle, ClipboardList, Waves, UtensilsCrossed } from 'lucide-react';
import { ConnectionIndicator } from '@/components/ConnectionIndicator';
import { ToastContainer } from '@/components/ToastContainer';

export function GuestLayout({ children }: { children: ReactNode }) {
  const { session, logout } = useAuth();

  if (session?.type !== 'guest') return null;

  const path = window.location.hash.replace(/^#/, '') || '/';
  const isActive = (p: string) => path.startsWith(p);

  return (
    <div className="min-h-screen bg-champagne-gradient">
      <ToastContainer />

      {/* ── Header ─ Luminous White & Mediterranean Ocean Accent ─────── */}
      <header className="sticky top-0 z-40 border-b border-slate-200/90 bg-white/95 backdrop-blur-md shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <RouterLink to="/guest/dashboard" className="flex items-center gap-3">
            {/* Ocean icon mark */}
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-sea-500 to-sea-700 shadow-gold-glow">
              <Waves className="h-5 w-5 text-white" />
            </div>
            <div className="leading-tight">
              <div className="flex items-center gap-2">
                <p className="font-serif text-base font-semibold text-ops-900 tracking-wide">{hotelInfo.name}</p>
                <ConnectionIndicator />
              </div>
              <p className="text-[10px] text-sea-700 font-semibold tracking-widest uppercase">Digital Concierge</p>
            </div>
          </RouterLink>

          <div className="flex items-center gap-1 sm:gap-2">
            <NavLink to="/guest/dashboard" active={isActive('/guest/dashboard')} icon={<Home           className="h-4 w-4" />} label="Home"       />
            <NavLink to="/guest/dining"    active={isActive('/guest/dining')}    icon={<UtensilsCrossed className="h-4 w-4" />} label="Dining & Bar" />
            <NavLink to="/guest/concierge" active={isActive('/guest/concierge')} icon={<MessageCircle  className="h-4 w-4" />} label="Concierge" />
            <NavLink to="/guest/requests"  active={isActive('/guest/requests')}  icon={<ClipboardList  className="h-4 w-4" />} label="Requests"  />

            <div className="ml-2 flex items-center gap-2 border-l border-slate-200 pl-3">
              <div className="hidden text-right sm:block">
                <p className="text-xs font-semibold text-ops-900">{session.name}</p>
                <p className="text-[11px] font-medium text-ops-500">Room {session.roomNumber}</p>
              </div>
              {/* Avatar */}
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-sea-500 to-sea-700 text-xs font-bold text-white shadow-sm">
                {session.name.split(' ').map((p) => p[0]).join('').slice(0, 2)}
              </div>
              <button
                onClick={() => { logout(); navigate('/guest/login'); }}
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-ops-900"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}

function NavLink({ to, active, icon, label }: { to: string; active: boolean; icon: ReactNode; label: string }) {
  return (
    <RouterLink
      to={to}
      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
        active
          ? 'bg-sea-50 text-sea-700 border border-sea-200 font-semibold shadow-sm'
          : 'text-ops-600 hover:bg-slate-100 hover:text-ops-900'
      }`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </RouterLink>
  );
}
