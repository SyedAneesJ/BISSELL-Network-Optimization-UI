import React, { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Circle, Clock3, ExternalLink, Mail, X } from 'lucide-react';
import { AppNotification } from '@/types/notifications';
import { Button, Modal } from '@/components/ui';

interface NotificationCenterProps {
  isOpen: boolean;
  notifications: AppNotification[];
  onClose: () => void;
  onMarkRead: (id: string) => void;
  onDismiss: (id: string) => void;
  onClearAll: () => void;
  onOpenScenario: (scenarioId: string) => void;
  onOpenComparison: (comparisonId: string) => void;
}

const kindMeta = {
  success: {
    label: 'Success',
    pill: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    ring: 'ring-emerald-100',
    icon: CheckCircle2,
  },
  error: {
    label: 'Error',
    pill: 'bg-red-50 text-red-700 border-red-200',
    ring: 'ring-red-100',
    icon: AlertTriangle,
  },
  info: {
    label: 'Info',
    pill: 'bg-blue-50 text-blue-700 border-blue-200',
    ring: 'ring-blue-100',
    icon: Circle,
  },
  warning: {
    label: 'Warning',
    pill: 'bg-amber-50 text-amber-700 border-amber-200',
    ring: 'ring-amber-100',
    icon: Clock3,
  },
} as const;

type Filter = 'All' | 'Unread' | 'Success' | 'Error';

const entityLabel = (notification: AppNotification) => {
  if (!notification.entity) return notification.actionLabel || 'Dismiss';
  if (notification.entity.type === 'scenario') return notification.actionLabel || 'Open scenario';
  if (notification.entity.type === 'comparison') return notification.actionLabel || 'Open comparison';
  return notification.actionLabel || '';
};

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  isOpen,
  notifications,
  onClose,
  onMarkRead,
  onDismiss,
  onClearAll,
  onOpenScenario,
  onOpenComparison,
}) => {
  const [filter, setFilter] = useState<Filter>('All');
  const unreadCount = notifications.filter((item) => !item.readAt).length;

  const filteredNotifications = useMemo(() => {
    return notifications.filter((notification) => {
      if (filter === 'Unread') return !notification.readAt;
      if (filter === 'Success') return notification.kind === 'success';
      if (filter === 'Error') return notification.kind === 'error';
      return true;
    });
  }, [filter, notifications]);

  const handleOpen = (notification: AppNotification) => {
    onMarkRead(notification.id);
    if (!notification.entity) return;
    if (notification.entity.type === 'scenario') {
      onOpenScenario(notification.entity.id);
      onClose();
      return;
    }
    if (notification.entity.type === 'comparison') {
      onOpenComparison(notification.entity.id);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      size="large"
      footer={
        <>
          <Button variant="ghost" onClick={onClearAll} disabled={notifications.length === 0}>
            Clear All
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-50 to-white p-2">
          {(['All', 'Unread', 'Success', 'Error'] as const).map((item) => {
            const active = filter === item;
            return (
              <button
                key={item}
                type="button"
                onClick={() => setFilter(item)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                  active
                    ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20'
                    : 'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {item}
              </button>
            );
          })}
          <div className="ml-auto flex items-center gap-2 text-xs text-slate-500">
            <span className="rounded-full bg-slate-900 px-2.5 py-1 font-semibold text-white">
              {filteredNotifications.length}
            </span>
            <span>shown</span>
          </div>
        </div>

        {filteredNotifications.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
            {filter === 'All'
              ? 'You do not have any notifications yet.'
              : `No ${filter.toLowerCase()} notifications found.`}
          </div>
        ) : (
          filteredNotifications.map((notification) => {
            const meta = kindMeta[notification.kind];
            const Icon = meta.icon;
            const isUnread = !notification.readAt;

            return (
              <div
                key={notification.id}
                className={`rounded-2xl border p-4 shadow-sm transition-all ${
                  isUnread
                    ? `border-slate-300 bg-white ring-1 ${meta.ring}`
                    : 'border-slate-200 bg-slate-50/80'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border ${meta.pill}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-slate-900">{notification.title}</h3>
                      <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${meta.pill}`}>
                        {meta.label}
                      </span>
                      {isUnread && (
                        <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[11px] font-semibold text-white">
                          New
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm leading-6 text-slate-700">{notification.message}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span className="rounded-full bg-white px-2.5 py-1 ring-1 ring-slate-200">
                        {new Date(notification.createdAt).toLocaleString()}
                      </span>
                      {notification.metadata?.dataflowId && (
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">
                          Dataflow {notification.metadata.dataflowId}
                        </span>
                      )}
                      {notification.metadata?.executionId && (
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">
                          Execution {notification.metadata.executionId}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDismiss(notification.id)}
                    className="rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                    aria-label="Dismiss notification"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {(notification.entity?.type === 'scenario' || notification.entity?.type === 'comparison') && (
                    <Button
                      variant="secondary"
                      size="small"
                      onClick={() => handleOpen(notification)}
                      icon={<ExternalLink className="h-4 w-4" />}
                      >
                      {entityLabel(notification)}
                    </Button>
                  )}
                  <Button
                    variant={isUnread ? 'primary' : 'ghost'}
                    size="small"
                    onClick={() => onMarkRead(notification.id)}
                    icon={<Mail className="h-4 w-4" />}
                  >
                    {isUnread ? 'Mark Read' : 'Read'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="small"
                    onClick={() => onDismiss(notification.id)}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </Modal>
  );
};
