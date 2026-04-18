import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { Check, X, Clock } from '@phosphor-icons/react';

export default function Attendance() {
  const { user } = useAuth();

  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const [students, setStudents] = useState([]);
  const [records, setRecords] = useState({});
  const [existingRecords, setExistingRecords] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  const isFacultyOrAdmin = ['faculty', 'admin', 'super_admin'].includes(user?.role);
  const isStudent = user?.role === 'student';

  // 🔹 Load batches
  useEffect(() => {
    api.get('/batches').then(r => setBatches(r.data)).catch(() => {});
  }, []);

  // 🔹 Load data when batch/date changes
  useEffect(() => {
    if (!selectedBatch) return;

    // students
    api.get(`/enrollments?batch_id=${selectedBatch}`).then(r => {
      setStudents(r.data);
      const initial = {};
      r.data.forEach(e => { initial[e.student_id] = 'present'; });
      setRecords(initial);
    });

    // existing attendance
    api.get(`/attendance?batch_id=${selectedBatch}&date=${date}`).then(r => {
      setExistingRecords(r.data);
      const existing = {};
      r.data.forEach(a => { existing[a.student_id] = a.status; });
      setRecords(prev => ({ ...prev, ...existing }));
    });

    // pending requests (admin only)
    if (isFacultyOrAdmin) {
      api.get('/attendance/pending').then(r => setPendingRequests(r.data));
    }

  }, [selectedBatch, date]);

  // ✅ SAVE ATTENDANCE (admin/faculty)
  const handleSave = async () => {
    setLoading(true);
    setSuccess('');

    try {
      const recordsList = Object.entries(records).map(([student_id, status]) => ({
        student_id,
        status
      }));

      await api.post('/attendance', {
        batch_id: selectedBatch,
        date,
        records: recordsList
      });

      setSuccess('✅ Attendance saved successfully');
    } catch {
      setSuccess('❌ Failed to save');
    }

    setLoading(false);
  };

  // ✅ STUDENT REQUEST ATTENDANCE
  const requestAttendance = async () => {
    setLoading(true);
    setSuccess('');

    try {
      await api.post('/attendance/request', {
        batch_id: selectedBatch,
        date
      });

      setSuccess('✅ Attendance request submitted');
    } catch (e) {
      setSuccess(e?.response?.data?.detail || '❌ Failed');
    }

    setLoading(false);
  };

  // ✅ APPROVE
  const approve = async (id) => {
    await api.put(`/attendance/${id}/approve`);
    setPendingRequests(prev => prev.filter(p => p.attendance_id !== id));
  };

  // ❌ REJECT
  const reject = async (id) => {
    await api.put(`/attendance/${id}/reject`);
    setPendingRequests(prev => prev.filter(p => p.attendance_id !== id));
  };

  return (
    <div>

      <h1 className="text-2xl font-bold mb-4">Attendance</h1>

      {/* SELECT */}
      <div className="flex gap-4 mb-6">
        <select value={selectedBatch} onChange={e => setSelectedBatch(e.target.value)}>
          <option value="">Select batch</option>
          {batches.map(b => (
            <option key={b.batch_id} value={b.batch_id}>
              {b.name}
            </option>
          ))}
        </select>

        <input type="date" value={date} onChange={e => setDate(e.target.value)} />
      </div>

      {/* SUCCESS MESSAGE */}
      {success && (
        <div className="mb-4 text-sm font-medium">
          {success}
        </div>
      )}

      {/* 🧑‍🎓 STUDENT VIEW */}
      {isStudent && selectedBatch && (
        <div>
          <button
            onClick={requestAttendance}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            {loading ? 'Submitting...' : 'Request Attendance'}
          </button>

          <div className="mt-4">
            {existingRecords.map(r => (
              <div key={r.attendance_id} className="border p-2 mb-2 flex justify-between">
                <span>{r.date}</span>
                <span className="flex items-center gap-1">
                  {r.status === 'pending' && <Clock size={14} />}
                  {r.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 👨‍🏫 ADMIN/FACULTY VIEW */}
      {isFacultyOrAdmin && selectedBatch && (
        <div>

          {/* MARK ATTENDANCE */}
          {students.map(s => (
            <div key={s.student_id} className="flex justify-between mb-2">
              <span>{s.student_name}</span>

              <div className="flex gap-2">
                <button onClick={() => setRecords({ ...records, [s.student_id]: 'present' })}>
                  <Check />
                </button>
                <button onClick={() => setRecords({ ...records, [s.student_id]: 'absent' })}>
                  <X />
                </button>
              </div>
            </div>
          ))}

          <button
            onClick={handleSave}
            disabled={loading}
            className="mt-4 bg-green-600 text-white px-4 py-2 rounded"
          >
            {loading ? 'Saving...' : 'Save Attendance'}
          </button>

          {/* 🔥 PENDING REQUESTS */}
          <h2 className="mt-8 font-bold">Pending Requests</h2>

          {pendingRequests.map(p => (
            <div key={p.attendance_id} className="border p-2 flex justify-between mt-2">
              <span>{p.student_name}</span>

              <div className="flex gap-2">
                <button onClick={() => approve(p.attendance_id)} className="text-green-600">Approve</button>
                <button onClick={() => reject(p.attendance_id)} className="text-red-600">Reject</button>
              </div>
            </div>
          ))}

        </div>
      )}
    </div>
  );
}
