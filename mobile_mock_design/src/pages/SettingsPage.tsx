import { useState } from 'react';
import { Save, Building2, Clock, Info } from 'lucide-react';

interface SettingsPageProps {
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

const TIMEZONES = ['Asia/Manila', 'Asia/Singapore', 'Asia/Tokyo', 'Asia/Bangkok', 'Asia/Kuala_Lumpur', 'UTC', 'America/New_York', 'America/Los_Angeles', 'Europe/London'];
const GRACE_OPTIONS = ['0', '5', '10', '15', '20', '30'];

const inputStyle = {
  border: '1px solid #E6E4DE',
  background: '#FFFFFF',
  boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.03)',
};

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6 py-5" style={{ borderBottom: '1px solid #F4F3F0' }}>
      <div>
        <p className="text-sm font-semibold text-zinc-700">{label}</p>
        {hint && <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">{hint}</p>}
      </div>
      <div className="md:col-span-2">{children}</div>
    </div>
  );
}

export default function SettingsPage({ showToast }: SettingsPageProps) {
  const [orgName, setOrgName] = useState('Example Company Inc.');
  const [timezone, setTimezone] = useState('Asia/Manila');
  const [workStart, setWorkStart] = useState('08:00');
  const [workEnd, setWorkEnd] = useState('17:00');
  const [gracePeriod, setGracePeriod] = useState('10');
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const mark = <T,>(setter: (v: T) => void) => (v: T) => { setter(v); setDirty(true); };

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 900));
    setSaving(false);
    setDirty(false);
    showToast('Settings saved successfully.', 'success');
  };

  const cls = 'w-full px-3.5 py-2.5 text-sm text-zinc-800 rounded-xl outline-none transition-all placeholder-zinc-300 max-w-xs';

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 tracking-tight">Settings</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Configure system preferences for your organization</p>
      </div>

      {/* Organization */}
      <section className="bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid #E6E4DE' }}>
        <div className="flex items-center gap-3 px-6 py-5" style={{ borderBottom: '1px solid #F4F3F0' }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#F4F3F0' }}>
            <Building2 size={15} className="text-zinc-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-800">Organization</p>
            <p className="text-xs text-zinc-400">Basic organization configuration</p>
          </div>
        </div>
        <div className="px-6">
          <Field label="Organization Name" hint="Displayed in reports and the attendance interface.">
            <input
              value={orgName}
              onChange={(e) => mark(setOrgName)(e.target.value)}
              className={cls}
              style={inputStyle}
            />
          </Field>
          <Field label="Timezone" hint="All times are shown relative to this timezone.">
            <select
              value={timezone}
              onChange={(e) => mark(setTimezone)(e.target.value)}
              className={`${cls} appearance-none bg-white`}
              style={inputStyle}
            >
              {TIMEZONES.map((tz) => <option key={tz}>{tz}</option>)}
            </select>
          </Field>
        </div>
      </section>

      {/* Attendance Rules */}
      <section className="bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid #E6E4DE' }}>
        <div className="flex items-center gap-3 px-6 py-5" style={{ borderBottom: '1px solid #F4F3F0' }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#F4F3F0' }}>
            <Clock size={15} className="text-zinc-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-800">Attendance Rules</p>
            <p className="text-xs text-zinc-400">Define work hours and late arrival thresholds</p>
          </div>
        </div>
        <div className="px-6">
          <Field label="Work Start Time" hint="Official start of the workday.">
            <input
              type="time"
              value={workStart}
              onChange={(e) => mark(setWorkStart)(e.target.value)}
              className={cls}
              style={inputStyle}
            />
          </Field>
          <Field label="Work End Time" hint="Official end of the workday.">
            <input
              type="time"
              value={workEnd}
              onChange={(e) => mark(setWorkEnd)(e.target.value)}
              className={cls}
              style={inputStyle}
            />
          </Field>
          <Field label="Grace Period" hint="Minutes after Work Start Time before a Time In is considered late.">
            <div className="flex items-center gap-3 max-w-xs">
              <select
                value={gracePeriod}
                onChange={(e) => mark(setGracePeriod)(e.target.value)}
                className={`${cls} appearance-none bg-white`}
                style={{ ...inputStyle, maxWidth: '120px' }}
              >
                {GRACE_OPTIONS.map((o) => <option key={o} value={o}>{o} {o === '1' ? 'minute' : 'minutes'}</option>)}
              </select>
              <div className="flex items-start gap-1.5 text-xs text-zinc-400 flex-1">
                <Info size={12} className="mt-0.5 shrink-0" />
                <span>After {workStart ? workStart : '8:00'} + {gracePeriod}m = marked Late</span>
              </div>
            </div>
          </Field>
        </div>
      </section>

      {/* Save bar */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving || !dirty}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white rounded-xl transition-all disabled:opacity-50"
          style={{ background: '#166634' }}
          onMouseEnter={(e) => { if (!saving && dirty) (e.currentTarget as HTMLButtonElement).style.background = '#14532D'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#166634'; }}
        >
          {saving ? (
            <><svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Saving…</>
          ) : (
            <><Save size={14} /> Save Settings</>
          )}
        </button>
        {dirty && !saving && <p className="text-xs text-amber-600 font-medium">You have unsaved changes</p>}
        {!dirty && !saving && <p className="text-xs text-zinc-400">All changes saved</p>}
      </div>
    </div>
  );
}
