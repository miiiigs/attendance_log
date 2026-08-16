import type { ElementType } from 'react';
import { User, Mail, Hash, Briefcase, Shield, LogOut, ChevronRight } from 'lucide-react';
import type { MobileEmployee } from '../types';

interface Props {
  employee: MobileEmployee;
  onLogout: () => void;
}

function ProfileRow({ Icon, label, value }: { Icon: ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-4 py-3.5 border-b border-[#F4F4F5] last:border-0">
      <div className="w-8 h-8 rounded-lg bg-[#F4F4F5] flex items-center justify-center flex-shrink-0">
        <Icon size={14} className="text-[#71717A]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold text-[#A1A1AA] tracking-wider uppercase">{label}</p>
        <p className="text-[14px] font-semibold text-[#18181B] mt-0.5 truncate">{value}</p>
      </div>
    </div>
  );
}

function MenuRow({ label, onPress, danger }: { label: string; onPress: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onPress}
      className={`w-full flex items-center justify-between py-4 border-b border-[#F4F4F5] last:border-0 transition-colors ${
        danger ? 'hover:bg-[#FEF2F2]' : 'hover:bg-[#F8F7F4]'
      } -mx-5 px-5`}
    >
      <span className={`text-[14px] font-semibold ${danger ? 'text-[#DC2626]' : 'text-[#18181B]'}`}>
        {label}
      </span>
      <ChevronRight size={16} className={danger ? 'text-[#FCA5A5]' : 'text-[#D4D4D8]'} />
    </button>
  );
}

export default function MobileProfilePage({ employee, onLogout }: Props) {
  const initials = employee.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  return (
    <div className="flex flex-col min-h-full px-5 pt-12 pb-10 gap-5">
      {/* Identity card */}
      <div className="bg-[#166534] rounded-2xl px-6 py-7 flex flex-col items-center text-center gap-3">
        <div className="w-16 h-16 rounded-full bg-white/15 border-2 border-white/20 flex items-center justify-center">
          <span className="text-xl font-bold text-white tracking-wide">{initials}</span>
        </div>
        <div>
          <h2 className="text-[20px] font-bold text-white leading-tight">{employee.name}</h2>
          <p className="text-sm text-white/60 mt-1">{employee.department}</p>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-[11px] font-bold tracking-widest uppercase border ${
            employee.status === 'active'
              ? 'bg-white/10 border-white/20 text-white/80'
              : 'bg-[#FEF2F2]/10 border-[#FCA5A5]/30 text-[#FCA5A5]'
          }`}
        >
          {employee.status === 'active' ? 'Active' : 'Inactive'}
        </span>
      </div>

      {/* Info card */}
      <div className="bg-white rounded-2xl border border-[#E6E4DE] px-5 py-1">
        <ProfileRow Icon={User} label="Full Name" value={employee.name} />
        <ProfileRow Icon={Hash} label="Username" value={employee.username} />
        <ProfileRow Icon={Mail} label="Email" value={employee.email} />
        <ProfileRow Icon={Briefcase} label="Department" value={employee.department} />
        <ProfileRow
          Icon={Shield}
          label="Account Status"
          value={employee.status === 'active' ? 'Active' : 'Inactive'}
        />
      </div>

      {/* Actions */}
      <div className="bg-white rounded-2xl border border-[#E6E4DE] px-5 py-1">
        <MenuRow label="Change Password" onPress={() => {}} />
        <MenuRow label="Notification Settings" onPress={() => {}} />
      </div>

      {/* Logout */}
      <button
        onClick={onLogout}
        className="w-full flex items-center justify-center gap-2.5 py-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626] text-[14px] font-semibold hover:bg-[#FEE2E2] active:bg-[#FECACA] transition-colors"
      >
        <LogOut size={16} />
        Sign Out
      </button>

      <p className="text-center text-[11px] text-[#D4D4D8] font-medium">
        Attendance Logger · v1.0.0
      </p>
    </div>
  );
}
