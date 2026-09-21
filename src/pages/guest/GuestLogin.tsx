import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { navigate } from '@/utils/router';
import { hotelInfo } from '@/data/mockData';
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
      setError('Could not sign in. Please check your details and try again.');
    }
  }

  function fillDemo() {
    setUsername('guest');
    setRoom('408');
    setPin('1234');
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-sea-800 via-sea-700 to-sea-900">
      {/* Decorative background */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute -left-32 top-20 h-96 w-96 rounded-full bg-sea-400 blur-3xl" />
        <div className="absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-sand-400 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
        {/* Brand */}
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm ring-1 ring-white/20">
            <Waves className="h-8 w-8 text-white" />
          </div>
          <h1 className="font-serif text-3xl font-medium text-white">{hotelInfo.name}</h1>
          <p className="mt-1 text-sm text-sea-200">{hotelInfo.location}</p>
          <p className="mt-4 text-xs uppercase tracking-[0.2em] text-sea-300">Private Guest Concierge</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl bg-white/95 p-7 shadow-2xl backdrop-blur-xl animate-slide-up">
          <h2 className="font-serif text-xl font-semibold text-slate-800">Welcome Back</h2>
          <p className="mt-1 text-sm text-slate-500">Sign in to access your private concierge for this stay.</p>

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
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-sea-700 py-3 text-sm font-semibold text-white transition-all hover:bg-sea-800 disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Enter Concierge
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <button
            onClick={fillDemo}
            className="mt-4 w-full rounded-lg border border-sand-200 bg-sand-50 py-2 text-xs font-medium text-sand-700 transition-colors hover:bg-sand-100"
          >
            Use demo guest — Alex Morgan, Room 408
          </button>
        </div>

        <p className="mt-6 text-center text-xs text-sea-300">
          This is a private digital concierge for registered hotel guests.
        </p>
      </div>
    </div>
  );
}

function Field({
  icon,
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  autoComplete,
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
      <span className="mb-1.5 block text-xs font-medium text-slate-600">{label}</span>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{icon}</span>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-300 focus:border-sea-400 focus:ring-2 focus:ring-sea-100"
        />
      </div>
    </label>
  );
}
