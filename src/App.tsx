import { useEffect } from 'react';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { useRoute, navigate } from '@/utils/router';

import { GuestLayout } from '@/layouts/GuestLayout';
import { StaffLayout } from '@/layouts/StaffLayout';

import { GuestLogin } from '@/pages/guest/GuestLogin';
import { GuestDashboard } from '@/pages/guest/GuestDashboard';
import { GuestConcierge } from '@/pages/guest/GuestConcierge';
import { GuestDining } from '@/pages/guest/GuestDining';
import { GuestCart } from '@/pages/guest/GuestCart';
import { GuestRequests } from '@/pages/guest/GuestRequests';
import { GuestRequestDetail } from '@/pages/guest/GuestRequestDetail';

import { StaffLogin } from '@/pages/staff/StaffLogin';
import { StaffDashboard } from '@/pages/staff/StaffDashboard';
import { StaffRequests } from '@/pages/staff/StaffRequests';
import { StaffRequestDetail } from '@/pages/staff/StaffRequestDetail';
import { ManagerView } from '@/pages/staff/ManagerView';
import MenuManagement from '@/pages/staff/MenuManagement';
import { RoomOperationsPage } from '@/pages/staff/RoomOperationsPage';
import { HousekeepingPage } from '@/pages/staff/HousekeepingPage';

function Router() {
  const { session, loading } = useAuth();
  const route = useRoute();

  useEffect(() => {
    if (!loading && (route.path === '/' || route.segments.length === 0)) {
      navigate('/guest/login');
    }
  }, [loading, route.path, route.segments.length]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-sand-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-sea-200 border-t-sea-600" />
      </div>
    );
  }

  const seg = route.segments;

  if (route.path === '/' || seg.length === 0) {
    return <GuestLogin />;
  }

  // ---- Guest routes ----
  if (seg[0] === 'guest') {
    if (seg[1] === 'login') return <GuestLogin />;

    if (!session || session.type !== 'guest') {
      navigate('/guest/login');
      return <GuestLogin />;
    }

    return (
      <GuestLayout>
        {seg[1] === 'dashboard' && <GuestDashboard />}
        {seg[1] === 'dining' && <GuestDining />}
        {seg[1] === 'cart' && <GuestCart />}
        {seg[1] === 'concierge' && <GuestConcierge />}
        {seg[1] === 'requests' && seg.length === 2 && <GuestRequests />}
        {seg[1] === 'requests' && seg.length === 3 && <GuestRequestDetail requestId={seg[2]} />}
      </GuestLayout>
    );
  }

  // ---- Staff routes ----
  if (seg[0] === 'staff') {
    if (seg[1] === 'login') return <StaffLogin />;

    if (!session || (session.type !== 'staff' && session.type !== 'manager')) {
      navigate('/staff/login');
      return <StaffLogin />;
    }

    return (
      <StaffLayout>
        {seg[1] === 'dashboard' && <StaffDashboard />}
        {seg[1] === 'requests' && seg.length === 2 && <StaffRequests />}
        {seg[1] === 'requests' && seg.length === 3 && <StaffRequestDetail requestId={seg[2]} />}
        {seg[1] === 'menu' && <MenuManagement />}
        {seg[1] === 'rooms' && <RoomOperationsPage initialFilter={seg[2] ?? 'all'} />}
        {seg[1] === 'housekeeping' && <HousekeepingPage />}
        {seg[1] === 'manager' && session.type === 'manager' && <ManagerView />}
        {seg[1] === 'manager' && session.type !== 'manager' && <StaffDashboard />}
      </StaffLayout>
    );
  }

  navigate('/guest/login');
  return <GuestLogin />;
}

export default function App() {
  return (
    <AuthProvider>
      <Router />
    </AuthProvider>
  );
}
