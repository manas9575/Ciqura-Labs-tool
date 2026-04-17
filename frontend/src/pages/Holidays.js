import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Plus, Trash, CalendarBlank } from '@phosphor-icons/react';

export default function Holidays() {
  const { user } = useAuth();
  const [holidays, setHolidays] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ date: '', name: '', description: '' });
  const isAdmin = ['super_admin', 'admin'].includes(user?.role);

  const load = () => api.get('/holidays').then(r => setHolidays(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    await api.post('/holidays', form);
    setOpen(false);
    setForm({ date: '', name: '', description: '' });
    load();
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this holiday?')) { await api.delete(`/holidays/${id}`); load(); }
  };

  const now = new Date();
  const upcoming = holidays.filter(h => new Date(h.date) >= new Date(now.toISOString().slice(0, 10)));
  const past = holidays.filter(h => new Date(h.date) < new Date(now.toISOString().slice(0, 10)));

  return (
    <div data-testid="holidays-page">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)', fontFamily: 'Outfit' }}>Holidays & Calendar</h1>
        {isAdmin && (
          <button onClick={() => setOpen(true)} data-testid="add-holiday-btn"
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white transition-colors duration-150"
            style={{ background: 'var(--brand)', fontFamily: 'IBM Plex Sans' }}>
            <Plus size={16} /> Add Holiday
          </button>
        )}
      </div>

      {upcoming.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-medium tracking-tight mb-3" style={{ color: 'var(--text-primary)', fontFamily: 'Outfit' }}>Upcoming Holidays</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {upcoming.map(h => (
              <div key={h.holiday_id} data-testid={`holiday-${h.holiday_id}`} className="border p-4 flex items-start justify-between" style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}>
                <div className="flex items-start gap-3">
                  <div className="text-center min-w-[48px] p-2 border" style={{ borderColor: 'var(--brand)', background: 'var(--surface)' }}>
                    <span className="text-lg font-bold block" style={{ color: 'var(--brand)', fontFamily: 'Outfit' }}>{new Date(h.date).getDate()}</span>
                    <span className="text-xs uppercase" style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>{new Date(h.date).toLocaleString('default', { month: 'short' })}</span>
                  </div>
                  <div>
                    <h3 className="font-medium text-sm" style={{ color: 'var(--text-primary)', fontFamily: 'IBM Plex Sans' }}>{h.name}</h3>
                    {h.description && <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>{h.description}</p>}
                    <span className="text-xs" style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>{new Date(h.date).toLocaleDateString('en-US', { weekday: 'long' })}</span>
                  </div>
                </div>
                {isAdmin && (
                  <button onClick={() => handleDelete(h.holiday_id)} className="p-1 ml-2" style={{ color: 'var(--alert)' }}><Trash size={14} /></button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {past.length > 0 && (
        <div>
          <h2 className="text-lg font-medium tracking-tight mb-3" style={{ color: 'var(--text-secondary)', fontFamily: 'Outfit' }}>Past Holidays</h2>
          <div className="border" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
            {past.map(h => (
              <div key={h.holiday_id} className="flex items-center justify-between px-4 py-2 border-b last:border-0 opacity-60" style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-3 text-sm" style={{ fontFamily: 'IBM Plex Sans' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{h.date}</span>
                  <span style={{ color: 'var(--text-primary)' }}>{h.name}</span>
                </div>
                {isAdmin && <button onClick={() => handleDelete(h.holiday_id)} className="p-1" style={{ color: 'var(--alert)' }}><Trash size={14} /></button>}
              </div>
            ))}
          </div>
        </div>
      )}

      {holidays.length === 0 && (
        <div className="text-center py-12 border" style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}>
          <CalendarBlank size={32} style={{ color: 'var(--text-secondary)', margin: '0 auto' }} />
          <p className="text-sm mt-3" style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>No holidays scheduled.</p>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent style={{ background: 'var(--bg)' }}>
          <DialogHeader><DialogTitle style={{ fontFamily: 'Outfit' }}>Add Holiday</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-xs uppercase tracking-widest font-medium mb-1 block" style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>Date</label>
              <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} data-testid="holiday-date-input"
                className="w-full px-3 py-2 border text-sm bg-transparent outline-none" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)', fontFamily: 'IBM Plex Sans' }} />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest font-medium mb-1 block" style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>Holiday Name</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} data-testid="holiday-name-input"
                className="w-full px-3 py-2 border text-sm bg-transparent outline-none" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)', fontFamily: 'IBM Plex Sans' }} placeholder="e.g. Republic Day" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest font-medium mb-1 block" style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>Description (optional)</label>
              <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} data-testid="holiday-desc-input"
                className="w-full px-3 py-2 border text-sm bg-transparent outline-none" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)', fontFamily: 'IBM Plex Sans' }} />
            </div>
            <button onClick={handleSave} data-testid="save-holiday-btn" className="w-full py-2.5 text-sm font-medium text-white" style={{ background: 'var(--brand)', fontFamily: 'IBM Plex Sans' }}>Add Holiday</button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
