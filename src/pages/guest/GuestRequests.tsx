import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useGuestRequests } from '@/hooks/useStore';
import { RequestCard } from '@/components/RequestCard';
import type { RequestStatus } from '@/types';
import { ClipboardList, Loader2 } from 'lucide-react';

const FILTERS: ('All' | RequestStatus)[] = ['All', 'Submitted', 'Assigned', 'In Progress', 'Completed', 'Cancelled'];

export function GuestRequests() {
  const { session, guestData } = useAuth();
  const { requests, loading, error } = useGuestRequests(guestData?.guestId ?? '');
  const [filter, setFilter] = useState<'All' | RequestStatus>('All');

  if (session?.type !== 'guest') return null;

  const all = requests;
  const filtered = filter === 'All' ? all : all.filter((r) => r.status === filter);

  return (
    <div className="space-y-5 animate-fade-in">
      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <div>
        <h1 className="font-serif text-2xl font-semibold text-slate-800">My Requests</h1>
        <p className="mt-1 text-sm text-slate-500">Track every request you've made during your stay.</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:pb-0 scrollbar-none">
        {FILTERS.map((f) => {
          const count = f === 'All' ? all.length : all.filter((r) => r.status === f).length;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors flex-shrink-0 ${
                filter === f
                  ? 'bg-sea-700 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-sea-300 hover:text-sea-700'
              }`}
            >
              {f} {count > 0 && <span className="opacity-70 font-normal">({count})</span>}
            </button>
          );
        })}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-sea-400" />
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((req) => (
            <RequestCard key={req.id} request={req} to={`/guest/requests/${req.id}`} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <ClipboardList className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 text-sm text-slate-400">No requests in this category.</p>
        </div>
      )}
    </div>
  );
}
