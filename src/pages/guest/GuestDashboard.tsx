import { useAuth } from '@/hooks/useAuth';
import { useGuestRequests } from '@/hooks/useStore';
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

export function GuestDashboard() {
  const { session, guestData } = useAuth();
  const { requests, loading } = useGuestRequests(guestData?.guestId ?? '');

  if (session?.type !== 'guest' || !guestData) return null;

  const openRequests = requests.filter((r) => r.status !== 'Completed' && r.status !== 'Cancelled');
  const recentRequests = requests.slice(0, 4);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const firstName = session.name.split(' ')[0];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero welcome */}
      <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-sea-700 to-sea-900 p-6 text-white sm:p-8">
        <div className="relative">
          <div className="flex items-center gap-2 text-sm text-sea-200">
            <MapPin className="h-3.5 w-3.5" />
            {hotelInfo.location}
          </div>
          <h1 className="mt-3 font-serif text-3xl font-medium sm:text-4xl">
            {greeting}, {firstName}.
          </h1>
          <p className="mt-2 max-w-md text-sea-100">
            How can we make your stay more comfortable?
          </p>

          <RouterLink
            to="/guest/concierge"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-sea-800 shadow-lg transition-transform hover:scale-[1.02]"
          >
            <MessageCircle className="h-4 w-4" />
            Ask Your Concierge
            <ArrowRight className="h-4 w-4" />
          </RouterLink>

          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-sea-100">
            <span className="flex items-center gap-1.5"><BedDouble className="h-4 w-4" /> Room {guestData.roomNumber}</span>
            <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" /> Check-out in 4 days</span>
            <span className="flex items-center gap-1.5"><Sun className="h-4 w-4" /> 2 adults</span>
          </div>
        </div>
      </section>

      {/* Quick actions */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Quick Actions</h2>
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
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Your Requests</h2>
            <RouterLink to="/guest/requests" className="text-xs font-medium text-sea-600 hover:text-sea-700">
              View all →
            </RouterLink>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-sea-400" />
            </div>
          ) : openRequests.length > 0 ? (
            <div className="space-y-3">
              <p className="text-xs font-medium text-slate-500">{openRequests.length} active</p>
              {openRequests.slice(0, 3).map((req) => (
                <RequestCard key={req.id} request={req} to={`/guest/requests/${req.id}`} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center">
              <p className="text-sm text-slate-400">No active requests. Your concierge is ready when you are.</p>
            </div>
          )}

          {recentRequests.length > 0 && (
            <>
              <h3 className="mb-2 mt-6 text-xs font-medium uppercase tracking-wide text-slate-400">Recent History</h3>
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
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Hotel Information</h2>
          <div className="space-y-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-2 text-slate-700">
                <Coffee className="h-4 w-4 text-sand-600" />
                <span className="text-sm font-medium">Breakfast</span>
              </div>
              <p className="mt-1.5 text-sm text-slate-500">{hotelInfo.breakfastHours}</p>
              <p className="text-xs text-slate-400">Azure Restaurant & Terrace</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-medium text-slate-700">Dining & Bars</p>
              <ul className="mt-2 space-y-1.5">
                {hotelInfo.venues.slice(0, 5).map((v) => (
                  <li key={v} className="text-xs text-slate-500">{v}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-medium text-slate-700">Nearby</p>
              <p className="mt-1.5 text-xs text-slate-500">{hotelInfo.nearby} — 5 min walk</p>
              <p className="mt-1 text-xs text-slate-400">Access to Malta attractions via public transport</p>
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
          ? 'border-sea-300 bg-sea-50 text-sea-700 hover:border-sea-400'
          : 'border-slate-200 bg-white text-slate-600 hover:border-sand-300'
      }`}
    >
      <span className={highlight ? 'text-sea-600' : 'text-sand-600'}>{icon}</span>
      <span className="text-xs font-medium">{label}</span>
    </RouterLink>
  );
}
