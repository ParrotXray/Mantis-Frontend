export type NotificationCategory = 'device' | 'system'
export type NotificationLevel = 'info' | 'warning' | 'critical'

export interface AppNotification {
    id: number
    timestamp: number
    category: NotificationCategory
    level: NotificationLevel
    title: string
    message: string
    link: string | null
}

export interface NotificationList {
    notifications: AppNotification[]
    read_id: number
    alerts_seen_at: number
}
