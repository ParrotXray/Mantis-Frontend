import React, { createContext, useState, useEffect, useRef, useCallback } from 'react'
import { websocketUrl, urls } from '../utils/apiManager'
import { createWebSocket, fetchData } from '../utils/connectionUtils'
import { BehaviorSubject } from 'rxjs'
import { share } from 'rxjs/operators'
import { useAuth } from '../contexts/AuthContext'
import LoadingSpinner from '../components/LoadingSpinner'

interface WebSocketContextType {
    bootTime: number | null;
    wsConnectedCount: number;
    getDetectionAlertStream: () => any;
    getIPv4FlowStream: (direction: string, flow_direction: string, timeType: string) => any;
    getIPv6FlowStream: (direction: string, flow_direction: string, timeType: string) => any;
    getSystemHealthStream: () => any;
    getLatestFlowData: (protocol: 'ipv4' | 'ipv6', direction: string, flow_direction: string, timeType: string) => any;
    getLatestSystemHealth: () => any;
}

export const WebsocketContext = createContext<WebSocketContextType>({
    bootTime: null,
    wsConnectedCount: 0,
    getDetectionAlertStream: () => null,
    getIPv4FlowStream: () => null,
    getIPv6FlowStream: () => null,
    getSystemHealthStream: () => null,
    getLatestFlowData: () => null,
    getLatestSystemHealth: () => null,
})

// Every stream the provider keeps open: detection alerts, system health, and
// flow stats for each IP version x direction x flow direction x time range.
const ALL_WS_URLS: string[] = (() => {
    const list: string[] = [websocketUrl.detectionAlert, websocketUrl.systemHealth]
    for (const direction of ['ingress', 'egress']) {
        for (const flowDirection of ['source', 'destination']) {
            for (const timeType of ['1min', '10min', '1hour']) {
                list.push(websocketUrl.ipv4FlowStats(direction, flowDirection, timeType))
                list.push(websocketUrl.ipv6FlowStats(direction, flowDirection, timeType))
            }
        }
    }
    return list
})()

