import React, { useEffect, useState, useCallback } from 'react';
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
  const [pendingRequests, setPendingRequests] = useState([]);

  const isFacultyOrAdmin = ['faculty', 'admin', 'super_admin'].includes(user?.role);
  const isStudent = user?.role === 'student';

  // 🔹 Load batches
  useEffect(() => {
    api.get('/batches').then(r => setBatches(r.data)).catch(() => {});
  }, []);

  // 🔥 CENTRALIZED LOAD FUNCTION — stable reference via useCallback
  const loadAttendance = useCallback(async () => {
    if (!selectedBatch) return;
    try {
      const res = await api.get(`/attendance?batch_id=${selectedBatch}&date=${date}`);
      setExistingRecords(res.data);

      const mapped = {};
      res.data.forEach(a => {
        if (a.status === 'approved' || a.status === 'present') {
          mapped[a.student_id] = 'present';
        } else if (a.status === 'rejected' || a.status === 'absent') {
          mapped[a.student_id] = 'absent';
        } else {
          mapped[a.student_id] = 'pending';
        }
      });

      setRecords(prev => ({ ...prev, ...mapped }));
    } catch {}
  }, [selectedBatch, date]);

  // 🔹 Load data when batch or date changes
  useEffect(() => {
    if (!selectedBatch) return;

    // Reset before loading fresh data
    setStudents([]);
    setRecords({});
    setExistingRecords([]);

    // Load students
    api.get(`/enrollments?batch_id=${selectedBatch}`).then(r => {
      setStudents(r.data);
      const initial = {};
      r.data.forEach(e => { initial[e.student_id] = 'pending'; });
      setRecords(initial);
    });

    loadAttendance();

    // Load pending requests
    if (isFacultyOrAdmin) {
      api.get('/attendance/pending').then(r => setPendingRequests(r.data));
    }

  }, [selectedBatch, date, loadAttendance, isFacultyOrAdmin]);

  // 💾 SAVE ATTENDANCE
  // FIX: map UI values (present/absent) → backend values (approved/rejected) before posting
  const handleSave = async () => {
    const recordsList = Object.entries(records).map(([student_id, status]) => ({
      student_id,
      status:
        status === 'present' ? 'approved' :
        status === 'absent'  ? 'rejected' : 'pending'
    }));

    await api.post('/attendance', {
      batch_id: selectedBatch,
      date,
      records: recordsList
    });

    await loadAttendance();
  };

  // 👨‍🎓 STUDENT REQUEST
  const requestAttendance = async () => {
    await api.post('/attendance/request', {
      batch_id: selectedBatch,
      date
    });

    await loadAttendance();
  };

  // ✅ APPROVE
  const approve = async (id) => {
    await api.put(`/attendance/${id}/approve`);
    await loadAttendance();
    setPendingRequests(prev => prev.filter(p => p.attendance_id !== id));
  };

  // ❌ REJECT
  const reject = async (id) => {
    await api.put(`/attendance/${id}/reject`);
    await loadAttendance();
    setPendingRequests(prev => prev.filter(p => p.attendance_id !== id));
  };

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

      {/* 👨‍🎓 STUDENT VIEW */}
      {isStudent && selectedBatch && (
        <div>
          <button
            onClick={requestAttendance}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            Request Attendance
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

      {/* 👨‍🏫 ADMIN / FACULTY */}
      {isFacultyOrAdmin && selectedBatch && (
        <div>

          {/* STUDENT LIST */}
          <div className="border">
            {students.map(s => (
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
                    {records[s.student_id] === 'present'
                      ? 'PRESENT'
                      : records[s.student_id] === 'absent'
                      ? 'ABSENT'
                      : 'PENDING'}
                  </span>

                  {/* ACTIONS */}
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

                </div>
              </div>
            ))}
          </div>

          {/* SAVE */}
          <button
            onClick={handleSave}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded"
          >
            Save Attendance
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
