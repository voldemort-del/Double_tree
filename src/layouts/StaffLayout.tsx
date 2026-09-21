import type { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { RouterLink, navigate } from '@/utils/router';
import { LogOut, LayoutDashboard, ClipboardList, BarChart3, Waves, UtensilsCrossed } from 'lucide-react';
import { ConnectionIndicator } from '@/components/ConnectionIndicator';
import { ToastContainer } from '@/components/ToastContainer';

export function StaffLayout({ children }: { children: ReactNode }) {
  const { session, logout } = useAuth();
  if (!session || (session.type !== 'staff' && session.type !== 'manager')) return null;

  const path = window.location.hash.replace(/^#/, '') || '/';
  const isManager = session.type === 'manager';

  return (
    <div className="min-h-screen bg-ops-50">
      <ToastContainer />

      {/* ── Header ─ Deep Navy ───────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-ops-800/60 bg-ops-900 shadow-navy-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5 sm:px-6">
          <div className="flex items-center gap-6">
            <RouterLink to={isManager ? '/staff/manager' : '/staff/dashboard'} className="flex items-center gap-2.5">
              {/* Gold icon mark */}
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sea-400 to-sea-600 shadow-gold-glow">
                <Waves className="h-4 w-4 text-white" />
              </div>
              <div className="leading-tight">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-white tracking-wide">Operations Center</p>
                  <ConnectionIndicator />
                </div>
                <p className="text-[10px] text-sea-300 font-medium tracking-widest uppercase">DoubleTree Malta</p>
              </div>
            </RouterLink>

            <nav className="hidden items-center gap-0.5 sm:flex">
              <StaffNavLink to="/staff/dashboard" active={path.startsWith('/staff/dashboard')} icon={<LayoutDashboard className="h-4 w-4" />} label="Dashboard" />
              <StaffNavLink to="/staff/requests"  active={path.startsWith('/staff/requests')}  icon={<ClipboardList   className="h-4 w-4" />} label="Requests"  />
              <StaffNavLink to="/staff/menu"      active={path.startsWith('/staff/menu')}      icon={<UtensilsCrossed className="h-4 w-4" />} label="Menu"      />
              {isManager && (
                <StaffNavLink to="/staff/manager" active={path.startsWith('/staff/manager')} icon={<BarChart3 className="h-4 w-4" />} label="Manager" />
              )}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-white">{session.name}</p>
              <p className="text-[10px] text-ops-400">{session.role === 'manager' ? 'Manager' : session.department}</p>
            </div>
            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-ops-900 ${isManager ? 'bg-gradient-to-br from-sea-300 to-sea-500' : 'bg-gradient-to-br from-sea-400 to-sea-600'}`}>
              {session.name.split(' ').map((p) => p[0]).join('')}
            </div>
            <button
              onClick={() => { logout(); navigate('/staff/login'); }}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-ops-400 transition-colors hover:bg-ops-800 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        <nav className="flex items-center gap-0.5 border-t border-ops-800/60 px-4 py-1.5 sm:hidden">
          <StaffNavLink to="/staff/dashboard" active={path.startsWith('/staff/dashboard')} icon={<LayoutDashboard className="h-4 w-4" />} label="Dashboard" />
          <StaffNavLink to="/staff/requests"  active={path.startsWith('/staff/requests')}  icon={<ClipboardList   className="h-4 w-4" />} label="Requests"  />
          <StaffNavLink to="/staff/menu"      active={path.startsWith('/staff/menu')}      icon={<UtensilsCrossed className="h-4 w-4" />} label="Menu"      />
          {isManager && (
            <StaffNavLink to="/staff/manager" active={path.startsWith('/staff/manager')} icon={<BarChart3 className="h-4 w-4" />} label="Manager" />
          )}
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {children}
      </main>
    </div>
  );
}

function StaffNavLink({ to, active, icon, label }: { to: string; active: boolean; icon: ReactNode; label: string }) {
  return (
    <RouterLink
      to={to}
      className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
        active
          ? 'bg-sea-600/30 text-sea-300 border border-sea-600/40'
          : 'text-ops-300 hover:bg-ops-800 hover:text-white'
      }`}
    >
      {icon}
      {label}
    </RouterLink>
  );
}
