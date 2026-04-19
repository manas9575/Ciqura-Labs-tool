import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import {
  Check, X, Clock, CalendarBlank, Users, ArrowClockwise,
  CheckCircle, XCircle, Hourglass, DownloadSimple,
  MagnifyingGlass, CaretLeft, CaretRight, ChartBar,
  ListChecks, UserCircle, Warning
} from '@phosphor-icons/react';

/* ─────────────────────────────────────────
   STATUS HELPERS
   Backend stores: "present" | "absent" | "pending" | "approved" | "rejected"
───────────────────────────────────────── */
const isPresent = s => s === 'present' || s === 'approved';
const isAbsent  = s => s === 'absent'  || s === 'rejected';

const displayStatus = s => {
  if (isPresent(s)) return 'present';
  if (isAbsent(s))  return 'absent';
  return 'pending';
};

/* ─────────────────────────────────────────
   CSS — matches your light theme
───────────────────────────────────────── */
const css = `
  .at-wrap {
    --blue:     #2563eb;
    --blue-lt:  #eff6ff;
    --blue-mid: #bfdbfe;
    --green:    #16a34a;
    --green-lt: #f0fdf4;
    --red:      #dc2626;
    --red-lt:   #fef2f2;
    --yellow:   #d97706;
    --yellow-lt:#fffbeb;
    --text:     #111827;
    --muted:    #6b7280;
    --border:   #e5e7eb;
    --bg:       #f9fafb;
    --white:    #ffffff;
    --radius:   8px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    color: var(--text);
    padding: 1.75rem 2rem 3rem;
    background: var(--bg);
    min-height: 100vh;
  }

  /* ── Page title ── */
  .at-page-title {
    font-size: 1.5rem;
    font-weight: 700;
    margin-bottom: 1.5rem;
    color: var(--text);
  }

  /* ── Top filter bar ── */
  .at-filter-bar {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding-bottom: 1.25rem;
    border-bottom: 1px solid var(--border);
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
  }
  .at-select, .at-date-input {
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--white);
    color: var(--text);
    font-size: 0.875rem;
    padding: 0.45rem 0.75rem;
    outline: none;
    cursor: pointer;
    transition: border-color .15s;
    font-family: inherit;
  }
  .at-select:focus, .at-date-input:focus { border-color: var(--blue); }
  .at-select { min-width: 160px; }

  /* ── Tabs ── */
  .at-tabs {
    display: flex;
    gap: 0;
    border-bottom: 1px solid var(--border);
    margin-bottom: 1.5rem;
    overflow-x: auto;
  }
  .at-tab {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 0.6rem 1rem;
    border: none;
    background: transparent;
    color: var(--muted);
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
    white-space: nowrap;
    font-family: inherit;
    transition: color .15s, border-color .15s;
  }
  .at-tab:hover { color: var(--text); }
  .at-tab.active { color: var(--blue); border-bottom-color: var(--blue); font-weight: 600; }
  .at-tab-count {
    background: #e5e7eb;
    border-radius: 99px;
    padding: 1px 6px;
    font-size: 0.7rem;
    font-weight: 700;
    color: var(--muted);
  }
  .at-tab.active .at-tab-count {
    background: var(--blue-lt);
    color: var(--blue);
  }

  /* ── Stats row ── */
  .at-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
    gap: 0.75rem;
    margin-bottom: 1.5rem;
  }
  .at-stat {
    background: var(--white);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 1rem 1.1rem;
  }
  .at-stat-val { font-size: 1.75rem; font-weight: 700; line-height: 1; }
  .at-stat-lbl { font-size: 0.72rem; color: var(--muted); text-transform: uppercase; letter-spacing: .05em; margin-top: 4px; }

  /* ── Table / card ── */
  .at-card {
    background: var(--white);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
    margin-bottom: 1.25rem;
  }
  .at-card-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.85rem 1.1rem;
    border-bottom: 1px solid var(--border);
    background: var(--white);
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .at-card-title {
    font-size: 0.875rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--text);
  }
  .at-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1.1rem;
    border-bottom: 1px solid var(--border);
    transition: background .1s;
  }
  .at-row:last-child { border-bottom: none; }
  .at-row:hover { background: var(--bg); }
  .at-name { font-size: 0.875rem; font-weight: 500; color: var(--text); }
  .at-sub  { font-size: 0.72rem; color: var(--muted); margin-top: 1px; }

  /* ── Badges ── */
  .at-badge {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: .04em;
    border-radius: 4px;
    padding: 2px 7px;
  }
  .at-badge.present, .at-badge.approved  { background: var(--green-lt); color: var(--green); }
  .at-badge.absent,  .at-badge.rejected  { background: var(--red-lt);   color: var(--red); }
  .at-badge.pending  { background: var(--yellow-lt); color: var(--yellow); }

  /* ── Mark buttons ── */
  .at-actions { display: flex; align-items: center; gap: 0.5rem; }
  .at-status-label {
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: .05em;
    text-transform: uppercase;
    padding: 3px 8px;
    border-radius: 4px;
    border: 1px solid;
  }
  .at-status-label.present { color: var(--green); border-color: var(--green); background: var(--green-lt); }
  .at-status-label.absent  { color: var(--red);   border-color: var(--red);   background: var(--red-lt); }
  .at-status-label.pending { color: var(--yellow); border-color: var(--yellow); background: var(--yellow-lt); }

  .at-mark-btn {
    width: 28px; height: 28px;
    border-radius: 6px;
    border: 1px solid var(--border);
    background: var(--white);
    display: grid; place-items: center;
    cursor: pointer;
    transition: all .15s;
    color: var(--muted);
  }
  .at-mark-btn:hover.p, .at-mark-btn.on.p { background: var(--green-lt); border-color: var(--green); color: var(--green); }
  .at-mark-btn:hover.a, .at-mark-btn.on.a { background: var(--red-lt);   border-color: var(--red);   color: var(--red); }
  .at-mark-btn.on.p { background: var(--green); color: #fff; border-color: var(--green); }
  .at-mark-btn.on.a { background: var(--red);   color: #fff; border-color: var(--red); }

  /* ── Buttons ── */
  .at-btn {
    display: inline-flex; align-items: center; gap: 5px;
    border-radius: var(--radius);
    font-size: 0.875rem; font-weight: 600;
    padding: 0.45rem 1rem;
    cursor: pointer; border: none;
    font-family: inherit;
    transition: opacity .15s, background .15s;
  }
  .at-btn:disabled { opacity: .5; cursor: not-allowed; }
  .at-btn.blue  { background: var(--blue); color: #fff; }
  .at-btn.blue:hover:not(:disabled)  { opacity: .88; }
  .at-btn.green { background: var(--green-lt); color: var(--green); border: 1px solid var(--green); }
  .at-btn.green:hover:not(:disabled) { background: #dcfce7; }
  .at-btn.red   { background: var(--red-lt); color: var(--red); border: 1px solid var(--red); }
  .at-btn.red:hover:not(:disabled)   { background: #fee2e2; }
  .at-btn.outline { background: var(--white); color: var(--text); border: 1px solid var(--border); }
  .at-btn.outline:hover:not(:disabled) { background: var(--bg); }
  .at-btn.sm { padding: 0.3rem 0.65rem; font-size: 0.78rem; }

  /* ── Search ── */
  .at-search { position: relative; }
  .at-search input {
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--white);
    color: var(--text);
    font-size: 0.85rem;
    padding: 0.4rem 0.75rem 0.4rem 2rem;
    outline: none; width: 200px;
    font-family: inherit;
    transition: border-color .15s;
  }
  .at-search input:focus { border-color: var(--blue); }
  .at-search input::placeholder { color: var(--muted); }
  .at-search-ico { position: absolute; left: 0.6rem; top: 50%; transform: translateY(-50%); color: var(--muted); pointer-events: none; }

  /* ── Progress bar ── */
  .at-bar { height: 5px; background: var(--border); border-radius: 99px; overflow: hidden; margin-top: 4px; width: 80px; }
  .at-bar-fill { height: 100%; border-radius: 99px; transition: width .4s; }

  /* ── Calendar ── */
  .at-cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
  .at-cal-head { text-align: center; font-size: 0.72rem; font-weight: 600; color: var(--muted); text-transform: uppercase; padding: 0.4rem 0; }
  .at-cal-cell {
    aspect-ratio: 1;
    border-radius: 6px;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    font-size: 0.8rem; font-weight: 500;
    cursor: default; transition: background .1s;
    position: relative;
  }
  .at-cal-cell.today { background: var(--blue-lt); color: var(--blue); font-weight: 700; }
  .at-cal-cell.has-data { cursor: pointer; }
  .at-cal-cell.has-data:hover { background: var(--bg); }
  .at-cal-cell.empty { visibility: hidden; }
  .at-dot { width: 5px; height: 5px; border-radius: 50%; margin-top: 2px; }

  /* ── Empty ── */
  .at-empty {
    display: flex; flex-direction: column; align-items: center;
    gap: 0.6rem; padding: 3rem 1.5rem;
    color: var(--muted); text-align: center;
  }

  /* ── Scrollable list ── */
  .at-scroll { max-height: 420px; overflow-y: auto; }
  .at-scroll::-webkit-scrollbar { width: 4px; }
  .at-scroll::-webkit-scrollbar-thumb { background: var(--border); border-radius: 99px; }

  /* ── Toast ── */
  @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  .at-toast {
    position: fixed; bottom: 1.5rem; right: 1.5rem; z-index: 9999;
    background: var(--white); border: 1px solid var(--border);
    border-radius: var(--radius); padding: 0.7rem 1rem;
    display: flex; align-items: center; gap: 0.5rem;
    font-size: 0.85rem; font-weight: 500;
    animation: fadeUp .2s ease;
    box-shadow: 0 4px 20px rgba(0,0,0,.1);
    color: var(--text);
  }

  /* ── Spinner ── */
  @keyframes spin { to { transform: rotate(360deg); } }
  .at-spin { width: 14px; height: 14px; border-radius: 50%; border: 2px solid #e5e7eb; border-top-color: #fff; animation: spin .6s linear infinite; display: inline-block; }
  .at-spin.dark { border-color: var(--border); border-top-color: var(--blue); }

  /* ── History row ── */
  .at-hist-row { display: flex; justify-content: space-between; align-items: center; padding: 0.65rem 1.1rem; border-bottom: 1px solid var(--border); }
  .at-hist-row:last-child { border-bottom: none; }
`;

