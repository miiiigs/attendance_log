import { useState, useCallback } from 'react';
import { Menu, CalendarCheck } from 'lucide-react';
import type { Person, AttendanceRecord, Page, ToastMessage, QRState } from './types';
import { INITIAL_PEOPLE, INITIAL_ATTENDANCE } from './data/mockData';
import Sidebar from './components/layout/Sidebar';
import ToastContainer from './components/ui/Toast';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import AttendancePage from './pages/AttendancePage';
import PeoplePage from './pages/PeoplePage';
import QRPage from './pages/QRPage';
import SettingsPage from './pages/SettingsPage';
import MobileRoot from './mobile/MobileRoot';

const PAGE_LABELS: Record<Page, string> = {
  dashboard: 'Dashboard',
  attendance: 'Attendance',
  people: 'People',
  qr: 'Attendance QR',
  settings: 'Settings',
};

function Header({ currentPage, onHamburger }: { currentPage: Page; onHamburger: () => void }) {
  return (
    <header
      className="sticky top-0 z-30 flex items-center gap-4 px-5 lg:px-7 py-4"
      style={{ background: '#FFFFFF', borderBottom: '1px solid #F0EFE9' }}
    >
      <button
        onClick={onHamburger}
        className="lg:hidden p-1.5 rounded-lg hover:bg-stone-100 text-zinc-500 transition-colors"
      >
        <Menu size={18} />
      </button>

      {/* Mobile brand */}
      <div className="lg:hidden flex items-center gap-2 flex-1">
        <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: '#166634' }}>
          <CalendarCheck size={12} className="text-white" />
        </div>
        <span className="text-sm font-semibold text-zinc-800">{PAGE_LABELS[currentPage]}</span>
      </div>

      {/* Desktop: current page title */}
      <p className="hidden lg:block text-sm text-zinc-400 font-medium">
        Sunday, 16 August 2026
      </p>

      <div className="ml-auto flex items-center gap-3">
        <div className="hidden lg:flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
            style={{ background: '#166634' }}
          >
            SA
          </div>
          <div>
            <p className="text-xs font-semibold text-zinc-800 leading-tight">System Admin</p>
            <p className="text-[11px] text-zinc-400 leading-tight">Administrator</p>
          </div>
        </div>
      </div>
    </header>
  );
}

function generateQRState(): QRState {
  const now = new Date();
  const expires = new Date(now.getTime() + 12 * 3600 * 1000);
  return {
    active: true,
    seed: Math.floor(Math.random() * 10000),
    generatedAt: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    expiresAt: expires.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  };
}

type ViewMode = 'admin' | 'employee';

function MobileShell({ onAdminMode }: { onAdminMode: () => void }) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#F0EFE9]">
      {/* Phone frame — decorative on desktop, full-screen on mobile */}
      <div
        className="relative w-full max-w-[390px] h-[844px] max-h-screen rounded-[48px] overflow-hidden shadow-2xl border-[6px] border-[#1A1A1A]"
        style={{ boxShadow: '0 40px 80px -12px rgba(0,0,0,0.4), 0 0 0 2px #2A2A2A inset' }}
      >
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-7 bg-[#1A1A1A] rounded-b-2xl z-50" />
        <div className="w-full h-full overflow-hidden bg-[#F8F7F4] pt-7">
          <MobileRoot onAdminMode={onAdminMode} />
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('employee');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [people, setPeople] = useState<Person[]>(INITIAL_PEOPLE);
  const [attendance] = useState<AttendanceRecord[]>(INITIAL_ATTENDANCE);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [qrState, setQrState] = useState<QRState>({
    active: false,
    seed: 1,
    generatedAt: null,
    expiresAt: null,
  });

  const showToast = useCallback(
    (message: string, type: 'success' | 'error' | 'info' = 'success') => {
      const id = Math.random().toString(36).slice(2);
      setToasts((t) => [...t, { id, message, type }]);
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts((t) => t.filter((toast) => toast.id !== id));
  }, []);

  const handleAddPerson = useCallback((data: Omit<Person, 'id'>) => {
    setPeople((p) => [...p, { ...data, id: Math.random().toString(36).slice(2) }]);
  }, []);

  const handleEditPerson = useCallback((updated: Person) => {
    setPeople((p) => p.map((pe) => pe.id === updated.id ? updated : pe));
  }, []);

  const handleDeactivate = useCallback((id: string) => {
    setPeople((p) => p.map((pe) => pe.id === id ? { ...pe, status: 'Inactive' } : pe));
  }, []);

  const handleReactivate = useCallback((id: string) => {
    setPeople((p) => p.map((pe) => pe.id === id ? { ...pe, status: 'Active' } : pe));
  }, []);

  const handleGenerateQR = useCallback(() => {
    const newState = generateQRState();
    setQrState(newState);
    showToast("Today's QR code generated successfully.", 'success');
  }, [showToast]);

  const handleRevokeQR = useCallback(() => {
    setQrState((s) => ({ ...s, active: false }));
  }, []);

  const handleDeleteQR = useCallback(() => {
    setQrState({ active: false, seed: 0, generatedAt: null, expiresAt: null });
  }, []);

  const handleRegenerateQR = useCallback(() => {
    setQrState(generateQRState());
  }, []);

  if (viewMode === 'employee') {
    return <MobileShell onAdminMode={() => setViewMode('admin')} />;
  }

  if (!isLoggedIn) {
    return (
      <>
        <LoginPage onLogin={() => setIsLoggedIn(true)} onEmployeeMode={() => setViewMode('employee')} />
        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#F8F7F4' }}>
      <Sidebar
        currentPage={currentPage}
        onNavigate={(page) => { setCurrentPage(page); setMobileMenuOpen(false); }}
        onLogout={() => { setIsLoggedIn(false); setCurrentPage('dashboard'); }}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header currentPage={currentPage} onHamburger={() => setMobileMenuOpen(true)} />

        <main className="flex-1 overflow-y-auto px-5 lg:px-8 py-7">
          {currentPage === 'dashboard' && (
            <DashboardPage
              people={people}
              attendance={attendance}
              qrState={qrState}
              onNavigate={setCurrentPage}
              onGenerateQR={handleGenerateQR}
            />
          )}
          {currentPage === 'attendance' && (
            <AttendancePage people={people} attendance={attendance} />
          )}
          {currentPage === 'people' && (
            <PeoplePage
              people={people}
              onAddPerson={handleAddPerson}
              onEditPerson={handleEditPerson}
              onDeactivate={handleDeactivate}
              onReactivate={handleReactivate}
              showToast={showToast}
            />
          )}
          {currentPage === 'qr' && (
            <QRPage
              qrState={qrState}
              onGenerate={handleGenerateQR}
              onRevoke={handleRevokeQR}
              onDelete={handleDeleteQR}
              onRegenerate={handleRegenerateQR}
              showToast={showToast}
            />
          )}
          {currentPage === 'settings' && (
            <SettingsPage showToast={showToast} />
          )}
        </main>
      </div>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
