import { apiRequest } from './client';
import type { NotificationResponse, UnreadCountResponse } from './types';

/** The caller's own notifications, newest first (sorted server-side). */
export function listNotifications(token: string): Promise<NotificationResponse[]> {
  return apiRequest<NotificationResponse[]>('/notifications', { token });
}

export function getUnreadCount(token: string): Promise<UnreadCountResponse> {
  return apiRequest<UnreadCountResponse>('/notifications/unread-count', { token });
}

export function markNotificationRead(id: string, token: string): Promise<NotificationResponse> {
  return apiRequest<NotificationResponse>(`/notifications/${id}/read`, { method: 'PATCH', token });
}

export function markAllNotificationsRead(token: string): Promise<void> {
  return apiRequest<void>('/notifications/read-all', { method: 'PATCH', token });
}
