export type NotificationKind = 'success' | 'error' | 'info' | 'warning';
export type NotificationStatus = 'Unread' | 'Read' | 'Dismissed';

export type NotificationEntity =
  | { type: 'scenario'; id: string }
  | { type: 'comparison'; id: string }
  | { type: 'dataflow'; id: string; executionId?: string }
  | { type: 'email'; id: string };

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  status: NotificationStatus;
  title: string;
  message: string;
  createdAt: string;
  readAt?: string | null;
  entity?: NotificationEntity;
  actionLabel?: string;
  metadata?: Record<string, string | number | boolean | null>;
}
