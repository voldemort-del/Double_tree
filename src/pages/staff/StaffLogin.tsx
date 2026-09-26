import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { navigate } from '@/utils/router';
import { isSupabaseConfigured } from '@/lib/supabase';
import { Waves, User, Lock, ArrowRight, Loader2 } from 'lucide-react';

const QUICK_LOGINS = [
  { label: 'Maria', sub: 'Housekeeping', username: 'staff', password: 'staff123' },
  { label: 'Daniel', sub: 'Maintenance', username: 'staff2', password: 'staff123' },
  { label: 'Lucia', sub: 'Concierge', username: 'staff3', password: 'staff123' },
  { label: 'Marco', sub: 'F&B', username: 'staff4', password: 'staff123' },
  { label: 'Elena', sub: 'Spa', username: 'staff5', password: 'staff123' },
  { label: 'Antoine', sub: 'Manager', username: 'manager', password: 'manager123', isManager: true },
] as const;

export function StaffLogin() {
  const { loginStaff } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function completeLogin(u: string, p: string) {
    setError('');
    setLoading(true);
    const auth = await loginStaff(u, p);
    setLoading(false);
    if (!auth) {
      setError(
        isSupabaseConfigured
          ? 'Invalid credentials. Try username + password (e.g. staff / staff or staff / staff123).'
          : 'Invalid credentials. Try using the quick demo buttons below.',
      );
      return;
    }
    navigate(auth.role === 'manager' ? '/staff/manager' : '/staff/dashboard');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await completeLogin(username, password);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-gradient px-6">
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at 50% 40%, rgba(192,128,32,0.08) 0%, transparent 65%)' }}
      />

      <div className="relative w-full max-w-sm animate-fade-in">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sea-400 to-sea-600 shadow-gold-glow">
            <Waves className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-xl font-semibold tracking-wide text-white">Operations Center</h1>
          <p className="mt-1 text-sm tracking-widest uppercase text-sea-300 font-medium">DoubleTree by Hilton Malta</p>
        </div>

        <div className="rounded-2xl border border-ops-700/50 bg-ops-800/80 backdrop-blur-md p-7 shadow-navy-md animate-slide-up">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-base font-semibold text-white">Staff Sign In</h2>
            {isSupabaseConfigured ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-900/40 px-2.5 py-0.5 text-[11px] font-medium text-emerald-300 ring-1 ring-inset ring-emerald-600/30">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live DB
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-sea-900/40 px-2.5 py-0.5 text-[11px] font-medium text-sea-300 ring-1 ring-inset ring-sea-500/30">
                <span className="h-1.5 w-1.5 rounded-full bg-sea-400" />
                Demo Mode
              </span>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-200">Username</span>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="staff, staff4, manager…"
                  autoComplete="off"
                  className="w-full rounded-lg border border-ops-700 bg-ops-950/80 py-2.5 pl-10 pr-3 text-sm text-white outline-none transition-colors placeholder:text-slate-400 focus:border-sea-400 focus:ring-2 focus:ring-sea-500/30"
                />
              </div>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-200">Password</span>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="staff123 or password"
                  className="w-full rounded-lg border border-ops-700 bg-ops-950/80 py-2.5 pl-10 pr-3 text-sm text-white outline-none transition-colors placeholder:text-slate-400 focus:border-sea-400 focus:ring-2 focus:ring-sea-500/30"
                />
              </div>
            </label>

            {error && (
              <p className="rounded-lg bg-red-900/30 border border-red-700/40 px-3 py-2 text-sm text-red-300">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-gold flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm disabled:opacity-60 mt-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Sign In <ArrowRight className="h-4 w-4" /></>}
            </button>
          </form>

          <div className="mt-6 space-y-2">
            <div className="divider-gold" />
            <p className="text-center text-[11px] font-semibold text-slate-300 pt-1">Quick Demo Logins (one tap)</p>
            <div className="grid grid-cols-3 gap-2">
              {QUICK_LOGINS.map((entry) => (
                <DemoButton
                  key={entry.username}
                  label={entry.label}
                  sub={entry.sub}
                  isManager={'isManager' in entry}
                  disabled={loading}
                  onClick={() => completeLogin(entry.username, entry.password)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DemoButton({
  label,
  sub,
  onClick,
  isManager = false,
  disabled = false,
}: {
  label: string;
  sub: string;
  onClick: () => void;
  isManager?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-lg border px-2 py-2 text-center transition-all hover:-translate-y-0.5 disabled:opacity-50 ${
        isManager
          ? 'border-amber-500/50 bg-amber-950/40 hover:bg-amber-900/60 hover:border-amber-400'
          : 'border-ops-700 bg-ops-900/90 hover:bg-ops-700/80 hover:border-ops-500'
      }`}
    >
      <p className={`text-[11px] font-semibold truncate ${isManager ? 'text-amber-300' : 'text-white'}`}>{label}</p>
      <p className={`text-[10px] font-medium ${isManager ? 'text-amber-400/80' : 'text-slate-300'}`}>{sub}</p>
    </button>
  );
}
