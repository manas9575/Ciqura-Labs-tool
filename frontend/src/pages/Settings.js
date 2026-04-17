import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';

export default function Settings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState({ institute_name: '', logo_url: '', primary_color: '#002FA7', theme: 'light' });
  const [saving, setSaving] = useState(false);
  const isSuperAdmin = user?.role === 'super_admin';

  useEffect(() => {
    api.get('/settings').then(r => setSettings(r.data)).catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    await api.put('/settings', settings);
    setSaving(false);
  };

  return (
    <div data-testid="settings-page">
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-6" style={{ color: 'var(--text-primary)', fontFamily: 'Outfit' }}>Institute Settings</h1>

      <div className="border max-w-2xl" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
        <div className="p-6 space-y-6">
          <div>
            <label className="text-xs uppercase tracking-widest font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>Institute Name</label>
            <input value={settings.institute_name} onChange={e => setSettings({ ...settings, institute_name: e.target.value })}
              disabled={!isSuperAdmin} data-testid="settings-name-input"
              className="w-full px-3 py-2.5 border text-sm bg-transparent outline-none disabled:opacity-50"
              style={{ borderColor: 'var(--border)', color: 'var(--text-primary)', fontFamily: 'IBM Plex Sans' }} />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>Logo URL</label>
            <input value={settings.logo_url} onChange={e => setSettings({ ...settings, logo_url: e.target.value })}
              disabled={!isSuperAdmin} data-testid="settings-logo-input"
              className="w-full px-3 py-2.5 border text-sm bg-transparent outline-none disabled:opacity-50"
              style={{ borderColor: 'var(--border)', color: 'var(--text-primary)', fontFamily: 'IBM Plex Sans' }} />
            {settings.logo_url && (
              <img src={settings.logo_url} alt="Logo preview" className="mt-2 h-16 object-contain" />
            )}
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>Primary Color</label>
            <div className="flex items-center gap-3">
              <input type="color" value={settings.primary_color} onChange={e => setSettings({ ...settings, primary_color: e.target.value })}
                disabled={!isSuperAdmin} data-testid="settings-color-input" className="w-10 h-10 border cursor-pointer" style={{ borderColor: 'var(--border)' }} />
              <input value={settings.primary_color} onChange={e => setSettings({ ...settings, primary_color: e.target.value })}
                disabled={!isSuperAdmin} className="px-3 py-2 border text-sm bg-transparent outline-none w-32"
                style={{ borderColor: 'var(--border)', color: 'var(--text-primary)', fontFamily: 'IBM Plex Sans' }} />
            </div>
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>Theme</label>
            <select value={settings.theme} onChange={e => setSettings({ ...settings, theme: e.target.value })}
              disabled={!isSuperAdmin} data-testid="settings-theme-select"
              className="px-3 py-2.5 border text-sm bg-transparent outline-none" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)', fontFamily: 'IBM Plex Sans' }}>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>

          {isSuperAdmin && (
            <button onClick={handleSave} disabled={saving} data-testid="save-settings-btn"
              className="px-6 py-2.5 text-sm font-medium text-white transition-colors duration-150"
              style={{ background: 'var(--brand)', fontFamily: 'IBM Plex Sans' }}>
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          )}
          {!isSuperAdmin && (
            <p className="text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>Only Super Admin can modify settings.</p>
          )}
        </div>
      </div>
    </div>
  );
}