/* ═══════════════════════════════════════
   COMPONENT
═══════════════════════════════════════ */
export default function Attendance() {
  const { user } = useAuth();
  const isFacultyOrAdmin = ['faculty', 'admin', 'super_admin'].includes(user?.role);
  const isStudent = user?.role === 'student';

  /* ── State ── */
  const [batches, setBatches]             = useState([]);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [date, setDate]                   = useState(new Date().toISOString().slice(0, 10));
  const [students, setStudents]           = useState([]);
  const [records, setRecords]             = useState({});
  const [allRecords, setAllRecords]       = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);

  const [activeTab, setActiveTab]         = useState(isFacultyOrAdmin ? 'daily' : 'request');
  const [search, setSearch]               = useState('');
  const [calMonth, setCalMonth]           = useState(() => {
    const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [selectedStudent, setSelectedStudent] = useState(null);

  const [loadingMain, setLoadingMain]     = useState(false);
  const [saving, setSaving]               = useState(false);
  const [requesting, setRequesting]       = useState(false);
  const [toast, setToast]                 = useState(null);

  const showToast = (msg, type = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  /* ── Load batches ── */
  useEffect(() => {
    api.get('/batches').then(r => setBatches(r.data)).catch(() => {});
  }, []);

  /* ── Load daily attendance ── */
  const loadDailyAttendance = useCallback(async () => {
    if (!selectedBatch) return;
    try {
      const res = await api.get(`/attendance?batch_id=${selectedBatch}&date=${date}`);
      const mapped = {};
      res.data.forEach(a => { mapped[a.student_id] = displayStatus(a.status); });
      setRecords(prev => ({ ...prev, ...mapped }));
    } catch {}
  }, [selectedBatch, date]);

  /* ── Load all attendance for batch ── */
  const loadAllAttendance = useCallback(async () => {
    if (!selectedBatch) return;
    try {
      const res = await api.get(`/attendance?batch_id=${selectedBatch}`);
      setAllRecords(res.data);
    } catch {}
  }, [selectedBatch]);

  /* ── Bootstrap on batch/date change ── */
  // ✅ FIX: Fetch enrollments + attendance together in one Promise.all,
  // then merge into a single setRecords call to avoid race conditions
  // where setRecords(init) could overwrite the loaded attendance data.
  useEffect(() => {
    if (!selectedBatch) return;
    setLoadingMain(true);
    setStudents([]);
    setRecords({});
    setAllRecords([]);
    setSelectedStudent(null);

    Promise.all([
      api.get(`/enrollments?batch_id=${selectedBatch}`),
      api.get(`/attendance?batch_id=${selectedBatch}&date=${date}`),
      api.get(`/attendance?batch_id=${selectedBatch}`),
      isFacultyOrAdmin ? api.get('/attendance/pending') : Promise.resolve({ data: [] })
    ])
      .then(([enrollRes, dailyRes, allRes, pendingRes]) => {
        setStudents(enrollRes.data);
        setAllRecords(allRes.data);
        if (isFacultyOrAdmin) setPendingRequests(pendingRes.data);

        // Start all students as pending, then overlay saved attendance
        const merged = {};
        enrollRes.data.forEach(e => { merged[e.student_id] = 'pending'; });
        dailyRes.data.forEach(a => { merged[a.student_id] = displayStatus(a.status); });
        setRecords(merged);
      })
      .catch(() => {})
      .finally(() => setLoadingMain(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBatch, date]);

  /* ─────────────── ACTIONS ─────────────── */

  const toggleRecord = (sid, status) =>
    setRecords(prev => ({ ...prev, [sid]: prev[sid] === status ? 'pending' : status }));

  const bulkMark = status => {
    const updated = {};
    filteredStudents.forEach(s => { updated[s.student_id] = status; });
    setRecords(prev => ({ ...prev, ...updated }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const recordsList = Object.entries(records).map(([student_id, status]) => ({ student_id, status }));
      await api.post('/attendance', { batch_id: selectedBatch, date, records: recordsList });
      await Promise.all([loadDailyAttendance(), loadAllAttendance()]);
      showToast('Attendance saved successfully!');
    } catch {
      showToast('Failed to save attendance.', 'err');
    } finally { setSaving(false); }
  };

  const requestAttendance = async () => {
    setRequesting(true);
    try {
      await api.post('/attendance/request', { batch_id: selectedBatch, date });
      await Promise.all([loadDailyAttendance(), loadAllAttendance()]);
      showToast('Attendance request submitted!');
    } catch (e) {
      showToast(e?.response?.data?.detail || 'Request failed.', 'err');
    } finally { setRequesting(false); }
  };

  const approve = async id => {
    try {
      await api.put(`/attendance/${id}/approve`);
      await Promise.all([loadDailyAttendance(), loadAllAttendance()]);
      setPendingRequests(prev => prev.filter(p => p.attendance_id !== id));
      showToast('Request approved.');
    } catch { showToast('Approval failed.', 'err'); }
  };

  const reject = async id => {
    try {
      await api.put(`/attendance/${id}/reject`);
      await Promise.all([loadDailyAttendance(), loadAllAttendance()]);
      setPendingRequests(prev => prev.filter(p => p.attendance_id !== id));
      showToast('Request rejected.');
    } catch { showToast('Rejection failed.', 'err'); }
  };

  const exportCSV = () => {
    if (!allRecords.length) return showToast('No data to export.', 'warn');
    const batchName = batches.find(b => b.batch_id === selectedBatch)?.name || selectedBatch;
    const rows = [['Student Name', 'Student ID', 'Date', 'Status', 'Batch']];
    allRecords.forEach(r => rows.push([r.student_name || '', r.student_id || '', r.date || '', r.status || '', batchName]));
    const csv  = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `attendance_${batchName}_${date}.csv`; a.click();
    URL.revokeObjectURL(url);
    showToast('CSV exported!');
  };

  /* ─────────────── DERIVED ─────────────── */

  const filteredStudents = useMemo(() =>
    students.filter(s =>
      !search ||
      s.student_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.student_id?.toLowerCase().includes(search.toLowerCase())
    ), [students, search]);

  const presentCount = Object.values(records).filter(v => v === 'present').length;
  const absentCount  = Object.values(records).filter(v => v === 'absent').length;
  const pendingCount = Object.values(records).filter(v => v === 'pending').length;

  const studentStats = useMemo(() =>
    students.map(s => {
      const recs    = allRecords.filter(r => r.student_id === s.student_id);
      const present = recs.filter(r => isPresent(r.status)).length;
      const total   = recs.length;
      const pct     = total > 0 ? Math.round(present / total * 100) : null;
      return { ...s, present, total, pct };
    }), [students, allRecords]);

  const calendarDays = useMemo(() => {
    const { year, month } = calMonth;
    const firstDay     = new Date(year, month, 1).getDay();
    const daysInMonth  = new Date(year, month + 1, 0).getDate();
    const today        = new Date().toISOString().slice(0, 10);
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr  = `${year}-${String(month + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const dayRecs  = allRecords.filter(r => r.date === dateStr);
      const presentD = dayRecs.filter(r => isPresent(r.status)).length;
      const myRec    = isStudent ? allRecords.find(r => r.date === dateStr && r.student_id === user?.user_id) : null;
      days.push({ d, dateStr, isToday: dateStr === today, dayRecs, presentD, myRec });
    }
    return days;
  }, [calMonth, allRecords, isStudent, user]);

  const myRecords = useMemo(() =>
    [...allRecords]
      .filter(r => r.student_id === user?.user_id)
      .sort((a, b) => b.date.localeCompare(a.date))
  , [allRecords, user]);

  const myPresent = myRecords.filter(r => isPresent(r.status)).length;
  const myPct     = myRecords.length > 0 ? Math.round(myPresent / myRecords.length * 100) : null;
  const monthLabel = new Date(calMonth.year, calMonth.month).toLocaleString('default', { month: 'long', year: 'numeric' });
  const batchName  = batches.find(b => b.batch_id === selectedBatch)?.name || '';

  /* ═══════════════════════════════════════
     RENDER
  ═══════════════════════════════════════ */
  return (
    <>
      <style>{css}</style>
      <div className="at-wrap">

        {/* PAGE TITLE */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem' }}>
          <h1 className="at-page-title" style={{ margin:0 }}>Attendance</h1>
          {isFacultyOrAdmin && selectedBatch && allRecords.length > 0 && (
            <button className="at-btn outline" onClick={exportCSV}>
              <DownloadSimple size={15} /> Export CSV
            </button>
          )}
        </div>

        {/* FILTER BAR */}
        <div className="at-filter-bar">
          <select className="at-select" value={selectedBatch} onChange={e => setSelectedBatch(e.target.value)}>
            <option value="">Select batch</option>
            {batches.map(b => <option key={b.batch_id} value={b.batch_id}>{b.name}</option>)}
          </select>

          {activeTab === 'daily' && (
            <input type="date" className="at-date-input" value={date} onChange={e => setDate(e.target.value)} />
          )}

          {isFacultyOrAdmin && activeTab === 'daily' && selectedBatch && (
            <button className="at-btn blue" onClick={handleSave} disabled={saving || !students.length}>
              {saving ? <span className="at-spin" /> : <Check size={15} weight="bold" />}
              {saving ? 'Saving…' : 'Save Attendance'}
            </button>
          )}
        </div>

        {/* NO BATCH */}
        {!selectedBatch && (
          <div className="at-card">
            <div className="at-empty">
              <Users size={40} color="#d1d5db" />
              <div>
                <div style={{ fontWeight:600, color:'' }}>No batch selected</div>
                <div style={{ fontSize:'.82rem', marginTop:2 }}>Select a batch above to get started.</div>
              </div>
            </div>
          </div>
        )}

        {selectedBatch && (
          <>
            {/* TABS */}
            <div className="at-tabs">
              {isFacultyOrAdmin && <>
                <button className={`at-tab ${activeTab==='daily'?'active':''}`} onClick={() => setActiveTab('daily')}>
                  <Check size={14} weight="bold" /> Daily Mark
                </button>
                <button className={`at-tab ${activeTab==='calendar'?'active':''}`} onClick={() => setActiveTab('calendar')}>
                  <CalendarBlank size={14} /> Calendar
                </button>
                <button className={`at-tab ${activeTab==='students'?'active':''}`} onClick={() => setActiveTab('students')}>
                  <ChartBar size={14} /> Student Stats
                </button>
                <button className={`at-tab ${activeTab==='requests'?'active':''}`} onClick={() => setActiveTab('requests')}>
                  <Clock size={14} /> Pending Requests
                  {pendingRequests.length > 0 && (
                    <span className="at-tab-count">{pendingRequests.length}</span>
                  )}
                </button>
              </>}

              {isStudent && <>
                <button className={`at-tab ${activeTab==='request'?'active':''}`} onClick={() => setActiveTab('request')}>
                  <ArrowClockwise size={14} /> Request Attendance
                </button>
                <button className={`at-tab ${activeTab==='history'?'active':''}`} onClick={() => setActiveTab('history')}>
                  <ListChecks size={14} /> My History
                </button>
                <button className={`at-tab ${activeTab==='calendar'?'active':''}`} onClick={() => setActiveTab('calendar')}>
                  <CalendarBlank size={14} /> Calendar
                </button>
              </>}
            </div>

            {/* ══════════════════════
                DAILY MARK (Faculty)
            ══════════════════════ */}
            {isFacultyOrAdmin && activeTab === 'daily' && (
              <>
                {/* Stats */}
                <div className="at-stats">
                  <div className="at-stat">
                    <div className="at-stat-val">{students.length}</div>
                    <div className="at-stat-lbl">Total</div>
                  </div>
                  <div className="at-stat">
                    <div className="at-stat-val" style={{ color:'var(--green)' }}>{presentCount}</div>
                    <div className="at-stat-lbl">Present</div>
                  </div>
                  <div className="at-stat">
                    <div className="at-stat-val" style={{ color:'var(--red)' }}>{absentCount}</div>
                    <div className="at-stat-lbl">Absent</div>
                  </div>
                  <div className="at-stat">
                    <div className="at-stat-val" style={{ color:'var(--yellow)' }}>{pendingCount}</div>
                    <div className="at-stat-lbl">Pending</div>
                  </div>
                </div>

                {/* Student list */}
                <div className="at-card">
                  <div className="at-card-head">
                    <div className="at-card-title">
                      <Users size={15} color="#6b7280" />
                      Students
                      <span style={{ background:'#eff6ff', color:'var(--blue)', borderRadius:4, padding:'1px 6px', fontSize:'.7rem', fontWeight:700 }}>
                        {filteredStudents.length}
                      </span>
                    </div>
                    <div style={{ display:'flex', gap:'.5rem', alignItems:'center', flexWrap:'wrap' }}>
                      <div className="at-search">
                        <MagnifyingGlass size={13} className="at-search-ico" />
                        <input placeholder="Search students…" value={search} onChange={e => setSearch(e.target.value)} />
                      </div>
                      <button className="at-btn outline sm" onClick={() => bulkMark('present')}>
                        <Check size={12} weight="bold" /> All Present
                      </button>
                      <button className="at-btn outline sm" onClick={() => bulkMark('absent')}>
                        <X size={12} weight="bold" /> All Absent
                      </button>
                    </div>
                  </div>

                  {loadingMain ? (
                    <div className="at-empty">
                      <span className="at-spin dark" style={{ width:20, height:20 }} />
                    </div>
                  ) : filteredStudents.length === 0 ? (
                    <div className="at-empty"><div style={{ fontSize:'.85rem' }}>No students found.</div></div>
                  ) : (
                    <div className="at-scroll">
                      {filteredStudents.map(s => {
                        const status = records[s.student_id] || 'pending';
                        return (
                          <div key={s.student_id} className="at-row">
                            <div>
                              <div className="at-name">{s.student_name}</div>
                              <div className="at-sub">#{s.student_id}</div>
                            </div>
                            <div className="at-actions">
                              <span className={`at-status-label ${status}`}>
                                {status === 'present' ? 'PRESENT' : status === 'absent' ? 'ABSENT' : 'PENDING'}
                              </span>
                              <button
                                className={`at-mark-btn p ${status === 'present' ? 'on' : ''}`}
                                title="Mark Present"
                                onClick={() => toggleRecord(s.student_id, 'present')}
                              ><Check size={13} weight="bold" /></button>
                              <button
                                className={`at-mark-btn a ${status === 'absent' ? 'on' : ''}`}
                                title="Mark Absent"
                                onClick={() => toggleRecord(s.student_id, 'absent')}
                              ><X size={13} weight="bold" /></button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ══════════════════════
                STUDENT STATS (Faculty)
            ══════════════════════ */}
            {isFacultyOrAdmin && activeTab === 'students' && (
              <div className="at-card">
                {selectedStudent ? (
                  <>
                    <div className="at-card-head">
                      <div className="at-card-title">
                        <UserCircle size={15} color="#6b7280" /> {selectedStudent.student_name}
                      </div>
                      <button className="at-btn outline sm" onClick={() => setSelectedStudent(null)}>← Back</button>
                    </div>
                    {(() => {
                      const hist   = allRecords.filter(r => r.student_id === selectedStudent.student_id).sort((a,b) => b.date.localeCompare(a.date));
                      const pres   = hist.filter(r => isPresent(r.status)).length;
                      const pct    = hist.length > 0 ? Math.round(pres / hist.length * 100) : null;
                      const color  = pct === null ? '' : pct >= 75 ? 'var(--green)' : pct >= 50 ? 'var(--yellow)' : 'var(--red)';
                      return hist.length === 0 ? (
                        <div className="at-empty"><div style={{ fontSize:'.85rem' }}>No records yet.</div></div>
                      ) : (
                        <>
                          <div style={{ display:'flex', gap:'2rem', padding:'.85rem 1.1rem', borderBottom:'1px solid var(--border)' }}>
                            {[
                              { val:hist.length, lbl:'Total', col:'' },
                              { val:pres, lbl:'Present', col:'var(--green)' },
                              { val:hist.length-pres, lbl:'Absent', col:'var(--red)' },
                              { val: pct !== null ? `${pct}%` : '—', lbl:'Rate', col:color },
                            ].map(s => (
                              <div key={s.lbl}>
                                <div style={{ fontSize:'1.25rem', fontWeight:700, color:s.col||'var(--text)' }}>{s.val}</div>
                                <div style={{ fontSize:'.7rem', color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.05em' }}>{s.lbl}</div>
                              </div>
                            ))}
                          </div>
                          <div className="at-scroll">
                            {hist.map(r => (
                              <div key={r.attendance_id} className="at-hist-row">
                                <span style={{ fontSize:'.875rem' }}>{r.date}</span>
                                <span className={`at-badge ${displayStatus(r.status)}`}>{r.status}</span>
                              </div>
                            ))}
                          </div>
                        </>
                      );
                    })()}
                  </>
                ) : (
                  <>
                    <div className="at-card-head">
                      <div className="at-card-title"><ChartBar size={15} color="#6b7280" /> Attendance Statistics</div>
                      <div className="at-search">
                        <MagnifyingGlass size={13} className="at-search-ico" />
                        <input placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} />
                      </div>
                    </div>
                    {studentStats.length === 0 ? (
                      <div className="at-empty"><div style={{ fontSize:'.85rem' }}>No data yet.</div></div>
                    ) : (
                      <div className="at-scroll">
                        {studentStats
                          .filter(s => !search || s.student_name?.toLowerCase().includes(search.toLowerCase()))
                          .map(s => {
                            const color = s.pct === null ? 'var(--muted)' : s.pct >= 75 ? 'var(--green)' : s.pct >= 50 ? 'var(--yellow)' : 'var(--red)';
                            return (
                              <div key={s.student_id} className="at-row" style={{ cursor:'pointer' }} onClick={() => setSelectedStudent(s)}>
                                <div>
                                  <div className="at-name">{s.student_name}</div>
                                  <div className="at-sub">{s.present} of {s.total} days present</div>
                                </div>
                                <div style={{ textAlign:'right' }}>
                                  {s.pct === null
                                    ? <span style={{ color:'var(--muted)', fontSize:'.8rem' }}>No records</span>
                                    : <>
                                        <div style={{ fontSize:'.9rem', fontWeight:700, color }}>{s.pct}%</div>
                                        <div className="at-bar">
                                          <div className="at-bar-fill" style={{ width:`${s.pct}%`, background:color }} />
                                        </div>
                                      </>
                                  }
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ══════════════════════
                PENDING REQUESTS (Faculty)
            ══════════════════════ */}
            {isFacultyOrAdmin && activeTab === 'requests' && (
              <div className="at-card">
                <div className="at-card-head">
                  <div className="at-card-title"><Clock size={15} color="#6b7280" /> Pending Requests</div>
                </div>
                {pendingRequests.length === 0 ? (
                  <div className="at-empty">
                    <CheckCircle size={36} color="#d1d5db" />
                    <div style={{ fontSize:'.85rem' }}>No pending requests.</div>
                  </div>
                ) : (
                  pendingRequests.map(p => (
                    <div key={p.attendance_id} className="at-row">
                      <div>
                        <div className="at-name">{p.student_name}</div>
                        <div className="at-sub">{p.date} · self-request</div>
                      </div>
                      <div style={{ display:'flex', gap:'.5rem' }}>
                        <button className="at-btn green sm" onClick={() => approve(p.attendance_id)}>Approve</button>
                        <button className="at-btn red sm"   onClick={() => reject(p.attendance_id)}>Reject</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ══════════════════════
                CALENDAR (Faculty + Student)
            ══════════════════════ */}
            {activeTab === 'calendar' && (
              <div className="at-card">
                <div className="at-card-head">
                  <div className="at-card-title">
                    <CalendarBlank size={15} color="#6b7280" /> {monthLabel}
                  </div>
                  <div style={{ display:'flex', gap:'.4rem' }}>
                    <button className="at-btn outline sm" onClick={() => setCalMonth(m => { const d = new Date(m.year, m.month-1); return { year:d.getFullYear(), month:d.getMonth() }; })}>
                      <CaretLeft size={13} />
                    </button>
                    <button className="at-btn outline sm" onClick={() => { const d=new Date(); setCalMonth({ year:d.getFullYear(), month:d.getMonth() }); }}>
                      Today
                    </button>
                    <button className="at-btn outline sm" onClick={() => setCalMonth(m => { const d = new Date(m.year, m.month+1); return { year:d.getFullYear(), month:d.getMonth() }; })}>
                      <CaretRight size={13} />
                    </button>
                  </div>
                </div>

                <div style={{ padding:'1rem 1.1rem 1.25rem' }}>
                  <div className="at-cal-grid">
                    {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
                      <div key={d} className="at-cal-head">{d}</div>
                    ))}
                    {calendarDays.map((day, i) => {
                      if (!day) return <div key={`e-${i}`} className="at-cal-cell empty" />;
                      const hasData = day.dayRecs.length > 0;
                      let dotColor  = null;
                      if (isStudent && day.myRec) {
                        dotColor = isPresent(day.myRec.status) ? 'var(--green)' : isAbsent(day.myRec.status) ? 'var(--red)' : 'var(--yellow)';
                      } else if (isFacultyOrAdmin && hasData) {
                        const pct = day.presentD / day.dayRecs.length;
                        dotColor  = pct >= .75 ? 'var(--green)' : pct >= .5 ? 'var(--yellow)' : 'var(--red)';
                      }
                      return (
                        <div
                          key={day.dateStr}
                          className={`at-cal-cell ${day.isToday ? 'today' : ''} ${hasData ? 'has-data' : ''}`}
                          title={isFacultyOrAdmin && hasData ? `${day.presentD}/${day.dayRecs.length} present` : ''}
                          onClick={() => { if (hasData && isFacultyOrAdmin) { setDate(day.dateStr); setActiveTab('daily'); } }}
                        >
                          <span>{day.d}</span>
                          {dotColor && <div className="at-dot" style={{ background:dotColor }} />}
                        </div>
                      );
                    })}
                  </div>

                  {/* Legend */}
                  <div style={{ display:'flex', gap:'1rem', marginTop:'.85rem', flexWrap:'wrap' }}>
                    {isFacultyOrAdmin
                      ? [['var(--green)','≥ 75% present'],['var(--yellow)','50–74% present'],['var(--red)','< 50% present']]
                      : [['var(--green)','Present / Approved'],['var(--yellow)','Pending'],['var(--red)','Absent / Rejected']]
                    }.map(([c,l]) => (
                      <div key={l} style={{ display:'flex', alignItems:'center', gap:5, fontSize:'.72rem', color:'var(--muted)' }}>
                        <div style={{ width:7, height:7, borderRadius:'50%', background:c }} /> {l}
                      </div>
                    ))}
                    {isFacultyOrAdmin && <span style={{ fontSize:'.72rem', color:'var(--muted)' }}>· Click a day to mark attendance</span>}
                  </div>
                </div>
              </div>
            )}

            {/* ══════════════════════
                STUDENT REQUEST
            ══════════════════════ */}
            {isStudent && activeTab === 'request' && (
              <>
                {myRecords.length > 0 && (
                  <div className="at-stats">
                    <div className="at-stat">
                      <div className="at-stat-val">{myRecords.length}</div>
                      <div className="at-stat-lbl">Total Days</div>
                    </div>
                    <div className="at-stat">
                      <div className="at-stat-val" style={{ color:'var(--green)' }}>{myPresent}</div>
                      <div className="at-stat-lbl">Present</div>
                    </div>
                    <div className="at-stat">
                      <div className="at-stat-val" style={{ color: myPct >= 75 ? 'var(--green)' : myPct >= 50 ? 'var(--yellow)' : 'var(--red)' }}>
                        {myPct !== null ? `${myPct}%` : '—'}
                      </div>
                      <div className="at-stat-lbl">Attendance %</div>
                    </div>
                  </div>
                )}

                <div className="at-card">
                  <div className="at-card-head">
                    <div className="at-card-title"><ArrowClockwise size={15} color="#6b7280" /> Request Attendance</div>
                  </div>
                  <div style={{ padding:'1.1rem', display:'flex', alignItems:'flex-end', gap:'.75rem', flexWrap:'wrap' }}>
                    <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                      <label style={{ fontSize:'.72rem', fontWeight:600, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.05em' }}>Date</label>
                      <input type="date" className="at-date-input" value={date} onChange={e => setDate(e.target.value)} />
                    </div>
                    <button className="at-btn blue" onClick={requestAttendance} disabled={requesting}>
                      {requesting ? <span className="at-spin" /> : <ArrowClockwise size={14} />}
                      {requesting ? 'Submitting…' : 'Request Attendance'}
                    </button>
                    {(() => {
                      const rec = allRecords.find(r => r.date === date && r.student_id === user?.user_id);
                      return rec ? (
                        <div style={{ display:'flex', alignItems:'center', gap:6, padding:'.4rem .75rem', border:'1px solid var(--border)', borderRadius:6, background:'var(--bg)' }}>
                          <span style={{ fontSize:'.78rem', color:'var(--muted)' }}>Status for {date}:</span>
                          <span className={`at-badge ${rec.status}`}>{rec.status}</span>
                        </div>
                      ) : null;
                    })()}
                  </div>
                  <div style={{ padding:'0 1.1rem .85rem', fontSize:'.78rem', color:'var(--muted)', display:'flex', gap:5, alignItems:'center' }}>
                    <Warning size={13} /> One request per day per batch. Faculty must approve it.
                  </div>
                </div>
              </>
            )}

            {/* ══════════════════════
                STUDENT HISTORY
            ══════════════════════ */}
            {isStudent && activeTab === 'history' && (
              <div className="at-card">
                <div className="at-card-head">
                  <div className="at-card-title"><ListChecks size={15} color="#6b7280" /> My Attendance History</div>
                  {myPct !== null && (
                    <span style={{ fontSize:'.875rem', fontWeight:700, color: myPct >= 75 ? 'var(--green)' : myPct >= 50 ? 'var(--yellow)' : 'var(--red)' }}>
                      Overall: {myPct}%
                    </span>
                  )}
                </div>
                {myRecords.length === 0 ? (
                  <div className="at-empty">
                    <CalendarBlank size={36} color="#d1d5db" />
                    <div style={{ fontSize:'.85rem' }}>No attendance records yet.</div>
                  </div>
                ) : (
                  <div className="at-scroll">
                    {myRecords.map(r => (
                      <div key={r.attendance_id} className="at-hist-row">
                        <div>
                          <div className="at-name">{r.date}</div>
                          <div className="at-sub">{batchName}</div>
                        </div>
                        <span className={`at-badge ${r.status}`}>
                          {isPresent(r.status) ? <CheckCircle size={10} weight="fill" /> :
                           isAbsent(r.status)  ? <XCircle size={10} weight="fill" /> :
                                                  <Hourglass size={10} weight="fill" />}
                          {r.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* TOAST */}
      {toast && (
        <div className="at-toast" style={{ borderColor: toast.type === 'err' ? '#fca5a5' : toast.type === 'warn' ? '#fcd34d' : '#86efac' }}>
          {toast.type === 'err'  ? <XCircle size={15} color="var(--red)" weight="fill" /> :
           toast.type === 'warn' ? <Warning  size={15} color="var(--yellow)" weight="fill" /> :
                                   <CheckCircle size={15} color="var(--green)" weight="fill" />}
          {toast.msg}
        </div>
      )}
    </>
  );
}