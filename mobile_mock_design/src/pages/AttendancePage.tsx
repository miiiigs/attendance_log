import { useState } from 'react';
import { Search, ChevronDown, X, CalendarCheck, SlidersHorizontal } from 'lucide-react';
import type { Person, AttendanceRecord, AttendanceStatus } from '../types';
import { getInitials, getFullName, TODAY } from '../data/mockData';
import Modal from '../components/ui/Modal';

interface AttendancePageProps {
  people: Person[];
  attendance: AttendanceRecord[];
}

function StatusBadge({ status }: { status: AttendanceStatus }) {
  const map: Record<AttendanceStatus, { bg: string; text: string; dot: string }> = {
    'On Time':        { bg: '#F0FDF4', text: '#15803D', dot: '#22C55E' },
    'Late':           { bg: '#FFFBEB', text: '#B45309', dot: '#F59E0B' },
    'Completed':      { bg: '#EFF6FF', text: '#1D4ED8', dot: '#3B82F6' },
    'Not Yet Logged': { bg: '#F4F4F5', text: '#71717A', dot: '#A1A1AA' },
  };
  const s = map[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium"
      style={{ background: s.bg, color: s.text }}
    >
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: s.dot }} />
      {status}
    </span>
  );
}

interface DetailDrawerProps {
  record: AttendanceRecord | null;
  person: Person | null;
  onClose: () => void;
}

