import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api, { BACKEND_URL } from '../lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Plus, DownloadSimple, Receipt } from '@phosphor-icons/react';

export default function Fees() {
  const { user } = useAuth();
  const [fees, setFees] = useState([]);
  const [payments, setPayments] = useState([]);
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [feeOpen, setFeeOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [feeForm, setFeeForm] = useState({ student_id: '', course_id: '', amount: '', due_date: '' });
  const [payForm, setPayForm] = useState({ fee_id: '', amount: '', payment_mode: 'cash' });
  const isAdmin = ['super_admin', 'admin'].includes(user?.role);

  const load = () => {
    api.get('/fees').then(r => setFees(r.data)).catch(() => {});
    api.get('/payments').then(r => setPayments(r.data)).catch(() => {});
    if (isAdmin) {
      api.get('/users?role=student').then(r => setStudents(r.data)).catch(() => {});
      api.get('/courses').then(r => setCourses(r.data)).catch(() => {});
    }
  };
  useEffect(() => { load(); }, []);

  const handleCreateFee = async () => {
    await api.post('/fees', { ...feeForm, amount: parseFloat(feeForm.amount) || 0 });
    setFeeOpen(false);
    setFeeForm({ student_id: '', course_id: '', amount: '', due_date: '' });
    load();
  };

  const handlePayment = async () => {
    await api.post('/payments', { ...payForm, amount: parseFloat(payForm.amount) || 0 });
    setPayOpen(false);
    setPayForm({ fee_id: '', amount: '', payment_mode: 'cash' });
    load();
  };

  const downloadReceipt = (paymentId) => {
    window.open(`${BACKEND_URL}/api/payments/${paymentId}/receipt`, '_blank');
  };

  const exportFees = () => {
    window.open(`${BACKEND_URL}/api/export/fees`, '_blank');
  };

  const statusColors = { paid: 'var(--success)', partial: 'var(--warning)', pending: 'var(--alert)' };

  return (
    <div data-testid="fees-page">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)', fontFamily: 'Outfit' }}>
          {isAdmin ? 'Fee Management' : 'My Fees'}
        </h1>
        <div className="flex gap-2">
          {isAdmin && (
            <>
              <button onClick={() => setFeeOpen(true)} data-testid="add-fee-btn"
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white transition-colors duration-150"
                style={{ background: 'var(--brand)', fontFamily: 'IBM Plex Sans' }}>
                <Plus size={16} /> Add Fee
              </button>
              <button onClick={exportFees} data-testid="export-fees-btn"
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium border transition-colors duration-150 hover:bg-[var(--surface)]"
                style={{ borderColor: 'var(--border)', color: 'var(--text-primary)', fontFamily: 'IBM Plex Sans' }}>
                <DownloadSimple size={16} /> Export
              </button>
            </>
          )}
        </div>
      </div>

      {/* Fees Table */}
      <div className="border mb-6" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
        <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <h3 className="text-lg font-medium tracking-tight" style={{ color: 'var(--text-primary)', fontFamily: 'Outfit' }}>Fee Records</h3>
        </div>
        <table className="w-full text-sm" style={{ fontFamily: 'IBM Plex Sans' }}>
          <thead>
            <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
              {[isAdmin && 'Student', 'Course', 'Amount', 'Paid', 'Balance', 'Due Date', 'Status', 'Actions'].filter(Boolean).map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs uppercase tracking-widest font-medium" style={{ color: 'var(--text-secondary)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {fees.map(f => (
              <tr key={f.fee_id} className="border-b last:border-0 transition-colors duration-150 hover:bg-[var(--surface)]" style={{ borderColor: 'var(--border)' }}>
                {isAdmin && <td className="px-4 py-3" style={{ color: 'var(--text-primary)' }}>{f.student_name}</td>}
                <td className="px-4 py-3" style={{ color: 'var(--brand)' }}>{f.course_name}</td>
                <td className="px-4 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>${f.amount}</td>
                <td className="px-4 py-3" style={{ color: 'var(--success)' }}>${f.total_paid}</td>
                <td className="px-4 py-3" style={{ color: f.balance > 0 ? 'var(--alert)' : 'var(--success)' }}>${f.balance}</td>
                <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{f.due_date?.slice(0, 10)}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 text-xs font-medium uppercase border" style={{ borderColor: statusColors[f.status], color: statusColors[f.status] }}>
                    {f.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {isAdmin && f.status !== 'paid' && (
                    <button onClick={() => { setPayForm({ fee_id: f.fee_id, amount: f.balance, payment_mode: 'cash' }); setPayOpen(true); }}
                      data-testid={`record-payment-${f.fee_id}`}
                      className="px-2 py-1 text-xs border transition-colors duration-150 hover:bg-[var(--surface)]"
                      style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>
                      Pay
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {fees.length === 0 && <div className="text-center py-12 text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>No fee records.</div>}
      </div>

      {/* Payments Table */}
      <div className="border" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
        <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <h3 className="text-lg font-medium tracking-tight" style={{ color: 'var(--text-primary)', fontFamily: 'Outfit' }}>Payment History</h3>
        </div>
        <table className="w-full text-sm" style={{ fontFamily: 'IBM Plex Sans' }}>
          <thead>
            <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
              {['Receipt #', isAdmin && 'Student', 'Amount', 'Mode', 'Date', 'Receipt'].filter(Boolean).map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs uppercase tracking-widest font-medium" style={{ color: 'var(--text-secondary)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {payments.map(p => (
              <tr key={p.payment_id} className="border-b last:border-0 transition-colors duration-150 hover:bg-[var(--surface)]" style={{ borderColor: 'var(--border)' }}>
                <td className="px-4 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>{p.receipt_number}</td>
                {isAdmin && <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{p.student_name}</td>}
                <td className="px-4 py-3 font-medium" style={{ color: 'var(--success)' }}>${p.amount}</td>
                <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{p.payment_mode}</td>
                <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{p.payment_date?.slice(0, 10)}</td>
                <td className="px-4 py-3">
                  <button onClick={() => downloadReceipt(p.payment_id)} data-testid={`download-receipt-${p.payment_id}`}
                    className="flex items-center gap-1 px-2 py-1 text-xs border transition-colors duration-150 hover:bg-[var(--surface)]"
                    style={{ borderColor: 'var(--border)', color: 'var(--brand)', fontFamily: 'IBM Plex Sans' }}>
                    <Receipt size={12} /> PDF
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {payments.length === 0 && <div className="text-center py-12 text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>No payments yet.</div>}
      </div>

      {/* Add Fee Dialog */}
      <Dialog open={feeOpen} onOpenChange={setFeeOpen}>
        <DialogContent style={{ background: 'var(--bg)' }}>
          <DialogHeader><DialogTitle style={{ fontFamily: 'Outfit' }}>Add Fee</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-xs uppercase tracking-widest font-medium mb-1 block" style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>Student</label>
              <select value={feeForm.student_id} onChange={e => setFeeForm({ ...feeForm, student_id: e.target.value })} data-testid="fee-student-select"
                className="w-full px-3 py-2 border text-sm bg-transparent outline-none" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)', fontFamily: 'IBM Plex Sans' }}>
                <option value="">Select student</option>
                {students.map(s => <option key={s.user_id} value={s.user_id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest font-medium mb-1 block" style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>Course</label>
              <select value={feeForm.course_id} onChange={e => setFeeForm({ ...feeForm, course_id: e.target.value })} data-testid="fee-course-select"
                className="w-full px-3 py-2 border text-sm bg-transparent outline-none" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)', fontFamily: 'IBM Plex Sans' }}>
                <option value="">Select course</option>
                {courses.map(c => <option key={c.course_id} value={c.course_id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest font-medium mb-1 block" style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>Amount ($)</label>
              <input type="number" value={feeForm.amount} onChange={e => setFeeForm({ ...feeForm, amount: e.target.value })} data-testid="fee-amount-input"
                className="w-full px-3 py-2 border text-sm bg-transparent outline-none" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)', fontFamily: 'IBM Plex Sans' }} />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest font-medium mb-1 block" style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>Due Date</label>
              <input type="date" value={feeForm.due_date} onChange={e => setFeeForm({ ...feeForm, due_date: e.target.value })} data-testid="fee-due-date-input"
                className="w-full px-3 py-2 border text-sm bg-transparent outline-none" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)', fontFamily: 'IBM Plex Sans' }} />
            </div>
            <button onClick={handleCreateFee} data-testid="save-fee-btn"
              className="w-full py-2.5 text-sm font-medium text-white" style={{ background: 'var(--brand)', fontFamily: 'IBM Plex Sans' }}>Add Fee</button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Record Payment Dialog */}
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent style={{ background: 'var(--bg)' }}>
          <DialogHeader><DialogTitle style={{ fontFamily: 'Outfit' }}>Record Payment</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-xs uppercase tracking-widest font-medium mb-1 block" style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>Amount ($)</label>
              <input type="number" value={payForm.amount} onChange={e => setPayForm({ ...payForm, amount: e.target.value })} data-testid="payment-amount-input"
                className="w-full px-3 py-2 border text-sm bg-transparent outline-none" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)', fontFamily: 'IBM Plex Sans' }} />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest font-medium mb-1 block" style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>Payment Mode</label>
              <select value={payForm.payment_mode} onChange={e => setPayForm({ ...payForm, payment_mode: e.target.value })} data-testid="payment-mode-select"
                className="w-full px-3 py-2 border text-sm bg-transparent outline-none" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)', fontFamily: 'IBM Plex Sans' }}>
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="upi">UPI</option>
                <option value="card">Card</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>
            <button onClick={handlePayment} data-testid="confirm-payment-btn"
              className="w-full py-2.5 text-sm font-medium text-white" style={{ background: 'var(--brand)', fontFamily: 'IBM Plex Sans' }}>Record Payment</button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
