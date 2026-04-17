import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Plus, Trash, Check, X, CalendarCheck, UserCircle } from '@phosphor-icons/react';

export default function Leaves() {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState([]);
  const [facultyAvail, setFacultyAvail] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ date: '', reason: '' });
  const [tab, setTab] = useState('leaves');
  const isFaculty = user?.role === 'faculty';
  const isAdmin = ['super_admin', 'admin'].includes(user?.role);
  const isStudent = user?.role === 'student';

  const load = () => {
    if (!isStudent) {
      api.get('/leaves').then(r => setLeaves(r.data)).catch(() => {});
    }
    api.get('/faculty/availability').then(r => setFacultyAvail(r.data)).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const handleApply = async () => {
    await api.post('/leaves', form);
    setOpen(false);
    setForm({ date: '', reason: '' });
    load();
  };

  const handleStatus = async (leaveId, status) => {
    await api.put(`/leaves/${leaveId}/status`, { status });
    load();
  };

  const handleDelete = async (leaveId) => {
    await api.delete(`/leaves/${leaveId}`);
    load();
  };

  const statusColors = { pending: 'var(--warning)', approved: 'var(--success)', rejected: 'var(--alert)' };

  // Generate calendar days for current month
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const monthName = now.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div data-testid="leaves-page">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)', fontFamily: 'Outfit' }}>
          {isStudent ? 'Faculty Availability' : 'Leave Management'}
        </h1>
        {isFaculty && (
          <button onClick={() => setOpen(true)} data-testid="apply-leave-btn"
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white transition-colors duration-150"
            style={{ background: 'var(--brand)', fontFamily: 'IBM Plex Sans' }}>
            <Plus size={16} /> Apply Leave
          </button>
        )}
      </div>

      {!isStudent && (
        <div className="flex gap-0 border-b mb-6" style={{ borderColor: 'var(--border)' }}>
          {[{ id: 'leaves', label: 'Leave Requests' }, { id: 'calendar', label: 'Faculty Calendar' }].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} data-testid={`ltab-${t.id}`}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors duration-150 ${tab === t.id ? 'border-[var(--brand)]' : 'border-transparent'}`}
              style={{ color: tab === t.id ? 'var(--brand)' : 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* Leave Requests Table */}
      {!isStudent && tab === 'leaves' && (
        <div className="border" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
          <table className="w-full text-sm" style={{ fontFamily: 'IBM Plex Sans' }}>
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                {['Faculty', 'Date', 'Reason', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs uppercase tracking-widest font-medium" style={{ color: 'var(--text-secondary)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leaves.map(l => (
                <tr key={l.leave_id} className="border-b last:border-0 transition-colors duration-150 hover:bg-[var(--surface)]" style={{ borderColor: 'var(--border)' }}>
                  <td className="px-4 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>{l.user_name}</td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{l.date}</td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{l.reason || '-'}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 text-xs font-medium uppercase border" style={{ borderColor: statusColors[l.status], color: statusColors[l.status] }}>{l.status}</span>
                  </td>
                  <td className="px-4 py-3 flex gap-1">
                    {isAdmin && l.status === 'pending' && (
                      <>
                        <button onClick={() => handleStatus(l.leave_id, 'approved')} data-testid={`approve-${l.leave_id}`}
                          className="p-1 transition-colors duration-150" style={{ color: 'var(--success)' }}><Check size={16} weight="bold" /></button>
                        <button onClick={() => handleStatus(l.leave_id, 'rejected')} data-testid={`reject-${l.leave_id}`}
                          className="p-1 transition-colors duration-150" style={{ color: 'var(--alert)' }}><X size={16} weight="bold" /></button>
                      </>
                    )}
                    {(l.user_id === user?.user_id || isAdmin) && (
                      <button onClick={() => handleDelete(l.leave_id)} className="p-1" style={{ color: 'var(--alert)' }}><Trash size={14} /></button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {leaves.length === 0 && <div className="text-center py-12 text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>No leave requests.</div>}
        </div>
      )}

      {/* Faculty Calendar / Availability (visible to all including students) */}
      {(isStudent || tab === 'calendar') && (
        <div>
          {/* Calendar grid for current month */}
          <div className="border mb-6" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
            <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
              <h3 className="text-lg font-medium tracking-tight" style={{ color: 'var(--text-primary)', fontFamily: 'Outfit' }}>{monthName}</h3>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-7 gap-px mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                  <div key={d} className="text-center text-xs uppercase tracking-widest font-medium py-1" style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-px" style={{ background: 'var(--border)' }}>
                {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} className="p-2" style={{ background: 'var(--bg)' }} />)}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const isToday = day === now.getDate();
                  const onLeave = facultyAvail.filter(f => f.leaves?.some(l => l.date === dateStr && l.status === 'approved'));
                  const hasLeaves = onLeave.length > 0;
                  return (
                    <div key={day} className="p-2 min-h-[60px] relative" style={{ background: isToday ? 'var(--surface)' : 'var(--bg)', borderLeft: isToday ? '2px solid var(--brand)' : 'none' }}>
                      <span className="text-xs font-medium" style={{ color: isToday ? 'var(--brand)' : 'var(--text-primary)', fontFamily: 'IBM Plex Sans' }}>{day}</span>
                      {hasLeaves && (
                        <div className="mt-0.5">
                          {onLeave.slice(0, 2).map(f => (
                            <div key={f.user_id} className="text-xs truncate px-1 py-0.5 mb-0.5" style={{ background: 'var(--alert)', color: 'white', fontSize: '9px' }}>
                              {f.name} - Leave
                            </div>
                          ))}
                          {onLeave.length > 2 && <span className="text-xs" style={{ color: 'var(--text-secondary)', fontSize: '9px' }}>+{onLeave.length - 2} more</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Faculty availability list */}
          <h3 className="text-lg font-medium tracking-tight mb-3" style={{ color: 'var(--text-primary)', fontFamily: 'Outfit' }}>Faculty Status Today</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {facultyAvail.map(f => (
              <div key={f.user_id} data-testid={`faculty-avail-${f.user_id}`}
                className="border p-4 flex items-center gap-3" style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}>
                <div className="w-10 h-10 flex items-center justify-center text-white text-sm font-bold shrink-0" style={{ background: f.available_today ? 'var(--success)' : 'var(--alert)' }}>
                  {f.name?.[0]}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate" style={{ color: 'var(--text-primary)', fontFamily: 'IBM Plex Sans' }}>{f.name}</p>
                  <p className="text-xs" style={{ color: f.available_today ? 'var(--success)' : 'var(--alert)', fontFamily: 'IBM Plex Sans' }}>
                    {f.available_today ? 'Available Today' : 'On Leave Today'}
                  </p>
                  {f.availability && <p className="text-xs truncate" style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>{f.availability}</p>}
                </div>
              </div>
            ))}
            {facultyAvail.length === 0 && <p className="text-sm col-span-full" style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>No faculty found.</p>}
          </div>
        </div>
      )}

      {/* Apply Leave Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent style={{ background: 'var(--bg)' }}>
          <DialogHeader><DialogTitle style={{ fontFamily: 'Outfit' }}>Apply for Leave</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-xs uppercase tracking-widest font-medium mb-1 block" style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>Date</label>
              <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} data-testid="leave-date-input"
                className="w-full px-3 py-2 border text-sm bg-transparent outline-none" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)', fontFamily: 'IBM Plex Sans' }} />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest font-medium mb-1 block" style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>Reason</label>
              <input value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} data-testid="leave-reason-input" placeholder="Optional"
                className="w-full px-3 py-2 border text-sm bg-transparent outline-none" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)', fontFamily: 'IBM Plex Sans' }} />
            </div>
            <button onClick={handleApply} data-testid="submit-leave-btn"
              className="w-full py-2.5 text-sm font-medium text-white" style={{ background: 'var(--brand)', fontFamily: 'IBM Plex Sans' }}>Apply Leave</button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
