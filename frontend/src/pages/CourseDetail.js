import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { ArrowLeft, Plus, Trash, LinkSimple, Users, BookOpen, FolderOpen, ClipboardText } from '@phosphor-icons/react';

export default function CourseDetail() {
  const { courseId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('overview');
  const [batchFilter, setBatchFilter] = useState('');
  const [resOpen, setResOpen] = useState(false);
  const [resForm, setResForm] = useState({ title: '', url: '', type: 'link' });
  const canEdit = ['super_admin', 'admin', 'faculty'].includes(user?.role);

  const load = () => api.get(`/courses/${courseId}/detail`).then(r => setData(r.data)).catch(() => navigate('/courses'));
  useEffect(() => { load(); }, [courseId]);

  const addResource = async () => {
    await api.post(`/courses/${courseId}/resources`, { ...resForm, course_id: courseId });
    setResOpen(false);
    setResForm({ title: '', url: '', type: 'link' });
    load();
  };

  const deleteResource = async (rid) => {
    await api.delete(`/courses/${courseId}/resources/${rid}`);
    load();
  };

  if (!data) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--brand)', borderTopColor: 'transparent' }} /></div>;

  const filteredStudents = batchFilter ? data.students.filter(s => s.batch_id === batchFilter) : data.students;
  const tabs = [
    { id: 'overview', label: 'Overview', icon: BookOpen },
    { id: 'students', label: `Students (${data.total_students})`, icon: Users },
    { id: 'materials', label: `Materials (${data.materials?.length || 0})`, icon: FolderOpen },
    { id: 'resources', label: `Resources (${data.resources?.length || 0})`, icon: LinkSimple },
    { id: 'assignments', label: `Assignments (${data.assignments?.length || 0})`, icon: ClipboardText },
  ];

  return (
    <div data-testid="course-detail-page">
      <button onClick={() => navigate('/courses')} className="flex items-center gap-1 mb-4 text-sm transition-colors duration-150 hover:underline" data-testid="back-to-courses" style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>
        <ArrowLeft size={14} /> Back to Courses
      </button>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)', fontFamily: 'Outfit' }}>
            {data.name} {data.display_id && <span className="text-base font-mono ml-2 px-2 py-0.5 border align-middle" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>{data.display_id}</span>}
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>{data.description}</p>
          <div className="flex gap-4 mt-2 text-xs" style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>
            <span>Duration: {data.duration}</span>
            {data.fee_structure != null && <span>Fee: &#8377;{data.fee_structure}</span>}
            <span>{data.total_batches} Batches</span>
            <span>{data.total_students} Students</span>
          </div>
        </div>
      </div>

      <div className="flex gap-0 border-b mb-6" style={{ borderColor: 'var(--border)' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} data-testid={`tab-${t.id}`}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors duration-150 ${tab === t.id ? 'border-[var(--brand)]' : 'border-transparent'}`}
            style={{ color: tab === t.id ? 'var(--brand)' : 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.batches.map(b => (
            <Link key={b.batch_id} to={`/batches/${b.batch_id}`} data-testid={`batch-link-${b.batch_id}`}
              className="border p-4 transition-colors duration-150 hover:border-[var(--brand)]" style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}>
              <h3 className="font-medium" style={{ color: 'var(--text-primary)', fontFamily: 'Outfit' }}>{b.name}</h3>
              <div className="flex gap-4 mt-2 text-xs" style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>
                <span>Faculty: {b.faculty_name}</span>
                <span>{b.student_count} students</span>
              </div>
              <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>{b.start_date?.slice(0, 10)} - {b.end_date?.slice(0, 10)}</div>
            </Link>
          ))}
        </div>
      )}

      {tab === 'students' && (
        <div>
          <div className="mb-4 flex gap-3">
            <select value={batchFilter} onChange={e => setBatchFilter(e.target.value)} data-testid="student-batch-filter"
              className="px-3 py-2 border text-sm bg-transparent outline-none" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)', background: 'var(--bg)', fontFamily: 'IBM Plex Sans' }}>
              <option value="">All Batches</option>
              {data.batches.map(b => <option key={b.batch_id} value={b.batch_id}>{b.name}</option>)}
            </select>
          </div>
          <div className="border" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
            <table className="w-full text-sm" style={{ fontFamily: 'IBM Plex Sans' }}>
              <thead><tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                {['Name', 'Email', 'Batch', 'Enrolled'].map(h => <th key={h} className="text-left px-4 py-3 text-xs uppercase tracking-widest font-medium" style={{ color: 'var(--text-secondary)' }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {filteredStudents.map(s => (
                  <tr key={s.user_id} className="border-b last:border-0 transition-colors duration-150 hover:bg-[var(--surface)]" style={{ borderColor: 'var(--border)' }}>
                    <td className="px-4 py-3"><Link to={`/students/${s.user_id}`} className="font-medium underline transition-colors duration-150" style={{ color: 'var(--brand)' }}>{s.name}</Link></td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{s.email}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{s.batch_name}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{s.enrollment_date?.slice(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredStudents.length === 0 && <div className="text-center py-8 text-sm" style={{ color: 'var(--text-secondary)' }}>No students found.</div>}
          </div>
        </div>
      )}

      {tab === 'materials' && (
        <div>
          {canEdit && (
            <label data-testid="upload-material-btn"
              className="inline-flex items-center gap-2 px-4 py-2 mb-4 text-sm font-medium text-white cursor-pointer transition-colors duration-150"
              style={{ background: 'var(--brand)', fontFamily: 'IBM Plex Sans' }}>
              <Plus size={14} /> Upload Material
              <input type="file" className="hidden" onChange={async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const formData = new FormData();
                formData.append('file', file);
                await api.post(`/files/upload?course_id=${courseId}&file_type=course_material`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
                load();
              }} />
            </label>
          )}
          <div className="border" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
            {data.materials.map(m => (
              <div key={m.file_id} className="flex items-center justify-between px-4 py-3 border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
                <div>
                  <span className="font-medium text-sm" style={{ color: 'var(--text-primary)', fontFamily: 'IBM Plex Sans' }}>{m.original_filename}</span>
                  <span className="text-xs ml-2" style={{ color: 'var(--text-secondary)' }}>by {m.uploader_name}</span>
                  <span className="text-xs ml-2" style={{ color: 'var(--text-secondary)' }}>{m.created_at?.slice(0, 10)}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={async () => { const res = await api.get(`/files/${m.file_id}/download`, { responseType: 'blob' }); const url = URL.createObjectURL(res.data); const a = document.createElement('a'); a.href = url; a.download = m.original_filename; a.click(); URL.revokeObjectURL(url); }}
                    className="px-2 py-1 text-xs border transition-colors duration-150 hover:bg-[var(--surface)]" style={{ borderColor: 'var(--border)', color: 'var(--brand)' }}>Download</button>
                  {canEdit && <button onClick={async () => { await api.delete(`/files/${m.file_id}`); load(); }}
                    className="px-2 py-1 text-xs border transition-colors duration-150 hover:bg-[var(--surface)]" style={{ borderColor: 'var(--border)', color: 'var(--alert)' }}>Delete</button>}
                </div>
              </div>
            ))}
            {data.materials.length === 0 && <div className="text-center py-8 text-sm" style={{ color: 'var(--text-secondary)' }}>No materials uploaded yet.</div>}
          </div>
        </div>
      )}

      {tab === 'resources' && (
        <div>
          {canEdit && (
            <button onClick={() => setResOpen(true)} data-testid="add-resource-btn"
              className="flex items-center gap-2 px-4 py-2 mb-4 text-sm font-medium text-white transition-colors duration-150" style={{ background: 'var(--brand)', fontFamily: 'IBM Plex Sans' }}>
              <Plus size={14} /> Add Resource
            </button>
          )}
          <div className="border" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
            {data.resources.map(r => (
              <div key={r.resource_id} className="flex items-center justify-between px-4 py-3 border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
                <a href={r.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm font-medium underline" style={{ color: 'var(--brand)', fontFamily: 'IBM Plex Sans' }}>
                  <LinkSimple size={14} /> {r.title}
                </a>
                {canEdit && <button onClick={() => deleteResource(r.resource_id)} className="p-1" style={{ color: 'var(--alert)' }}><Trash size={14} /></button>}
              </div>
            ))}
            {data.resources.length === 0 && <div className="text-center py-8 text-sm" style={{ color: 'var(--text-secondary)' }}>No resources added.</div>}
          </div>
        </div>
      )}

      {tab === 'assignments' && (
        <div className="border" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
          {data.assignments.map(a => (
            <div key={a.assignment_id} className="px-4 py-3 border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
              <span className="font-medium text-sm" style={{ color: 'var(--text-primary)', fontFamily: 'Outfit' }}>{a.title}</span>
              <span className="text-xs ml-3" style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>Due: {a.due_date?.slice(0, 10)}</span>
            </div>
          ))}
          {data.assignments.length === 0 && <div className="text-center py-8 text-sm" style={{ color: 'var(--text-secondary)' }}>No assignments.</div>}
        </div>
      )}

      <Dialog open={resOpen} onOpenChange={setResOpen}>
        <DialogContent style={{ background: 'var(--bg)' }}>
          <DialogHeader><DialogTitle style={{ fontFamily: 'Outfit' }}>Add Resource</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-4">
            <div><label className="text-xs uppercase tracking-widest font-medium mb-1 block" style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>Title</label>
              <input value={resForm.title} onChange={e => setResForm({ ...resForm, title: e.target.value })} data-testid="resource-title-input" className="w-full px-3 py-2 border text-sm bg-transparent outline-none" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)', fontFamily: 'IBM Plex Sans' }} /></div>
            <div><label className="text-xs uppercase tracking-widest font-medium mb-1 block" style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>URL</label>
              <input value={resForm.url} onChange={e => setResForm({ ...resForm, url: e.target.value })} data-testid="resource-url-input" className="w-full px-3 py-2 border text-sm bg-transparent outline-none" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)', fontFamily: 'IBM Plex Sans' }} /></div>
            <button onClick={addResource} data-testid="save-resource-btn" className="w-full py-2.5 text-sm font-medium text-white" style={{ background: 'var(--brand)', fontFamily: 'IBM Plex Sans' }}>Add Resource</button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