// The first connect after login blocks the page behind a spinner until every
// stream is open and boot time is known, so pages never render half-wired.
// Capped so a backend with some endpoints down still lets the UI through.
const INITIAL_CONNECT_TIMEOUT_MS = 10_000
const RETRY_BASE_MS = 1000
const RETRY_MAX_MS = 30_000

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { token } = useAuth()

    const wsRefs = useRef<{ [key: string]: WebSocket }>({})
    // Which URLs are open right now. The count is derived from this set, so a
    // socket that closes without ever opening (e.g. rejected for a missing
    // token) cannot pull the count below the number actually open.
    const openUrls = useRef<Set<string>>(new Set())
    const retryDelays = useRef<{ [key: string]: number }>({})
    const retryTimers = useRef<{ [key: string]: ReturnType<typeof setTimeout> }>({})
    // False once torn down (logout, token change, unmount): closes that follow
    // must not schedule reconnects.
    const activeRef = useRef(false)
    const dataSubjects = useRef<{ [key: string]: BehaviorSubject<any> }>({})
    const latestDataCache = useRef<{ [key: string]: any }>({})

    const [bootTime, setBootTime] = useState<number | null>(null)
    const [wsConnectedCount, setWsConnectedCount] = useState(0)
    const [initialConnectDone, setInitialConnectDone] = useState(false)

    const fetchBootTime = useCallback(() => {
        fetchData(
            urls.bootTime,
            (data) => setBootTime(Number(data.trim())),
            (error) => console.error('Boot time fetch error:', error?.message || 'Unknown error'),
        )
    }, [])

    const getOrCreateSubject = (url: string) => {
        if (!dataSubjects.current[url]) {
            dataSubjects.current[url] = new BehaviorSubject(null)
        }
        return dataSubjects.current[url]
    }

    const getWebSocketStream = (url: string) => {
        const subject = getOrCreateSubject(url)
        return subject.asObservable().pipe(share())
    }

    const setupWebSocket = useCallback((url: string) => {
        if (!activeRef.current) return
        const existing = wsRefs.current[url]
        if (existing && (existing.readyState === WebSocket.OPEN || existing.readyState === WebSocket.CONNECTING)) {
            return
        }

        // createWebSocket appends the current token, so each (re)connect uses
        // whatever token is valid at that moment.
        const ws = createWebSocket(
            url,
            (data) => {
                latestDataCache.current[url] = data
                getOrCreateSubject(url).next(data)
            },
            (error) => console.error(`WebSocket error for ${url}:`, error),
        )

        ws.onopen = () => {
            if (wsRefs.current[url] !== ws) return
            retryDelays.current[url] = RETRY_BASE_MS
            openUrls.current.add(url)
            setWsConnectedCount(openUrls.current.size)
        }

        ws.onclose = () => {
            // A socket replaced or torn down on purpose must not touch state.
            if (wsRefs.current[url] !== ws) return
            delete wsRefs.current[url]
            if (openUrls.current.delete(url)) {
                setWsConnectedCount(openUrls.current.size)
            }
            if (!activeRef.current) return
            const delay = retryDelays.current[url] ?? RETRY_BASE_MS
            retryDelays.current[url] = Math.min(delay * 2, RETRY_MAX_MS)
            console.warn(`WebSocket for ${url} closed. Retrying in ${delay}ms...`)
            retryTimers.current[url] = setTimeout(() => {
                delete retryTimers.current[url]
                setupWebSocket(url)
            }, delay)
        }

        wsRefs.current[url] = ws
    }, [])

    const closeWebSockets = useCallback(() => {
        activeRef.current = false
        Object.values(retryTimers.current).forEach(clearTimeout)
        retryTimers.current = {}
        const sockets = Object.values(wsRefs.current)
        // Cleared first so the onclose handlers below see a replaced socket
        // and skip both the count update and the reconnect.
        wsRefs.current = {}
        sockets.forEach(ws => {
            try {
                ws.close()
            } catch (error) {
                console.error('Failed to close WebSocket:', error)
            }
        })
        openUrls.current.clear()
        retryDelays.current = {}
        setWsConnectedCount(0)
    }, [])

    // Connect only with a token: before login (the /login and /setup pages
    // also render inside this provider) every socket would be rejected, and
    // the resulting backoff could delay the post-login connect by up to 30s.
    // A new token (login, re-login) tears down and reconnects immediately.
    useEffect(() => {
        if (!token) {
            closeWebSockets()
            setBootTime(null)
            setInitialConnectDone(false)
            return
        }
        activeRef.current = true
        setInitialConnectDone(false)
        fetchBootTime()
        ALL_WS_URLS.forEach(url => setupWebSocket(url))
        const timer = setTimeout(() => setInitialConnectDone(true), INITIAL_CONNECT_TIMEOUT_MS)
        return () => {
            clearTimeout(timer)
            closeWebSockets()
        }
    }, [token, fetchBootTime, setupWebSocket, closeWebSockets])

    useEffect(() => {
        if (token && !initialConnectDone && bootTime !== null && wsConnectedCount >= ALL_WS_URLS.length) {
            setInitialConnectDone(true)
        }
    }, [token, initialConnectDone, bootTime, wsConnectedCount])

    // Subjects outlive reconnects (pages keep their subscriptions); they are
    // only completed when the provider itself goes away.
    useEffect(() => () => {
        Object.values(dataSubjects.current).forEach(subject => subject.complete())
        dataSubjects.current = {}
        latestDataCache.current = {}
    }, [])

    const getLatestFlowData = useCallback((
        protocol: 'ipv4' | 'ipv6',
        direction: string,
        flow_direction: string,
        timeType: string
    ) => {
        const urlFunc = protocol === 'ipv4' ? websocketUrl.ipv4FlowStats : websocketUrl.ipv6FlowStats
        const url = urlFunc(direction, flow_direction, timeType)
        return latestDataCache.current[url] || null
    }, [])

    const getLatestSystemHealth = useCallback(() => {
        return latestDataCache.current[websocketUrl.systemHealth] || null
    }, [])

    const getDetectionAlertStream = useCallback(() => {
        return getWebSocketStream(websocketUrl.detectionAlert)
    }, [])

    const getIPv4FlowStream = useCallback((direction: string, flow_direction: string, timeType: string) => {
        const url = websocketUrl.ipv4FlowStats(direction, flow_direction, timeType)
        return getWebSocketStream(url)
    }, [])

    const getIPv6FlowStream = useCallback((direction: string, flow_direction: string, timeType: string) => {
        const url = websocketUrl.ipv6FlowStats(direction, flow_direction, timeType)
        return getWebSocketStream(url)
    }, [])

    const getSystemHealthStream = useCallback(() => {
        return getWebSocketStream(websocketUrl.systemHealth)
    }, [])

    const connecting = !!token && !initialConnectDone

    return (
        <WebsocketContext.Provider value={{
            bootTime,
            wsConnectedCount,
            getDetectionAlertStream,
            getIPv4FlowStream,
            getIPv6FlowStream,
            getSystemHealthStream,
            getLatestFlowData,
            getLatestSystemHealth,
        }}>
            {connecting ? (
                <div className="min-h-screen flex flex-col items-center justify-center gap-4">
                    <LoadingSpinner />
                    <p className="text-sm text-slate-500">
                        {wsConnectedCount < ALL_WS_URLS.length
                            ? `Connecting to Mantis... ${wsConnectedCount}/${ALL_WS_URLS.length}`
                            : 'Loading system info...'}
                    </p>
                </div>
            ) : children}
        </WebsocketContext.Provider>
    )
}
