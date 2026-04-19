import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Trash, UserPlus, DownloadSimple } from '@phosphor-icons/react';

export default function Students({ isFaculty = false }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [batches, setBatches] = useState([]);
  const [enrollOpen, setEnrollOpen] = useState(false);

  const [enrollForm, setEnrollForm] = useState({
    student_id: '',
    course_id: '',
    batch_id: ''
  });

  const isAdmin = ['super_admin', 'admin'].includes(user?.role);

  // ✅ FIXED ROLE FILTER
  const roleFilter = isFaculty ? 'faculty' : 'students';

  const load = () => {
    // ✅ FIXED API CALL
    api.get(`/users?role=${roleFilter}`)
      .then(r => setUsers(r.data))
      .catch(() => {});

    api.get('/courses')
      .then(r => setCourses(r.data))
      .catch(() => {});

    api.get('/batches')
      .then(r => setBatches(r.data))
      .catch(() => {});
  };

  useEffect(() => {
    load();
  }, [roleFilter]);

  const handleRoleChange = async (userId, newRole) => {
    await api.put(`/users/${userId}/role`, { role: newRole });
    load();
  };

  const handleDelete = async (userId) => {
    if (window.confirm(`Delete this ${roleFilter}?`)) {
      await api.delete(`/users/${userId}`);
      load();
    }
  };

  const handleEnroll = async () => {
    await api.post('/enrollments', enrollForm);
    setEnrollOpen(false);
    setEnrollForm({ student_id: '', course_id: '', batch_id: '' });
  };

  const handleExport = () => {
    const backendUrl = process.env.REACT_APP_BACKEND_URL;
    window.open(`${backendUrl}/api/export/students`, '_blank');
  };

  const filteredBatches = enrollForm.course_id
    ? batches.filter(b => b.course_id === enrollForm.course_id)
    : batches;

  return (
    <div data-testid={isFaculty ? 'faculty-page' : 'students-page'}>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          {isFaculty ? 'Faculty Management' : 'Student Management'}
        </h1>

        <div className="flex gap-2">
          {isAdmin && !isFaculty && (
            <button onClick={() => setEnrollOpen(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-blue-600 rounded">
              <UserPlus size={16} /> Enroll Student
            </button>
          )}

          {isAdmin && (
            <button onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 text-sm border rounded">
              <DownloadSimple size={16} /> Export CSV
            </button>
          )}
        </div>
      </div>

      <div className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              {['Name', 'ID', 'Email', 'Role', 'Joined', isAdmin && 'Actions']
                .filter(Boolean)
                .map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs uppercase text-gray-500 dark:text-gray-400">
                    {h}
                  </th>
                ))}
            </tr>
          </thead>

          <tbody>
            {users.map(u => (
              <tr key={u.user_id} className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="px-4 py-3">
                  <div
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={() =>
                      navigate(`/${isFaculty ? 'faculty' : 'students'}/${u.user_id}`)
                    }
                  >
                    <div className="w-6 h-6 bg-blue-600 text-white flex items-center justify-center text-xs rounded">
                      {u.name?.[0]}
                    </div>
                    <span className="font-medium underline text-blue-600">
                      {u.name}
                    </span>
                  </div>
                </td>

                <td className="px-4 py-3 text-xs">{u.display_id || '-'}</td>
                <td className="px-4 py-3">{u.email}</td>

                <td className="px-4 py-3">
                  {isAdmin ? (
                    <select
                      value={u.role}
                      onChange={e => handleRoleChange(u.user_id, e.target.value)}
                      className="px-2 py-1 border border-gray-300 dark:border-gray-700 bg-transparent dark:bg-[#1a1a1a] text-gray-900 dark:text-white text-xs rounded dark:[color-scheme:dark]"
                    >
                      <option value="student">Student</option>
                      <option value="faculty">Faculty</option>
                      <option value="admin">Admin</option>
                      {user?.role === 'super_admin' && (
                        <option value="super_admin">Super Admin</option>
                      )}
                    </select>
                  ) : (
                    <span>{u.role}</span>
                  )}
                </td>

                <td className="px-4 py-3">
                  {u.created_at?.slice(0, 10)}
                </td>

                {isAdmin && (
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDelete(u.user_id)}
                      className="text-red-500 hover:text-red-600"
                    >
                      <Trash size={16} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        {users.length === 0 && (
          <div className="text-center py-12 text-sm text-gray-500 dark:text-gray-400">
            No {isFaculty ? 'faculty' : 'students'} found.
          </div>
        )}
      </div>

      <Dialog open={enrollOpen} onOpenChange={setEnrollOpen}>
        <DialogContent className="dark:bg-[#1a1a1a] dark:text-white border dark:border-gray-800">
          <DialogHeader>
            <DialogTitle>Enroll Student</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <select
              value={enrollForm.student_id}
              onChange={e => setEnrollForm({ ...enrollForm, student_id: e.target.value })}
              className="w-full px-3 py-2 bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 dark:[color-scheme:dark]"
            >
              <option value="">Select student</option>
              {users.map(s => (
                <option key={s.user_id} value={s.user_id}>
                  {s.name}
                </option>
              ))}
            </select>

            <select
              value={enrollForm.course_id}
              onChange={e => setEnrollForm({ ...enrollForm, course_id: e.target.value })}
              className="w-full px-3 py-2 bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 dark:[color-scheme:dark]"
            >
              <option value="">Select course</option>
              {courses.map(c => (
                <option key={c.course_id} value={c.course_id}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              value={enrollForm.batch_id}
              onChange={e => setEnrollForm({ ...enrollForm, batch_id: e.target.value })}
              className="w-full px-3 py-2 bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 dark:[color-scheme:dark]"
            >
              <option value="">Select batch</option>
              {filteredBatches.map(b => (
                <option key={b.batch_id} value={b.batch_id}>
                  {b.name}
                </option>
              ))}
            </select>

            <button
              onClick={handleEnroll}
              className="w-full py-2 text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors"
            >
              Enroll Student
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}