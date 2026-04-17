import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { Users, BookOpen, GraduationCap, CurrencyDollar, ClipboardText, CalendarCheck, ChartLineUp } from '@phosphor-icons/react';

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="p-6 border" data-testid={`stat-${label.toLowerCase().replace(/\s/g, '-')}`} style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs uppercase tracking-widest font-medium" style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>{label}</span>
        <Icon size={20} weight="duotone" style={{ color }} />
      </div>
      <p className="text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)', fontFamily: 'Outfit' }}>{value}</p>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({});
  const [recentEnrollments, setRecentEnrollments] = useState([]);

  useEffect(() => {
    api.get('/dashboard/stats').then(r => setStats(r.data)).catch(() => {});
    if (['super_admin', 'admin'].includes(user?.role)) {
      api.get('/enrollments').then(r => setRecentEnrollments(r.data.slice(-5).reverse())).catch(() => {});
    }
  }, [user]);

  const isAdmin = ['super_admin', 'admin'].includes(user?.role);
  const isFaculty = user?.role === 'faculty';
  const isStudent = user?.role === 'student';

  return (
    <div data-testid="dashboard-page">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)', fontFamily: 'Outfit' }}>
          Welcome back, {user?.name}
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>
          {isAdmin ? 'Institute Overview' : isFaculty ? 'Faculty Dashboard' : 'Student Dashboard'}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px border" style={{ borderColor: 'var(--border)', background: 'var(--border)' }}>
        {isAdmin && (
          <>
            <StatCard icon={Users} label="Students" value={stats.total_students || 0} color="var(--brand)" />
            <StatCard icon={GraduationCap} label="Faculty" value={stats.total_faculty || 0} color="var(--success)" />
            <StatCard icon={BookOpen} label="Courses" value={stats.total_courses || 0} color="var(--warning)" />
            <StatCard icon={CurrencyDollar} label="Revenue" value={`$${(stats.total_revenue || 0).toLocaleString()}`} color="var(--success)" />
            <StatCard icon={GraduationCap} label="Batches" value={stats.total_batches || 0} color="var(--brand)" />
            <StatCard icon={Users} label="Enrollments" value={stats.total_enrollments || 0} color="var(--text-secondary)" />
            <StatCard icon={CurrencyDollar} label="Pending Fees" value={stats.pending_fees || 0} color="var(--alert)" />
            <StatCard icon={ClipboardText} label="Assignments" value={stats.total_assignments || 0} color="var(--warning)" />
          </>
        )}
        {isFaculty && (
          <>
            <StatCard icon={GraduationCap} label="My Batches" value={stats.total_batches || 0} color="var(--brand)" />
            <StatCard icon={Users} label="Students" value={stats.total_students || 0} color="var(--success)" />
            <StatCard icon={ClipboardText} label="Assignments" value={stats.total_assignments || 0} color="var(--warning)" />
            <StatCard icon={ClipboardText} label="Pending Reviews" value={stats.pending_submissions || 0} color="var(--alert)" />
          </>
        )}
        {isStudent && (
          <>
            <StatCard icon={BookOpen} label="My Courses" value={stats.total_courses || 0} color="var(--brand)" />
            <StatCard icon={ClipboardText} label="Assignments" value={stats.total_assignments || 0} color="var(--warning)" />
            <StatCard icon={ClipboardText} label="Pending" value={stats.pending_assignments || 0} color="var(--alert)" />
            <StatCard icon={CalendarCheck} label="Attendance" value={`${stats.attendance_percentage || 0}%`} color="var(--success)" />
            <StatCard icon={CurrencyDollar} label="Pending Fees" value={stats.pending_fees || 0} color="var(--alert)" />
            <StatCard icon={ClipboardText} label="Completed" value={stats.completed_assignments || 0} color="var(--success)" />
          </>
        )}
      </div>

      {isAdmin && recentEnrollments.length > 0 && (
        <div className="mt-6 border" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
          <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
            <h3 className="text-lg font-medium tracking-tight" style={{ color: 'var(--text-primary)', fontFamily: 'Outfit' }}>Recent Enrollments</h3>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {recentEnrollments.map(e => (
              <div key={e.enrollment_id} className="px-6 py-3 flex items-center justify-between text-sm" style={{ fontFamily: 'IBM Plex Sans' }}>
                <div>
                  <span style={{ color: 'var(--text-primary)' }}>{e.student_name}</span>
                  <span className="mx-2" style={{ color: 'var(--text-secondary)' }}>enrolled in</span>
                  <span className="font-medium" style={{ color: 'var(--brand)' }}>{e.course_name}</span>
                </div>
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{e.enrollment_date?.slice(0, 10)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
