import type { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { RouterLink, navigate } from '@/utils/router';
import { hotelInfo } from '@/data/mockData';
import { LogOut, Home, MessageCircle, ClipboardList, Waves, UtensilsCrossed, ShoppingCart } from 'lucide-react';
import { ConnectionIndicator } from '@/components/ConnectionIndicator';
import { ToastContainer } from '@/components/ToastContainer';

export function GuestLayout({ children }: { children: ReactNode }) {
  const { session, logout } = useAuth();

  if (session?.type !== 'guest') return null;

  const path = window.location.hash.replace(/^#/, '') || '/';
  const isActive = (p: string) => path.startsWith(p);

  return (
    <div className="min-h-screen bg-champagne-gradient flex flex-col">
      <ToastContainer />

      <header className="sticky top-0 z-40 border-b border-ops-200/80 bg-ops-900/95 backdrop-blur-md shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-3 py-2.5 sm:px-6 sm:py-3">
          <RouterLink to="/guest/dashboard" className="flex items-center gap-2 sm:gap-3">
            {/* Ocean icon mark */}
            <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-gradient-to-br from-sea-500 to-sea-700 shadow-gold-glow flex-shrink-0">
              <Waves className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            </div>
            <div className="leading-tight">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <p className="font-serif text-sm sm:text-base font-semibold text-ops-800 tracking-wide truncate max-w-[150px] xs:max-w-[220px] sm:max-w-none">
                  {hotelInfo.name}
                </p>
                <ConnectionIndicator />
              </div>
              <p className="text-[9px] sm:text-[10px] text-sea-300 font-semibold tracking-widest uppercase">Digital Concierge</p>
            </div>
          </RouterLink>

          <nav aria-label="Guest navigation" className="hidden md:flex items-center gap-1">
            <NavLink to="/guest/dashboard" active={isActive('/guest/dashboard')} icon={<Home className="h-4 w-4" />} label="Home" />
            <NavLink to="/guest/dining" active={isActive('/guest/dining')} icon={<UtensilsCrossed className="h-4 w-4" />} label="Dining & Bar" />
            <NavLink to="/guest/cart" active={isActive('/guest/cart')} icon={<ShoppingCart className="h-4 w-4" />} label="Cart" />
            <NavLink to="/guest/concierge" active={isActive('/guest/concierge')} icon={<MessageCircle className="h-4 w-4" />} label="Concierge" />
            <NavLink to="/guest/requests" active={isActive('/guest/requests')} icon={<ClipboardList className="h-4 w-4" />} label="Requests" />
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden sm:block text-right">
              <p className="text-xs font-semibold text-ops-800">{session.name}</p>
              <p className="text-[11px] font-medium text-ops-500">Room {session.roomNumber}</p>
            </div>
            <div className="flex sm:hidden items-center text-[11px] font-bold text-sea-300 bg-ops-800 border border-ops-700 px-2 py-0.5 rounded-md">
              Rm {session.roomNumber}
            </div>
            {/* Avatar */}
            <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-gradient-to-br from-sea-500 to-sea-700 text-xs font-bold text-white shadow-sm flex-shrink-0">
              {session.name.split(' ').map((p) => p[0]).join('').slice(0, 2)}
            </div>
            <button
              onClick={() => { logout(); navigate('/guest/login'); }}
              className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full text-ops-400 transition-colors hover:bg-ops-800 hover:text-ops-800 flex-shrink-0"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content (with bottom padding on mobile for the fixed bottom tab bar) */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-3 py-4 sm:px-6 sm:py-8 pb-20 md:pb-8">
        {children}
      </main>

      {/* Mobile Bottom Navigation Bar (app-like convenience for phone guests) */}
      <nav aria-label="Guest navigation" className="mobile-tab-bar fixed bottom-0 inset-x-0 z-40 flex md:hidden items-center justify-around border-t border-ops-200 bg-ops-900/95 px-2 py-2 backdrop-blur-md shadow-lg">
        <MobileNavLink to="/guest/dashboard" active={isActive('/guest/dashboard')} icon={<Home className="h-5 w-5" />} label="Home" />
        <MobileNavLink to="/guest/dining" active={isActive('/guest/dining')} icon={<UtensilsCrossed className="h-5 w-5" />} label="Dining" />
        <MobileNavLink to="/guest/concierge" active={isActive('/guest/concierge')} icon={<MessageCircle className="h-5 w-5" />} label="Concierge" highlight />
        <MobileNavLink to="/guest/cart" active={isActive('/guest/cart')} icon={<ShoppingCart className="h-5 w-5" />} label="Cart" />
        <MobileNavLink to="/guest/requests" active={isActive('/guest/requests')} icon={<ClipboardList className="h-5 w-5" />} label="Requests" />
      </nav>
    </div>
  );
}

function NavLink({ to, active, icon, label }: { to: string; active: boolean; icon: ReactNode; label: string }) {
  return (
    <RouterLink
      to={to}
      ariaCurrent={active ? 'page' : undefined}
      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
        active
          ? 'bg-sea-50 text-sea-700 border border-sea-200 font-semibold shadow-sm'
          : 'text-ops-500 hover:bg-ops-800 hover:text-ops-800'
      }`}
    >
      {icon}
      <span>{label}</span>
    </RouterLink>
  );
}

function MobileNavLink({ to, active, icon, label, highlight }: { to: string; active: boolean; icon: ReactNode; label: string; highlight?: boolean }) {
  return (
    <RouterLink
      to={to}
      ariaCurrent={active ? 'page' : undefined}
      className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 py-1 px-1 rounded-lg text-[10px] font-medium transition-all ${
        active
          ? 'text-sea-300 font-bold'
          : highlight
          ? 'text-sea-200 font-semibold'
          : 'text-ops-500 hover:text-ops-700'
      }`}
    >
      <div className={`p-1 rounded-full ${active ? 'bg-sea-900/40 text-sea-300' : ''}`}>
        {icon}
      </div>
      <span>{label}</span>
    </RouterLink>
  );
}
