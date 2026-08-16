import { ArrowRight, Users, UserCheck, Clock, UserMinus, QrCode, Plus, CalendarCheck } from 'lucide-react';
import type { Person, AttendanceRecord, Page, QRState } from '../types';
import { WEEKLY_DATA, getInitials, getFullName, TODAY } from '../data/mockData';

interface DashboardPageProps {
  people: Person[];
  attendance: AttendanceRecord[];
  qrState: QRState;
  onNavigate: (page: Page) => void;
  onGenerateQR: () => void;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string; dot: string }> = {
    'On Time':       { bg: '#F0FDF4', text: '#15803D', dot: '#22C55E' },
    'Late':          { bg: '#FFFBEB', text: '#B45309', dot: '#F59E0B' },
    'Completed':     { bg: '#EFF6FF', text: '#1D4ED8', dot: '#3B82F6' },
    'Not Yet Logged':{ bg: '#F4F4F5', text: '#71717A', dot: '#A1A1AA' },
  };
  const s = map[status] || map['Not Yet Logged'];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium"
      style={{ background: s.bg, color: s.text }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.dot }} />
      {status}
    </span>
  );
}

function WeeklyChart({ data }: { data: typeof WEEKLY_DATA }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="flex items-end gap-2.5 h-24">
      {data.map((d, i) => {
        const isToday = i === 5;
        const pct = (d.count / max) * 100;
        return (
          <div key={d.day} className="flex flex-col items-center gap-1.5 flex-1 group">
            <span className="text-[10px] font-mono text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity">
              {d.count}
            </span>
            <div
              className="w-full rounded-t-sm transition-all"
              style={{
                height: `${Math.max(pct, d.count > 0 ? 6 : 2)}%`,
                background: isToday ? '#166634' : '#E5E4E0',
              }}
            />
            <span
              className="text-[11px] font-medium"
              style={{ color: isToday ? '#166634' : '#A1A1AA' }}
            >
              {d.day}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function Kpi({
  label, value, sub, icon, accent,
}: {
  label: string;
  value: number;
  sub: string;
  icon: React.ReactNode;
  accent: string;
}) {
  return (
    <div className="bg-white rounded-xl p-5" style={{ border: '1px solid #E6E4DE' }}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">{label}</span>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: accent + '18' }}>
          <span style={{ color: accent }}>{icon}</span>
        </div>
      </div>
      <p className="text-3xl font-bold text-zinc-900 tracking-tight">{value}</p>
      <p className="text-xs text-zinc-400 mt-1">{sub}</p>
    </div>
  );
}

export default function DashboardPage({ people, attendance, qrState, onNavigate, onGenerateQR }: DashboardPageProps) {
  const activeCount = people.filter((p) => p.status === 'Active').length;
  const inactiveCount = people.filter((p) => p.status === 'Inactive').length;
  const todayAtt = attendance.filter((a) => a.date === TODAY);
  const present = todayAtt.filter((a) => a.status !== 'Not Yet Logged').length;
  const late = todayAtt.filter((a) => a.status === 'Late').length;

  const recentActivity = todayAtt
    .filter((a) => a.timeIn)
    .slice(0, 6)
    .map((a) => ({ ...a, person: people.find((p) => p.id === a.personId) }))
    .filter((a) => a.person);

  // QR expiry display
  let qrTimeLeft = '';
  if (qrState.active && qrState.expiresAt) {
    const expires = new Date(qrState.expiresAt);
    const now = new Date();
    const diffMs = expires.getTime() - now.getTime();
    if (diffMs > 0) {
      const h = Math.floor(diffMs / 3600000);
      const m = Math.floor((diffMs % 3600000) / 60000);
      qrTimeLeft = h > 0 ? `${h}h ${m}m remaining` : `${m}m remaining`;
    }
  }

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 tracking-tight">Dashboard</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Sunday, August 16, 2026 · Attendance overview</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <Kpi label="Total People" value={people.length} sub="Registered in system" icon={<Users size={16} />} accent="#166634" />
        <Kpi label="Present Today" value={present} sub={`${Math.round((present / activeCount) * 100)}% of active`} icon={<UserCheck size={16} />} accent="#15803D" />
        <Kpi label="Late Today" value={late} sub="Arrived after grace period" icon={<Clock size={16} />} accent="#B45309" />
        <Kpi label="Inactive People" value={inactiveCount} sub="Deactivated accounts" icon={<UserMinus size={16} />} accent="#71717A" />
      </div>

      {/* Charts + QR status row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Weekly chart */}
        <div className="xl:col-span-2 bg-white rounded-xl p-5" style={{ border: '1px solid #E6E4DE' }}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-semibold text-zinc-800">Weekly Attendance</h2>
              <p className="text-xs text-zinc-400 mt-0.5">Aug 11 – 17, 2026</p>
            </div>
            <button
              onClick={() => onNavigate('attendance')}
              className="flex items-center gap-1.5 text-xs font-semibold transition-colors"
              style={{ color: '#166634' }}
            >
              View All <ArrowRight size={12} />
            </button>
          </div>
          <WeeklyChart data={WEEKLY_DATA} />
        </div>

        {/* QR status */}
        <div
          className="bg-white rounded-xl p-5 flex flex-col"
          style={{ border: '1px solid #E6E4DE' }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-zinc-800">Today's QR</h2>
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
              style={
                qrState.active
                  ? { background: '#F0FDF4', color: '#15803D' }
                  : { background: '#F4F4F5', color: '#71717A' }
              }
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: qrState.active ? '#22C55E' : '#A1A1AA' }}
              />
              {qrState.active ? 'Active' : 'Not Generated'}
            </div>
          </div>

          {qrState.active ? (
            <div className="flex-1 flex flex-col justify-between">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Generated</span>
                  <span className="font-medium text-zinc-700 font-mono text-xs">{qrState.generatedAt}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Expires</span>
                  <span className="font-medium text-zinc-700 font-mono text-xs">{qrState.expiresAt}</span>
                </div>
                {qrTimeLeft && (
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Remaining</span>
                    <span className="font-semibold text-xs" style={{ color: '#15803D' }}>{qrTimeLeft}</span>
                  </div>
                )}
              </div>
              <button
                onClick={() => onNavigate('qr')}
                className="mt-5 w-full py-2 text-xs font-semibold rounded-lg transition-colors"
                style={{ background: '#F0FDF4', color: '#166634', border: '1px solid #BBF7D0' }}
              >
                Manage QR
              </button>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 py-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: '#F4F4F5' }}>
                <QrCode size={20} className="text-zinc-400" />
              </div>
              <div className="text-center">
                <p className="text-xs font-medium text-zinc-500">No QR generated today</p>
                <p className="text-xs text-zinc-400 mt-0.5">Valid for 12 hours once generated</p>
              </div>
              <button
                onClick={onGenerateQR}
                className="px-4 py-2 text-xs font-semibold text-white rounded-lg transition-colors"
                style={{ background: '#166634' }}
              >
                Generate QR
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Recent activity + Quick actions */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Recent activity */}
        <div className="xl:col-span-2 bg-white rounded-xl overflow-hidden" style={{ border: '1px solid #E6E4DE' }}>
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #F4F3F0' }}>
            <h2 className="text-sm font-semibold text-zinc-800">Recent Attendance</h2>
            <button
              onClick={() => onNavigate('attendance')}
              className="flex items-center gap-1 text-xs font-semibold transition-colors"
              style={{ color: '#166634' }}
            >
              View all <ArrowRight size={11} />
            </button>
          </div>
          <div>
            {recentActivity.length === 0 ? (
              <div className="py-10 flex flex-col items-center gap-2">
                <CalendarCheck size={24} className="text-zinc-300" />
                <p className="text-xs text-zinc-400">No activity recorded yet today</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid #F4F3F0', background: '#FAFAF8' }}>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Person</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider hidden md:table-cell">Time In</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentActivity.map((row) => (
                    <tr key={row.id} style={{ borderBottom: '1px solid #F4F3F0' }}>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                            style={{ background: '#DCFCE7', color: '#166634' }}
                          >
                            {row.person ? getInitials(row.person.firstName, row.person.lastName) : '?'}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-zinc-800">{row.person ? getFullName(row.person) : '—'}</p>
                            <p className="text-xs text-zinc-400 font-mono">{row.person?.username}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 hidden md:table-cell">
                        <span className="font-mono text-xs text-zinc-600">{row.timeIn || '—'}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={row.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div className="bg-white rounded-xl p-5" style={{ border: '1px solid #E6E4DE' }}>
          <h2 className="text-sm font-semibold text-zinc-800 mb-4">Quick Actions</h2>
          <div className="space-y-2.5">
            {[
              {
                label: 'Add Person',
                desc: 'Register a new person',
                icon: <Plus size={16} />,
                action: () => onNavigate('people'),
                primary: true,
              },
              {
                label: 'Generate Today\'s QR',
                desc: 'Create attendance QR code',
                icon: <QrCode size={16} />,
                action: () => { onGenerateQR(); onNavigate('qr'); },
                primary: false,
              },
              {
                label: 'View Attendance',
                desc: 'Open attendance records',
                icon: <CalendarCheck size={16} />,
                action: () => onNavigate('attendance'),
                primary: false,
              },
            ].map((qa) => (
              <button
                key={qa.label}
                onClick={qa.action}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-all"
                style={
                  qa.primary
                    ? { background: '#166634', color: '#FFFFFF' }
                    : { background: '#FAFAF8', border: '1px solid #E6E4DE', color: '#3F3F46' }
                }
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLButtonElement;
                  if (qa.primary) { el.style.background = '#14532D'; }
                  else { el.style.background = '#F4F3F0'; }
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLButtonElement;
                  if (qa.primary) { el.style.background = '#166634'; }
                  else { el.style.background = '#FAFAF8'; }
                }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={qa.primary ? { background: 'rgba(255,255,255,0.15)' } : { background: '#E6E4DE' }}
                >
                  {qa.icon}
                </div>
                <div>
                  <p className="text-sm font-semibold">{qa.label}</p>
                  <p className="text-xs mt-0.5" style={{ color: qa.primary ? 'rgba(255,255,255,0.65)' : '#A1A1AA' }}>
                    {qa.desc}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
