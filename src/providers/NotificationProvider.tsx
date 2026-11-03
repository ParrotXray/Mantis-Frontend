import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import { fetchData } from '../utils/connectionUtils'
import { urls } from '../utils/apiManager'
import { useAuth } from '../contexts/AuthContext'
import { WebsocketContext } from './WebSocketProvider'
import { AppNotification, NotificationList } from '../types/NotificationTypes'

const POLL_MS = 15_000
const FETCH_LIMIT = 200
// Read state is per browser: the highest notification id seen, and the time
// alerts were last looked at.
const READ_ID_KEY = 'mantis_notifications_read_id'
const ALERTS_SEEN_KEY = 'mantis_alerts_seen_at'

const readNumber = (key: string): number => {
    try {
        return Number(localStorage.getItem(key) ?? 0) || 0
    } catch {
        return 0
    }
}

const writeNumber = (key: string, value: number) => {
    try {
        localStorage.setItem(key, String(value))
    } catch {
        // private mode or blocked storage: read state just does not persist
    }
}

interface NotificationContextType {
    notifications: AppNotification[]
    readId: number
    unreadCount: number
    // Threat alerts received since alerts were last looked at.
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

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { token } = useAuth()
    const router = useRouter()
    const { getDetectionAlertStream } = useContext(WebsocketContext)
    const [notifications, setNotifications] = useState<AppNotification[]>([])
    const [readId, setReadId] = useState(0)
    const [newAlertCount, setNewAlertCount] = useState(0)
    const alertsSeenAtRef = useRef(0)
    const onDetectionRef = useRef(false)

    useEffect(() => {
        setReadId(readNumber(READ_ID_KEY))
        // A browser that never opened Detection starts counting from now, so
        // the alert the stream replays on subscribe is not reported as new.
        const seen = readNumber(ALERTS_SEEN_KEY)
        alertsSeenAtRef.current = seen || Math.floor(Date.now() / 1000)
        if (!seen) writeNumber(ALERTS_SEEN_KEY, alertsSeenAtRef.current)
    }, [])

    const refresh = useCallback(() => {
        fetchData(
            `${urls.notifications}?limit=${FETCH_LIMIT}`,
            (text) => {
                try {
                    setNotifications((JSON.parse(text) as NotificationList).notifications)
                } catch {
                    // keep the last list
                }
            },
            () => {},
        )
    }, [])

    useEffect(() => {
        if (!token) {
            setNotifications([])
            return
        }
        refresh()
        const timer = setInterval(refresh, POLL_MS)
        return () => clearInterval(timer)
    }, [token, refresh])

    const markAlertsSeen = useCallback(() => {
        const now = Math.floor(Date.now() / 1000)
        alertsSeenAtRef.current = now
        writeNumber(ALERTS_SEEN_KEY, now)
        setNewAlertCount(0)
    }, [])

    // Alerts are already streamed to every page; count the attack ones that
    // arrive while the Detection page is not open.
    useEffect(() => {
        onDetectionRef.current = router.pathname.startsWith('/detection')
        if (onDetectionRef.current) markAlertsSeen()
    }, [router.pathname, markAlertsSeen])

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
                    } else if ((alert.timestamp ?? 0) > alertsSeenAtRef.current) {
                        setNewAlertCount(c => c + 1)
                    }
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
        writeNumber(READ_ID_KEY, top)
    }, [notifications, readId])

    const unreadCount = notifications.filter(n => n.id > readId).length

    return (
        <NotificationContext.Provider
            value={{ notifications, readId, unreadCount, newAlertCount, markAllRead, markAlertsSeen, refresh }}
        >
            {children}
        </NotificationContext.Provider>
    )
}
