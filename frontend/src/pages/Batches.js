import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Plus, Trash } from '@phosphor-icons/react';

export default function Batches() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [batches, setBatches] = useState([]);
  const [courses, setCourses] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ course_id: '', name: '', start_date: '', end_date: '', faculty_id: '', schedule: '' });
  const isAdmin = ['super_admin', 'admin'].includes(user?.role);

  const load = () => {
    api.get('/batches').then(r => setBatches(r.data)).catch(() => {});
    if (isAdmin) {
      api.get('/courses').then(r => setCourses(r.data)).catch(() => {});
      api.get('/users?role=faculty').then(r => setFaculty(r.data)).catch(() => {});
    }
  };
  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    await api.post('/batches', form);
    setOpen(false);
    setForm({ course_id: '', name: '', start_date: '', end_date: '', faculty_id: '', schedule: '' });
    load();
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this batch?')) { await api.delete(`/batches/${id}`); load(); }
  };

  return (
    <div data-testid="batches-page">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)', fontFamily: 'Outfit' }}>
          {user?.role === 'faculty' ? 'My Batches' : 'Batch Management'}
        </h1>
        {isAdmin && (
          <button onClick={() => setOpen(true)} data-testid="add-batch-btn"
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white transition-colors duration-150"
            style={{ background: 'var(--brand)', fontFamily: 'IBM Plex Sans' }}>
            <Plus size={16} /> Add Batch
          </button>
        )}
      </div>

      <div className="border" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
        <table className="w-full text-sm" style={{ fontFamily: 'IBM Plex Sans' }}>
          <thead>
            <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
              {['Batch', 'Course', 'Faculty', 'Schedule', 'Period', 'Students', isAdmin && 'Actions'].filter(Boolean).map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs uppercase tracking-widest font-medium" style={{ color: 'var(--text-secondary)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {batches.map(b => (
              <tr key={b.batch_id} className="border-b last:border-0 transition-colors duration-150 hover:bg-[var(--surface)] cursor-pointer" style={{ borderColor: 'var(--border)' }}
                onClick={() => navigate(`/batches/${b.batch_id}`)}>
                <td className="px-4 py-3 font-medium" style={{ color: 'var(--brand)' }}>
                  {b.name} {b.display_id && <span className="text-xs font-mono ml-1 px-1 py-0.5 border" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>{b.display_id}</span>}
                </td>
                <td className="px-4 py-3" style={{ color: 'var(--brand)' }}>{b.course_name}</td>
                <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{b.faculty_name}</td>
                <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{b.schedule}</td>
                <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{b.start_date?.slice(0, 10)} - {b.end_date?.slice(0, 10)}</td>
                <td className="px-4 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>{b.student_count}</td>
                {isAdmin && (
                  <td className="px-4 py-3">
                    <button onClick={() => handleDelete(b.batch_id)} data-testid={`delete-batch-${b.batch_id}`}
                      className="p-1 transition-colors duration-150 hover:bg-[var(--surface)]" style={{ color: 'var(--alert)' }}>
                      <Trash size={16} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {batches.length === 0 && (
          <div className="text-center py-12 text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>No batches found.</div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent style={{ background: 'var(--bg)' }}>
          <DialogHeader><DialogTitle style={{ fontFamily: 'Outfit' }}>New Batch</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-xs uppercase tracking-widest font-medium mb-1 block" style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>Course</label>
              <select value={form.course_id} onChange={e => setForm({ ...form, course_id: e.target.value })} data-testid="batch-course-select"
                className="w-full px-3 py-2 border text-sm bg-transparent outline-none" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)', fontFamily: 'IBM Plex Sans' }}>
                <option value="">Select course</option>
                {courses.map(c => <option key={c.course_id} value={c.course_id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest font-medium mb-1 block" style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>Faculty</label>
              <select value={form.faculty_id} onChange={e => setForm({ ...form, faculty_id: e.target.value })} data-testid="batch-faculty-select"
                className="w-full px-3 py-2 border text-sm bg-transparent outline-none" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)', fontFamily: 'IBM Plex Sans' }}>
                <option value="">Select faculty</option>
                {faculty.map(f => <option key={f.user_id} value={f.user_id}>{f.name}</option>)}
              </select>
            </div>
            {[
              { key: 'name', label: 'Batch Name', placeholder: 'e.g. Batch A - Jan 2026' },
              { key: 'start_date', label: 'Start Date', type: 'date' },
              { key: 'end_date', label: 'End Date', type: 'date' },
              { key: 'schedule', label: 'Schedule', placeholder: 'e.g. Mon, Wed, Fri 10:00-12:00' },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs uppercase tracking-widest font-medium mb-1 block" style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>{f.label}</label>
                <input value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} type={f.type || 'text'}
                  data-testid={`batch-${f.key}-input`}
                  className="w-full px-3 py-2 border text-sm bg-transparent outline-none"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-primary)', fontFamily: 'IBM Plex Sans' }} placeholder={f.placeholder || ''} />
              </div>
            ))}
            <button onClick={handleSave} data-testid="save-batch-btn"
              className="w-full py-2.5 text-sm font-medium text-white transition-colors duration-150"
              style={{ background: 'var(--brand)', fontFamily: 'IBM Plex Sans' }}>Create Batch</button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
