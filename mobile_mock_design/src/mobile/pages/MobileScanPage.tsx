import { useState, useEffect } from 'react';
import { CheckCircle2, X, AlertCircle, RotateCcw } from 'lucide-react';
import type { ScanResult } from '../types';

type ScanState = 'idle' | 'scanning' | 'processing' | 'success' | 'error';

interface Props {
  hasClockedIn: boolean;
  hasClockedOut: boolean;
  lastScan: ScanResult | null;
  onSuccess: (result: ScanResult) => void;
  onDone: () => void;
}

function nowTime() {
  return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
}

function nowDate() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

export default function MobileScanPage({ hasClockedIn, hasClockedOut, onSuccess, onDone }: Props) {
  const [state, setState] = useState<ScanState>('idle');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState('');

  // Auto-start scanning after mount
  useEffect(() => {
    const t = setTimeout(() => setState('scanning'), 400);
    return () => clearTimeout(t);
  }, []);

  function handleScan() {
    if (state !== 'scanning') return;
    if (hasClockedIn && hasClockedOut) {
      setError("You've already completed attendance for today.");
      setState('error');
      return;
    }
    setState('processing');
    setTimeout(() => {
      const type: 'in' | 'out' = hasClockedIn ? 'out' : 'in';
      const r: ScanResult = { type, time: nowTime(), date: nowDate() };
      setResult(r);
      onSuccess(r);
      setState('success');
    }, 1600);
  }

  function handleReset() {
    setState('scanning');
    setError('');
    setResult(null);
  }

  if (state === 'success' && result) {
    return <ScanSuccess result={result} onDone={onDone} />;
  }

  return (
    <div className="flex flex-col min-h-full bg-[#0D1117]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-12 pb-4">
        <div>
          <h2 className="text-[17px] font-bold text-white">Scan QR Code</h2>
          <p className="text-xs text-white/40 mt-0.5">
            {!hasClockedIn ? 'Scanning for Time In' : !hasClockedOut ? 'Scanning for Time Out' : 'Attendance complete'}
          </p>
        </div>
        <button
          onClick={onDone}
          className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:bg-white/20 transition-colors"
        >
          <X size={17} />
        </button>
      </div>

      {/* Camera area */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 gap-6">
        <div
          className="relative w-full max-w-[280px] aspect-square rounded-3xl overflow-hidden cursor-pointer"
          onClick={handleScan}
        >
          {/* Camera background */}
          <div className="absolute inset-0 bg-[#0A0F0A]" />

          {/* Corner brackets */}
          <div className="absolute inset-4 pointer-events-none">
            <span className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-[#166534] rounded-tl-lg" />
            <span className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-[#166534] rounded-tr-lg" />
            <span className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-[#166534] rounded-bl-lg" />
            <span className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-[#166534] rounded-br-lg" />
          </div>

          {/* Scan line animation */}
          {state === 'scanning' && (
            <div className="absolute inset-x-4 h-px bg-[#166534] shadow-[0_0_8px_2px_#166534] animate-scanline" />
          )}

          {/* Processing overlay */}
          {state === 'processing' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 gap-3">
              <div className="w-8 h-8 border-2 border-[#166534]/30 border-t-[#166534] rounded-full animate-spin" />
              <p className="text-xs text-white/70 font-medium">Processing…</p>
            </div>
          )}

          {/* Error overlay */}
          {state === 'error' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 gap-2 px-5">
              <AlertCircle size={32} className="text-[#F87171]" />
              <p className="text-xs text-white/80 text-center leading-snug font-medium">{error}</p>
            </div>
          )}

          {/* Simulated QR pattern in idle/scanning */}
          {(state === 'idle' || state === 'scanning') && (
            <div className="absolute inset-0 flex items-center justify-center opacity-10">
              <svg width="140" height="140" viewBox="0 0 140 140" fill="none">
                {/* Simple QR-like grid pattern */}
                <rect x="10" y="10" width="48" height="48" rx="4" fill="white" />
                <rect x="18" y="18" width="32" height="32" rx="2" fill="#0A0F0A" />
                <rect x="26" y="26" width="16" height="16" rx="1" fill="white" />
                <rect x="82" y="10" width="48" height="48" rx="4" fill="white" />
                <rect x="90" y="18" width="32" height="32" rx="2" fill="#0A0F0A" />
                <rect x="98" y="26" width="16" height="16" rx="1" fill="white" />
                <rect x="10" y="82" width="48" height="48" rx="4" fill="white" />
                <rect x="18" y="90" width="32" height="32" rx="2" fill="#0A0F0A" />
                <rect x="26" y="98" width="16" height="16" rx="1" fill="white" />
                {/* Data cells */}
                {[68, 76, 84, 92, 100, 108, 116].map((x, i) =>
                  [68, 76, 84, 92, 100, 108, 116].map((y, j) =>
                    (i + j) % 2 === 0 ? (
                      <rect key={`${i}-${j}`} x={x} y={y} width="6" height="6" fill="white" />
                    ) : null
                  )
                )}
              </svg>
            </div>
          )}
        </div>

        {/* Instruction text */}
        <div className="text-center">
          {state === 'idle' && (
            <p className="text-sm text-white/50">Initializing camera…</p>
          )}
          {state === 'scanning' && (
            <p className="text-sm text-white/70 font-medium">
              Tap the viewfinder to simulate scan
            </p>
          )}
          {state === 'processing' && (
            <p className="text-sm text-white/70 font-medium animate-pulse">
              Processing attendance…
            </p>
          )}
          {state === 'error' && (
            <button
              onClick={handleReset}
              className="flex items-center gap-2 text-sm text-[#86EFAC] font-medium hover:text-[#4ADE80] transition-colors"
            >
              <RotateCcw size={13} />
              Try again
            </button>
          )}
        </div>
      </div>

      {/* Bottom info */}
      <div className="px-5 pb-10">
        <div className="px-4 py-3.5 rounded-xl bg-white/5 border border-white/8">
          <p className="text-xs text-white/40 text-center leading-relaxed">
            Position the QR code displayed by your administrator within the frame to log attendance.
          </p>
        </div>
      </div>
    </div>
  );
}

function ScanSuccess({ result, onDone }: { result: ScanResult; onDone: () => void }) {
  return (
    <div className="flex flex-col min-h-full bg-[#F8F7F4]">
      <div className="flex-1 flex flex-col items-center justify-center px-7 text-center gap-6">
        {/* Icon */}
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-[#F0FDF4] border-2 border-[#DCFCE7] flex items-center justify-center">
            <CheckCircle2 size={44} className="text-[#166534]" strokeWidth={1.75} />
          </div>
          <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white border-2 border-[#F0FDF4] flex items-center justify-center">
            <span className="text-[10px] font-black text-[#166534]">✓</span>
          </div>
        </div>

        {/* Type badge */}
        <div>
          <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase ${
            result.type === 'in'
              ? 'bg-[#DCFCE7] text-[#166534]'
              : 'bg-[#DBEAFE] text-[#1D4ED8]'
          }`}>
            Time {result.type === 'in' ? 'In' : 'Out'}
          </span>
        </div>

        {/* Main confirmation */}
        <div>
          <h2 className="text-[28px] font-bold text-[#18181B] leading-tight tracking-tight">
            Attendance Logged
          </h2>
          <p className="text-sm text-[#71717A] mt-1.5">Your attendance has been recorded.</p>
        </div>

        {/* Time and date card */}
        <div className="w-full bg-white rounded-2xl border border-[#E6E4DE] overflow-hidden">
          <div className="px-6 py-5 flex flex-col items-center gap-1 border-b border-[#F4F4F5]">
            <p className="text-[11px] font-semibold text-[#A1A1AA] tracking-wider uppercase">Recorded Time</p>
            <p className="text-[34px] font-bold text-[#18181B] tracking-tight leading-none mt-2">
              {result.time.split(':').slice(0, 2).join(':')}
            </p>
            <p className="text-sm text-[#A1A1AA] font-medium">
              {result.time.split(' ')[1]} · {result.time.split(':')[2].split(' ')[0]}s
            </p>
          </div>
          <div className="px-6 py-4 flex items-center justify-center">
            <p className="text-sm text-[#71717A] font-medium">{result.date}</p>
          </div>
        </div>
      </div>

      {/* Done button */}
      <div className="px-5 pb-10 pt-4">
        <button
          onClick={onDone}
          className="w-full py-4 rounded-xl bg-[#166534] text-white text-[15px] font-semibold hover:bg-[#14532D] active:bg-[#052e16] transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );
}
