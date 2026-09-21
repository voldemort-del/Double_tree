import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useConversation } from '@/hooks/useStore';
import { RouterLink } from '@/utils/router';
import { InlineRequestCard } from '@/components/InlineRequestCard';
import { getRequestById } from '@/services/requestService';
import { formatTime } from '@/utils/format';
import { Send, Sparkles, MessageCircle, Loader2 } from 'lucide-react';
import type { HotelRequest } from '@/types';

const SUGGESTED_PROMPTS = [
  { label: 'Request extra towels', prompt: 'Can I get two extra towels?' },
  { label: 'Report a problem', prompt: "The air conditioning isn't working." },
  { label: 'Ask about dining', prompt: 'What dining options does the hotel have?' },
  { label: 'Ask about the spa', prompt: "I'd like to book a spa treatment." },
  { label: 'Ask about hotel facilities', prompt: 'What facilities does the hotel have?' },
  { label: 'Request assistance', prompt: 'Can you arrange a taxi for 7 PM?' },
];

export function GuestConcierge() {
  const { session } = useAuth();
  const { conversation, loading, sending, send } = useConversation();
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prefill = sessionStorage.getItem('concierge_prefill_prompt');
    if (prefill) {
      setInput(prefill);
      sessionStorage.removeItem('concierge_prefill_prompt');
    }
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversation?.messages.length, typing]);

  async function handleSend(text: string) {
    const trimmed = text.trim();
    if (!trimmed || !session || session.type !== 'guest' || sending || typing) return;
    setError(null);
    setInput('');
    setTyping(true);
    try {
      await send(trimmed);
    } catch (err) {
      console.error('Failed to send concierge message:', err);
      setError('Failed to send message. Please try again.');
    } finally {
      setTyping(false);
    }
  }

  if (session?.type !== 'guest') return null;

  if (loading || !conversation) {
    return (
      <div className="flex h-[calc(100vh-64px)] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-sea-400" />
      </div>
    );
  }

  const isBusy = typing || sending;

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col animate-fade-in">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-sand-200/60 pb-3">
        <div>
          <h1 className="font-serif text-xl font-semibold text-slate-800">Your Concierge</h1>
          <p className="text-xs text-slate-400">Ask for anything — we'll route it to the right team.</p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-sea-50 px-3 py-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse-soft" />
          <span className="text-xs font-medium text-sea-700">Online</span>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin py-4">
        <div className="space-y-4">
          {conversation.messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              role={msg.role}
              content={msg.content}
              timestamp={msg.timestamp}
              requestId={msg.requestId}
              guestName={session.name}
            />
          ))}

          {isBusy && (
            <div className="flex items-center gap-2.5 animate-fade-in">
              <Avatar role="assistant" guestName={session.name} />
              <div className="rounded-2xl rounded-tl-sm bg-white border border-sand-200 px-4 py-3 shadow-xs">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="h-2 w-2 rounded-full bg-sea-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="h-2 w-2 rounded-full bg-sea-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="h-2 w-2 rounded-full bg-sea-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-xs text-slate-400">Concierge is responding…</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Suggested prompts */}
      {conversation.messages.length <= 1 && !isBusy && (
        <div className="border-t border-sand-200/60 pt-3">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-slate-400">
            <Sparkles className="h-3.5 w-3.5" /> Suggested requests
          </p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_PROMPTS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => handleSend(p.prompt)}
                disabled={isBusy}
                className="rounded-full border border-sand-200 bg-white px-3.5 py-1.5 text-xs text-slate-600 transition-colors hover:border-sea-300 hover:bg-sea-50 hover:text-sea-700 disabled:opacity-50"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Error notification if any */}
      {error && (
        <div className="mb-2 rounded-lg bg-red-50 p-2.5 text-xs text-red-600 border border-red-200">
          {error}
        </div>
      )}

      {/* Input form */}
      <div className="border-t border-sand-200/60 pt-3">
        <form
          onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
          className="flex items-end gap-2"
        >
          <div className="relative flex-1">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isBusy}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(input);
                }
              }}
              rows={1}
              placeholder={isBusy ? "Processing your request…" : "Type your request…"}
              className="w-full resize-none rounded-xl border border-sand-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-300 focus:border-sea-400 focus:ring-2 focus:ring-sea-100 disabled:bg-slate-50"
              style={{ minHeight: '46px', maxHeight: '120px' }}
            />
          </div>
          <button
            type="submit"
            disabled={!input.trim() || isBusy}
            className="flex h-[46px] w-[46px] flex-shrink-0 items-center justify-center rounded-xl bg-sea-700 text-white transition-all hover:bg-sea-800 disabled:opacity-40"
          >
            {isBusy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

function MessageBubble({
  role,
  content,
  timestamp,
  requestId,
  guestName,
}: {
  role: 'guest' | 'assistant';
  content: string;
  timestamp: string;
  requestId?: string;
  guestName: string;
}) {
  const isGuest = role === 'guest';
  const [request, setRequest] = useState<HotelRequest | null>(null);

  useEffect(() => {
    if (!requestId) return;
    let cancelled = false;
    (async () => {
      const r = await getRequestById(requestId);
      if (!cancelled) setRequest(r);
    })();
    return () => { cancelled = true; };
  }, [requestId]);

  return (
    <div className={`flex gap-2.5 animate-slide-up ${isGuest ? 'flex-row-reverse' : ''}`}>
      <Avatar role={role} guestName={guestName} />
      <div className={`max-w-[80%] ${isGuest ? 'items-end' : 'items-start'}`}>
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isGuest
              ? 'rounded-tr-sm bg-sea-700 text-white'
              : 'rounded-tl-sm border border-sand-200 bg-white text-slate-700'
          }`}
        >
          {content}
        </div>
        <p className={`mt-1 text-[11px] text-slate-300 ${isGuest ? 'text-right' : 'text-slate-400'}`}>
          {formatTime(timestamp)}
        </p>
        {request && (
          <RouterLink to={`/guest/requests/${request.id}`}>
            <InlineRequestCard request={request} />
          </RouterLink>
        )}
      </div>
    </div>
  );
}

function Avatar({ role, guestName }: { role: 'guest' | 'assistant'; guestName: string }) {
  if (role === 'assistant') {
    return (
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-sea-100 text-sea-600">
        <MessageCircle className="h-4 w-4" />
      </div>
    );
  }
  const initials = guestName.split(' ').map((p) => p[0]).join('');
  return (
    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-sand-200 text-xs font-semibold text-sand-700">
      {initials}
    </div>
  );
}
