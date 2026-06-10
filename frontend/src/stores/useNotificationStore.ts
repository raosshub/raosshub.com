import { create } from 'zustand';
import type { Toast } from '@/types';

interface NotificationState {
  toasts: Toast[];
  notifications: Array<{
    id: string;
    msg: string;
    msg_zh?: string;
    type: string;
    title: string;
    title_zh?: string;
    ts: string;
    read: boolean;
  }>;
  addToast: (message: string, type?: Toast['type'], title?: string) => void;
  removeToast: (id: string) => void;
  addNotification: (msg: string, type: string, title?: string, msgZh?: string, titleZh?: string) => void;
  markAllRead: () => void;
  dismissNotification: (id: string) => void;
  clearAll: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  toasts: [],
  notifications: [],

  addToast: (message, type = 'info', title = '') => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    set((s) => ({
      toasts: [...s.toasts, { id, message, type, title }],
      // Also push to notification history — this drives the bell badge unread count.
      // The popup auto-removes after 4s but the history entry stays until dismissed.
      notifications: [
        { id, msg: message, type, title, ts, read: false },
        ...s.notifications,
      ].slice(0, 20),
    }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 4000);
  },

  removeToast: (id) => {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },

  addNotification: (msg, type, title = '', msgZh, titleZh) => {
    const id = `notif_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    set((s) => ({
      notifications: [{ id, msg, msg_zh: msgZh, type, title, title_zh: titleZh, ts, read: false }, ...s.notifications].slice(0, 20),
    }));
  },

  markAllRead: () => {
    set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) }));
  },

  dismissNotification: (id) => {
    set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) }));
  },

  clearAll: () => {
    set({ notifications: [] });
  },
}));
