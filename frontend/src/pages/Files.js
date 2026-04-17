import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { UploadSimple, Trash, DownloadSimple } from '@phosphor-icons/react';

export default function FilesPage() {
  const { user } = useAuth();
  const [files, setFiles] = useState([]);
  const [courses, setCourses] = useState([]);
  const [batches, setBatches] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [uploading, setUploading] = useState(false);
  const canUpload = ['faculty', 'admin', 'super_admin'].includes(user?.role);

  const load = () => {
    const params = selectedCourse ? `?course_id=${selectedCourse}` : '';
    api.get(`/files${params}`).then(r => setFiles(r.data)).catch(() => {});
    api.get('/courses').then(r => setCourses(r.data)).catch(() => {});
    api.get('/batches').then(r => setBatches(r.data)).catch(() => {});
  };
  useEffect(() => { load(); }, [selectedCourse]);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    const params = new URLSearchParams();
    if (selectedCourse) params.append('course_id', selectedCourse);
    params.append('file_type', 'course_material');
    await api.post(`/files/upload?${params.toString()}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
    setUploading(false);
    load();
  };

  const handleDownload = async (fileId, filename) => {
    const res = await api.get(`/files/${fileId}/download`, { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = async (fileId) => {
    if (window.confirm('Delete this file?')) { await api.delete(`/files/${fileId}`); load(); }
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div data-testid="files-page">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)', fontFamily: 'Outfit' }}>Course Materials</h1>
        {canUpload && (
          <label data-testid="upload-file-btn"
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white cursor-pointer transition-colors duration-150"
            style={{ background: 'var(--brand)', fontFamily: 'IBM Plex Sans' }}>
            <UploadSimple size={16} /> {uploading ? 'Uploading...' : 'Upload File'}
            <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
          </label>
        )}
      </div>

      <div className="mb-4">
        <select value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)} data-testid="files-course-filter"
          className="px-3 py-2 border text-sm bg-transparent outline-none" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)', background: 'var(--bg)', fontFamily: 'IBM Plex Sans' }}>
          <option value="">All Courses</option>
          {courses.map(c => <option key={c.course_id} value={c.course_id}>{c.name}</option>)}
        </select>
      </div>

      <div className="border" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
        <table className="w-full text-sm" style={{ fontFamily: 'IBM Plex Sans' }}>
          <thead>
            <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
              {['Filename', 'Type', 'Size', 'Uploaded By', 'Date', 'Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs uppercase tracking-widest font-medium" style={{ color: 'var(--text-secondary)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {files.map(f => (
              <tr key={f.file_id} className="border-b last:border-0 transition-colors duration-150 hover:bg-[var(--surface)]" style={{ borderColor: 'var(--border)' }}>
                <td className="px-4 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>{f.original_filename}</td>
                <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{f.content_type?.split('/')[1] || 'file'}</td>
                <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{formatSize(f.size)}</td>
                <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{f.uploader_name}</td>
                <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{f.created_at?.slice(0, 10)}</td>
                <td className="px-4 py-3 flex gap-2">
                  <button onClick={() => handleDownload(f.file_id, f.original_filename)} data-testid={`download-file-${f.file_id}`}
                    className="p-1 transition-colors duration-150 hover:bg-[var(--surface)]" style={{ color: 'var(--brand)' }}>
                    <DownloadSimple size={16} />
                  </button>
                  {canUpload && (
                    <button onClick={() => handleDelete(f.file_id)} data-testid={`delete-file-${f.file_id}`}
                      className="p-1 transition-colors duration-150 hover:bg-[var(--surface)]" style={{ color: 'var(--alert)' }}>
                      <Trash size={16} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {files.length === 0 && <div className="text-center py-12 text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>No files uploaded.</div>}
      </div>
    </div>
  );
}
