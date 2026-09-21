import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { navigate } from '@/utils/router';
import { Waves, User, Lock, ArrowRight, Loader2 } from 'lucide-react';

export function StaffLogin() {
  const { loginStaff } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const ok = await loginStaff(username, password);
    setLoading(false);
    if (!ok) {
      setError('Invalid credentials. Please try again.');
      return;
    }
    // Navigate based on role
    if (username === 'manager') {
      navigate('/staff/manager');
    } else {
      navigate('/staff/dashboard');
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ops-900 px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-ops-800 ring-1 ring-ops-700">
            <Waves className="h-6 w-6 text-ops-200" />
          </div>
          <h1 className="text-lg font-semibold text-white">Operations Center</h1>
          <p className="mt-1 text-sm text-ops-400">DoubleTree by Hilton Malta</p>
        </div>

        <div className="rounded-xl border border-ops-200 bg-white p-6 shadow-xl animate-slide-up">
          <h2 className="text-base font-semibold text-ops-900">Staff Sign In</h2>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-ops-600">Username</span>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ops-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="staff or manager"
                  autoComplete="off"
                  className="w-full rounded-lg border border-ops-200 bg-ops-50 py-2.5 pl-10 pr-3 text-sm text-ops-900 outline-none transition-colors placeholder:text-ops-300 focus:border-ops-500 focus:bg-white focus:ring-2 focus:ring-ops-100"
                />
              </div>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-ops-600">Password</span>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ops-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••"
                  className="w-full rounded-lg border border-ops-200 bg-ops-50 py-2.5 pl-10 pr-3 text-sm text-ops-900 outline-none transition-colors placeholder:text-ops-300 focus:border-ops-500 focus:bg-white focus:ring-2 focus:ring-ops-100"
                />
              </div>
            </label>

            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-ops-900 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-ops-800 disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Sign In <ArrowRight className="h-4 w-4" /></>}
            </button>
          </form>

          <div className="mt-5 grid grid-cols-2 gap-2">
            <DemoButton label="Staff" creds="staff / staff123" onClick={() => { setUsername('staff'); setPassword('staff123'); }} />
            <DemoButton label="Manager" creds="manager / manager123" onClick={() => { setUsername('manager'); setPassword('manager123'); }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function DemoButton({ label, creds, onClick }: { label: string; creds: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-lg border border-ops-100 bg-ops-50 px-3 py-2 text-center transition-colors hover:bg-ops-100"
    >
      <p className="text-xs font-semibold text-ops-700">{label}</p>
      <p className="mt-0.5 text-[10px] text-ops-400">{creds}</p>
    </button>
  );
}
