import type { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { RouterLink, navigate } from '@/utils/router';
import { LogOut, LayoutDashboard, ClipboardList, BarChart3, Waves } from 'lucide-react';

export function StaffLayout({ children }: { children: ReactNode }) {
  const { session, logout } = useAuth();
  if (!session || (session.type !== 'staff' && session.type !== 'manager')) return null;

  const path = window.location.hash.replace(/^#/, '') || '/';
  const isManager = session.type === 'manager';

  return (
    <div className="min-h-screen bg-ops-50">
      <header className="sticky top-0 z-40 border-b border-ops-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5 sm:px-6">
          <div className="flex items-center gap-6">
            <RouterLink to={isManager ? '/staff/manager' : '/staff/dashboard'} className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-ops-900 text-white">
                <Waves className="h-4 w-4" />
              </div>
              <div className="leading-tight">
                <p className="text-sm font-semibold text-ops-900">Operations Center</p>
                <p className="text-[10px] text-ops-400">DoubleTree Malta</p>
              </div>
            </RouterLink>

            <nav className="hidden items-center gap-1 sm:flex">
              <StaffNavLink to="/staff/dashboard" active={path.startsWith('/staff/dashboard')} icon={<LayoutDashboard className="h-4 w-4" />} label="Dashboard" />
              <StaffNavLink to="/staff/requests" active={path.startsWith('/staff/requests')} icon={<ClipboardList className="h-4 w-4" />} label="Requests" />
              {isManager && (
                <StaffNavLink to="/staff/manager" active={path.startsWith('/staff/manager')} icon={<BarChart3 className="h-4 w-4" />} label="Manager" />
              )}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs font-semibold text-ops-900">{session.name}</p>
              <p className="text-[10px] text-ops-400">{session.role === 'manager' ? 'Manager' : session.department}</p>
            </div>
            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white ${isManager ? 'bg-ops-800' : 'bg-ops-600'}`}>
              {session.name.split(' ').map((p) => p[0]).join('')}
            </div>
            <button
              onClick={() => { logout(); navigate('/staff/login'); }}
              className="flex h-8 w-8 items-center justify-center rounded text-ops-400 transition-colors hover:bg-ops-100 hover:text-ops-700"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        <nav className="flex items-center gap-1 border-t border-ops-100 px-4 py-1.5 sm:hidden">
          <StaffNavLink to="/staff/dashboard" active={path.startsWith('/staff/dashboard')} icon={<LayoutDashboard className="h-4 w-4" />} label="Dashboard" />
          <StaffNavLink to="/staff/requests" active={path.startsWith('/staff/requests')} icon={<ClipboardList className="h-4 w-4" />} label="Requests" />
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
        active ? 'bg-ops-100 text-ops-900' : 'text-ops-500 hover:bg-ops-50 hover:text-ops-700'
      }`}
    >
      {icon}
      {label}
    </RouterLink>
  );
}
