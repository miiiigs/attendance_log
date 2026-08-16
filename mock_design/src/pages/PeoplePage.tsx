import { useState, useRef, useEffect } from 'react';
import {
  Search, Plus, MoreHorizontal, Eye, Key, UserMinus, UserCheck,
  ChevronDown, X, Users, CheckCircle2, Copy, Mail, AlertTriangle, RefreshCw
} from 'lucide-react';
import type { Person, PersonStatus } from '../types';
import { getInitials, getFullName, generateUsername, generatePassword, PERSON_RECENT_ATTENDANCE } from '../data/mockData';
import Modal from '../components/ui/Modal';

interface PeoplePageProps {
  people: Person[];
  onAddPerson: (person: Omit<Person, 'id'>) => void;
  onEditPerson: (person: Person) => void;
  onDeactivate: (id: string) => void;
  onReactivate: (id: string) => void;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

// ─── Shared styles ─────────────────────────────────────────────────────────────

const inputBase = {
  border: '1px solid #E6E4DE',
  background: '#FFFFFF',
  boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.03)',
};

function StatusPill({ status }: { status: PersonStatus }) {
  const active = status === 'Active';
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold"
      style={active
        ? { background: '#F0FDF4', color: '#15803D' }
        : { background: '#F4F4F5', color: '#71717A' }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: active ? '#22C55E' : '#A1A1AA' }} />
      {status}
    </span>
  );
}

function Avatar({ firstName, lastName, size = 'md' }: { firstName: string; lastName: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'w-7 h-7 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-14 h-14 text-lg' };
  return (
    <div className={`${sizes[size]} rounded-full flex items-center justify-center font-bold shrink-0`} style={{ background: '#DCFCE7', color: '#166634' }}>
      {getInitials(firstName, lastName)}
    </div>
  );
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).catch(() => {});
}

// ─── Dropdown ──────────────────────────────────────────────────────────────────

