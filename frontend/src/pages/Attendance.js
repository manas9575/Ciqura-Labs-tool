import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { Check, X } from '@phosphor-icons/react';

export default function Attendance() {
  const { user } = useAuth();
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [students, setStudents] = useState([]);
  const [records, setRecords] = useState({});
  const [existingRecords, setExistingRecords] = useState([]);
  const isFacultyOrAdmin = ['faculty', 'admin', 'super_admin'].includes(user?.role);

  useEffect(() => {
    api.get('/batches').then(r => setBatches(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedBatch) {
      api.get(`/enrollments?batch_id=${selectedBatch}`).then(r => {
        setStudents(r.data);
        const initial = {};
        r.data.forEach(e => { initial[e.student_id] = 'present'; });
        setRecords(initial);
      }).catch(() => {});
      api.get(`/attendance?batch_id=${selectedBatch}&date=${date}`).then(r => {
        setExistingRecords(r.data);
        const existing = {};
        r.data.forEach(a => { existing[a.student_id] = a.status; });
        setRecords(prev => ({ ...prev, ...existing }));
      }).catch(() => {});
    }
  }, [selectedBatch, date]);

  const handleSave = async () => {
    const recordsList = Object.entries(records).map(([student_id, status]) => ({ student_id, status }));
    await api.post('/attendance', { batch_id: selectedBatch, date, records: recordsList });
    api.get(`/attendance?batch_id=${selectedBatch}&date=${date}`).then(r => setExistingRecords(r.data)).catch(() => {});
  };

  const isStudent = user?.role === 'student';

  return (
    <div data-testid="attendance-page">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)', fontFamily: 'Outfit' }}>Attendance</h1>
      </div>

      <div className="flex flex-wrap gap-4 mb-6">
        <div>
          <label className="text-xs uppercase tracking-widest font-medium mb-1 block" style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>Batch</label>
          <select value={selectedBatch} onChange={e => setSelectedBatch(e.target.value)} data-testid="attendance-batch-select"
            className="px-3 py-2 border text-sm bg-transparent outline-none min-w-[200px]" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)', background: 'var(--bg)', fontFamily: 'IBM Plex Sans' }}>
            <option value="">Select batch</option>
            {batches.map(b => <option key={b.batch_id} value={b.batch_id}>{b.name} - {b.course_name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs uppercase tracking-widest font-medium mb-1 block" style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} data-testid="attendance-date-input"
            className="px-3 py-2 border text-sm bg-transparent outline-none" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)', background: 'var(--bg)', fontFamily: 'IBM Plex Sans' }} />
        </div>
      </div>

      {selectedBatch && (
        <div className="border" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
          <table className="w-full text-sm" style={{ fontFamily: 'IBM Plex Sans' }}>
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-widest font-medium" style={{ color: 'var(--text-secondary)' }}>Student</th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-widest font-medium" style={{ color: 'var(--text-secondary)' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {isStudent ? (
                existingRecords.length > 0 ? existingRecords.map(r => (
                  <tr key={r.attendance_id} className="border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
                    <td className="px-4 py-3" style={{ color: 'var(--text-primary)' }}>{r.student_name}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-medium ${r.status === 'present' ? 'text-[var(--success)]' : 'text-[var(--alert)]'}`} style={{ border: '1px solid', borderColor: r.status === 'present' ? 'var(--success)' : 'var(--alert)' }}>
                        {r.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                )) : <tr><td colSpan={2} className="px-4 py-8 text-center" style={{ color: 'var(--text-secondary)' }}>No attendance records for this date</td></tr>
              ) : (
                students.map(s => (
                  <tr key={s.student_id} className="border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
                    <td className="px-4 py-3" style={{ color: 'var(--text-primary)' }}>{s.student_name}</td>
                    <td className="px-4 py-3 flex gap-2">
                      <button onClick={() => setRecords({ ...records, [s.student_id]: 'present' })}
                        data-testid={`mark-present-${s.student_id}`}
                        className={`flex items-center gap-1 px-3 py-1 text-xs border transition-colors duration-150 ${records[s.student_id] === 'present' ? 'text-white' : ''}`}
                        style={{ background: records[s.student_id] === 'present' ? 'var(--success)' : 'transparent', borderColor: 'var(--success)', color: records[s.student_id] === 'present' ? 'white' : 'var(--success)' }}>
                        <Check size={12} /> Present
                      </button>
                      <button onClick={() => setRecords({ ...records, [s.student_id]: 'absent' })}
                        data-testid={`mark-absent-${s.student_id}`}
                        className={`flex items-center gap-1 px-3 py-1 text-xs border transition-colors duration-150`}
                        style={{ background: records[s.student_id] === 'absent' ? 'var(--alert)' : 'transparent', borderColor: 'var(--alert)', color: records[s.student_id] === 'absent' ? 'white' : 'var(--alert)' }}>
                        <X size={12} /> Absent
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {isFacultyOrAdmin && students.length > 0 && (
            <div className="p-4 border-t" style={{ borderColor: 'var(--border)' }}>
              <button onClick={handleSave} data-testid="save-attendance-btn"
                className="px-6 py-2 text-sm font-medium text-white transition-colors duration-150"
                style={{ background: 'var(--brand)', fontFamily: 'IBM Plex Sans' }}>Save Attendance</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
