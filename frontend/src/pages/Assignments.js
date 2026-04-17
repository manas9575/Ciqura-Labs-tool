import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api, { BACKEND_URL } from '../lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Plus, UploadSimple, Trash } from '@phosphor-icons/react';

export default function Assignments() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [batches, setBatches] = useState([]);
  const [open, setOpen] = useState(false);
  const [gradeOpen, setGradeOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [form, setForm] = useState({ batch_id: '', title: '', description: '', due_date: '' });
  const [gradeForm, setGradeForm] = useState({ submission_id: '', grade: '', feedback: '' });
  const [submitFile, setSubmitFile] = useState(null);
  const canCreate = ['faculty', 'admin', 'super_admin'].includes(user?.role);

  const load = () => {
    api.get('/assignments').then(r => setAssignments(r.data)).catch(() => {});
    api.get('/batches').then(r => setBatches(r.data)).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    await api.post('/assignments', form);
    setOpen(false);
    setForm({ batch_id: '', title: '', description: '', due_date: '' });
    load();
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete assignment?')) { await api.delete(`/assignments/${id}`); load(); }
  };

  const handleSubmit = async (assignmentId) => {
    const formData = new FormData();
    if (submitFile) formData.append('file', submitFile);
    await api.post(`/submissions?assignment_id=${assignmentId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    setSubmitFile(null);
    load();
  };

  const viewSubmissions = async (assignmentId) => {
    setSelectedAssignment(assignmentId);
    const r = await api.get(`/submissions?assignment_id=${assignmentId}`);
    setSubmissions(r.data);
    setGradeOpen(true);
  };

  const handleGrade = async () => {
    await api.put(`/submissions/${gradeForm.submission_id}/grade`, { grade: gradeForm.grade, feedback: gradeForm.feedback });
    const r = await api.get(`/submissions?assignment_id=${selectedAssignment}`);
    setSubmissions(r.data);
    setGradeForm({ submission_id: '', grade: '', feedback: '' });
  };

  const isStudent = user?.role === 'student';

  return (
    <div data-testid="assignments-page">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)', fontFamily: 'Outfit' }}>Assignments</h1>
        {canCreate && (
          <button onClick={() => setOpen(true)} data-testid="add-assignment-btn"
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white transition-colors duration-150"
            style={{ background: 'var(--brand)', fontFamily: 'IBM Plex Sans' }}>
            <Plus size={16} /> New Assignment
          </button>
        )}
      </div>

      <div className="space-y-3">
        {assignments.map(a => (
          <div key={a.assignment_id} data-testid={`assignment-${a.assignment_id}`} className="border p-4" style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-medium tracking-tight" style={{ color: 'var(--text-primary)', fontFamily: 'Outfit' }}>{a.title}</h3>
                <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>{a.description}</p>
                <div className="flex gap-4 mt-2 text-xs" style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>
                  <span>{a.batch_name} / {a.course_name}</span>
                  <span>Due: {a.due_date?.slice(0, 10)}</span>
                  {!isStudent && <span>{a.submission_count} submissions</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {canCreate && (
                  <>
                    <button onClick={() => viewSubmissions(a.assignment_id)} data-testid={`view-submissions-${a.assignment_id}`}
                      className="px-3 py-1.5 text-xs border transition-colors duration-150 hover:bg-[var(--surface)]"
                      style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>
                      Submissions
                    </button>
                    <button onClick={() => handleDelete(a.assignment_id)} className="p-1" style={{ color: 'var(--alert)' }}>
                      <Trash size={16} />
                    </button>
                  </>
                )}
              </div>
            </div>

            {isStudent && (
              <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                {a.my_submission ? (
                  <div className="flex items-center justify-between text-sm" style={{ fontFamily: 'IBM Plex Sans' }}>
                    <span style={{ color: 'var(--success)' }}>Submitted {a.my_submission.submitted_at?.slice(0, 10)}</span>
                    {a.my_submission.grade && (
                      <span className="px-2 py-1 border text-xs font-medium" style={{ borderColor: 'var(--brand)', color: 'var(--brand)' }}>
                        Grade: {a.my_submission.grade}
                      </span>
                    )}
                    {a.my_submission.feedback && <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Feedback: {a.my_submission.feedback}</p>}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <input type="file" onChange={e => setSubmitFile(e.target.files[0])} data-testid={`submit-file-${a.assignment_id}`}
                      className="text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }} />
                    <button onClick={() => handleSubmit(a.assignment_id)} data-testid={`submit-assignment-${a.assignment_id}`}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white transition-colors duration-150"
                      style={{ background: 'var(--brand)', fontFamily: 'IBM Plex Sans' }}>
                      <UploadSimple size={12} /> Submit
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        {assignments.length === 0 && (
          <div className="text-center py-12 border text-sm" style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>
            No assignments found.
          </div>
        )}
      </div>

      {/* Create Assignment Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent style={{ background: 'var(--bg)' }}>
          <DialogHeader><DialogTitle style={{ fontFamily: 'Outfit' }}>New Assignment</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-xs uppercase tracking-widest font-medium mb-1 block" style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>Batch</label>
              <select value={form.batch_id} onChange={e => setForm({ ...form, batch_id: e.target.value })} data-testid="assignment-batch-select"
                className="w-full px-3 py-2 border text-sm bg-transparent outline-none" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)', fontFamily: 'IBM Plex Sans' }}>
                <option value="">Select batch</option>
                {batches.map(b => <option key={b.batch_id} value={b.batch_id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest font-medium mb-1 block" style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>Title</label>
              <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} data-testid="assignment-title-input"
                className="w-full px-3 py-2 border text-sm bg-transparent outline-none" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)', fontFamily: 'IBM Plex Sans' }} />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest font-medium mb-1 block" style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>Description</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} data-testid="assignment-desc-input"
                className="w-full px-3 py-2 border text-sm bg-transparent outline-none" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)', fontFamily: 'IBM Plex Sans' }} />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest font-medium mb-1 block" style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>Due Date</label>
              <input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} data-testid="assignment-due-input"
                className="w-full px-3 py-2 border text-sm bg-transparent outline-none" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)', fontFamily: 'IBM Plex Sans' }} />
            </div>
            <button onClick={handleCreate} data-testid="save-assignment-btn"
              className="w-full py-2.5 text-sm font-medium text-white" style={{ background: 'var(--brand)', fontFamily: 'IBM Plex Sans' }}>
              Create Assignment
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Submissions/Grade Dialog */}
      <Dialog open={gradeOpen} onOpenChange={setGradeOpen}>
        <DialogContent className="max-w-2xl" style={{ background: 'var(--bg)' }}>
          <DialogHeader><DialogTitle style={{ fontFamily: 'Outfit' }}>Submissions</DialogTitle></DialogHeader>
          <div className="mt-4 space-y-3">
            {submissions.map(s => (
              <div key={s.submission_id} className="border p-3" style={{ borderColor: 'var(--border)' }}>
                <div className="flex justify-between items-center text-sm" style={{ fontFamily: 'IBM Plex Sans' }}>
                  <span style={{ color: 'var(--text-primary)' }}>{s.student_name}</span>
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{s.submitted_at?.slice(0, 10)}</span>
                </div>
                {s.grade && <span className="text-xs mt-1 inline-block px-2 py-0.5 border" style={{ borderColor: 'var(--brand)', color: 'var(--brand)' }}>Grade: {s.grade}</span>}
                {!s.grade && canCreate && (
                  <div className="flex gap-2 mt-2">
                    <input placeholder="Grade" value={gradeForm.submission_id === s.submission_id ? gradeForm.grade : ''} data-testid={`grade-input-${s.submission_id}`}
                      onChange={e => setGradeForm({ ...gradeForm, submission_id: s.submission_id, grade: e.target.value })}
                      className="px-2 py-1 border text-xs bg-transparent outline-none w-20" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)', fontFamily: 'IBM Plex Sans' }} />
                    <input placeholder="Feedback" value={gradeForm.submission_id === s.submission_id ? gradeForm.feedback : ''} data-testid={`feedback-input-${s.submission_id}`}
                      onChange={e => setGradeForm({ ...gradeForm, submission_id: s.submission_id, feedback: e.target.value })}
                      className="px-2 py-1 border text-xs bg-transparent outline-none flex-1" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)', fontFamily: 'IBM Plex Sans' }} />
                    <button onClick={handleGrade} data-testid={`save-grade-${s.submission_id}`}
                      className="px-3 py-1 text-xs text-white" style={{ background: 'var(--brand)', fontFamily: 'IBM Plex Sans' }}>Save</button>
                  </div>
                )}
              </div>
            ))}
            {submissions.length === 0 && <p className="text-center py-6 text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>No submissions yet.</p>}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
