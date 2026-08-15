import { useEffect, useState } from 'react';
import { api } from '../lib/api';

type Notification = {
  id: string;
  title: string;
  body: string;
  link?: string | null;
  readAt?: string | null;
  createdAt: string;
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);

  const load = () => {
    api('/notifications')
      .then((d) => setItems(d.notifications || []))
      .catch(() => setItems([]));
  };

  useEffect(() => {
    load();
    const id = window.setInterval(load, 60000);
    return () => window.clearInterval(id);
  }, []);

  const unread = items.filter((n) => !n.readAt).length;

  return (
    <div className="notifBell">
      <button type="button" className="secondaryBtn" aria-label="Notifications" onClick={() => setOpen((v) => !v)}>
        Alerts{unread ? ` (${unread})` : ''}
      </button>
      {open && (
        <div className="notifPanel">
          {items.length === 0 ? (
            <p className="muted">No notifications yet.</p>
          ) : (
            items.slice(0, 12).map((n) => (
              <button
                key={n.id}
                type="button"
                className={`notifItem ${n.readAt ? '' : 'unread'}`}
                onClick={async () => {
                  if (!n.readAt) {
                    try {
                      await api(`/notifications/${n.id}/read`, { method: 'POST' });
                      load();
                    } catch {
                      /* ignore */
                    }
                  }
                  if (n.link) window.location.assign(n.link);
                  setOpen(false);
                }}
              >
                <strong>{n.title}</strong>
                <span>{n.body}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
