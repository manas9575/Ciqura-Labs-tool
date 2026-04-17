import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { ArrowLeft, Users, ClipboardText, CalendarCheck, ChatCircle } from '@phosphor-icons/react';
import Comments from '../components/Comments';

export default function BatchDetail() {
  const { batchId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('students');

  useEffect(() => {
    api.get(`/batches/${batchId}/detail`).then(r => setData(r.data)).catch(() => navigate('/batches'));
  }, [batchId]);

  if (!data) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--brand)', borderTopColor: 'transparent' }} /></div>;

  const tabs = [
    { id: 'students', label: `Students (${data.total_students})`, icon: Users },
    { id: 'assignments', label: `Assignments (${data.assignments?.length || 0})`, icon: ClipboardText },
    { id: 'attendance', label: `Attendance (${data.attendance_dates?.length || 0} days)`, icon: CalendarCheck },
    { id: 'discussion', label: 'Discussion', icon: ChatCircle },
  ];

  return (
    <div data-testid="batch-detail-page">
      <button onClick={() => navigate('/batches')} className="flex items-center gap-1 mb-4 text-sm transition-colors duration-150 hover:underline" data-testid="back-to-batches" style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>
        <ArrowLeft size={14} /> Back to Batches
      </button>
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)', fontFamily: 'Outfit' }}>{data.name}</h1>
        <div className="flex flex-wrap gap-4 mt-2 text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>
          <span>Course: <span style={{ color: 'var(--brand)' }}>{data.course_name}</span></span>
          <span>Faculty: {data.faculty?.name || 'Unassigned'}</span>
          <span>Schedule: {data.schedule}</span>
          <span>{data.start_date?.slice(0, 10)} - {data.end_date?.slice(0, 10)}</span>
        </div>
      </div>

      <div className="flex gap-0 border-b mb-6" style={{ borderColor: 'var(--border)' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} data-testid={`btab-${t.id}`}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors duration-150 ${tab === t.id ? 'border-[var(--brand)]' : 'border-transparent'}`}
            style={{ color: tab === t.id ? 'var(--brand)' : 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'students' && (
        <div className="border" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
          <table className="w-full text-sm" style={{ fontFamily: 'IBM Plex Sans' }}>
            <thead><tr className="border-b" style={{ borderColor: 'var(--border)' }}>
              {['Name', 'Email', 'Attendance', 'Submissions'].map(h => <th key={h} className="text-left px-4 py-3 text-xs uppercase tracking-widest font-medium" style={{ color: 'var(--text-secondary)' }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {data.students.map(s => (
                <tr key={s.user_id} className="border-b last:border-0 transition-colors duration-150 hover:bg-[var(--surface)]" style={{ borderColor: 'var(--border)' }}>
                  <td className="px-4 py-3"><Link to={`/students/${s.user_id}`} className="font-medium underline" style={{ color: 'var(--brand)' }}>{s.name}</Link></td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{s.email}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 text-xs font-medium border`} style={{ borderColor: s.attendance_pct >= 75 ? 'var(--success)' : 'var(--alert)', color: s.attendance_pct >= 75 ? 'var(--success)' : 'var(--alert)' }}>
                      {s.attendance_pct}%
                    </span>
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-primary)' }}>{s.submissions_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.students.length === 0 && <div className="text-center py-8 text-sm" style={{ color: 'var(--text-secondary)' }}>No students enrolled.</div>}
        </div>
      )}

      {tab === 'assignments' && (
        <div className="space-y-3">
          {data.assignments.map(a => (
            <div key={a.assignment_id} className="border p-4" style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}>
              <div className="flex justify-between items-center">
                <h3 className="font-medium" style={{ color: 'var(--text-primary)', fontFamily: 'Outfit' }}>{a.title}</h3>
                <span className="text-xs px-2 py-0.5 border" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>{a.submission_count} submissions</span>
              </div>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>{a.description}</p>
              <span className="text-xs mt-1 block" style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>Due: {a.due_date?.slice(0, 10)}</span>
            </div>
          ))}
          {data.assignments.length === 0 && <div className="text-center py-8 border text-sm" style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>No assignments.</div>}
        </div>
      )}

      {tab === 'attendance' && (
        <div className="border" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
          <div className="p-4">
            <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>Attendance recorded on {data.attendance_dates?.length || 0} days</p>
            <div className="flex flex-wrap gap-2">
              {data.attendance_dates?.map(d => (
                <span key={d} className="px-2 py-1 text-xs border" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>{d}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'discussion' && (
        <div className="border p-4" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
          <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)', fontFamily: 'Outfit' }}>Batch Discussion</h3>
          <Comments entityType="batch" entityId={batchId} />
        </div>
      )}
    </div>
  );
}
