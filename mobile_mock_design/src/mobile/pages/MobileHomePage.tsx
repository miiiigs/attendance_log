import type { ReactNode, ElementType } from 'react';
import { QrCode, ChevronRight, Clock, LogIn, LogOut, AlertTriangle } from 'lucide-react';
import type { MobileEmployee, MobileAttendanceRecord } from '../types';

interface Props {
  employee: MobileEmployee;
  todayRecord: MobileAttendanceRecord | null;
  onScan: () => void;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function formatFullDate(d: Date) {
  return `${DAY_NAMES[d.getDay()]}, ${MONTH_NAMES[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function StatusChip({ status }: { status: 'present' | 'late' | 'absent' | 'not-logged' }) {
  const map = {
    present: { label: 'Present', bg: 'bg-[#F0FDF4]', text: 'text-[#166534]', dot: 'bg-[#166534]' },
    late: { label: 'Late', bg: 'bg-[#FFFBEB]', text: 'text-[#B45309]', dot: 'bg-[#D97706]' },
    absent: { label: 'Absent', bg: 'bg-[#FEF2F2]', text: 'text-[#DC2626]', dot: 'bg-[#DC2626]' },
    'not-logged': { label: 'Not Logged', bg: 'bg-[#F4F4F5]', text: 'text-[#71717A]', dot: 'bg-[#A1A1AA]' },
  };
  const s = map[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

function TimeBlock({ label, time, Icon }: { label: string; time: string | null; Icon: ElementType }) {
  return (
    <div className="flex-1 flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        <Icon size={13} className="text-[#A1A1AA]" />
        <span className="text-[11px] font-semibold text-[#A1A1AA] tracking-wider uppercase">{label}</span>
      </div>
      <p className="text-[22px] font-bold text-[#18181B] leading-none tracking-tight">
        {time ?? '—'}
      </p>
      {time && <p className="text-[11px] text-[#A1A1AA]">Recorded</p>}
      {!time && <p className="text-[11px] text-[#A1A1AA]">Not yet</p>}
    </div>
  );
}

export default function MobileHomePage({ employee, todayRecord, onScan }: Props) {
  const today = new Date();
  const isInactive = employee.status === 'inactive';

  const attendanceStatus: 'present' | 'late' | 'absent' | 'not-logged' =
    todayRecord?.status ?? 'not-logged';

  const initials = employee.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  return (
    <div className="flex flex-col min-h-full px-5 pt-12 pb-6 gap-5">
      {/* Header: greeting */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-[#A1A1AA] tracking-wider uppercase mb-1">
            {getGreeting()}
          </p>
          <h1 className="text-[24px] font-bold text-[#18181B] leading-tight">
            {employee.name.split(' ')[0]}
          </h1>
          <p className="text-sm text-[#71717A] mt-0.5">{formatFullDate(today)}</p>
        </div>
        <div className="w-11 h-11 rounded-full bg-[#166534] flex items-center justify-center text-white text-sm font-bold tracking-wide flex-shrink-0">
          {initials}
        </div>
      </div>

      {/* Inactive warning */}
      {isInactive && (
        <div className="flex items-start gap-3 px-4 py-4 rounded-2xl bg-[#FFFBEB] border border-[#FDE68A]">
          <AlertTriangle size={17} className="text-[#D97706] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-[#B45309]">Account Inactive</p>
            <p className="text-xs text-[#92400E] mt-0.5 leading-snug">
              Your account is currently inactive. Please contact your administrator.
            </p>
          </div>
        </div>
      )}

      {/* Today's attendance card */}
      <div className="bg-white rounded-2xl border border-[#E6E4DE] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#F4F4F5] flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-[#A1A1AA] tracking-wider uppercase mb-1">
              Today's Attendance
            </p>
            <StatusChip status={attendanceStatus} />
          </div>
          <Clock size={18} className="text-[#E4E4E7]" />
        </div>

        <div className="px-5 py-5 flex gap-4">
          <TimeBlock label="Time In" time={todayRecord?.timeIn ?? null} Icon={LogIn} />
          <div className="w-px bg-[#F4F4F5]" />
          <TimeBlock label="Time Out" time={todayRecord?.timeOut ?? null} Icon={LogOut} />
        </div>
      </div>

      {/* Scan CTA */}
      <button
        onClick={onScan}
        disabled={isInactive}
        className="w-full py-4 px-5 rounded-2xl bg-[#166534] text-white flex items-center justify-between disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#14532D] active:bg-[#052e16] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
            <QrCode size={18} className="text-white" />
          </div>
          <div className="text-left">
            <p className="text-[15px] font-semibold">Scan Attendance</p>
            <p className="text-xs text-white/60 mt-0.5">
              {!todayRecord?.timeIn
                ? 'Log your time in'
                : !todayRecord?.timeOut
                  ? 'Log your time out'
                  : 'Attendance complete'}
            </p>
          </div>
        </div>
        <ChevronRight size={18} className="text-white/50" />
      </button>

      {/* Account info card */}
      <div className="bg-white rounded-2xl border border-[#E6E4DE] px-5 py-4">
        <p className="text-[11px] font-semibold text-[#A1A1AA] tracking-wider uppercase mb-3">
          Account
        </p>
        <div className="flex flex-col gap-2.5">
          <Row label="Username" value={employee.username} />
          <Row label="Department" value={employee.department} />
          <Row
            label="Status"
            value={
              <span
                className={`text-xs font-semibold ${employee.status === 'active' ? 'text-[#166534]' : 'text-[#DC2626]'}`}
              >
                {employee.status === 'active' ? 'Active' : 'Inactive'}
              </span>
            }
          />
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-[#71717A]">{label}</span>
      <span className="text-sm font-semibold text-[#18181B]">{value}</span>
    </div>
  );
}