function DropdownMenu({ items }: { items: { label: string; icon: React.ReactNode; onClick: () => void; destructive?: boolean }[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-stone-100 transition-colors"
      >
        <MoreHorizontal size={15} />
      </button>
      {open && (
        <div
          className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl z-20 py-1 overflow-hidden"
          style={{ border: '1px solid #E6E4DE', boxShadow: '0 8px 24px rgba(0,0,0,0.10)' }}
        >
          {items.map((item) => (
            <button
              key={item.label}
              onClick={() => { item.onClick(); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium transition-colors text-left"
              style={{ color: item.destructive ? '#DC2626' : '#3F3F46' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = item.destructive ? '#FEF2F2' : '#F4F3F0'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
            >
              {item.icon} {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Credential Result Panel ───────────────────────────────────────────────────

interface CredentialPanelProps {
  credentials: { username: string; password: string; email: string; name: string } | null;
  onDone: () => void;
}

function CredentialPanel({ credentials, onDone }: CredentialPanelProps) {
  const [showEmailTemplate, setShowEmailTemplate] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  if (!credentials) return null;

  const emailSubject = `Your Attendance Logger credentials — ${credentials.name}`;
  const emailBody = `Dear ${credentials.name},

Your Attendance Logger account has been created. Please use the following credentials to sign in:

Username: ${credentials.username}
Temporary Password: ${credentials.password}

Please log in and change your password at your earliest convenience.

For assistance, contact your system administrator.

—
Attendance Logger`;

  const copy = (text: string, key: string) => {
    copyToClipboard(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-zinc-900/40 backdrop-blur-[2px]" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md z-10"
        style={{ border: '1px solid #E6E4DE' }}
      >
        {/* Header */}
        <div className="px-6 pt-7 pb-5 text-center" style={{ borderBottom: '1px solid #F4F3F0' }}>
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
            <CheckCircle2 size={22} style={{ color: '#166634' }} />
          </div>
          <h2 className="text-base font-semibold text-zinc-900">Person Created</h2>
          <p className="text-sm text-zinc-400 mt-0.5">
            Credentials have been generated for <strong className="text-zinc-600">{credentials.name}</strong>
          </p>
        </div>

        {/* Credentials */}
        <div className="px-6 py-5 space-y-3">
          {[
            { label: 'Username', value: credentials.username, key: 'username' },
            { label: 'Temporary Password', value: credentials.password, key: 'password', mono: true, sensitive: true },
            { label: 'Email', value: credentials.email, key: 'email' },
          ].map((field) => (
            <div key={field.label} className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl" style={{ background: '#FAFAF8', border: '1px solid #E6E4DE' }}>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">{field.label}</p>
                <p className={`text-sm font-medium text-zinc-800 mt-0.5 truncate ${field.mono ? 'font-mono' : ''}`}>{field.value}</p>
              </div>
              <button
                onClick={() => copy(field.value, field.key)}
                className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={copied === field.key
                  ? { background: '#F0FDF4', color: '#166634' }
                  : { background: '#F4F3F0', color: '#71717A' }}
              >
                <Copy size={11} />
                {copied === field.key ? 'Copied' : 'Copy'}
              </button>
            </div>
          ))}
        </div>

        {/* Email status */}
        <div className="px-6 pb-4">
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
            <Mail size={14} style={{ color: '#166634' }} />
            <p className="text-xs font-medium" style={{ color: '#166634' }}>
              Onboarding email sent to {credentials.email}
            </p>
          </div>
        </div>

        {/* Manual email fallback */}
        <div className="px-6 pb-4">
          <button
            onClick={() => setShowEmailTemplate((s) => !s)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-medium text-zinc-500 transition-all"
            style={{ background: '#F4F3F0', border: '1px solid #E6E4DE' }}
          >
            <span className="flex items-center gap-2">
              <Mail size={13} />
              Manual Email Template
            </span>
            <ChevronDown size={13} className={`transition-transform ${showEmailTemplate ? 'rotate-180' : ''}`} />
          </button>
          {showEmailTemplate && (
            <div className="mt-2 rounded-xl overflow-hidden" style={{ border: '1px solid #E6E4DE' }}>
              <div className="px-4 py-3" style={{ borderBottom: '1px solid #F4F3F0', background: '#FAFAF8' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Subject</p>
                    <p className="text-xs text-zinc-700 mt-0.5">{emailSubject}</p>
                  </div>
                  <button onClick={() => copy(emailSubject, 'subject')} className="text-xs text-zinc-400 hover:text-zinc-600 flex items-center gap-1 transition-colors">
                    <Copy size={11} /> {copied === 'subject' ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
              <div className="px-4 py-3" style={{ background: '#FAFAF8' }}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-1">Body</p>
                    <pre className="text-xs text-zinc-600 whitespace-pre-wrap font-sans leading-relaxed">{emailBody}</pre>
                  </div>
                  <button onClick={() => copy(emailBody, 'body')} className="text-xs text-zinc-400 hover:text-zinc-600 flex items-center gap-1 transition-colors shrink-0">
                    <Copy size={11} /> {copied === 'body' ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Done */}
        <div className="px-6 pb-6">
          <button
            onClick={onDone}
            className="w-full py-2.5 text-sm font-semibold text-white rounded-xl transition-colors"
            style={{ background: '#166634' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#14532D'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#166634'; }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Add Person Drawer ─────────────────────────────────────────────────────────

interface AddPersonDrawerProps {
  open: boolean;
  onClose: () => void;
  onCreated: (credentials: { username: string; password: string; email: string; name: string }) => void;
  onAddPerson: (person: Omit<Person, 'id'>) => void;
  existingUsernames: string[];
}

function AddPersonDrawer({ open, onClose, onCreated, onAddPerson, existingUsernames }: AddPersonDrawerProps) {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) { setForm({ firstName: '', lastName: '', email: '' }); setErrors({}); }
  }, [open]);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.firstName.trim()) e.firstName = 'Required';
    if (!form.lastName.trim()) e.lastName = 'Required';
    if (!form.email.trim()) e.email = 'Required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email';
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 900));

    let username = generateUsername(form.firstName, form.lastName);
    let suffix = 2;
    while (existingUsernames.includes(username)) {
      username = `${generateUsername(form.firstName, form.lastName)}${suffix}`;
      suffix++;
    }
    const password = generatePassword();
    const person: Omit<Person, 'id'> = {
      username,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      status: 'Active',
      createdAt: new Date().toISOString().split('T')[0],
    };
    onAddPerson(person);
    setSubmitting(false);
    onClose();
    onCreated({ username, password, email: form.email.trim(), name: `${form.firstName} ${form.lastName}` });
  };

  if (!open) return null;

  const fieldCls = (key: string) =>
    `w-full px-3.5 py-2.5 text-sm text-zinc-900 rounded-xl outline-none placeholder-zinc-300 transition-all ${errors[key] ? 'border-red-300' : ''}`;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-zinc-900/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white flex flex-col h-full" style={{ boxShadow: '-8px 0 32px rgba(0,0,0,0.12)' }}>
        <div className="flex items-start justify-between px-6 py-5" style={{ borderBottom: '1px solid #F4F3F0' }}>
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">Add Person</h2>
            <p className="text-xs text-zinc-400 mt-0.5">Register a new person to the system</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-stone-100 text-zinc-400"><X size={15} /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">First Name *</label>
              <input value={form.firstName} onChange={set('firstName')} placeholder="Juan" className={fieldCls('firstName')} style={inputBase} />
              {errors.firstName && <p className="text-xs text-red-500 mt-1">{errors.firstName}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Last Name *</label>
              <input value={form.lastName} onChange={set('lastName')} placeholder="Santos" className={fieldCls('lastName')} style={inputBase} />
              {errors.lastName && <p className="text-xs text-red-500 mt-1">{errors.lastName}</p>}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Email *</label>
            <input type="email" value={form.email} onChange={set('email')} placeholder="juan.santos@company.com" className={fieldCls('email')} style={inputBase} />
            {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
          </div>

          {/* Auto-generated notice */}
          <div className="px-4 py-3.5 rounded-xl flex gap-3" style={{ background: '#F8F7F4', border: '1px solid #E6E4DE' }}>
            <Key size={14} className="text-zinc-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-zinc-600">Credentials auto-generated</p>
              <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">
                A username and temporary password will be generated automatically upon creation.
              </p>
            </div>
          </div>
        </form>
        <div className="px-6 py-4 flex gap-3" style={{ borderTop: '1px solid #F4F3F0' }}>
          <button onClick={onClose} className="flex-1 py-2.5 text-sm font-medium text-zinc-600 rounded-xl transition-colors" style={{ border: '1px solid #E6E4DE' }}>
            Cancel
          </button>
          <button
            onClick={handleSubmit as never}
            disabled={submitting}
            className="flex-1 py-2.5 text-sm font-semibold text-white rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            style={{ background: '#166634' }}
          >
            {submitting ? (
              <><svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Creating…</>
            ) : 'Create Person'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Person Detail Drawer ─────────────────────────────────────────────────────

interface PersonDetailDrawerProps {
  person: Person | null;
  onClose: () => void;
  onDeactivate: (p: Person) => void;
  onReactivate: (p: Person) => void;
  onGenerateCredentials: (p: Person) => void;
}

function PersonDetailDrawer({ person, onClose, onDeactivate, onReactivate, onGenerateCredentials }: PersonDetailDrawerProps) {
  if (!person) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-zinc-900/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white flex flex-col h-full" style={{ boxShadow: '-8px 0 32px rgba(0,0,0,0.12)' }}>
        <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid #F4F3F0' }}>
          <h2 className="text-sm font-semibold text-zinc-900">Person Details</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-stone-100 text-zinc-400"><X size={15} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Identity */}
          <div className="flex items-start gap-4">
            <Avatar firstName={person.firstName} lastName={person.lastName} size="lg" />
            <div>
              <h3 className="text-lg font-semibold text-zinc-900">{getFullName(person)}</h3>
              <p className="text-xs font-mono text-zinc-400 mt-0.5">{person.username}</p>
              <p className="text-xs text-zinc-400">{person.email}</p>
              <div className="mt-2"><StatusPill status={person.status} /></div>
            </div>
          </div>

          {/* Info rows */}
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #E6E4DE' }}>
            {[
              { label: 'Username', value: person.username, mono: true },
              { label: 'Email', value: person.email },
              { label: 'Status', value: <StatusPill status={person.status} /> },
              { label: 'Created', value: new Date(person.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) },
            ].map((row, i) => (
              <div key={row.label} className="flex items-center justify-between px-4 py-3.5" style={{ borderTop: i > 0 ? '1px solid #F4F3F0' : 'none', background: '#FAFAF8' }}>
                <span className="text-xs font-medium text-zinc-400">{row.label}</span>
                {typeof row.value === 'string'
                  ? <span className={`text-sm text-zinc-700 ${row.mono ? 'font-mono text-xs' : ''}`}>{row.value}</span>
                  : row.value}
              </div>
            ))}
          </div>

          {/* Generate credentials */}
          <div>
            <button
              onClick={() => onGenerateCredentials(person)}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all text-left"
              style={{ border: '1px solid #E6E4DE', background: '#FAFAF8' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#F4F3F0'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#FAFAF8'; }}
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#E6E4DE' }}>
                <Key size={14} className="text-zinc-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-700">Generate New Credentials</p>
                <p className="text-xs text-zinc-400 mt-0.5">Creates a new username and password</p>
              </div>
            </button>
            <p className="text-xs text-amber-600 flex items-start gap-1.5 mt-2 px-1">
              <AlertTriangle size={11} className="mt-px shrink-0" />
              This will invalidate the previous password immediately.
            </p>
          </div>

          {/* Recent attendance */}
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-3">Recent Attendance</p>
            <div className="space-y-2">
              {PERSON_RECENT_ATTENDANCE.map((rec) => (
                <div key={rec.id} className="flex items-center justify-between px-4 py-3 rounded-xl" style={{ background: '#FAFAF8', border: '1px solid #E6E4DE' }}>
                  <div>
                    <p className="text-xs font-semibold text-zinc-700">
                      {new Date(rec.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                    <p className="text-xs font-mono text-zinc-400 mt-0.5">
                      {rec.timeIn || '—'} — {rec.timeOut || 'pending'}
                    </p>
                  </div>
                  <span
                    className="text-xs font-medium px-2 py-0.5 rounded-md"
                    style={
                      rec.status === 'Completed' ? { background: '#EFF6FF', color: '#1D4ED8' }
                      : rec.status === 'Late' ? { background: '#FFFBEB', color: '#B45309' }
                      : rec.status === 'On Time' ? { background: '#F0FDF4', color: '#15803D' }
                      : { background: '#F4F4F5', color: '#71717A' }
                    }
                  >
                    {rec.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 space-y-2" style={{ borderTop: '1px solid #F4F3F0' }}>
          {person.status === 'Active' ? (
            <button
              onClick={() => { onDeactivate(person); onClose(); }}
              className="w-full py-2.5 text-sm font-semibold rounded-xl transition-colors"
              style={{ background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#FEE2E2'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#FEF2F2'; }}
            >
              Deactivate Person
            </button>
          ) : (
            <button
              onClick={() => { onReactivate(person); onClose(); }}
              className="w-full py-2.5 text-sm font-semibold rounded-xl transition-colors"
              style={{ background: '#F0FDF4', color: '#166634', border: '1px solid #BBF7D0' }}
            >
              Reactivate Person
            </button>
          )}
          <button onClick={onClose} className="w-full py-2.5 text-sm font-medium text-zinc-500 rounded-xl hover:bg-stone-100 transition-colors">Close</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────

export default function PeoplePage({ people, onAddPerson, onDeactivate, onReactivate, showToast }: PeoplePageProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [viewingPerson, setViewingPerson] = useState<Person | null>(null);
  const [deactivatingPerson, setDeactivatingPerson] = useState<Person | null>(null);
  const [reactivatingPerson, setReactivatingPerson] = useState<Person | null>(null);
  const [credentials, setCredentials] = useState<{ username: string; password: string; email: string; name: string } | null>(null);
  const [newCredPerson, setNewCredPerson] = useState<Person | null>(null);

  const filtered = people.filter((p) => {
    if (statusFilter && p.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!getFullName(p).toLowerCase().includes(q) && !p.username.includes(q) && !p.email.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const active = people.filter((p) => p.status === 'Active').length;
  const inactive = people.filter((p) => p.status === 'Inactive').length;

  const handleDeactivate = (p: Person) => {
    onDeactivate(p.id);
    showToast(`${getFullName(p)} has been deactivated.`, 'success');
    setDeactivatingPerson(null);
  };

  const handleReactivate = (p: Person) => {
    onReactivate(p.id);
    showToast(`${getFullName(p)} has been reactivated.`, 'success');
    setReactivatingPerson(null);
  };

  const handleGenerateCredentials = (p: Person) => {
    const username = p.username;
    const password = generatePassword();
    setViewingPerson(null);
    setNewCredPerson(p);
    setCredentials({ username, password, email: p.email, name: getFullName(p) });
  };

  const getMenuItems = (p: Person) => [
    { label: 'View Details', icon: <Eye size={14} />, onClick: () => setViewingPerson(p) },
    { label: 'New Credentials', icon: <Key size={14} />, onClick: () => handleGenerateCredentials(p) },
    p.status === 'Active'
      ? { label: 'Deactivate', icon: <UserMinus size={14} />, onClick: () => setDeactivatingPerson(p), destructive: true }
      : { label: 'Reactivate', icon: <UserCheck size={14} />, onClick: () => setReactivatingPerson(p) },
  ];

  return (
    <div className="space-y-5 max-w-7xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 tracking-tight">People</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Manage registered people and their accounts</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white rounded-xl transition-colors shrink-0"
          style={{ background: '#166634' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#14532D'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#166634'; }}
        >
          <Plus size={15} /> Add Person
        </button>
      </div>

      {/* Summary */}
      <div className="flex gap-3">
        {[
          { label: `${active} Active`, style: { background: '#F0FDF4', color: '#166634', border: '1px solid #BBF7D0' } },
          { label: `${inactive} Inactive`, style: { background: '#F4F4F5', color: '#71717A', border: '1px solid #E4E4E7' } },
          { label: `${people.length} Total`, style: { background: '#FAFAF8', color: '#52525B', border: '1px solid #E6E4DE' } },
        ].map((chip) => (
          <span key={chip.label} className="inline-flex px-3 py-1 rounded-full text-xs font-semibold" style={chip.style}>
            {chip.label}
          </span>
        ))}
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-xl px-4 py-3 flex items-center gap-3 flex-wrap" style={{ border: '1px solid #E6E4DE' }}>
        <div className="relative flex-1 min-w-48">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, username or email…"
            className="w-full pl-8 pr-3 py-2 text-sm text-zinc-800 rounded-lg outline-none placeholder-zinc-300"
            style={inputBase}
          />
        </div>
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="appearance-none pl-3 pr-7 py-2 text-sm text-zinc-700 rounded-lg outline-none bg-white"
            style={inputBase}
          >
            <option value="">All Status</option>
            <option>Active</option>
            <option>Inactive</option>
          </select>
          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
        </div>
        {(search || statusFilter) && (
          <button onClick={() => { setSearch(''); setStatusFilter(''); }} className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-600 transition-colors">
            <X size={13} /> Clear
          </button>
        )}
      </div>

      <p className="text-xs text-zinc-400"><span className="font-medium text-zinc-600">{filtered.length}</span> people</p>

      {/* Table */}
      <div className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid #E6E4DE' }}>
        {filtered.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3">
            <Users size={28} className="text-zinc-200" />
            <div className="text-center">
              <p className="text-sm font-medium text-zinc-500">No people found</p>
              <p className="text-xs text-zinc-400 mt-1">{search ? 'Try a different search term.' : 'Add your first person to get started.'}</p>
            </div>
            {!search && (
              <button
                onClick={() => setShowAdd(true)}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white rounded-xl transition-colors mt-1"
                style={{ background: '#166634' }}
              >
                <Plus size={14} /> Add Person
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: '#FAFAF8', borderBottom: '1px solid #F0EFE9' }}>
                    {['Person', 'Username', 'Email', 'Status', 'Created', ''].map((h) => (
                      <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-zinc-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => (
                    <tr
                      key={p.id}
                      className="transition-colors cursor-pointer"
                      style={{ borderBottom: '1px solid #F4F3F0' }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = '#FAFAF8'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = ''; }}
                      onClick={() => setViewingPerson(p)}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar firstName={p.firstName} lastName={p.lastName} size="sm" />
                          <span className="font-medium text-zinc-800">{getFullName(p)}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="font-mono text-xs text-zinc-500">{p.username}</span>
                      </td>
                      <td className="px-5 py-4 text-zinc-500 text-xs truncate max-w-48">{p.email}</td>
                      <td className="px-5 py-4"><StatusPill status={p.status} /></td>
                      <td className="px-5 py-4 text-xs text-zinc-400 font-mono">
                        {new Date(p.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu items={getMenuItems(p)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-stone-50">
              {filtered.map((p) => (
                <div key={p.id} className="px-4 py-4 flex items-center gap-3" onClick={() => setViewingPerson(p)}>
                  <Avatar firstName={p.firstName} lastName={p.lastName} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-zinc-800">{getFullName(p)}</p>
                    <p className="text-xs font-mono text-zinc-400">{p.username}</p>
                    <div className="mt-1.5"><StatusPill status={p.status} /></div>
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu items={getMenuItems(p)} />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-xs text-zinc-400">
        <span>{filtered.length} of {people.length}</span>
        <div className="flex gap-1">
          <button className="px-3 py-1.5 rounded-lg border border-stone-200 text-zinc-500 hover:bg-stone-50 disabled:opacity-40" disabled>Prev</button>
          <button className="px-3 py-1.5 rounded-lg border border-stone-200 text-zinc-500 hover:bg-stone-50 disabled:opacity-40" disabled>Next</button>
        </div>
      </div>

      {/* Add Person drawer */}
      <AddPersonDrawer
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onCreated={(creds) => setCredentials(creds)}
        onAddPerson={onAddPerson}
        existingUsernames={people.map((p) => p.username)}
      />

      {/* Credential panel */}
      {credentials && (
        <CredentialPanel
          credentials={credentials}
          onDone={() => { setCredentials(null); setNewCredPerson(null); }}
        />
      )}

      {/* Person detail drawer */}
      <PersonDetailDrawer
        person={viewingPerson}
        onClose={() => setViewingPerson(null)}
        onDeactivate={(p) => { setDeactivatingPerson(p); setViewingPerson(null); }}
        onReactivate={(p) => { setReactivatingPerson(p); setViewingPerson(null); }}
        onGenerateCredentials={handleGenerateCredentials}
      />

      {/* Deactivate modal */}
      <Modal open={!!deactivatingPerson} onClose={() => setDeactivatingPerson(null)} title="Deactivate Person?" subtitle="This action can be reversed at any time.">
        <div className="space-y-4">
          <p className="text-sm text-zinc-500 leading-relaxed">
            <strong className="text-zinc-700">{deactivatingPerson ? getFullName(deactivatingPerson) : ''}</strong> will lose access to the attendance system immediately. Historical records will be preserved.
          </p>
          <div className="flex gap-3">
            <button onClick={() => setDeactivatingPerson(null)} className="flex-1 py-2.5 text-sm font-medium text-zinc-600 rounded-xl transition-colors" style={{ border: '1px solid #E6E4DE' }}>Cancel</button>
            <button onClick={() => deactivatingPerson && handleDeactivate(deactivatingPerson)} className="flex-1 py-2.5 text-sm font-semibold text-white rounded-xl transition-colors" style={{ background: '#DC2626' }}>Deactivate</button>
          </div>
        </div>
      </Modal>

      {/* Reactivate modal */}
      <Modal open={!!reactivatingPerson} onClose={() => setReactivatingPerson(null)} title="Reactivate Person?">
        <div className="space-y-4">
          <p className="text-sm text-zinc-500 leading-relaxed">
            <strong className="text-zinc-700">{reactivatingPerson ? getFullName(reactivatingPerson) : ''}</strong> will regain full access to the attendance system.
          </p>
          <div className="flex gap-3">
            <button onClick={() => setReactivatingPerson(null)} className="flex-1 py-2.5 text-sm font-medium text-zinc-600 rounded-xl transition-colors" style={{ border: '1px solid #E6E4DE' }}>Cancel</button>
            <button onClick={() => reactivatingPerson && handleReactivate(reactivatingPerson)} className="flex-1 py-2.5 text-sm font-semibold text-white rounded-xl transition-colors" style={{ background: '#166634' }}>Reactivate</button>
          </div>
        </div>
      </Modal>

      {/* New credentials confirm */}
      <Modal open={!!newCredPerson && !credentials} onClose={() => setNewCredPerson(null)} title="Generate New Credentials?" subtitle="Read carefully before proceeding.">
        <div className="space-y-4">
          <div className="flex gap-2.5 px-3.5 py-3 rounded-xl" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
            <AlertTriangle size={15} className="text-amber-500 shrink-0 mt-px" />
            <p className="text-xs text-amber-700 leading-relaxed">
              Generating new credentials will immediately invalidate the previous password. The person will need to use the new temporary password to log in.
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setNewCredPerson(null)} className="flex-1 py-2.5 text-sm font-medium text-zinc-600 rounded-xl" style={{ border: '1px solid #E6E4DE' }}>Cancel</button>
            <button
              onClick={() => { if (newCredPerson) handleGenerateCredentials(newCredPerson); }}
              className="flex-1 py-2.5 text-sm font-semibold text-white rounded-xl flex items-center justify-center gap-2"
              style={{ background: '#166634' }}
            >
              <RefreshCw size={14} /> Generate
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
