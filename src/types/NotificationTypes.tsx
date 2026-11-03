// Mirrors backend model/notification.rs (GET /notifications/list).

export type NotificationCategory = 'device' | 'system'
export type NotificationLevel = 'info' | 'warning' | 'critical'

export interface AppNotification {
    // Increasing; read state is the highest id seen.
    id: number
    // Unix seconds.
    timestamp: number
    category: NotificationCategory
    level: NotificationLevel
    title: string
    message: string
    // Web UI path with details, e.g. "/devices".
    link: string | null
}

export interface NotificationList {
    // Newest first.
    notifications: AppNotification[]
    // The signed-in account's read state (shared by all its browsers).
    // Highest notification id read.
    read_id: number
    // Unix seconds; attack alerts after this are new.
    alerts_seen_at: number
}
