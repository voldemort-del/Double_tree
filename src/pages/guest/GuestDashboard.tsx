import { useAuth } from '@/hooks/useAuth';
import { useGuestRequests, useGuestStay } from '@/hooks/useStore';
import { RouterLink } from '@/utils/router';
import { hotelInfo } from '@/data/mockData';
import { RequestCard } from '@/components/RequestCard';
import {
  MessageCircle,
  Sparkles,
  BedDouble,
  Wrench,
  Car,
  Utensils,
  Waves,
  ArrowRight,
  Clock,
  Sun,
  MapPin,
  Coffee,
  Loader2,
} from 'lucide-react';

function daysUntil(isoDate: string | undefined): number {
  if (!isoDate) return 0;
  const diff = new Date(isoDate).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86400000));
}

export function GuestDashboard() {
  const { session, guestData } = useAuth();
  const { requests, loading } = useGuestRequests(guestData?.guestId ?? '');
  const { stay } = useGuestStay(guestData?.guestId ?? '');

  if (session?.type !== 'guest' || !guestData) return null;

  const openRequests = requests.filter((r) => r.status !== 'Completed' && r.status !== 'Cancelled');
  const recentRequests = requests.slice(0, 4);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const firstName = session.name.split(' ')[0];

  const checkoutDays = daysUntil(stay?.checkOut);
  const adultsLabel = stay ? `${stay.adults} adult${stay.adults !== 1 ? 's' : ''}${stay.children > 0 ? `, ${stay.children} child${stay.children !== 1 ? 'ren' : ''}` : ''}` : '2 adults';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero welcome */}
      <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-sea-700 via-sea-800 to-ops-900 p-6 text-white sm:p-8 shadow-md">
        <div className="relative">
          <div className="flex items-center gap-2 text-sm text-sea-200 font-medium">
            <MapPin className="h-3.5 w-3.5 text-amber-300" />
            {hotelInfo.location}
          </div>
          <h1 className="mt-3 font-serif text-3xl font-medium sm:text-4xl text-white">
            {greeting}, {firstName}.
          </h1>
          <p className="mt-2 max-w-md text-sea-100 font-normal">
            How can we make your stay more comfortable?
          </p>

          <RouterLink
            to="/guest/concierge"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-sea-900 shadow-md transition-transform hover:scale-[1.02]"
          >
            <MessageCircle className="h-4 w-4 text-sea-600" />
            Ask Your Concierge
            <ArrowRight className="h-4 w-4 text-sea-600" />
          </RouterLink>

          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-sea-200 font-medium">
            <span className="flex items-center gap-1.5"><BedDouble className="h-4 w-4 text-sea-300" /> Room {guestData.roomNumber}</span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-sea-300" />
              {stay
                ? checkoutDays === 0
                  ? 'Checking out today'
                  : checkoutDays === 1
                  ? 'Check-out tomorrow'
                  : `Check-out in ${checkoutDays} days`
                : 'Check-out in 4 days'}
            </span>
            <span className="flex items-center gap-1.5"><Sun className="h-4 w-4 text-sea-300" /> {adultsLabel}</span>
          </div>
        </div>
      </section>

      {/* Quick actions */}
      <section>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-ops-500">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <QuickAction to="/guest/concierge" icon={<MessageCircle className="h-5 w-5" />} label="Ask Concierge" highlight />
          <QuickAction to="/guest/concierge" icon={<Sparkles className="h-5 w-5" />} label="Housekeeping" />
          <QuickAction to="/guest/concierge" icon={<Utensils className="h-5 w-5" />} label="Room Service" />
          <QuickAction to="/guest/concierge" icon={<Waves className="h-5 w-5" />} label="Spa" />
          <QuickAction to="/guest/concierge" icon={<Wrench className="h-5 w-5" />} label="Maintenance" />
          <QuickAction to="/guest/concierge" icon={<Car className="h-5 w-5" />} label="Transport" />
        </div>
      </section>

      {/* Two-column */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Open requests */}
        <div className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-ops-500">Your Requests</h2>
            <RouterLink to="/guest/requests" className="text-xs font-semibold text-sea-700 hover:text-sea-800">
              View all →
            </RouterLink>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-sea-600" />
            </div>
          ) : openRequests.length > 0 ? (
            <div className="space-y-3">
              <p className="text-xs font-medium text-slate-600">{openRequests.length} active</p>
              {openRequests.slice(0, 3).map((req) => (
                <RequestCard key={req.id} request={req} to={`/guest/requests/${req.id}`} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center">
              <p className="text-sm text-slate-500">No active requests. Your concierge is ready when you are.</p>
            </div>
          )}

          {recentRequests.length > 0 && (
            <>
              <h3 className="mb-2 mt-6 text-xs font-bold uppercase tracking-wider text-ops-500">Recent History</h3>
              <div className="space-y-3">
                {recentRequests.filter((r) => r.status === 'Completed' || r.status === 'Cancelled').slice(0, 2).map((req) => (
                  <RequestCard key={req.id} request={req} to={`/guest/requests/${req.id}`} />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Hotel info */}
        <div>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-ops-500">Hotel Information</h2>
          <div className="space-y-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-2 text-slate-800">
                <Coffee className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-semibold">Breakfast</span>
              </div>
              <p className="mt-1.5 text-sm text-slate-600">{hotelInfo.breakfastHours}</p>
              <p className="text-xs text-slate-500">Azure Restaurant &amp; Terrace</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold text-slate-800">Dining &amp; Bars</p>
              <ul className="mt-2 space-y-1.5">
                {hotelInfo.venues.slice(0, 5).map((v) => (
                  <li key={v} className="text-xs text-slate-600">{v}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold text-slate-800">Nearby</p>
              <p className="mt-1.5 text-xs text-slate-600">{hotelInfo.nearby} — 5 min walk</p>
              <p className="mt-1 text-xs text-slate-500">Access to Malta attractions via public transport</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickAction({
  to,
  icon,
  label,
  highlight,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  highlight?: boolean;
}) {
  return (
    <RouterLink
      to={to}
      className={`flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-all hover:shadow-md ${
        highlight
          ? 'border-sea-300 bg-sea-50 text-sea-700 hover:border-sea-400 font-semibold'
          : 'border-slate-200 bg-white text-ops-700 hover:border-sea-300 hover:text-sea-700'
      }`}
    >
      <span className={highlight ? 'text-sea-600' : 'text-ops-600'}>{icon}</span>
      <span className="text-xs font-medium">{label}</span>
    </RouterLink>
  );
}
