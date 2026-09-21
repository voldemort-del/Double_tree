import type { RequestEvent, HotelRequest } from '@/types';
import { formatTime } from '@/utils/format';
import { CheckCircle2, Circle, Clock, AlertTriangle, XCircle, ArrowRight, User, Bot, Building } from 'lucide-react';

export function RequestTimeline({ events, request }: { events: RequestEvent[]; request: HotelRequest }) {
  return (
    <div className="relative">
      <div className="absolute left-[15px] top-2 bottom-2 w-px bg-slate-200" />
      <div className="space-y-5">
        {events.map((evt, i) => {
          const isLast = i === events.length - 1;
          return (
            <div key={evt.id} className="relative flex gap-4 animate-fade-in">
              <div className="relative z-10 flex-shrink-0">
                <EventIcon eventType={evt.eventType} isLast={isLast} />
              </div>
              <div className="flex-1 pt-0.5">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-sm font-medium text-slate-800">{evt.description}</p>
                  <span className="flex-shrink-0 text-xs tabular-nums text-slate-400">{formatTime(evt.timestamp)}</span>
                </div>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <ActorIcon actor={evt.actor} />
                  <span className="text-xs text-slate-400">{evt.actorName}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EventIcon({ eventType, isLast }: { eventType: RequestEvent['eventType']; isLast: boolean }) {
  const base = 'flex h-8 w-8 items-center justify-center rounded-full border-2 bg-white';
  switch (eventType) {
    case 'created':
      return <div className={`${base} border-sea-300 text-sea-600`}><Circle className="h-3.5 w-3.5 fill-current" /></div>;
    case 'routed':
      return <div className={`${base} border-slate-200 text-slate-400`}><ArrowRight className="h-4 w-4" /></div>;
    case 'assigned':
      return <div className={`${base} border-blue-300 text-blue-600`}><User className="h-4 w-4" /></div>;
    case 'started':
      return <div className={`${base} border-indigo-300 text-indigo-600`}><Clock className="h-4 w-4" /></div>;
    case 'completed':
      return <div className={`${base} border-emerald-300 text-emerald-600`}><CheckCircle2 className="h-4 w-4" /></div>;
    case 'escalated':
      return <div className={`${base} border-red-300 text-red-600`}><AlertTriangle className="h-4 w-4" /></div>;
    case 'cancelled':
      return <div className={`${base} border-slate-300 text-slate-500`}><XCircle className="h-4 w-4" /></div>;
    default:
      return <div className={`${base} border-slate-200 text-slate-400`}><Building className="h-4 w-4" /></div>;
  }
}

function ActorIcon({ actor }: { actor: RequestEvent['actor'] }) {
  if (actor === 'assistant') return <Bot className="h-3 w-3 text-slate-400" />;
  if (actor === 'staff' || actor === 'guest') return <User className="h-3 w-3 text-slate-400" />;
  return <Building className="h-3 w-3 text-slate-400" />;
}
