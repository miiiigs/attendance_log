import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Trash2, ShieldOff, Maximize2, Minimize2, QrCode, Info } from 'lucide-react';
import type { QRState } from '../types';
import Modal from '../components/ui/Modal';

interface QRPageProps {
  qrState: QRState;
  onGenerate: () => void;
  onRevoke: () => void;
  onDelete: () => void;
  onRegenerate: () => void;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

function QRCodeSVG({ seed }: { seed: number }) {
  const size = 31;
  const cells: boolean[][] = [];
  for (let r = 0; r < size; r++) {
    cells[r] = [];
    for (let c = 0; c < size; c++) {
      const inTopLeft = r < 7 && c < 7;
      const inTopRight = r < 7 && c >= size - 7;
      const inBottomLeft = r >= size - 7 && c < 7;
      if (inTopLeft || inTopRight || inBottomLeft) {
        const local = { r: inTopLeft ? r : inTopRight ? r : r - (size - 7), c: inTopLeft ? c : inTopRight ? c - (size - 7) : c };
        cells[r][c] =
          (local.r === 0 || local.r === 6 || local.c === 0 || local.c === 6) ||
          (local.r >= 2 && local.r <= 4 && local.c >= 2 && local.c <= 4);
      } else {
        const h = ((r * 37 + c * 19 + seed * 11) * 2654435761) >>> 0;
        cells[r][c] = (h % 3) !== 0;
      }
    }
  }
  const cs = 7;
  const total = size * cs;
  return (
    <svg width={total} height={total} viewBox={`0 0 ${total} ${total}`} xmlns="http://www.w3.org/2000/svg">
      <rect width={total} height={total} fill="white" />
      {cells.flatMap((row, r) =>
        row.map((filled, c) =>
          filled ? <rect key={`${r}-${c}`} x={c * cs} y={r * cs} width={cs} height={cs} fill="#18181B" /> : null
        )
      )}
    </svg>
  );
}

function CountdownRing({ seconds, max = 43200 }: { seconds: number; max?: number }) {
  const pct = seconds / max;
  const r = 28;
  const circ = 2 * Math.PI * r;
  const dash = circ * pct;
  return (
    <svg width={72} height={72} className="-rotate-90">
      <circle cx={36} cy={36} r={r} fill="none" stroke="#E6E4DE" strokeWidth={4} />
      <circle
        cx={36} cy={36} r={r} fill="none"
        stroke="#166634" strokeWidth={4}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 1s linear' }}
      />
    </svg>
  );
}

function formatTime(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

export default function QRPage({ qrState, onGenerate, onRevoke, onDelete, onRegenerate, showToast }: QRPageProps) {
  const [countdown, setCountdown] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const MAX_SECONDS = 12 * 3600;

  useEffect(() => {
    if (!qrState.active || !qrState.expiresAt) { setCountdown(0); return; }
    const tick = () => {
      const diff = Math.max(0, Math.floor((new Date(qrState.expiresAt!).getTime() - Date.now()) / 1000));
      setCountdown(diff);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [qrState.active, qrState.expiresAt]);

  const doConfirm = async (action: () => void, cb: () => void) => {
    setConfirming(true);
    await new Promise((r) => setTimeout(r, 800));
    action();
    setConfirming(false);
    cb();
  };

  if (fullscreen && qrState.active) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white">
        <button onClick={() => setFullscreen(false)} className="absolute top-5 right-5 p-2 rounded-xl hover:bg-stone-100 text-zinc-500">
          <Minimize2 size={20} />
        </button>
        <div className="flex flex-col items-center gap-8 max-w-xs w-full">
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest text-center mb-1">Attendance Logger</p>
            <h1 className="text-3xl font-bold text-zinc-900 text-center">Scan to Log In</h1>
          </div>
          <div className="p-6 rounded-2xl" style={{ border: '2px solid #E6E4DE' }}>
            <QRCodeSVG seed={qrState.seed} />
          </div>
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm font-semibold text-green-700">Active</span>
            </div>
            <p className="text-xs text-zinc-400">Expires in {formatTime(countdown)}</p>
            <p className="text-xs text-zinc-400">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-5xl">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 tracking-tight">Attendance QR</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Generate and manage today's attendance QR code</p>
      </div>

      {!qrState.active ? (
        /* ── No QR generated ─────────────────────────────────────────── */
        <div className="bg-white rounded-2xl p-12 flex flex-col items-center gap-5" style={{ border: '1px solid #E6E4DE' }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: '#F4F3F0' }}>
            <QrCode size={28} className="text-zinc-400" />
          </div>
          <div className="text-center">
            <p className="text-base font-semibold text-zinc-700">No QR code generated</p>
            <p className="text-sm text-zinc-400 mt-1 max-w-xs">
              Generate today's QR code to allow people to record their attendance via the mobile app.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-400 mt-2">
            <Info size={13} />
            QR codes are valid for 12 hours by default.
          </div>
          <button
            onClick={onGenerate}
            className="flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white rounded-xl transition-colors"
            style={{ background: '#166634' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#14532D'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#166634'; }}
          >
            <QrCode size={16} /> Generate Today's QR
          </button>
        </div>
      ) : (
        /* ── QR Active ───────────────────────────────────────────────── */
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
          {/* QR display */}
          <div className="xl:col-span-3 bg-white rounded-2xl p-8 flex flex-col items-center gap-6" style={{ border: '1px solid #E6E4DE' }}>
            <div className="p-5 rounded-2xl" style={{ background: '#FAFAF8', border: '1px solid #E6E4DE' }}>
              <QRCodeSVG seed={qrState.seed} />
            </div>

            {/* Countdown */}
            <div className="flex items-center gap-5">
              <div className="relative">
                <CountdownRing seconds={countdown} max={MAX_SECONDS} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-bold text-zinc-700 font-mono">{Math.floor(countdown / 60)}m</span>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-sm font-semibold text-green-700">Active</span>
                </div>
                <p className="text-xs text-zinc-500">{formatTime(countdown)} remaining</p>
                <p className="text-xs text-zinc-400 mt-0.5 font-mono">{qrState.generatedAt}</p>
              </div>
            </div>

            <button
              onClick={() => setFullscreen(true)}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-colors text-zinc-600"
              style={{ border: '1px solid #E6E4DE', background: '#FAFAF8' }}
            >
              <Maximize2 size={13} /> Display Full Screen
            </button>
          </div>

          {/* Controls */}
          <div className="xl:col-span-2 space-y-4">
            {/* Status card */}
            <div className="bg-white rounded-xl p-5" style={{ border: '1px solid #E6E4DE' }}>
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-3">QR Information</p>
              <div className="space-y-2.5">
                {[
                  { label: 'Status', value: <span className="text-xs font-semibold text-green-700">Active</span> },
                  { label: 'Generated', value: <span className="font-mono text-xs text-zinc-600">{qrState.generatedAt}</span> },
                  { label: 'Expires', value: <span className="font-mono text-xs text-zinc-600">{qrState.expiresAt}</span> },
                  { label: 'Valid for', value: <span className="text-xs text-zinc-600">12 hours</span> },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between">
                    <span className="text-xs text-zinc-400">{row.label}</span>
                    {row.value}
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-xl p-5" style={{ border: '1px solid #E6E4DE' }}>
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-3">Actions</p>
              <div className="space-y-2">
                {[
                  {
                    label: 'Regenerate QR',
                    desc: 'Issue a new code, same validity window',
                    icon: <RefreshCw size={15} />,
                    action: () => { onRegenerate(); showToast('QR code regenerated.', 'success'); },
                    style: { background: '#F0FDF4', color: '#166634', border: '1px solid #BBF7D0' },
                  },
                  {
                    label: 'Remove Validity',
                    desc: 'Invalidate without deleting',
                    icon: <ShieldOff size={15} />,
                    action: () => setShowRevokeModal(true),
                    style: { background: '#FFFBEB', color: '#B45309', border: '1px solid #FDE68A' },
                  },
                  {
                    label: 'Delete QR',
                    desc: 'Remove the QR code entirely',
                    icon: <Trash2 size={15} />,
                    action: () => setShowDeleteModal(true),
                    style: { background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA' },
                  },
                ].map((btn) => (
                  <button
                    key={btn.label}
                    onClick={btn.action}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all text-sm font-semibold"
                    style={btn.style}
                  >
                    {btn.icon}
                    <div>
                      <p>{btn.label}</p>
                      <p className="text-xs font-normal opacity-70">{btn.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Note */}
            <div className="flex gap-2.5 px-4 py-3.5 rounded-xl" style={{ background: '#F8F7F4', border: '1px solid #E6E4DE' }}>
              <Info size={13} className="text-zinc-400 mt-0.5 shrink-0" />
              <p className="text-xs text-zinc-400 leading-relaxed">
                QR codes are valid for 12 hours by default. Removing validity will prevent scanning without deleting the record.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Generate CTA (when active — secondary) */}
      {qrState.active && (
        <div className="flex justify-end">
          <button
            onClick={onGenerate}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white rounded-xl transition-colors"
            style={{ background: '#166634' }}
          >
            <QrCode size={15} /> Generate Today's QR
          </button>
        </div>
      )}

      {/* Revoke modal */}
      <Modal open={showRevokeModal} onClose={() => setShowRevokeModal(false)} title="Remove QR Validity?" subtitle="This cannot be undone automatically.">
        <div className="space-y-4">
          <p className="text-sm text-zinc-500 leading-relaxed">
            The current QR code will stop accepting scans immediately. People will not be able to record attendance until a new QR is generated.
          </p>
          <div className="flex gap-3">
            <button onClick={() => setShowRevokeModal(false)} className="flex-1 py-2.5 text-sm font-medium text-zinc-600 rounded-xl" style={{ border: '1px solid #E6E4DE' }}>Cancel</button>
            <button
              disabled={confirming}
              onClick={() => doConfirm(onRevoke, () => { setShowRevokeModal(false); showToast('QR validity removed.', 'info'); })}
              className="flex-1 py-2.5 text-sm font-semibold text-white rounded-xl disabled:opacity-60"
              style={{ background: '#B45309' }}
            >
              {confirming ? 'Removing…' : 'Remove Validity'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete modal */}
      <Modal open={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Delete QR Code?" subtitle="This action is permanent.">
        <div className="space-y-4">
          <p className="text-sm text-zinc-500 leading-relaxed">
            The QR code will be permanently deleted. You will need to generate a new one to resume attendance scanning.
          </p>
          <div className="flex gap-3">
            <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-2.5 text-sm font-medium text-zinc-600 rounded-xl" style={{ border: '1px solid #E6E4DE' }}>Cancel</button>
            <button
              disabled={confirming}
              onClick={() => doConfirm(onDelete, () => { setShowDeleteModal(false); showToast('QR code deleted.', 'info'); })}
              className="flex-1 py-2.5 text-sm font-semibold text-white rounded-xl disabled:opacity-60"
              style={{ background: '#DC2626' }}
            >
              {confirming ? 'Deleting…' : 'Delete QR'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
