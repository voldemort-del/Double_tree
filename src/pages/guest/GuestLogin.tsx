import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { navigate } from '@/utils/router';
import { hotelInfo } from '@/data/mockData';
import { isSupabaseConfigured } from '@/lib/supabase';
import { Waves, User, KeyRound, DoorOpen, ArrowRight, Loader2 } from 'lucide-react';

export function GuestLogin() {
  const { loginGuest } = useAuth();
  const [username, setUsername] = useState('');
  const [room, setRoom] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const ok = await loginGuest(username, room, pin);
    setLoading(false);
    if (ok) {
      navigate('/guest/dashboard');
    } else {
      setError(
        isSupabaseConfigured
          ? 'Could not sign in. Please verify your username, room number, and PIN.'
          : 'Could not sign in. Try clicking "Use demo guest" below.'
      );
    }
  }

  function fillDemo() {
    setUsername('guest');
    setRoom('408');
    setPin('1234');
    setError('');
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-navy-gradient">
      {/* Layered decorative blurs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -left-40 top-10  h-[32rem] w-[32rem] rounded-full bg-sea-600/20 blur-3xl" />
        <div className="absolute -right-40 bottom-0 h-[32rem] w-[32rem] rounded-full bg-sea-400/15 blur-3xl" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-64 rounded-full bg-sea-500/10 blur-2xl" />
      </div>

      {/* Gold horizontal accent line at very top */}
      <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-sea-400 to-transparent opacity-60" />

      <div className="relative mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">

        {/* Brand */}
        <div className="mb-10 text-center animate-fade-in">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-sea-400 to-sea-600 shadow-gold-glow ring-1 ring-sea-300/20">
            <Waves className="h-8 w-8 text-white" />
          </div>
          <h1 className="font-serif text-3xl font-medium tracking-wide text-white">{hotelInfo.name}</h1>
          <p className="mt-1.5 text-sm text-sea-300">{hotelInfo.location}</p>
          <div className="mt-4 inline-block border-t border-sea-700/50 pt-3">
            <p className="text-xs uppercase tracking-[0.25em] text-sea-400 font-medium">Private Guest Concierge</p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-ops-700/40 bg-white/97 p-7 shadow-navy-md backdrop-blur-xl animate-slide-up">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-serif text-xl font-semibold text-ops-900">Welcome Back</h2>
            {isSupabaseConfigured ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live DB
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-sea-50 px-2.5 py-0.5 text-[11px] font-medium text-sea-700 ring-1 ring-inset ring-sea-400/30">
                <span className="h-1.5 w-1.5 rounded-full bg-sea-500" />
                Demo Mode
              </span>
            )}
          </div>
          <p className="text-sm text-sand-600">Sign in to access your private concierge for this stay.</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <Field
              icon={<User className="h-4 w-4" />}
              label="Guest Username"
              value={username}
              onChange={setUsername}
              placeholder="e.g. alex.morgan"
              autoComplete="off"
            />
            <div className="grid grid-cols-2 gap-3">
              <Field
                icon={<DoorOpen className="h-4 w-4" />}
                label="Room Number"
                value={room}
                onChange={setRoom}
                placeholder="408"
                autoComplete="off"
              />
              <Field
                icon={<KeyRound className="h-4 w-4" />}
                label="PIN"
                value={pin}
                onChange={setPin}
                placeholder="••••"
                type="password"
                autoComplete="off"
              />
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-gold flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm disabled:opacity-60 mt-1"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>Enter Concierge <ArrowRight className="h-4 w-4" /></>
              )}
            </button>
          </form>

          {/* Divider + demo fill */}
          <div className="mt-5">
            <div className="divider-gold" />
            <button
              onClick={fillDemo}
              className="mt-4 w-full rounded-xl border border-sand-200 bg-sand-50 py-2.5 text-xs font-medium text-sand-700 transition-all hover:bg-sand-100 hover:border-sand-300"
            >
              Use demo guest — Alex Morgan, Room 408
            </button>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-ops-500">
          This is a private digital concierge for registered hotel guests.
        </p>
      </div>
    </div>
  );
}

function Field({
  icon, label, value, onChange, placeholder, type = 'text', autoComplete,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-ops-700">{label}</span>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sand-500">{icon}</span>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="w-full rounded-lg border border-sand-200 bg-white py-2.5 pl-10 pr-3 text-sm text-ops-900 outline-none transition-colors placeholder:text-sand-300 focus:border-sea-400 focus:ring-2 focus:ring-sea-200/60"
        />
      </div>
    </label>
  );
}
