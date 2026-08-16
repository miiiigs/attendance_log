import { useEffect } from 'react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';
import type { ToastMessage } from '../../types';

interface ToastProps {
  toasts: ToastMessage[];
  onRemove: (id: string) => void;
}

export default function ToastContainer({ toasts, onRemove }: ToastProps) {
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onRemove={onRemove} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onRemove }: { toast: ToastMessage; onRemove: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onRemove(toast.id), 4500);
    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  const styles = {
    success: { border: '#BBF7D0', icon: <CheckCircle2 size={15} className="text-green-600 shrink-0 mt-px" /> },
    error: { border: '#FECACA', icon: <XCircle size={15} className="text-red-500 shrink-0 mt-px" /> },
    info: { border: '#BAE6FD', icon: <Info size={15} className="text-blue-500 shrink-0 mt-px" /> },
  };
  const s = styles[toast.type];

  return (
    <div
      className="pointer-events-auto flex items-start gap-3 px-4 py-3 bg-white rounded-xl shadow-lg text-sm font-medium text-zinc-800 min-w-72 max-w-sm"
      style={{ border: `1px solid ${s.border}` }}
    >
      {s.icon}
      <span className="flex-1 leading-snug">{toast.message}</span>
      <button onClick={() => onRemove(toast.id)} className="text-zinc-300 hover:text-zinc-500 transition-colors shrink-0">
        <X size={14} />
      </button>
    </div>
  );
}
