import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Trash, UserPlus, DownloadSimple } from '@phosphor-icons/react';

export default function Students({ isFaculty = false }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [batches, setBatches] = useState([]);
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [enrollForm, setEnrollForm] = useState({ student_id: '', course_id: '', batch_id: '' });
  const isAdmin = ['super_admin', 'admin'].includes(user?.role);
  const roleFilter = isFaculty ? 'faculty' : 'student';

  const load = () => {
    api.get(`/users?role=${roleFilter}`).then(r => setUsers(r.data)).catch(() => {});
    api.get('/courses').then(r => setCourses(r.data)).catch(() => {});
    api.get('/batches').then(r => setBatches(r.data)).catch(() => {});
  };
  useEffect(() => { load(); }, [roleFilter]);

  const handleRoleChange = async (userId, newRole) => {
    await api.put(`/users/${userId}/role`, { role: newRole });
    load();
  };

  const handleDelete = async (userId) => {
    if (window.confirm(`Delete this ${roleFilter}?`)) { await api.delete(`/users/${userId}`); load(); }
  };

  const handleEnroll = async () => {
    await api.post('/enrollments', enrollForm);
    setEnrollOpen(false);
    setEnrollForm({ student_id: '', course_id: '', batch_id: '' });
  };

  const handleExport = () => {
    const backendUrl = process.env.REACT_APP_BACKEND_URL;
    window.open(`${backendUrl}/api/export/students`, '_blank');
  };

  const filteredBatches = enrollForm.course_id ? batches.filter(b => b.course_id === enrollForm.course_id) : batches;

  return (
    <div data-testid={isFaculty ? 'faculty-page' : 'students-page'}>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)', fontFamily: 'Outfit' }}>
          {isFaculty ? 'Faculty Management' : 'Student Management'}
        </h1>
        <div className="flex gap-2">
          {isAdmin && !isFaculty && (
            <button onClick={() => setEnrollOpen(true)} data-testid="enroll-student-btn"
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white transition-colors duration-150"
              style={{ background: 'var(--brand)', fontFamily: 'IBM Plex Sans' }}>
              <UserPlus size={16} /> Enroll Student
            </button>
          )}
          {isAdmin && (
            <button onClick={handleExport} data-testid="export-students-btn"
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium border transition-colors duration-150 hover:bg-[var(--surface)]"
              style={{ borderColor: 'var(--border)', color: 'var(--text-primary)', fontFamily: 'IBM Plex Sans' }}>
              <DownloadSimple size={16} /> Export CSV
            </button>
          )}
        </div>
      </div>

      <div className="border" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
        <table className="w-full text-sm" style={{ fontFamily: 'IBM Plex Sans' }}>
          <thead>
            <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
              {['Name', 'ID', 'Email', 'Role', 'Joined', isAdmin && 'Actions'].filter(Boolean).map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs uppercase tracking-widest font-medium" style={{ color: 'var(--text-secondary)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.user_id} className="border-b last:border-0 transition-colors duration-150 hover:bg-[var(--surface)]" style={{ borderColor: 'var(--border)' }}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate(`/${isFaculty ? 'faculty' : 'students'}/${u.user_id}`)}>
                    {u.picture ? <img src={u.picture} alt="" className="w-6 h-6 rounded-full" /> : (
                      <div className="w-6 h-6 flex items-center justify-center text-white text-xs font-bold" style={{ background: 'var(--brand)' }}>{u.name?.[0]}</div>
                    )}
                    <span className="font-medium underline" style={{ color: 'var(--brand)' }}>{u.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>{u.display_id || '-'}</td>
                <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{u.email}</td>
                <td className="px-4 py-3">
                  {isAdmin ? (
                    <select value={u.role} onChange={e => handleRoleChange(u.user_id, e.target.value)}
                      data-testid={`role-select-${u.user_id}`}
                      className="px-2 py-1 border text-xs bg-transparent outline-none"
                      style={{ borderColor: 'var(--border)', color: 'var(--text-primary)', fontFamily: 'IBM Plex Sans' }}>
                      <option value="student">Student</option>
                      <option value="faculty">Faculty</option>
                      <option value="admin">Admin</option>
                      {user?.role === 'super_admin' && <option value="super_admin">Super Admin</option>}
                    </select>
                  ) : (
                    <span className="text-xs px-2 py-1 border" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>{u.role}</span>
                  )}
                </td>
                <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{u.created_at?.slice(0, 10)}</td>
                {isAdmin && (
                  <td className="px-4 py-3">
                    <button onClick={() => handleDelete(u.user_id)} data-testid={`delete-user-${u.user_id}`}
                      className="p-1 transition-colors duration-150 hover:bg-[var(--surface)]" style={{ color: 'var(--alert)' }}>
                      <Trash size={16} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <div className="text-center py-12 text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>
            No {isFaculty ? 'faculty' : 'students'} found.
          </div>
        )}
      </div>

      <Dialog open={enrollOpen} onOpenChange={setEnrollOpen}>
        <DialogContent style={{ background: 'var(--bg)' }}>
          <DialogHeader><DialogTitle style={{ fontFamily: 'Outfit' }}>Enroll Student</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-xs uppercase tracking-widest font-medium mb-1 block" style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>Student</label>
              <select value={enrollForm.student_id} onChange={e => setEnrollForm({ ...enrollForm, student_id: e.target.value })} data-testid="enroll-student-select"
                className="w-full px-3 py-2 border text-sm bg-transparent outline-none" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)', fontFamily: 'IBM Plex Sans' }}>
                <option value="">Select student</option>
                {users.filter(u => u.role === 'student').map(s => <option key={s.user_id} value={s.user_id}>{s.name} ({s.email})</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest font-medium mb-1 block" style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>Course</label>
              <select value={enrollForm.course_id} onChange={e => setEnrollForm({ ...enrollForm, course_id: e.target.value, batch_id: '' })} data-testid="enroll-course-select"
                className="w-full px-3 py-2 border text-sm bg-transparent outline-none" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)', fontFamily: 'IBM Plex Sans' }}>
                <option value="">Select course</option>
                {courses.map(c => <option key={c.course_id} value={c.course_id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest font-medium mb-1 block" style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>Batch</label>
              <select value={enrollForm.batch_id} onChange={e => setEnrollForm({ ...enrollForm, batch_id: e.target.value })} data-testid="enroll-batch-select"
                className="w-full px-3 py-2 border text-sm bg-transparent outline-none" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)', fontFamily: 'IBM Plex Sans' }}>
                <option value="">Select batch</option>
                {filteredBatches.map(b => <option key={b.batch_id} value={b.batch_id}>{b.name}</option>)}
              </select>
            </div>
            <button onClick={handleEnroll} data-testid="confirm-enroll-btn"
              className="w-full py-2.5 text-sm font-medium text-white transition-colors duration-150"
              style={{ background: 'var(--brand)', fontFamily: 'IBM Plex Sans' }}>Enroll Student</button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
