import { useState } from 'react';
import { Home, QrCode, Clock, User } from 'lucide-react';
import MobileHomePage from './pages/MobileHomePage';
import MobileScanPage from './pages/MobileScanPage';
import MobileHistoryPage from './pages/MobileHistoryPage';
import MobileProfilePage from './pages/MobileProfilePage';
import type { MobileEmployee, MobileAttendanceRecord, MobileScreen, ScanResult } from './types';

const MOCK_EMPLOYEE: MobileEmployee = {
  id: 'e-001',
  name: 'Sarah Mendoza',
  username: '30847291',
  email: 'sarah.mendoza@company.com',
  department: 'Operations',
  status: 'active',
};

const today = new Date();
const fmt = (d: Date) => d.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });

const MOCK_HISTORY: MobileAttendanceRecord[] = [
  {
    id: 'a-1',
    date: fmt(today),
    timeIn: '08:32 AM',
    timeOut: null,
    status: 'present',
  },
  {
    id: 'a-2',
    date: fmt(new Date(today.getTime() - 86400000)),
    timeIn: '08:21 AM',
    timeOut: '05:44 PM',
    status: 'present',
  },
  {
    id: 'a-3',
    date: fmt(new Date(today.getTime() - 2 * 86400000)),
    timeIn: '09:14 AM',
    timeOut: '06:02 PM',
    status: 'late',
  },
  {
    id: 'a-4',
    date: fmt(new Date(today.getTime() - 3 * 86400000)),
    timeIn: '08:07 AM',
    timeOut: '05:30 PM',
    status: 'present',
  },
  {
    id: 'a-5',
    date: fmt(new Date(today.getTime() - 4 * 86400000)),
    timeIn: null,
    timeOut: null,
    status: 'absent',
  },
  {
    id: 'a-6',
    date: fmt(new Date(today.getTime() - 7 * 86400000)),
    timeIn: '08:28 AM',
    timeOut: '05:58 PM',
    status: 'present',
  },
  {
    id: 'a-7',
    date: fmt(new Date(today.getTime() - 8 * 86400000)),
    timeIn: '08:45 AM',
    timeOut: '06:10 PM',
    status: 'late',
  },
];

const NAV_ITEMS = [
  { id: 'home' as MobileScreen, label: 'Home', Icon: Home },
  { id: 'scan' as MobileScreen, label: 'Scan', Icon: QrCode },
  { id: 'history' as MobileScreen, label: 'History', Icon: Clock },
  { id: 'profile' as MobileScreen, label: 'Profile', Icon: User },
];

interface Props {
  onLogout: () => void;
}

export default function MobileApp({ onLogout }: Props) {
  const [screen, setScreen] = useState<MobileScreen>('home');
  const [records, setRecords] = useState<MobileAttendanceRecord[]>(MOCK_HISTORY);
  const [lastScan, setLastScan] = useState<ScanResult | null>(null);

  const todayRecord = records.find((r) => r.date === fmt(today));
  const hasClockedIn = !!todayRecord?.timeIn;
  const hasClockedOut = !!todayRecord?.timeOut;

  function handleScanSuccess(result: ScanResult) {
    setLastScan(result);
    setRecords((prev) => {
      const existing = prev.findIndex((r) => r.date === fmt(today));
      if (existing === -1) {
        return [
          { id: `a-${Date.now()}`, date: fmt(today), timeIn: result.time, timeOut: null, status: 'present' },
          ...prev,
        ];
      }
      return prev.map((r, i) =>
        i === existing
          ? { ...r, timeOut: result.type === 'out' ? result.time : r.timeOut, timeIn: result.type === 'in' ? result.time : r.timeIn }
          : r
      );
    });
  }

  return (
    <div className="flex flex-col h-full bg-[#F8F7F4]">
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {screen === 'home' && (
          <MobileHomePage
            employee={MOCK_EMPLOYEE}
            todayRecord={todayRecord ?? null}
            onScan={() => setScreen('scan')}
          />
        )}
        {screen === 'scan' && (
          <MobileScanPage
            hasClockedIn={hasClockedIn}
            hasClockedOut={hasClockedOut}
            lastScan={lastScan}
            onSuccess={handleScanSuccess}
            onDone={() => { setScreen('home'); }}
          />
        )}
        {screen === 'history' && (
          <MobileHistoryPage records={records} />
        )}
        {screen === 'profile' && (
          <MobileProfilePage employee={MOCK_EMPLOYEE} onLogout={onLogout} />
        )}
      </div>

      {/* Bottom navigation */}
      <nav className="flex-none flex border-t border-[#E6E4DE] bg-white safe-area-bottom">
        {NAV_ITEMS.map(({ id, label, Icon }) => {
          const active = screen === id;
          return (
            <button
              key={id}
              onClick={() => setScreen(id)}
              className="flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors"
            >
              <Icon
                size={20}
                strokeWidth={active ? 2.5 : 1.75}
                className={active ? 'text-[#166534]' : 'text-[#A1A1AA]'}
              />
              <span
                className={`text-[10px] font-semibold tracking-wide ${active ? 'text-[#166534]' : 'text-[#A1A1AA]'}`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
