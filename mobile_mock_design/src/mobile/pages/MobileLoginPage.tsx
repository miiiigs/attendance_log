import { useState } from 'react';
import { Eye, EyeOff, CheckSquare, AlertCircle } from 'lucide-react';

interface Props {
  onLogin: () => void;
  onAdminMode: () => void;
}

export default function MobileLoginPage({ onLogin, onAdminMode }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('Please enter your username and password.');
      return;
    }

    setLoading(true);
    await new Promise((r) => setTimeout(r, 900));

    if (username === '30847291' && password === 'pass1234') {
      onLogin();
    } else {
      setError('Incorrect username or password. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-full flex flex-col bg-[#F8F7F4]">
      {/* Top accent bar */}
      <div className="h-1 bg-[#166534]" />

      <div className="flex-1 flex flex-col px-7 pt-16 pb-10">
        {/* Brand mark */}
        <div className="mb-12">
          <div className="w-11 h-11 rounded-xl bg-[#166534] flex items-center justify-center mb-5">
            <CheckSquare size={22} className="text-white" strokeWidth={2} />
          </div>
          <h1 className="text-[28px] font-bold text-[#18181B] leading-tight tracking-tight">
            Attendance<br />Logger
          </h1>
          <p className="mt-2 text-sm text-[#71717A] font-medium">
            Sign in to your account
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Error state */}
          {error && (
            <div className="flex items-start gap-3 px-4 py-3.5 rounded-xl bg-[#FEF2F2] border border-[#FECACA]">
              <AlertCircle size={16} className="text-[#DC2626] flex-shrink-0 mt-0.5" />
              <p className="text-sm text-[#DC2626] font-medium leading-snug">{error}</p>
            </div>
          )}

          {/* Username */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#52525B] tracking-wide uppercase">
              Username
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              autoComplete="username"
              className={`w-full px-4 py-3.5 rounded-xl bg-white border text-[15px] text-[#18181B] placeholder:text-[#D4D4D8] font-medium outline-none transition-all
                ${error ? 'border-[#FECACA] focus:border-[#DC2626] focus:ring-2 focus:ring-[#DC2626]/10' : 'border-[#E4E4E7] focus:border-[#166534] focus:ring-2 focus:ring-[#166534]/10'}
              `}
            />
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#52525B] tracking-wide uppercase">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                className={`w-full px-4 py-3.5 pr-12 rounded-xl bg-white border text-[15px] text-[#18181B] placeholder:text-[#D4D4D8] font-medium outline-none transition-all
                  ${error ? 'border-[#FECACA] focus:border-[#DC2626] focus:ring-2 focus:ring-[#DC2626]/10' : 'border-[#E4E4E7] focus:border-[#166534] focus:ring-2 focus:ring-[#166534]/10'}
                `}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#A1A1AA] hover:text-[#71717A] transition-colors"
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full py-4 rounded-xl bg-[#166534] text-white text-[15px] font-semibold tracking-wide hover:bg-[#14532D] active:bg-[#052e16] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Signing in…
              </span>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* Demo hint */}
        <div className="mt-8 px-4 py-3.5 rounded-xl bg-[#F0FDF4] border border-[#DCFCE7]">
          <p className="text-xs text-[#166534] font-medium leading-relaxed">
            <span className="font-bold">Demo credentials</span><br />
            Username: 30847291 · Password: pass1234
          </p>
        </div>

        <div className="mt-auto pt-10 text-center">
          <button
            onClick={onAdminMode}
            className="text-xs text-[#A1A1AA] hover:text-[#71717A] font-medium transition-colors"
          >
            Switch to Admin Portal →
          </button>
        </div>
      </div>
    </div>
  );
}
