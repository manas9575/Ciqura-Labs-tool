import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { ArrowLeft, CalendarCheck, Pencil } from '@phosphor-icons/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';

export default function StudentProfile() {
  const { userId } = useParams();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [tab, setTab] = useState('overview');
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({});

  const load = () => api.get(`/users/${userId}/profile`).then(r => setProfile(r.data)).catch(() => navigate(-1));
  useEffect(() => { load(); }, [userId]);

  const isFaculty = profile?.role === 'faculty';
  const isStudent = profile?.role === 'student';
  const isOwnProfile = currentUser?.user_id === userId;
  const isAdmin = ['super_admin', 'admin'].includes(currentUser?.role);
  const canEdit = isOwnProfile || isAdmin;
  const backPath = isFaculty ? '/faculty' : '/students';

  const openEdit = () => {
    const base = { picture: profile.picture || '', phone: profile.phone || '', email: profile.email || '' };
    if (isStudent && (isOwnProfile || isAdmin)) {
      Object.assign(base, {
        name: profile.name || '', address: profile.address || '', dob: profile.dob || '',
        guardian_name: profile.guardian_name || '', guardian_phone: profile.guardian_phone || '',
        blood_group: profile.blood_group || '', qualification: profile.qualification || '',
        skills: (profile.skills || []).join(', '), interests: (profile.interests || []).join(', '), bio: profile.bio || ''
      });
    } else {
      Object.assign(base, {
        skills: (profile.skills || []).join(', '), interests: (profile.interests || []).join(', '),
        bio: profile.bio || '', availability: profile.availability || ''
      });
    }
    setEditForm(base);
    setEditOpen(true);
  };

  const saveProfile = async () => {
    const payload = {};
    for (const [k, v] of Object.entries(editForm)) {
      if (k === 'skills' || k === 'interests') {
        payload[k] = v ? v.split(',').map(s => s.trim()).filter(Boolean) : [];
      } else if (v !== '' && v !== undefined) {
        payload[k] = v;
      }
    }
    await api.put(`/users/${userId}/profile`, payload);
    setEditOpen(false);
    load();
  };

  if (!profile) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--brand)', borderTopColor: 'transparent' }} /></div>;

  const tabs = isFaculty
    ? [{ id: 'overview', label: 'Overview' }, { id: 'batches', label: 'Batches' }]
    : [{ id: 'overview', label: 'Overview' }, { id: 'courses', label: 'Courses' }, { id: 'fees', label: 'Fees' }, { id: 'attendance', label: 'Attendance' }];

  const editFields = isStudent && (isOwnProfile || isAdmin) ? [
    { key: 'picture', label: 'Profile Picture URL' },
    { key: 'phone', label: 'Mobile Number' },
    { key: 'email', label: 'Email Address' },
    { key: 'name', label: 'Full Name' },
    { key: 'dob', label: 'Date of Birth', type: 'date' },
    { key: 'blood_group', label: 'Blood Group' },
    { key: 'address', label: 'Address' },
    { key: 'guardian_name', label: 'Guardian Name' },
    { key: 'guardian_phone', label: 'Guardian Phone' },
    { key: 'qualification', label: 'Qualification' },
    { key: 'skills', label: 'Skills (comma separated)' },
    { key: 'interests', label: 'Interests (comma separated)' },
    { key: 'bio', label: 'Bio' },
  ] : [
    { key: 'picture', label: 'Profile Picture URL' },
    { key: 'phone', label: 'Mobile Number' },
    { key: 'email', label: 'Email Address' },
    { key: 'skills', label: 'Skills (comma separated)' },
    { key: 'interests', label: 'Interests (comma separated)' },
    { key: 'bio', label: 'Bio' },
    ...(isFaculty ? [{ key: 'availability', label: 'Availability / Schedule' }] : []),
  ];

  const InfoRow = ({ label, value }) => value ? (
    <div className="flex gap-2 text-sm py-1" style={{ fontFamily: 'IBM Plex Sans' }}>
      <span className="text-xs uppercase tracking-widest font-medium min-w-[120px] shrink-0" style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <span style={{ color: 'var(--text-primary)' }}>{value}</span>
    </div>
  ) : null;

  return (
    <div data-testid="user-profile-page">
      <button onClick={() => navigate(backPath)} className="flex items-center gap-1 mb-4 text-sm hover:underline" data-testid="back-btn" style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>
        <ArrowLeft size={14} /> Back
      </button>

      <div className="border p-6 mb-6" style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            {profile.picture ? <img src={profile.picture} alt="" className="w-16 h-16 rounded-full object-cover" /> : (
              <div className="w-16 h-16 flex items-center justify-center text-white text-xl font-bold" style={{ background: 'var(--brand)' }}>{profile.name?.[0]}</div>
            )}
            <div>
              <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)', fontFamily: 'Outfit' }}>{profile.name}</h1>
              <p className="text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>{profile.email}</p>
              <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>
                <span className="px-2 py-0.5 border uppercase font-medium" style={{ borderColor: 'var(--brand)', color: 'var(--brand)' }}>{profile.role?.replace('_', ' ')}</span>
                {profile.display_id && <span className="px-2 py-0.5 border font-mono" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}>{profile.display_id}</span>}
                {profile.phone && <span>Phone: {profile.phone}</span>}
              </div>
            </div>
          </div>
          {canEdit && (
            <button onClick={openEdit} data-testid="edit-profile-btn" className="flex items-center gap-1 px-3 py-1.5 text-xs border transition-colors duration-150 hover:bg-[var(--surface)]" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>
              <Pencil size={12} /> Edit Profile
            </button>
          )}
        </div>

        {/* Extended details */}
        <div className="mt-4 pt-4 border-t grid grid-cols-1 sm:grid-cols-2 gap-x-8" style={{ borderColor: 'var(--border)' }}>
          <InfoRow label="DOB" value={profile.dob} />
          <InfoRow label="Blood Group" value={profile.blood_group} />
          <InfoRow label="Address" value={profile.address} />
          <InfoRow label="Qualification" value={profile.qualification} />
          <InfoRow label="Guardian" value={profile.guardian_name} />
          <InfoRow label="Guardian Ph" value={profile.guardian_phone} />
          {isFaculty && <InfoRow label="Availability" value={profile.availability} />}
          <InfoRow label="Bio" value={profile.bio} />
        </div>

        {profile.skills?.length > 0 && (
          <div className="mt-3">
            <span className="text-xs uppercase tracking-widest font-medium mr-2" style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>Skills:</span>
            {profile.skills.map((s, i) => <span key={i} className="px-2 py-0.5 text-xs border mr-1" style={{ borderColor: 'var(--brand)', color: 'var(--brand)', fontFamily: 'IBM Plex Sans' }}>{s}</span>)}
          </div>
        )}
        {profile.interests?.length > 0 && (
          <div className="mt-1.5">
            <span className="text-xs uppercase tracking-widest font-medium mr-2" style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>Interests:</span>
            {profile.interests.map((s, i) => <span key={i} className="px-2 py-0.5 text-xs border mr-1" style={{ borderColor: 'var(--success)', color: 'var(--success)', fontFamily: 'IBM Plex Sans' }}>{s}</span>)}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px border mb-6" style={{ borderColor: 'var(--border)', background: 'var(--border)' }}>
        {!isFaculty && <>
          <div className="p-4" style={{ background: 'var(--bg)' }}><span className="text-xs uppercase tracking-widest" style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>Courses</span><p className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)', fontFamily: 'Outfit' }}>{profile.courses?.length || 0}</p></div>
          <div className="p-4" style={{ background: 'var(--bg)' }}><span className="text-xs uppercase tracking-widest" style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>Attendance</span><p className="text-2xl font-bold mt-1" style={{ color: profile.attendance_pct >= 75 ? 'var(--success)' : 'var(--alert)', fontFamily: 'Outfit' }}>{profile.attendance_pct}%</p></div>
          <div className="p-4" style={{ background: 'var(--bg)' }}><span className="text-xs uppercase tracking-widest" style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>Total Fees</span><p className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)', fontFamily: 'Outfit' }}>&#8377;{profile.fees?.reduce((s, f) => s + f.amount, 0) || 0}</p></div>
          <div className="p-4" style={{ background: 'var(--bg)' }}><span className="text-xs uppercase tracking-widest" style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>Pending</span><p className="text-2xl font-bold mt-1" style={{ color: 'var(--alert)', fontFamily: 'Outfit' }}>&#8377;{profile.fees?.reduce((s, f) => s + f.balance, 0) || 0}</p></div>
        </>}
        {isFaculty && <>
          <div className="p-4" style={{ background: 'var(--bg)' }}><span className="text-xs uppercase tracking-widest" style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>Batches</span><p className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)', fontFamily: 'Outfit' }}>{profile.batches?.length || 0}</p></div>
          <div className="p-4" style={{ background: 'var(--bg)' }}><span className="text-xs uppercase tracking-widest" style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>Total Students</span><p className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)', fontFamily: 'Outfit' }}>{profile.batches?.reduce((s, b) => s + (b.student_count || 0), 0) || 0}</p></div>
        </>}
      </div>

      <div className="flex gap-0 border-b mb-6" style={{ borderColor: 'var(--border)' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} data-testid={`ptab-${t.id}`}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors duration-150 ${tab === t.id ? 'border-[var(--brand)]' : 'border-transparent'}`}
            style={{ color: tab === t.id ? 'var(--brand)' : 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>{t.label}</button>
        ))}
      </div>

      {tab === 'overview' && <div className="text-center py-8 border text-sm" style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>Select a tab above to view details.</div>}
      {tab === 'courses' && profile.courses?.map(c => (
        <div key={c.course_id} className="border p-4 mb-2" style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2"><h3 className="font-medium" style={{ color: 'var(--text-primary)', fontFamily: 'Outfit' }}>{c.name}</h3>{c.display_id && <span className="text-xs font-mono px-1.5 py-0.5 border" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>{c.display_id}</span>}</div>
          <div className="flex gap-4 text-xs mt-1" style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}><span>Batch: {c.batch_name}</span><span>Duration: {c.duration}</span><span>Enrolled: {c.enrollment_date?.slice(0, 10)}</span></div>
        </div>
      ))}
      {tab === 'fees' && profile.fees?.map(f => (
        <div key={f.fee_id} className="border p-4 mb-2 flex items-center justify-between" style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}>
          <div><span className="font-medium text-sm" style={{ color: 'var(--text-primary)', fontFamily: 'IBM Plex Sans' }}>{f.course_name}</span>
            <span className="text-xs ml-2 px-2 py-0.5 border uppercase" style={{ borderColor: f.status === 'paid' ? 'var(--success)' : 'var(--alert)', color: f.status === 'paid' ? 'var(--success)' : 'var(--alert)' }}>{f.status}</span>
            {f.category && <span className="text-xs ml-2" style={{ color: 'var(--text-secondary)' }}>({f.category})</span>}</div>
          <div className="text-right text-sm" style={{ fontFamily: 'IBM Plex Sans' }}><span style={{ color: 'var(--text-primary)' }}>&#8377;{f.total_paid}</span><span className="mx-1" style={{ color: 'var(--text-secondary)' }}>/</span><span style={{ color: 'var(--text-secondary)' }}>&#8377;{f.amount}</span></div>
        </div>
      ))}
      {tab === 'attendance' && (
        <div className="border p-6 text-center" style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}>
          <CalendarCheck size={32} style={{ color: 'var(--brand)', margin: '0 auto' }} /><p className="text-4xl font-bold mt-3" style={{ color: profile.attendance_pct >= 75 ? 'var(--success)' : 'var(--alert)', fontFamily: 'Outfit' }}>{profile.attendance_pct}%</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>{profile.attendance_present} present / {profile.attendance_total} total</p>
        </div>
      )}
      {tab === 'batches' && isFaculty && profile.batches?.map(b => (
        <div key={b.batch_id} className="border p-4 mb-2" style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}>
          <h3 className="font-medium" style={{ color: 'var(--text-primary)', fontFamily: 'Outfit' }}>{b.name}</h3>
          <div className="flex gap-4 text-xs mt-1" style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}><span>Course: {b.course_name}</span><span>{b.student_count} students</span></div>
        </div>
      ))}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto" style={{ background: 'var(--bg)' }}>
          <DialogHeader><DialogTitle style={{ fontFamily: 'Outfit' }}>Edit Profile</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-4">
            {editFields.map(f => (
              <div key={f.key}>
                <label className="text-xs uppercase tracking-widest font-medium mb-1 block" style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>{f.label}</label>
                <input type={f.type || 'text'} value={editForm[f.key] || ''} onChange={e => setEditForm({ ...editForm, [f.key]: e.target.value })} data-testid={`edit-${f.key}`}
                  className="w-full px-3 py-2 border text-sm bg-transparent outline-none" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)', fontFamily: 'IBM Plex Sans' }} />
              </div>
            ))}
            <button onClick={saveProfile} data-testid="save-profile-btn" className="w-full py-2.5 text-sm font-medium text-white" style={{ background: 'var(--brand)', fontFamily: 'IBM Plex Sans' }}>Save Profile</button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
