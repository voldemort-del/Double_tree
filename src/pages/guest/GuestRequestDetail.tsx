import { useAuth } from '@/hooks/useAuth';
import { useRequestDetail } from '@/hooks/useStore';
import { RequestDetailCard } from '@/components/RequestDetailCard';
import { RequestTimeline } from '@/components/RequestTimeline';
import { RouterLink } from '@/utils/router';
import { ArrowLeft, Loader2 } from 'lucide-react';

export function GuestRequestDetail({ requestId }: { requestId: string }) {
  const { session } = useAuth();
  const { request, events, loading } = useRequestDetail(requestId);

  if (session?.type !== 'guest') return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-sea-400" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-slate-400">Request not found.</p>
        <RouterLink to="/guest/requests" className="mt-3 inline-block text-sm font-medium text-sea-600">
          ← Back to requests
        </RouterLink>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <RouterLink to="/guest/requests" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-sea-600">
        <ArrowLeft className="h-4 w-4" /> Back to requests
      </RouterLink>

      <div className="grid gap-5 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <RequestDetailCard request={request} guestName={session.name} />
        </div>

        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h3 className="text-sm font-semibold text-slate-800">Live Timeline</h3>
            <p className="mt-0.5 text-xs text-slate-400">Follow every step of your request.</p>
            <div className="mt-5">
              <RequestTimeline events={events} request={request} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
