import { useState } from 'react';
import { Eye, EyeOff, CalendarCheck, AlertCircle } from 'lucide-react';

interface LoginPageProps {
  onLogin: () => void;
  onEmployeeMode?: () => void;
}

export default function LoginPage({ onLogin, onEmployeeMode }: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [touched, setTouched] = useState({ username: false, password: false });

  const usernameErr = touched.username && !username ? 'Username is required' : '';
  const passwordErr = touched.password && !password ? 'Password is required' : '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ username: true, password: true });
    if (!username || !password) return;
    setLoading(true);
    setError('');
    await new Promise((r) => setTimeout(r, 1100));
    if (username === 'admin' && password === 'admin123') {
      onLogin();
    } else {
      setError('Invalid username or password.');
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex"
      style={{ background: '#F8F7F4' }}
    >
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-96 shrink-0 px-12 py-12" style={{ background: '#0B1D11' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#1A4D2E' }}>
            <CalendarCheck size={16} className="text-green-300" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm leading-none">Attendance Logger</p>
            <p className="text-[11px] mt-0.5 leading-none" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Administration
            </p>
          </div>
        </div>

        <div>
          <p className="text-white text-2xl font-semibold leading-snug mb-3">
            Track attendance.<br />Stay in control.
          </p>
          <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
            Manage your organization's attendance records, generate QR codes, and keep your team data current — all in one place.
          </p>
        </div>

        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.20)' }}>
          © 2026 Attendance Logger
        </p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile brand */}
          <div className="flex items-center gap-2.5 mb-10 lg:hidden">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#166534' }}>
              <CalendarCheck size={16} className="text-white" />
            </div>
            <span className="font-semibold text-zinc-900 text-sm">Attendance Logger</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight">Sign in</h1>
            <p className="text-sm text-zinc-500 mt-1">Enter your administrator credentials to continue.</p>
          </div>

          {error && (
            <div
              className="flex items-center gap-2.5 px-4 py-3 rounded-xl mb-5 text-sm"
              style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C' }}
            >
              <AlertCircle size={15} className="shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-600 uppercase tracking-wide mb-1.5">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, username: true }))}
                placeholder="admin"
                autoComplete="username"
                className="w-full px-3.5 py-2.5 text-sm text-zinc-900 rounded-xl outline-none transition-all placeholder-zinc-300"
                style={{
                  border: `1px solid ${usernameErr ? '#FCA5A5' : '#E6E4DE'}`,
                  background: usernameErr ? '#FFF5F5' : '#FFFFFF',
                  boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.04)',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#166534'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(22,101,52,0.10), inset 0 1px 2px rgba(0,0,0,0.04)'; }}
                onBlurCapture={(e) => { if (!usernameErr) { e.currentTarget.style.borderColor = '#E6E4DE'; e.currentTarget.style.boxShadow = 'inset 0 1px 2px rgba(0,0,0,0.04)'; } }}
              />
              {usernameErr && <p className="text-xs text-red-500 mt-1">{usernameErr}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-600 uppercase tracking-wide mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                  placeholder="••••••••••"
                  autoComplete="current-password"
                  className="w-full px-3.5 py-2.5 pr-10 text-sm text-zinc-900 rounded-xl outline-none transition-all placeholder-zinc-300"
                  style={{
                    border: `1px solid ${passwordErr ? '#FCA5A5' : '#E6E4DE'}`,
                    background: passwordErr ? '#FFF5F5' : '#FFFFFF',
                    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.04)',
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#166534'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(22,101,52,0.10), inset 0 1px 2px rgba(0,0,0,0.04)'; }}
                  onBlurCapture={(e) => { if (!passwordErr) { e.currentTarget.style.borderColor = '#E6E4DE'; e.currentTarget.style.boxShadow = 'inset 0 1px 2px rgba(0,0,0,0.04)'; } }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {passwordErr && <p className="text-xs text-red-500 mt-1">{passwordErr}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 text-sm font-semibold text-white rounded-xl transition-all mt-2 flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ background: '#166534' }}
              onMouseEnter={(e) => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = '#14532D'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#166634'; }}
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in…
                </>
              ) : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-xs text-zinc-400 mt-7">
            Demo: <span className="font-mono text-zinc-500">admin</span> / <span className="font-mono text-zinc-500">admin123</span>
          </p>
          {onEmployeeMode && (
            <p className="text-center mt-3">
              <button
                onClick={onEmployeeMode}
                className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
              >
                ← Switch to Employee App
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
