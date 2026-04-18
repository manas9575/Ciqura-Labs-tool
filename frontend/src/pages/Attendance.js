import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { Check, X, Clock, CalendarBlank, Users, ArrowClockwise, CheckCircle, XCircle, Hourglass } from '@phosphor-icons/react';

/* ─────────────────────────────────────────────
   DESIGN TOKENS  (override in your global CSS)
───────────────────────────────────────────── */
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');

  .att-root {
    --bg:        #0f1117;
    --surface:   #181c27;
    --surface2:  #1e2334;
    --border:    rgba(255,255,255,0.07);
    --accent:    #4f8ef7;
    --accent2:   #7c3aed;
    --success:   #22c55e;
    --danger:    #ef4444;
    --warn:      #f59e0b;
    --text:      #e8eaf0;
    --muted:     #6b7280;
    font-family: 'DM Sans', sans-serif;
    background: var(--bg);
    color: var(--text);
    min-height: 100vh;
    padding: 2rem;
  }

  /* HEADER */
  .att-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 2rem;
  }
  .att-header-icon {
    width: 44px; height: 44px;
    background: linear-gradient(135deg, var(--accent), var(--accent2));
    border-radius: 12px;
    display: grid; place-items: center;
  }
  .att-title { font-size: 1.5rem; font-weight: 700; letter-spacing: -0.5px; }
  .att-subtitle { font-size: 0.8rem; color: var(--muted); margin-top: 2px; }

  /* FILTERS */
  .att-filters {
    display: flex; gap: 1rem; flex-wrap: wrap;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 1.25rem 1.5rem;
    margin-bottom: 1.5rem;
    align-items: flex-end;
  }
  .att-field { display: flex; flex-direction: column; gap: 6px; flex: 1; min-width: 160px; }
  .att-label { font-size: 0.72rem; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: var(--muted); }
  .att-select, .att-date-input {
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: 9px;
    color: var(--text);
    font-family: 'DM Sans', sans-serif;
    font-size: 0.875rem;
    padding: 0.6rem 0.9rem;
    outline: none;
    transition: border-color .2s;
    cursor: pointer;
  }
  .att-select:focus, .att-date-input:focus { border-color: var(--accent); }
  .att-select option { background: var(--surface2); }

  /* EMPTY STATE */
  .att-empty {
    display: flex; flex-direction: column; align-items: center;
    gap: 1rem; padding: 4rem 2rem;
    color: var(--muted); text-align: center;
  }
  .att-empty-icon { opacity: .3; }

  /* BADGE */
  .att-badge {
    display: inline-flex; align-items: center; gap: 4px;
    font-size: 0.7rem; font-weight: 600;
    letter-spacing: .05em; text-transform: uppercase;
    border-radius: 6px; padding: 3px 8px;
  }
  .att-badge.present  { background: rgba(34,197,94,.12);  color: var(--success); }
  .att-badge.absent   { background: rgba(239,68,68,.12);   color: var(--danger); }
  .att-badge.pending  { background: rgba(245,158,11,.12);  color: var(--warn); }
  .att-badge.approved { background: rgba(34,197,94,.12);  color: var(--success); }
  .att-badge.rejected { background: rgba(239,68,68,.12);   color: var(--danger); }

  /* TABLE CARD */
  .att-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 14px;
    overflow: hidden;
    margin-bottom: 1.5rem;
  }
  .att-card-header {
    display: flex; justify-content: space-between; align-items: center;
    padding: 1rem 1.5rem;
    border-bottom: 1px solid var(--border);
  }
  .att-card-title { font-size: 0.875rem; font-weight: 600; display: flex; align-items: center; gap: 8px; }

  .att-row {
    display: flex; justify-content: space-between; align-items: center;
    padding: 0.85rem 1.5rem;
    border-bottom: 1px solid var(--border);
    transition: background .15s;
  }
  .att-row:last-child { border-bottom: none; }
  .att-row:hover { background: var(--surface2); }

  .att-student-name { font-size: 0.9rem; font-weight: 500; }
  .att-student-id   { font-size: 0.72rem; color: var(--muted); font-family: 'DM Mono', monospace; }

  /* ICON BUTTONS */
  .att-icon-btn {
    width: 32px; height: 32px;
    border-radius: 8px; border: none;
    display: grid; place-items: center;
    cursor: pointer; transition: all .2s;
  }
  .att-icon-btn.present  { background: rgba(34,197,94,.12); color: var(--success); }
  .att-icon-btn.absent   { background: rgba(239,68,68,.12);  color: var(--danger); }
  .att-icon-btn.present:hover { background: rgba(34,197,94,.25); }
  .att-icon-btn.absent:hover  { background: rgba(239,68,68,.25); }
  .att-icon-btn.active-present { background: var(--success); color: #fff; }
  .att-icon-btn.active-absent  { background: var(--danger);  color: #fff; }

  /* PRIMARY BUTTON */
  .att-btn-primary {
    display: inline-flex; align-items: center; gap: 8px;
    background: linear-gradient(135deg, var(--accent), var(--accent2));
    color: #fff; border: none; border-radius: 10px;
    padding: 0.65rem 1.4rem; font-size: 0.875rem; font-weight: 600;
    cursor: pointer; transition: opacity .2s, transform .15s;
    font-family: 'DM Sans', sans-serif;
  }
  .att-btn-primary:hover  { opacity: .9; transform: translateY(-1px); }
  .att-btn-primary:active { transform: translateY(0); }
  .att-btn-primary:disabled { opacity: .5; cursor: not-allowed; transform: none; }

  .att-btn-success {
    font-size: 0.8rem; font-weight: 600;
    background: rgba(34,197,94,.12); color: var(--success);
    border: 1px solid rgba(34,197,94,.25); border-radius: 8px;
    padding: 5px 12px; cursor: pointer; transition: all .2s;
    font-family: 'DM Sans', sans-serif;
  }
  .att-btn-success:hover { background: rgba(34,197,94,.25); }

  .att-btn-danger {
    font-size: 0.8rem; font-weight: 600;
    background: rgba(239,68,68,.12); color: var(--danger);
    border: 1px solid rgba(239,68,68,.25); border-radius: 8px;
    padding: 5px 12px; cursor: pointer; transition: all .2s;
    font-family: 'DM Sans', sans-serif;
  }
  .att-btn-danger:hover { background: rgba(239,68,68,.25); }

  /* STATS ROW */
  .att-stats {
    display: flex; gap: 1rem; flex-wrap: wrap;
    margin-bottom: 1.5rem;
  }
  .att-stat-card {
    flex: 1; min-width: 100px;
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 12px; padding: 1rem 1.25rem;
    display: flex; flex-direction: column; gap: 4px;
  }
  .att-stat-val { font-size: 1.6rem; font-weight: 700; font-family: 'DM Mono', monospace; }
  .att-stat-lbl { font-size: 0.72rem; color: var(--muted); text-transform: uppercase; letter-spacing: .06em; }

  /* TOAST */
  .att-toast {
    position: fixed; bottom: 1.5rem; right: 1.5rem; z-index: 9999;
    background: var(--surface2); border: 1px solid var(--border);
    border-radius: 12px; padding: .8rem 1.2rem;
    display: flex; align-items: center; gap: .6rem;
    font-size: .875rem; font-weight: 500;
    animation: slideUp .3s ease;
    box-shadow: 0 8px 32px rgba(0,0,0,.4);
  }
  @keyframes slideUp { from { opacity:0; transform: translateY(12px); } to { opacity:1; transform: translateY(0); } }

  /* DIVIDER */
  .att-divider {
    display: flex; align-items: center; gap: 1rem;
    margin: 1.5rem 0 1rem;
    color: var(--muted); font-size: .75rem;
    font-weight: 600; text-transform: uppercase; letter-spacing: .06em;
  }
  .att-divider::before, .att-divider::after {
    content: ''; flex: 1; height: 1px; background: var(--border);
  }

  /* SPINNER */
  @keyframes spin { to { transform: rotate(360deg); } }
  .att-spinner {
    width: 16px; height: 16px; border-radius: 50%;
    border: 2px solid rgba(255,255,255,.2);
    border-top-color: #fff;
    animation: spin .7s linear infinite;
    display: inline-block;
  }
`;

/* ─────────────────────────────────────────────
   COMPONENT
───────────────────────────────────────────── */
export default function Attendance() {
  const { user } = useAuth();

  const [batches, setBatches]                 = useState([]);
  const [selectedBatch, setSelectedBatch]     = useState('');
  const [date, setDate]                       = useState(new Date().toISOString().slice(0, 10));

  const [students, setStudents]               = useState([]);
  const [records, setRecords]                 = useState({});          // { student_id: 'present'|'absent'|'pending' }
  const [existingRecords, setExistingRecords] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);

  const [saving, setSaving]     = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [toast, setToast]       = useState(null);

  const isFacultyOrAdmin = ['faculty', 'admin', 'super_admin'].includes(user?.role);
  const isStudent        = user?.role === 'student';

  /* ── helpers ── */
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  /* ── Load batches ── */
  useEffect(() => {
    api.get('/batches').then(r => setBatches(r.data)).catch(() => {});
  }, []);

  /* ── Load attendance (stable reference so useEffect can depend on it) ── */
  const loadAttendance = useCallback(async () => {
    if (!selectedBatch) return;
    try {
      const res = await api.get(`/attendance?batch_id=${selectedBatch}&date=${date}`);
      setExistingRecords(res.data);
      const mapped = {};
      res.data.forEach(a => {
        mapped[a.student_id] =
          a.status === 'approved' ? 'present' :
          a.status === 'rejected' ? 'absent' : 'pending';
      });
      setRecords(prev => ({ ...prev, ...mapped }));
    } catch {
      // silently ignore; existing records stay as-is
    }
  }, [selectedBatch, date]);

  /* ── Load students + attendance when batch/date changes ── */
  useEffect(() => {
    if (!selectedBatch) return;

    setLoading(true);

    // Reset
    setStudents([]);
    setRecords({});
    setExistingRecords([]);

    Promise.all([
      api.get(`/enrollments?batch_id=${selectedBatch}`).then(r => {
        setStudents(r.data);
        const initial = {};
        r.data.forEach(e => { initial[e.student_id] = 'pending'; });
        setRecords(initial);
      }),
      loadAttendance(),
      isFacultyOrAdmin
        ? api.get('/attendance/pending').then(r => setPendingRequests(r.data))
        : Promise.resolve()
    ])
      .catch(() => {})
      .finally(() => setLoading(false));

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBatch, date]);

  /* ── Toggle record ── */
  const toggle = (studentId, status) => {
    setRecords(prev => ({
      ...prev,
      [studentId]: prev[studentId] === status ? 'pending' : status
    }));
  };

  /* ── Save (faculty/admin) ── */
  const handleSave = async () => {
    setSaving(true);
    try {
      const recordsList = Object.entries(records).map(([student_id, status]) => ({
        student_id,
        status
      }));
      await api.post('/attendance', { batch_id: selectedBatch, date, records: recordsList });
      await loadAttendance();
      showToast('Attendance saved successfully!');
    } catch {
      showToast('Failed to save attendance.', 'error');
    } finally {
      setSaving(false);
    }
  };

  /* ── Request attendance (student) ── */
  const requestAttendance = async () => {
    setRequesting(true);
    try {
      await api.post('/attendance/request', { batch_id: selectedBatch, date });
      await loadAttendance();
      showToast('Attendance request submitted!');
    } catch {
      showToast('Request failed. Try again.', 'error');
    } finally {
      setRequesting(false);
    }
  };

  /* ── Approve / Reject ── */
  const approve = async (id) => {
    try {
      await api.put(`/attendance/${id}/approve`);
      await loadAttendance();
      setPendingRequests(prev => prev.filter(p => p.attendance_id !== id));
      showToast('Request approved.');
    } catch {
      showToast('Approval failed.', 'error');
    }
  };

  const reject = async (id) => {
    try {
      await api.put(`/attendance/${id}/reject`);
      await loadAttendance();
      setPendingRequests(prev => prev.filter(p => p.attendance_id !== id));
      showToast('Request rejected.');
    } catch {
      showToast('Rejection failed.', 'error');
    }
  };

  /* ── Derived stats ── */
  const presentCount = Object.values(records).filter(v => v === 'present').length;
  const absentCount  = Object.values(records).filter(v => v === 'absent').length;
  const pendingCount = Object.values(records).filter(v => v === 'pending').length;

  /* ── My attendance record (student) ── */
  const myRecord = isStudent
    ? existingRecords.find(r => r.student_id === user?.user_id)
    : null;

  /* ────────────── RENDER ────────────── */
  return (
    <>
      <style>{styles}</style>

      <div className="att-root">

        {/* HEADER */}
        <div className="att-header">
          <div className="att-header-icon">
            <CalendarBlank size={22} color="#fff" weight="bold" />
          </div>
          <div>
            <div className="att-title">Attendance</div>
            <div className="att-subtitle">
              {isFacultyOrAdmin ? 'Manage & track student attendance' : 'View your attendance records'}
            </div>
          </div>
        </div>

        {/* FILTERS */}
        <div className="att-filters">
          <div className="att-field">
            <label className="att-label">Batch</label>
            <select
              className="att-select"
              value={selectedBatch}
              onChange={e => setSelectedBatch(e.target.value)}
            >
              <option value="">— Select batch —</option>
              {batches.map(b => (
                <option key={b.batch_id} value={b.batch_id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div className="att-field">
            <label className="att-label">Date</label>
            <input
              type="date"
              className="att-date-input"
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </div>

          {isFacultyOrAdmin && selectedBatch && (
            <button
              className="att-btn-primary"
              style={{ alignSelf: 'flex-end' }}
              onClick={handleSave}
              disabled={saving || !students.length}
            >
              {saving ? <span className="att-spinner" /> : <Check size={15} weight="bold" />}
              {saving ? 'Saving…' : 'Save Attendance'}
            </button>
          )}
        </div>

        {/* EMPTY STATE */}
        {!selectedBatch && (
          <div className="att-empty">
            <Users size={52} className="att-empty-icon" />
            <div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>No batch selected</div>
              <div style={{ fontSize: '0.85rem' }}>Choose a batch above to view attendance.</div>
            </div>
          </div>
        )}

        {/* ─── FACULTY / ADMIN VIEW ─── */}
        {isFacultyOrAdmin && selectedBatch && (
          <>
            {/* STATS */}
            {students.length > 0 && (
              <div className="att-stats">
                <div className="att-stat-card">
                  <div className="att-stat-val" style={{ color: 'var(--text)' }}>{students.length}</div>
                  <div className="att-stat-lbl">Total</div>
                </div>
                <div className="att-stat-card">
                  <div className="att-stat-val" style={{ color: 'var(--success)' }}>{presentCount}</div>
                  <div className="att-stat-lbl">Present</div>
                </div>
                <div className="att-stat-card">
                  <div className="att-stat-val" style={{ color: 'var(--danger)' }}>{absentCount}</div>
                  <div className="att-stat-lbl">Absent</div>
                </div>
                <div className="att-stat-card">
                  <div className="att-stat-val" style={{ color: 'var(--warn)' }}>{pendingCount}</div>
                  <div className="att-stat-lbl">Pending</div>
                </div>
              </div>
            )}

            {/* STUDENT LIST */}
            <div className="att-card">
              <div className="att-card-header">
                <div className="att-card-title">
                  <Users size={16} />
                  Students
                  <span style={{
                    background: 'rgba(79,142,247,.15)', color: 'var(--accent)',
                    borderRadius: 6, padding: '2px 8px', fontSize: '0.72rem', fontWeight: 700
                  }}>
                    {students.length}
                  </span>
                </div>
                {loading && <span style={{ color: 'var(--muted)', fontSize: '0.8rem', display:'flex', alignItems:'center', gap:6 }}>
                  <span className="att-spinner" style={{ borderTopColor: 'var(--muted)' }} /> Loading…
                </span>}
              </div>

              {students.length === 0 && !loading && (
                <div className="att-empty" style={{ padding: '2rem' }}>
                  <div style={{ fontSize: '0.85rem' }}>No students found in this batch.</div>
                </div>
              )}

              {students.map((s, idx) => {
                const status = records[s.student_id] || 'pending';
                return (
                  <div key={s.student_id} className="att-row">
                    <div>
                      <div className="att-student-name">{s.student_name}</div>
                      <div className="att-student-id">#{s.student_id}</div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span className={`att-badge ${status}`}>
                        {status === 'present' ? <CheckCircle size={11} weight="fill" /> :
                         status === 'absent'  ? <XCircle size={11} weight="fill" /> :
                                                <Hourglass size={11} weight="fill" />}
                        {status}
                      </span>

                      <button
                        className={`att-icon-btn ${status === 'present' ? 'active-present' : 'present'}`}
                        title="Mark Present"
                        onClick={() => toggle(s.student_id, 'present')}
                      >
                        <Check size={14} weight="bold" />
                      </button>

                      <button
                        className={`att-icon-btn ${status === 'absent' ? 'active-absent' : 'absent'}`}
                        title="Mark Absent"
                        onClick={() => toggle(s.student_id, 'absent')}
                      >
                        <X size={14} weight="bold" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* PENDING REQUESTS */}
            {pendingRequests.length > 0 && (
              <>
                <div className="att-divider">
                  <Clock size={13} /> Pending Requests ({pendingRequests.length})
                </div>

                <div className="att-card">
                  {pendingRequests.map(p => (
                    <div key={p.attendance_id} className="att-row">
                      <div>
                        <div className="att-student-name">{p.student_name}</div>
                        <div className="att-student-id">
                          {p.date} · Self-reported request
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="att-btn-success" onClick={() => approve(p.attendance_id)}>
                          <Check size={12} style={{ marginRight: 4 }} weight="bold" />
                          Approve
                        </button>
                        <button className="att-btn-danger" onClick={() => reject(p.attendance_id)}>
                          <X size={12} style={{ marginRight: 4 }} weight="bold" />
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {/* ─── STUDENT VIEW ─── */}
        {isStudent && selectedBatch && (
          <>
            {/* REQUEST BUTTON */}
            <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button
                className="att-btn-primary"
                onClick={requestAttendance}
                disabled={requesting}
              >
                {requesting ? <span className="att-spinner" /> : <ArrowClockwise size={15} weight="bold" />}
                {requesting ? 'Submitting…' : 'Request Attendance'}
              </button>

              {myRecord && (
                <span className={`att-badge ${myRecord.status}`}>
                  {myRecord.status === 'approved' ? <CheckCircle size={11} weight="fill" /> :
                   myRecord.status === 'rejected' ? <XCircle size={11} weight="fill" /> :
                                                    <Hourglass size={11} weight="fill" />}
                  Today: {myRecord.status}
                </span>
              )}
            </div>

            {/* HISTORY */}
            <div className="att-card">
              <div className="att-card-header">
                <div className="att-card-title">
                  <CalendarBlank size={16} /> My Attendance History
                </div>
              </div>

              {existingRecords.filter(r => r.student_id === user?.user_id).length === 0 ? (
                <div className="att-empty" style={{ padding: '2rem' }}>
                  <div style={{ fontSize: '0.85rem' }}>No attendance records found for this batch.</div>
                </div>
              ) : (
                existingRecords
                  .filter(r => r.student_id === user?.user_id)
                  .map(r => (
                    <div key={r.attendance_id} className="att-row">
                      <div>
                        <div className="att-student-name">{r.date}</div>
                        <div className="att-student-id">Batch #{r.batch_id ?? selectedBatch}</div>
                      </div>
                      <span className={`att-badge ${r.status}`}>
                        {r.status === 'approved' ? <CheckCircle size={11} weight="fill" /> :
                         r.status === 'rejected' ? <XCircle size={11} weight="fill" /> :
                                                   <Hourglass size={11} weight="fill" />}
                        {r.status}
                      </span>
                    </div>
                  ))
              )}
            </div>
          </>
        )}
      </div>

      {/* TOAST */}
      {toast && (
        <div className="att-toast" style={{
          borderColor: toast.type === 'error' ? 'rgba(239,68,68,.3)' : 'rgba(34,197,94,.3)',
          color: toast.type === 'error' ? 'var(--danger)' : 'var(--success)'
        }}>
          {toast.type === 'error'
            ? <XCircle size={16} weight="fill" />
            : <CheckCircle size={16} weight="fill" />}
          {toast.msg}
        </div>
      )}
    </>
  );
}
