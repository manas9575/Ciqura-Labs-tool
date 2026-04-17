import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { Trash, PaperPlaneTilt } from '@phosphor-icons/react';

export default function Comments({ entityType, entityId }) {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');

  const load = () => {
    api.get(`/comments?entity_type=${entityType}&entity_id=${entityId}`).then(r => setComments(r.data)).catch(() => {});
  };
  useEffect(() => { load(); }, [entityType, entityId]);

  const handlePost = async () => {
    if (!text.trim()) return;
    await api.post('/comments', { entity_type: entityType, entity_id: entityId, text: text.trim() });
    setText('');
    load();
  };

  const handleDelete = async (commentId) => {
    await api.delete(`/comments/${commentId}`);
    load();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handlePost(); }
  };

  const roleColors = { super_admin: 'var(--brand)', admin: 'var(--brand)', faculty: 'var(--success)', student: 'var(--text-secondary)' };

  return (
    <div data-testid={`comments-${entityType}-${entityId}`}>
      <div className="space-y-2 mb-3 max-h-60 overflow-y-auto">
        {comments.map(c => (
          <div key={c.comment_id} className="flex items-start justify-between gap-2 p-2 border" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium" style={{ color: roleColors[c.user_role] || 'var(--text-primary)', fontFamily: 'IBM Plex Sans' }}>{c.user_name}</span>
                <span className="text-xs px-1 py-0.5 border uppercase" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans', fontSize: '9px' }}>{c.user_role?.replace('_', ' ')}</span>
                <span className="text-xs" style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>{c.created_at?.slice(0, 16).replace('T', ' ')}</span>
              </div>
              <p className="text-sm mt-0.5 break-words" style={{ color: 'var(--text-primary)', fontFamily: 'IBM Plex Sans' }}>{c.text}</p>
            </div>
            {(c.user_id === user?.user_id || ['super_admin', 'admin'].includes(user?.role)) && (
              <button onClick={() => handleDelete(c.comment_id)} className="p-0.5 shrink-0" style={{ color: 'var(--alert)' }}>
                <Trash size={12} />
              </button>
            )}
          </div>
        ))}
        {comments.length === 0 && <p className="text-xs text-center py-2" style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>No comments yet.</p>}
      </div>
      <div className="flex items-center gap-2">
        <input value={text} onChange={e => setText(e.target.value)} onKeyDown={handleKeyDown}
          data-testid={`comment-input-${entityId}`} placeholder="Write a comment..."
          className="flex-1 px-3 py-2 border text-sm bg-transparent outline-none" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)', fontFamily: 'IBM Plex Sans' }} />
        <button onClick={handlePost} data-testid={`post-comment-${entityId}`}
          className="px-3 py-2 text-white transition-colors duration-150" style={{ background: 'var(--brand)' }}>
          <PaperPlaneTilt size={14} />
        </button>
      </div>
    </div>
  );
}
