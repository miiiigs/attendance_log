import {
  LayoutDashboard,
  CalendarCheck,
  Users,
  QrCode,
  Settings,
  LogOut,
  X,
} from 'lucide-react';
import type { Page } from '../../types';

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  onLogout: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

const navItems: { label: string; page: Page; icon: React.ReactNode }[] = [
  { label: 'Dashboard', page: 'dashboard', icon: <LayoutDashboard size={16} /> },
  { label: 'Attendance', page: 'attendance', icon: <CalendarCheck size={16} /> },
  { label: 'People', page: 'people', icon: <Users size={16} /> },
  { label: 'Attendance QR', page: 'qr', icon: <QrCode size={16} /> },
  { label: 'Settings', page: 'settings', icon: <Settings size={16} /> },
];

function SidebarContent({
  currentPage,
  onNavigate,
  onLogout,
  onMobileClose,
}: {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  onLogout: () => void;
  onMobileClose?: () => void;
}) {
  const nav = (page: Page) => {
    onNavigate(page);
    onMobileClose?.();
  };

  return (
    <div className="flex flex-col h-full" style={{ background: '#0B1D11' }}>
      {/* Brand */}
      <div className="flex items-center justify-between px-5 pt-7 pb-6">
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: '#1A4D2E' }}
          >
            <CalendarCheck size={14} className="text-green-300" />
          </div>
          <div>
            <span className="font-semibold text-white text-sm tracking-tight leading-none block">
              Attendance
            </span>
            <span className="text-[11px] font-medium leading-none block" style={{ color: 'rgba(255,255,255,0.40)' }}>
              Logger
            </span>
          </div>
        </div>
        {onMobileClose && (
          <button onClick={onMobileClose} className="lg:hidden" style={{ color: 'rgba(255,255,255,0.4)' }}>
            <X size={16} />
          </button>
        )}
      </div>

      {/* Divider */}
      <div className="mx-5 mb-5" style={{ height: '1px', background: 'rgba(255,255,255,0.07)' }} />

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        <p
          className="text-[10px] font-semibold uppercase tracking-[0.12em] px-3 mb-2"
          style={{ color: 'rgba(255,255,255,0.30)' }}
        >
          Navigation
        </p>
        {navItems.map((item) => {
          const active = currentPage === item.page;
          return (
            <button
              key={item.page}
              onClick={() => nav(item.page)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left"
              style={{
                background: active ? '#1A4D2E' : 'transparent',
                color: active ? '#FFFFFF' : 'rgba(255,255,255,0.55)',
              }}
            >
              <span style={{ color: active ? '#4ADE80' : 'rgba(255,255,255,0.35)' }}>
                {item.icon}
              </span>
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Bottom */}
      <div
        className="mx-5 mt-6 mb-4"
        style={{ height: '1px', background: 'rgba(255,255,255,0.07)' }}
      />
      <div className="px-3 pb-5">
        <div className="px-3 py-2.5 mb-1">
          <p className="text-sm font-semibold text-white leading-tight">System Admin</p>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.40)' }}>
            admin@company.com
          </p>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
          style={{ color: 'rgba(255,255,255,0.45)' }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.12)';
            (e.currentTarget as HTMLButtonElement).style.color = '#FCA5A5';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.45)';
          }}
        >
          <LogOut size={15} />
          Sign Out
        </button>
      </div>
    </div>
  );
}

export default function Sidebar({
  currentPage,
  onNavigate,
  onLogout,
  mobileOpen,
  onMobileClose,
}: SidebarProps) {
  return (
    <>
      {/* Desktop */}
      <aside className="hidden lg:flex flex-col w-56 shrink-0 h-screen sticky top-0">
        <SidebarContent
          currentPage={currentPage}
          onNavigate={onNavigate}
          onLogout={onLogout}
        />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onMobileClose}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-64 shadow-2xl">
            <SidebarContent
              currentPage={currentPage}
              onNavigate={onNavigate}
              onLogout={onLogout}
              onMobileClose={onMobileClose}
            />
          </aside>
        </div>
      )}
    </>
  );
}