function DetailDrawer({ record, person, onClose }: DetailDrawerProps) {
  if (!record || !person) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-zinc-900/30 backdrop-blur-[2px]" onClick={onClose} />
      <div
        className="relative w-full max-w-sm bg-white flex flex-col h-full"
        style={{ boxShadow: '-8px 0 32px rgba(0,0,0,0.12)' }}
      >
        <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid #F4F3F0' }}>
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">Attendance Record</h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              {new Date(record.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-stone-100 text-zinc-400 transition-colors">
            <X size={15} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-base font-bold"
              style={{ background: '#DCFCE7', color: '#166634' }}
            >
              {getInitials(person.firstName, person.lastName)}
            </div>
            <div>
              <p className="text-base font-semibold text-zinc-900">{getFullName(person)}</p>
              <p className="text-xs font-mono text-zinc-400 mt-0.5">{person.username}</p>
              <p className="text-xs text-zinc-400">{person.email}</p>
            </div>
          </div>

          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #E6E4DE' }}>
            {[
              { label: 'Status', value: <StatusBadge status={record.status} /> },
              { label: 'Time In', value: <span className="font-mono text-sm text-zinc-700">{record.timeIn || '—'}</span> },
              { label: 'Time Out', value: <span className="font-mono text-sm text-zinc-700">{record.timeOut || '—'}</span> },
            ].map((row, i) => (
              <div
                key={row.label}
                className="flex items-center justify-between px-4 py-3.5"
                style={{ borderTop: i > 0 ? '1px solid #F4F3F0' : 'none', background: '#FAFAF8' }}
              >
                <span className="text-xs text-zinc-500 font-medium">{row.label}</span>
                {row.value}
              </div>
            ))}
          </div>

          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-3">Scan Timeline</p>
            <div className="space-y-3">
              {record.timeIn ? (
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                    <span className="w-2 h-2 rounded-full" style={{ background: '#22C55E' }} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-zinc-700 font-mono">{record.timeIn}</p>
                    <p className="text-xs text-zinc-400">Time In recorded</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 opacity-40">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: '#F4F4F5' }}>
                    <span className="w-2 h-2 rounded-full bg-zinc-400" />
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">No Time In recorded</p>
                  </div>
                </div>
              )}
              {record.timeOut ? (
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
                    <span className="w-2 h-2 rounded-full" style={{ background: '#3B82F6' }} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-zinc-700 font-mono">{record.timeOut}</p>
                    <p className="text-xs text-zinc-400">Time Out recorded</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 opacity-40">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: '#F4F4F5' }}>
                    <span className="w-2 h-2 rounded-full bg-zinc-400" />
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">No Time Out recorded</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="px-6 py-4" style={{ borderTop: '1px solid #F4F3F0' }}>
          <button
            onClick={onClose}
            className="w-full py-2.5 text-sm font-semibold rounded-xl transition-colors text-zinc-600 hover:text-zinc-800"
            style={{ background: '#F4F3F0', border: '1px solid #E6E4DE' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

const STATUSES = ['On Time', 'Late', 'Not Yet Logged', 'Completed'];

export default function AttendancePage({ people, attendance }: AttendancePageProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedDate, setSelectedDate] = useState(TODAY);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const filtered = attendance.filter((a) => {
    if (a.date !== selectedDate) return false;
    const p = people.find((pe) => pe.id === a.personId);
    if (!p) return false;
    if (statusFilter && a.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!getFullName(p).toLowerCase().includes(q) && !p.username.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const selectedPerson = selectedRecord ? people.find((p) => p.id === selectedRecord.personId) || null : null;

  const inputStyle = {
    border: '1px solid #E6E4DE',
    background: '#FFFFFF',
    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.03)',
  };

  return (
    <div className="space-y-5 max-w-7xl">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 tracking-tight">Attendance</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Daily attendance records and status</p>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-xl px-4 py-3" style={{ border: '1px solid #E6E4DE' }}>
        <div className="hidden md:flex items-center gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 text-sm text-zinc-700 rounded-lg outline-none"
            style={inputStyle}
          />
          <div className="relative flex-1 max-w-64">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or username…"
              className="w-full pl-8 pr-3 py-2 text-sm text-zinc-800 rounded-lg outline-none placeholder-zinc-300"
              style={inputStyle}
            />
          </div>
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none pl-3 pr-7 py-2 text-sm text-zinc-700 rounded-lg outline-none bg-white"
              style={inputStyle}
            >
              <option value="">All Statuses</option>
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
          </div>
          {(search || statusFilter) && (
            <button
              onClick={() => { setSearch(''); setStatusFilter(''); }}
              className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-600 transition-colors px-2 py-2"
            >
              <X size={13} /> Clear
            </button>
          )}
        </div>

        {/* Mobile toolbar */}
        <div className="flex md:hidden items-center gap-2">
          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="flex-1 px-3 py-2 text-sm rounded-lg outline-none" style={inputStyle} />
          <button onClick={() => setShowMobileFilters(true)} className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg text-zinc-600" style={inputStyle}>
            <SlidersHorizontal size={14} />
          </button>
        </div>
      </div>

      {/* Mobile filter modal */}
      <Modal open={showMobileFilters} onClose={() => setShowMobileFilters(false)} title="Filter Records">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Search</label>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name or username" className="w-full px-3 py-2 text-sm rounded-lg outline-none" style={inputStyle} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Status</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg outline-none bg-white" style={inputStyle}>
              <option value="">All</option>
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={() => { setSearch(''); setStatusFilter(''); setShowMobileFilters(false); }} className="flex-1 py-2.5 text-sm font-medium rounded-xl border border-stone-200 text-zinc-600 hover:bg-stone-50">Clear</button>
            <button onClick={() => setShowMobileFilters(false)} className="flex-1 py-2.5 text-sm font-semibold rounded-xl text-white" style={{ background: '#166634' }}>Apply</button>
          </div>
        </div>
      </Modal>

      {/* Summary row */}
      <div className="flex items-center gap-2 text-xs text-zinc-400">
        <span className="font-medium text-zinc-600">{filtered.length}</span> records
        {statusFilter && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs" style={{ background: '#F0FDF4', color: '#166634' }}>
            {statusFilter} <button onClick={() => setStatusFilter('')}><X size={10} /></button>
          </span>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid #E6E4DE' }}>
        {filtered.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3">
            <CalendarCheck size={28} className="text-zinc-200" />
            <div className="text-center">
              <p className="text-sm font-medium text-zinc-500">No records found</p>
              <p className="text-xs text-zinc-400 mt-1">Try adjusting the date or filters</p>
            </div>
          </div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: '#FAFAF8', borderBottom: '1px solid #F0EFE9' }}>
                    {['Person', 'Username', 'Time In', 'Time Out', 'Status', ''].map((h) => (
                      <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-zinc-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((record) => {
                    const p = people.find((pe) => pe.id === record.personId);
                    if (!p) return null;
                    return (
                      <tr
                        key={record.id}
                        className="transition-colors cursor-pointer"
                        style={{ borderBottom: '1px solid #F4F3F0' }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = '#FAFAF8'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = ''; }}
                        onClick={() => setSelectedRecord(record)}
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: '#DCFCE7', color: '#166634' }}>
                              {getInitials(p.firstName, p.lastName)}
                            </div>
                            <span className="font-medium text-zinc-800">{getFullName(p)}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="font-mono text-xs text-zinc-500">{p.username}</span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="font-mono text-xs text-zinc-700">{record.timeIn || <span className="text-zinc-300">—</span>}</span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="font-mono text-xs text-zinc-700">{record.timeOut || <span className="text-zinc-300">—</span>}</span>
                        </td>
                        <td className="px-5 py-4">
                          <StatusBadge status={record.status} />
                        </td>
                        <td className="px-5 py-4">
                          <button className="text-xs font-medium text-zinc-400 hover:text-zinc-700 transition-colors">Details</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-stone-50">
              {filtered.map((record) => {
                const p = people.find((pe) => pe.id === record.personId);
                if (!p) return null;
                return (
                  <div key={record.id} className="px-4 py-4" onClick={() => setSelectedRecord(record)}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: '#DCFCE7', color: '#166634' }}>
                          {getInitials(p.firstName, p.lastName)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-zinc-800">{getFullName(p)}</p>
                          <p className="text-xs font-mono text-zinc-400">{p.username}</p>
                        </div>
                      </div>
                      <StatusBadge status={record.status} />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs pl-11">
                      <div>
                        <span className="text-zinc-400">In: </span>
                        <span className="font-mono text-zinc-700">{record.timeIn || '—'}</span>
                      </div>
                      <div>
                        <span className="text-zinc-400">Out: </span>
                        <span className="font-mono text-zinc-700">{record.timeOut || '—'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-zinc-400">
        <span>{filtered.length} of {attendance.filter((a) => a.date === selectedDate).length} records</span>
        <div className="flex gap-1">
          <button className="px-3 py-1.5 rounded-lg text-xs border border-stone-200 text-zinc-500 hover:bg-stone-50 disabled:opacity-40" disabled>Prev</button>
          <button className="px-3 py-1.5 rounded-lg text-xs border border-stone-200 text-zinc-500 hover:bg-stone-50 disabled:opacity-40" disabled>Next</button>
        </div>
      </div>

      <DetailDrawer record={selectedRecord} person={selectedPerson} onClose={() => setSelectedRecord(null)} />
    </div>
  );
}
