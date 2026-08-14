export interface AppNotification {
  id: string;
  type: 'csv_generated' | 'tag_read_error' | 'info' | 'success' | 'warning';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  linkTab?: string;
  details?: string;
}

const STORAGE_KEY = "latam_app_notifications";

export const getNotifications = (): AppNotification[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Erro ao ler notificações:", e);
    return [];
  }
};

export const saveNotifications = (notifications: AppNotification[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
    window.dispatchEvent(new CustomEvent("app_notifications_changed"));
  } catch (e) {
    console.error("Erro ao salvar notificações:", e);
  }
};

export const addNotification = (item: Omit<AppNotification, "id" | "timestamp" | "read">): AppNotification => {
  const current = getNotifications();
  const newNotif: AppNotification = {
    id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    timestamp: new Date().toISOString(),
    read: false,
    ...item
  };

  // Prevent immediate duplicates within 2 seconds
  const isDuplicate = current.some(
    n => n.type === newNotif.type && n.message === newNotif.message && (Date.now() - new Date(n.timestamp).getTime() < 2000)
  );

  if (!isDuplicate) {
    const updated = [newNotif, ...current].slice(0, 50); // Keep max 50 notifications
    saveNotifications(updated);
  }
  return newNotif;
};

export const markNotificationAsRead = (id: string) => {
  const current = getNotifications();
  const updated = current.map(n => n.id === id ? { ...n, read: true } : n);
  saveNotifications(updated);
};

export const markAllNotificationsAsRead = () => {
  const current = getNotifications();
  const updated = current.map(n => ({ ...n, read: true }));
  saveNotifications(updated);
};

export const clearAllNotifications = () => {
  saveNotifications([]);
};

export const subscribeNotifications = (callback: () => void) => {
  const handleEvent = () => callback();
  window.addEventListener("app_notifications_changed", handleEvent);
  window.addEventListener("storage", handleEvent);
  return () => {
    window.removeEventListener("app_notifications_changed", handleEvent);
    window.removeEventListener("storage", handleEvent);
  };
};
