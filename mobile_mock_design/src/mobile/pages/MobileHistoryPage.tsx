import { LogIn, LogOut, Calendar } from 'lucide-react';
import type { MobileAttendanceRecord } from '../types';

interface Props {
  records: MobileAttendanceRecord[];
}

function StatusBadge({ status }: { status: MobileAttendanceRecord['status'] }) {
  const map = {
    present: { label: 'Present', bg: 'bg-[#F0FDF4]', text: 'text-[#166534]' },
    late: { label: 'Late', bg: 'bg-[#FFFBEB]', text: 'text-[#B45309]' },
    absent: { label: 'Absent', bg: 'bg-[#FEF2F2]', text: 'text-[#DC2626]' },
  };
  const s = map[status];
  return (
    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  );
}

function parseRecordDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const recDate = new Date(d);
  recDate.setHours(0, 0, 0, 0);

  const diff = (today.getTime() - recDate.getTime()) / 86400000;

  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function isToday(dateStr: string): boolean {
  const today = new Date();
  const d = new Date(dateStr);
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  );
}

export default function MobileHistoryPage({ records }: Props) {
  const sorted = [...records].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="flex flex-col min-h-full px-5 pt-12 pb-10">
      <div className="mb-6">
        <h2 className="text-[22px] font-bold text-[#18181B] leading-tight">Attendance History</h2>
        <p className="text-sm text-[#71717A] mt-1">Your recent attendance records</p>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Present', count: records.filter((r) => r.status === 'present').length, color: 'text-[#166534]', bg: 'bg-[#F0FDF4]' },
          { label: 'Late', count: records.filter((r) => r.status === 'late').length, color: 'text-[#B45309]', bg: 'bg-[#FFFBEB]' },
          { label: 'Absent', count: records.filter((r) => r.status === 'absent').length, color: 'text-[#DC2626]', bg: 'bg-[#FEF2F2]' },
        ].map(({ label, count, color, bg }) => (
          <div key={label} className={`${bg} rounded-xl px-3 py-3 text-center`}>
            <p className={`text-xl font-bold ${color}`}>{count}</p>
            <p className={`text-[10px] font-semibold ${color} opacity-70 mt-0.5`}>{label}</p>
          </div>
        ))}
      </div>

      {/* Records list */}
      {sorted.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center py-16">
          <Calendar size={36} className="text-[#D4D4D8]" strokeWidth={1.5} />
          <p className="text-sm text-[#A1A1AA] font-medium">No attendance records yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {sorted.map((record) => (
            <div
              key={record.id}
              className={`bg-white rounded-2xl border overflow-hidden ${
                isToday(record.date) ? 'border-[#DCFCE7]' : 'border-[#E6E4DE]'
              }`}
            >
              <div className="px-4 py-3 border-b border-[#F4F4F5] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isToday(record.date) && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#166534]" />
                  )}
                  <p className="text-[13px] font-semibold text-[#18181B]">
                    {parseRecordDate(record.date)}
                  </p>
                  <p className="text-[11px] text-[#A1A1AA]">
                    {new Date(record.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
                <StatusBadge status={record.status} />
              </div>

              <div className="px-4 py-3 flex items-center gap-5">
                <div className="flex items-center gap-2 flex-1">
                  <LogIn size={13} className="text-[#A1A1AA]" />
                  <div>
                    <p className="text-[10px] font-semibold text-[#A1A1AA] tracking-wider uppercase">In</p>
                    <p className="text-[13px] font-bold text-[#18181B]">
                      {record.timeIn ?? '—'}
                    </p>
                  </div>
                </div>
                <div className="w-px h-8 bg-[#F4F4F5]" />
                <div className="flex items-center gap-2 flex-1">
                  <LogOut size={13} className="text-[#A1A1AA]" />
                  <div>
                    <p className="text-[10px] font-semibold text-[#A1A1AA] tracking-wider uppercase">Out</p>
                    <p className={`text-[13px] font-bold ${record.timeOut ? 'text-[#18181B]' : 'text-[#D4D4D8]'}`}>
                      {record.timeOut ?? '—'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
