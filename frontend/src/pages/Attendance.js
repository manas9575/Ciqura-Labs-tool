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
  const [message, setMessage] = useState('');

  const isFacultyOrAdmin = ['faculty', 'admin', 'super_admin'].includes(user?.role);
  const isStudent = user?.role === 'student';

  // 🔹 Load batches
  useEffect(() => {
    api.get('/batches').then(r => setBatches(r.data)).catch(() => {});
  }, []);

  // 🔹 Load students + attendance
  useEffect(() => {
    if (!selectedBatch) return;

    // students
    api.get(`/enrollments?batch_id=${selectedBatch}`).then(r => {
      setStudents(r.data);

      const initial = {};
      r.data.forEach(e => { initial[e.student_id] = 'pending'; });
      setRecords(initial);
    });

    // existing attendance
    api.get(`/attendance?batch_id=${selectedBatch}&date=${date}`).then(r => {
      setExistingRecords(r.data);

      const existing = {};
      r.data.forEach(a => {
        existing[a.student_id] = a.status;
      });

      setRecords(prev => ({
        ...prev,
        ...existing
      }));
    });

    // pending requests (admin)
    if (isFacultyOrAdmin) {
      api.get('/attendance/pending').then(r => setPendingRequests(r.data));
    }

  }, [selectedBatch, date]);

  // 💾 SAVE ATTENDANCE
  const handleSave = async () => {
    setLoading(true);
    setMessage('');

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

      setMessage('✅ Attendance saved');

    } catch {
      setMessage('❌ Failed to save');
    }

    setLoading(false);
  };

  // 👨‍🎓 REQUEST ATTENDANCE
  const requestAttendance = async () => {
    setLoading(true);
    setMessage('');

    try {
      await api.post('/attendance/request', {
        batch_id: selectedBatch,
        date
      });

      setMessage('✅ Request submitted');

    } catch (e) {
      setMessage(e?.response?.data?.detail || '❌ Failed');
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

  // 🎯 SORT STUDENTS (present first)
  const sortedStudents = [...students].sort((a, b) => {
    const s1 = records[a.student_id];
    const s2 = records[b.student_id];

    if (s1 === 'present' && s2 !== 'present') return -1;
    if (s1 !== 'present' && s2 === 'present') return 1;
    return 0;
  });

  return (
    <div className="p-4">

      <h1 className="text-2xl font-bold mb-4">Attendance</h1>

      {/* FILTER */}
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

      {/* MESSAGE */}
      {message && (
        <div className="mb-4 text-sm font-medium">
          {message}
        </div>
      )}

      {/* 👨‍🎓 STUDENT VIEW */}
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
            {existingRecords
              .filter(r => r.student_id === user.user_id)
              .map(r => (
                <div key={r.attendance_id} className="border p-2 mb-2 flex justify-between">
                  <span>{r.date}</span>

                  <span className={`px-2 py-1 text-xs rounded ${
                    r.status === 'approved'
                      ? 'bg-green-100 text-green-700'
                      : r.status === 'rejected'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {r.status}
                  </span>
                </div>
              ))}
          </div>

        </div>
      )}

      {/* 👨‍🏫 ADMIN / FACULTY VIEW */}
      {isFacultyOrAdmin && selectedBatch && (
        <div>

          {/* TABLE */}
          <div className="border">

            {sortedStudents.map(s => (
              <div key={s.student_id} className="flex justify-between items-center p-2 border-b">

                <span>{s.student_name}</span>

                <div className="flex items-center gap-3">

                  {/* STATUS */}
                  <span className={`px-2 py-1 text-xs border ${
                    records[s.student_id] === 'present'
                      ? 'text-green-600 border-green-600'
                      : records[s.student_id] === 'absent'
                      ? 'text-red-600 border-red-600'
                      : 'text-yellow-600 border-yellow-600'
                  }`}>
                    {records[s.student_id]?.toUpperCase()}
                  </span>

                  {/* ACTION */}
                  <button
                    onClick={() => setRecords({ ...records, [s.student_id]: 'present' })}
                    className="text-green-600"
                  >
                    <Check size={16} />
                  </button>

                  <button
                    onClick={() => setRecords({ ...records, [s.student_id]: 'absent' })}
                    className="text-red-600"
                  >
                    <X size={16} />
                  </button>

                  {/* SAVED */}
                  {existingRecords.find(e => e.student_id === s.student_id) && (
                    <span className="text-xs text-green-500">✔</span>
                  )}

                </div>
              </div>
            ))}

          </div>

          {/* SAVE BUTTON */}
          <button
            onClick={handleSave}
            disabled={loading}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded"
          >
            {loading ? 'Saving...' : 'Save Attendance'}
          </button>

          {/* 🔥 PENDING REQUESTS */}
          <h2 className="mt-6 font-semibold">Pending Requests</h2>

          {pendingRequests.map(p => (
            <div key={p.attendance_id} className="flex justify-between border p-2 mt-2">
              <span>{p.student_name}</span>

              <div className="flex gap-2">
                <button onClick={() => approve(p.attendance_id)} className="text-green-600">
                  Approve
                </button>

                <button onClick={() => reject(p.attendance_id)} className="text-red-600">
                  Reject
                </button>
              </div>
            </div>
          ))}

        </div>
      )}

    </div>
  );
}
