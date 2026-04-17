import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Plus, Pencil, Trash } from '@phosphor-icons/react';

export default function Courses() {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', duration: '', fee_structure: '', cover_image: '' });
  const isAdmin = ['super_admin', 'admin'].includes(user?.role);

  const load = () => api.get('/courses').then(r => setCourses(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    const payload = { ...form, fee_structure: parseFloat(form.fee_structure) || 0 };
    if (editing) {
      await api.put(`/courses/${editing}`, payload);
    } else {
      await api.post('/courses', payload);
    }
    setOpen(false);
    setEditing(null);
    setForm({ name: '', description: '', duration: '', fee_structure: '', cover_image: '' });
    load();
  };

  const handleEdit = (c) => {
    setEditing(c.course_id);
    setForm({ name: c.name, description: c.description, duration: c.duration, fee_structure: c.fee_structure, cover_image: c.cover_image });
    setOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this course?')) {
      await api.delete(`/courses/${id}`);
      load();
    }
  };

  const coverImages = {
    'AIML': 'https://images.unsplash.com/photo-1674027444636-ce7379d51252?w=400',
    'Cybersecurity': 'https://images.unsplash.com/photo-1654588831833-6658f38580dc?w=400',
    'Python': 'https://images.unsplash.com/photo-1660616246653-e2c57d1077b9?w=400',
  };

  return (
    <div data-testid="courses-page">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)', fontFamily: 'Outfit' }}>
          {isAdmin ? 'Course Management' : 'My Courses'}
        </h1>
        {isAdmin && (
          <button onClick={() => { setEditing(null); setForm({ name: '', description: '', duration: '', fee_structure: '', cover_image: '' }); setOpen(true); }}
            data-testid="add-course-btn"
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white transition-colors duration-150"
            style={{ background: 'var(--brand)', fontFamily: 'IBM Plex Sans' }}>
            <Plus size={16} /> Add Course
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {courses.map(c => (
          <div key={c.course_id} data-testid={`course-card-${c.course_id}`} className="border overflow-hidden" style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}>
            <div className="h-40 bg-cover bg-center" style={{ backgroundImage: `url(${c.cover_image || coverImages[c.name] || 'https://images.unsplash.com/photo-1674027444636-ce7379d51252?w=400'})` }} />
            <div className="p-4">
              <h3 className="text-lg font-medium tracking-tight mb-1" style={{ color: 'var(--text-primary)', fontFamily: 'Outfit' }}>{c.name}</h3>
              <p className="text-sm mb-3 line-clamp-2" style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>{c.description}</p>
              <div className="flex items-center justify-between text-sm" style={{ fontFamily: 'IBM Plex Sans' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{c.duration}</span>
                <span className="font-medium" style={{ color: 'var(--brand)' }}>${c.fee_structure}</span>
              </div>
              {isAdmin && (
                <div className="flex gap-2 mt-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                  <button onClick={() => handleEdit(c)} data-testid={`edit-course-${c.course_id}`} className="flex items-center gap-1 px-3 py-1.5 text-xs border transition-colors duration-150 hover:bg-[var(--surface)]" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>
                    <Pencil size={12} /> Edit
                  </button>
                  <button onClick={() => handleDelete(c.course_id)} data-testid={`delete-course-${c.course_id}`} className="flex items-center gap-1 px-3 py-1.5 text-xs border transition-colors duration-150 hover:bg-[var(--surface)]" style={{ borderColor: 'var(--border)', color: 'var(--alert)', fontFamily: 'IBM Plex Sans' }}>
                    <Trash size={12} /> Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        {courses.length === 0 && (
          <div className="col-span-full text-center py-12" style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>
            No courses yet. {isAdmin && 'Click "Add Course" to create one.'}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Outfit' }}>{editing ? 'Edit Course' : 'New Course'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {[
              { key: 'name', label: 'Course Name', placeholder: 'e.g. AIML' },
              { key: 'description', label: 'Description', placeholder: 'Course description', textarea: true },
              { key: 'duration', label: 'Duration', placeholder: 'e.g. 6 months' },
              { key: 'fee_structure', label: 'Fee ($)', placeholder: '0', type: 'number' },
              { key: 'cover_image', label: 'Cover Image URL', placeholder: 'https://...' },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs uppercase tracking-widest font-medium mb-1 block" style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>{f.label}</label>
                {f.textarea ? (
                  <textarea value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                    data-testid={`course-${f.key}-input`}
                    className="w-full px-3 py-2 border text-sm bg-transparent outline-none" rows={3}
                    style={{ borderColor: 'var(--border)', color: 'var(--text-primary)', fontFamily: 'IBM Plex Sans' }} placeholder={f.placeholder} />
                ) : (
                  <input value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                    data-testid={`course-${f.key}-input`} type={f.type || 'text'}
                    className="w-full px-3 py-2 border text-sm bg-transparent outline-none"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-primary)', fontFamily: 'IBM Plex Sans' }} placeholder={f.placeholder} />
                )}
              </div>
            ))}
            <button onClick={handleSave} data-testid="save-course-btn"
              className="w-full py-2.5 text-sm font-medium text-white transition-colors duration-150"
              style={{ background: 'var(--brand)', fontFamily: 'IBM Plex Sans' }}>
              {editing ? 'Update Course' : 'Create Course'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
