import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import { fetchData, postData } from '../utils/connectionUtils'
import { urls } from '../utils/apiManager'
import { useAuth } from '../contexts/AuthContext'
import { WebsocketContext } from './WebSocketProvider'
import { AppNotification, NotificationList } from '../types/NotificationTypes'

// New notifications arrive over /notifications/websocket; the poll only keeps
// the read state in step with the account's other browsers and heals gaps.
const POLL_MS = 60_000
const FETCH_LIMIT = 200
// While Detection is open, alerts are being looked at; tell the backend at
// most this often instead of on every alert.
const SEEN_SYNC_MS = 30_000
// New-alert timestamps kept to recompute the count when another browser of
// the same account marks alerts seen.
const MAX_TRACKED_ALERTS = 1000

interface NotificationContextType {
    notifications: AppNotification[]
    readId: number
    unreadCount: number
    // Threat alerts this account has not looked at since alerts_seen_at.
    newAlertCount: number
    markAllRead: () => void
    markAlertsSeen: () => void
    refresh: () => void
}

export const NotificationContext = createContext<NotificationContextType>({
    notifications: [],
    readId: 0,
    unreadCount: 0,
    newAlertCount: 0,
    markAllRead: () => {},
    markAlertsSeen: () => {},
    refresh: () => {},
})

export const useNotifications = () => useContext(NotificationContext)

// Read state is per account on the backend (GET /notifications/list carries it,
// POST /notifications/read advances it), so every browser the account uses
// agrees. Local updates are applied at once and the server only moves forward.
export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { token } = useAuth()
    const router = useRouter()
    const { getDetectionAlertStream, getNotificationStream } = useContext(WebsocketContext)
    const [notifications, setNotifications] = useState<AppNotification[]>([])
    const [readId, setReadId] = useState(0)
    const [alertsSeenAt, setAlertsSeenAt] = useState<number | null>(null)
    const [alertTimes, setAlertTimes] = useState<number[]>([])
    const onDetectionRef = useRef(false)
    const lastSeenSyncRef = useRef(0)

    const refresh = useCallback(() => {
        fetchData(
            `${urls.notifications.list}?limit=${FETCH_LIMIT}`,
            (text) => {
                try {
                    const data = JSON.parse(text) as NotificationList
                    setNotifications(data.notifications)
                    setReadId(r => Math.max(r, data.read_id))
                    setAlertsSeenAt(s => Math.max(s ?? 0, data.alerts_seen_at))
                } catch {
                    // keep the last state
                }
            },
            () => {},
        )
    }, [])

    useEffect(() => {
        if (!token) {
            setNotifications([])
            setReadId(0)
            setAlertsSeenAt(null)
            setAlertTimes([])
            return
        }
        refresh()
        const timer = setInterval(refresh, POLL_MS)
        return () => clearInterval(timer)
    }, [token, refresh])

    // Pushed as soon as the backend stores them. The stream replays its last
    // message on subscribe, so merge by id rather than prepend blindly.
    useEffect(() => {
        if (!token || !getNotificationStream) return
        const stream = getNotificationStream()
        if (!stream) return
        const sub = stream.subscribe({
            next: (raw: any) => {
                if (!raw) return
                try {
                    const n = (typeof raw === 'string' ? JSON.parse(raw) : raw) as AppNotification
                    if (typeof n?.id !== 'number') return
                    setNotifications(list => list.some(x => x.id === n.id)
                        ? list
                        : [n, ...list].sort((a, b) => b.id - a.id).slice(0, FETCH_LIMIT))
                } catch {
                    // not a notification payload
                }
            },
        })
        return () => sub.unsubscribe()
    }, [token, getNotificationStream])

    const markAlertsSeen = useCallback(() => {
        const now = Math.floor(Date.now() / 1000)
        setAlertsSeenAt(s => Math.max(s ?? 0, now))
        if (Date.now() - lastSeenSyncRef.current < SEEN_SYNC_MS) return
        lastSeenSyncRef.current = Date.now()
        postData(urls.notifications.read, { alerts_seen_at: now }, undefined, () => {})
    }, [])

    useEffect(() => {
        onDetectionRef.current = router.pathname.startsWith('/detection')
        if (onDetectionRef.current && token) {
            lastSeenSyncRef.current = 0
            markAlertsSeen()
        }
    }, [router.pathname, token, markAlertsSeen])

    // Alerts are already streamed to every page; remember when attack alerts
    // arrive so the count follows alerts_seen_at, whichever browser moved it.
    useEffect(() => {
        if (!token || !getDetectionAlertStream) return
        const stream = getDetectionAlertStream()
        if (!stream) return
        const sub = stream.subscribe({
            next: (raw: any) => {
                if (!raw) return
                try {
                    const alert = typeof raw === 'string' ? JSON.parse(raw) : raw
                    if (!alert?.is_attack) return
                    if (onDetectionRef.current) {
                        markAlertsSeen()
                        return
                    }
                    const ts = Number(alert.timestamp) || Math.floor(Date.now() / 1000)
                    setAlertTimes(times => [...times, ts].slice(-MAX_TRACKED_ALERTS))
                } catch {
                    // not an alert payload
                }
            },
        })
        return () => sub.unsubscribe()
    }, [token, getDetectionAlertStream, markAlertsSeen])

    const markAllRead = useCallback(() => {
        const top = notifications.reduce((max, n) => Math.max(max, n.id), readId)
        setReadId(top)
        postData(urls.notifications.read, { read_id: top }, undefined, () => {})
    }, [notifications, readId])

    const unreadCount = notifications.filter(n => n.id > readId).length
    // Until the first response arrives the account's seen time is unknown;
    // count nothing rather than the alert the stream replays on subscribe.
    const newAlertCount = alertsSeenAt === null ? 0 : alertTimes.filter(t => t > alertsSeenAt).length

    return (
        <NotificationContext.Provider
            value={{ notifications, readId, unreadCount, newAlertCount, markAllRead, markAlertsSeen, refresh }}
        >
            {children}
        </NotificationContext.Provider>
    )
}
