import type { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { RouterLink, navigate } from '@/utils/router';
import { LogOut, LayoutDashboard, ClipboardList, BarChart3, Waves, UtensilsCrossed, BedDouble, Brush, CalendarDays, ArrowRightLeft, Wrench } from 'lucide-react';
import { ConnectionIndicator } from '@/components/ConnectionIndicator';
import { ToastContainer } from '@/components/ToastContainer';

export function StaffLayout({ children }: { children: ReactNode }) {
  const { session, staffData, logout } = useAuth();
  if (!session || (session.type !== 'staff' && session.type !== 'manager')) return null;

  const path = window.location.hash.replace(/^#/, '') || '/';
  const isManager = session.type === 'manager';
  const canWorkHousekeeping = isManager || Boolean(staffData?.housekeepingEligible);
  const canWorkMaintenance = isManager || Boolean(staffData?.maintenanceEligible) || staffData?.department === 'Maintenance';

  return (
    <div className="min-h-screen bg-ops-50 flex flex-col">
      <ToastContainer />

      {/* ── Header ─ Deep Navy ───────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-ops-800/80 bg-ops-900 shadow-navy-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-3 py-2 sm:px-6 sm:py-2.5">
          <div className="flex items-center gap-3 sm:gap-6">
            <RouterLink to={isManager ? '/staff/manager' : '/staff/dashboard'} className="flex items-center gap-2">
              {/* Logo mark */}
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sea-400 to-sea-600 shadow-gold-glow flex-shrink-0">
                <Waves className="h-4 w-4 text-white" />
              </div>
              <div className="leading-tight">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs sm:text-sm font-semibold text-white tracking-wide truncate max-w-[130px] sm:max-w-none">
                    Operations
                  </p>
                  <ConnectionIndicator />
                </div>
                <p className="text-[9px] sm:text-[10px] text-sea-300 font-medium tracking-widest uppercase">DoubleTree Malta</p>
              </div>
            </RouterLink>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              <StaffNavLink to="/staff/dashboard" active={path.startsWith('/staff/dashboard')} icon={<LayoutDashboard className="h-4 w-4" />} label="Dashboard" />
              <StaffNavLink to="/staff/requests"  active={path.startsWith('/staff/requests')}  icon={<ClipboardList   className="h-4 w-4" />} label="Requests"  />
              <StaffNavLink to="/staff/menu"      active={path.startsWith('/staff/menu')}      icon={<UtensilsCrossed className="h-4 w-4" />} label="Menu"      />
              {canWorkHousekeeping && (
                <>
                  <StaffNavLink to="/staff/rooms" active={path.startsWith('/staff/rooms')} icon={<BedDouble className="h-4 w-4" />} label="Rooms" />
                  <StaffNavLink to="/staff/housekeeping" active={path.startsWith('/staff/housekeeping')} icon={<Brush className="h-4 w-4" />} label="Housekeeping" />
                </>
              )}
              {canWorkMaintenance && (
                <StaffNavLink to="/staff/maintenance" active={path.startsWith('/staff/maintenance')} icon={<Wrench className="h-4 w-4" />} label="Maintenance" />
              )}
              {isManager && (
                <StaffNavLink to="/staff/manager" active={path.startsWith('/staff/manager')} icon={<BarChart3 className="h-4 w-4" />} label="Manager" />
              )}
              {isManager && <StaffNavLink to="/staff/schedule" active={path.startsWith('/staff/schedule')} icon={<CalendarDays className="h-4 w-4" />} label="Schedule" />}
              <StaffNavLink to={isManager ? '/staff/handover' : '/staff/my-schedule'} active={path.startsWith('/staff/my-schedule') || path.startsWith('/staff/handover')} icon={<ArrowRightLeft className="h-4 w-4" />} label={isManager ? 'Handover' : 'My Shift'} />
            </nav>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-white">{session.name}</p>
              <p className="text-[10px] font-medium text-slate-300">{session.role === 'manager' ? 'Manager' : session.department}</p>
            </div>
            <div className={`flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full text-xs font-bold text-ops-900 flex-shrink-0 ${isManager ? 'bg-gradient-to-br from-amber-300 to-amber-500' : 'bg-gradient-to-br from-sea-300 to-sea-500'}`}>
              {session.name.split(' ').map((p) => p[0]).join('')}
            </div>
            <button
              onClick={() => { logout(); navigate('/staff/login'); }}
              className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-ops-800 hover:text-white flex-shrink-0"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Mobile Navigation Bar */}
        <nav className="flex items-center justify-around border-t border-ops-800/80 px-2 py-1.5 md:hidden overflow-x-auto">
          <StaffNavLink to="/staff/dashboard" active={path.startsWith('/staff/dashboard')} icon={<LayoutDashboard className="h-3.5 w-3.5" />} label="Dashboard" />
          <StaffNavLink to="/staff/requests"  active={path.startsWith('/staff/requests')}  icon={<ClipboardList   className="h-3.5 w-3.5" />} label="Requests"  />
          <StaffNavLink to="/staff/menu"      active={path.startsWith('/staff/menu')}      icon={<UtensilsCrossed className="h-3.5 w-3.5" />} label="Menu"      />
          {canWorkHousekeeping && (
            <>
              <StaffNavLink to="/staff/rooms" active={path.startsWith('/staff/rooms')} icon={<BedDouble className="h-3.5 w-3.5" />} label="Rooms" />
              <StaffNavLink to="/staff/housekeeping" active={path.startsWith('/staff/housekeeping')} icon={<Brush className="h-3.5 w-3.5" />} label="Housekeeping" />
            </>
          )}
          {canWorkMaintenance && (
            <StaffNavLink to="/staff/maintenance" active={path.startsWith('/staff/maintenance')} icon={<Wrench className="h-3.5 w-3.5" />} label="Maintenance" />
          )}
          {isManager && (
            <StaffNavLink to="/staff/manager" active={path.startsWith('/staff/manager')} icon={<BarChart3 className="h-3.5 w-3.5" />} label="Manager" />
          )}
          {isManager && <StaffNavLink to="/staff/schedule" active={path.startsWith('/staff/schedule')} icon={<CalendarDays className="h-3.5 w-3.5" />} label="Schedule" />}
          <StaffNavLink to={isManager ? '/staff/handover' : '/staff/my-schedule'} active={path.startsWith('/staff/my-schedule') || path.startsWith('/staff/handover')} icon={<ArrowRightLeft className="h-3.5 w-3.5" />} label={isManager ? 'Handover' : 'My Shift'} />
        </nav>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-3 py-4 sm:px-6 sm:py-6">
        {children}
      </main>
    </div>
  );
}

function StaffNavLink({ to, active, icon, label }: { to: string; active: boolean; icon: ReactNode; label: string }) {
  return (
    <RouterLink
      to={to}
      className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
        active
          ? 'bg-sea-600/30 text-sea-200 border border-sea-400/40 font-semibold'
          : 'text-slate-300 hover:bg-ops-800 hover:text-white'
      }`}
    >
      {icon}
      <span>{label}</span>
    </RouterLink>
  );
}
