import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#002FA7', '#00C853', '#FFCC00', '#FF2A00', '#52525B', '#2563EB'];

export default function Analytics() {
  const [revenue, setRevenue] = useState([]);
  const [enrollment, setEnrollment] = useState([]);
  const [attendance, setAttendance] = useState([]);

  useEffect(() => {
    api.get('/analytics/revenue').then(r => setRevenue(r.data)).catch(() => {});
    api.get('/analytics/enrollment').then(r => setEnrollment(r.data)).catch(() => {});
    api.get('/analytics/attendance-summary').then(r => setAttendance(r.data)).catch(() => {});
  }, []);

  return (
    <div data-testid="analytics-page">
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-6" style={{ color: 'var(--text-primary)', fontFamily: 'Outfit' }}>Analytics</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue Chart */}
        <div className="border p-6" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
          <h3 className="text-lg font-medium tracking-tight mb-4" style={{ color: 'var(--text-primary)', fontFamily: 'Outfit' }}>Monthly Revenue</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={revenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fill: 'var(--text-secondary)', fontSize: 12, fontFamily: 'IBM Plex Sans' }} />
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 12, fontFamily: 'IBM Plex Sans' }} />
              <Tooltip contentStyle={{ background: 'var(--bg)', border: '1px solid var(--border)', fontFamily: 'IBM Plex Sans', fontSize: 12 }} />
              <Bar dataKey="revenue" fill="var(--brand)" />
            </BarChart>
          </ResponsiveContainer>
          {revenue.length === 0 && <p className="text-center text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>No revenue data yet.</p>}
        </div>

        {/* Enrollment by Course */}
        <div className="border p-6" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
          <h3 className="text-lg font-medium tracking-tight mb-4" style={{ color: 'var(--text-primary)', fontFamily: 'Outfit' }}>Enrollment by Course</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={enrollment} dataKey="enrollments" nameKey="course" cx="50%" cy="50%" outerRadius={80} label={({ course, enrollments }) => `${course}: ${enrollments}`}>
                {enrollment.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: 'var(--bg)', border: '1px solid var(--border)', fontFamily: 'IBM Plex Sans', fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          {enrollment.length === 0 && <p className="text-center text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>No enrollment data yet.</p>}
        </div>

        {/* Attendance Summary */}
        <div className="border p-6 lg:col-span-2" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
          <h3 className="text-lg font-medium tracking-tight mb-4" style={{ color: 'var(--text-primary)', fontFamily: 'Outfit' }}>Attendance by Batch</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={attendance}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="batch" tick={{ fill: 'var(--text-secondary)', fontSize: 12, fontFamily: 'IBM Plex Sans' }} />
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 12, fontFamily: 'IBM Plex Sans' }} />
              <Tooltip contentStyle={{ background: 'var(--bg)', border: '1px solid var(--border)', fontFamily: 'IBM Plex Sans', fontSize: 12 }} />
              <Bar dataKey="percentage" fill="var(--success)" name="Attendance %" />
            </BarChart>
          </ResponsiveContainer>
          {attendance.length === 0 && <p className="text-center text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>No attendance data yet.</p>}
        </div>
      </div>
    </div>
  );
}
