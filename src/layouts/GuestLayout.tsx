import type { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { RouterLink, navigate } from '@/utils/router';
import { hotelInfo } from '@/data/mockData';
import { LogOut, Home, MessageCircle, ClipboardList, Waves } from 'lucide-react';

export function GuestLayout({ children }: { children: ReactNode }) {
  const { session, logout } = useAuth();

  if (session?.type !== 'guest') return null;

  const path = window.location.hash.replace(/^#/, '') || '/';
  const isActive = (p: string) => path.startsWith(p);

  return (
    <div className="min-h-screen bg-sand-50">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-sand-200/60 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <RouterLink to="/guest/dashboard" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sea-600 text-white">
              <Waves className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <p className="font-serif text-base font-semibold text-slate-800">{hotelInfo.name}</p>
              <p className="text-[11px] text-slate-400">Digital Concierge</p>
            </div>
          </RouterLink>

          <div className="flex items-center gap-1 sm:gap-2">
            <NavLink to="/guest/dashboard" active={isActive('/guest/dashboard')} icon={<Home className="h-4 w-4" />} label="Home" />
            <NavLink to="/guest/concierge" active={isActive('/guest/concierge')} icon={<MessageCircle className="h-4 w-4" />} label="Concierge" />
            <NavLink to="/guest/requests" active={isActive('/guest/requests')} icon={<ClipboardList className="h-4 w-4" />} label="Requests" />
            <div className="ml-2 flex items-center gap-2 border-l border-sand-200 pl-3">
              <div className="hidden text-right sm:block">
                <p className="text-xs font-medium text-slate-700">{session.name}</p>
                <p className="text-[11px] text-slate-400">Room {session.roomNumber}</p>
              </div>
              <button
                onClick={() => { logout(); navigate('/guest/login'); }}
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-sand-100 hover:text-slate-600"
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
      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
        active ? 'bg-sea-50 text-sea-700' : 'text-slate-500 hover:bg-sand-100 hover:text-slate-700'
      }`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </RouterLink>
  );
}
