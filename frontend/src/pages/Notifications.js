import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { Bell, Check } from '@phosphor-icons/react';

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);

  const load = () => api.get('/notifications').then(r => setNotifications(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const markRead = async (id) => {
    await api.put(`/notifications/${id}/read`);
    load();
  };

  const markAllRead = async () => {
    await api.put('/notifications/read-all');
    load();
  };

  return (
    <div data-testid="notifications-page">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)', fontFamily: 'Outfit' }}>Notifications</h1>
        {notifications.some(n => !n.read) && (
          <button onClick={markAllRead} data-testid="mark-all-read-btn"
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium border transition-colors duration-150 hover:bg-[var(--surface)]"
            style={{ borderColor: 'var(--border)', color: 'var(--text-primary)', fontFamily: 'IBM Plex Sans' }}>
            <Check size={16} /> Mark All Read
          </button>
        )}
      </div>

      <div className="border" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
        {notifications.length === 0 ? (
          <div className="text-center py-12">
            <Bell size={32} style={{ color: 'var(--text-secondary)', margin: '0 auto' }} />
            <p className="text-sm mt-3" style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>No notifications</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {notifications.map(n => (
              <div key={n.notification_id} data-testid={`notification-${n.notification_id}`}
                className={`px-4 py-3 flex items-start justify-between transition-colors duration-150 ${!n.read ? 'bg-[var(--surface)]' : ''}`}>
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)', fontFamily: 'IBM Plex Sans' }}>{n.title}</p>
                  <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>{n.message}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>{n.created_at?.slice(0, 16).replace('T', ' ')}</p>
                </div>
                {!n.read && (
                  <button onClick={() => markRead(n.notification_id)} data-testid={`mark-read-${n.notification_id}`}
                    className="p-1 ml-2 transition-colors duration-150 hover:bg-[var(--surface)]" style={{ color: 'var(--brand)' }}>
                    <Check size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
