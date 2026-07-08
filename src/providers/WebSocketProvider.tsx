import React, { createContext, useState, useEffect, useRef, useCallback } from 'react'
import { websocketUrl, urls } from '../config'
import { createWebSocket, fetchData } from '../utils/connectionUtils'
import { BehaviorSubject } from 'rxjs'
import { share } from 'rxjs/operators'

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

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const wsRefs = useRef<{ [key: string]: WebSocket }>({})
    const [bootTime, setBootTime] = useState<number | null>(null)
    const [wsConnectedCount, setWsConnectedCount] = useState(0)
    const connectedCountRef = useRef(0)
    const retryDelays = useRef<{ [key: string]: number }>({})
    const dataSubjects = useRef<{ [key: string]: BehaviorSubject<any> }>({})
    const latestDataCache = useRef<{ [key: string]: any }>({})

    const fetchBootTime = async () => {
        try {
            await fetchData(
                urls.bootTime,
                (data) => setBootTime(Number(data.trim())),
                (error) => {
                    throw new Error(`Failed to fetch boot_time: ${error?.message || 'Unknown error'}`)
                }
            )
        } catch (error) {
            console.error('Boot time fetch error:', error)
        }
    }

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

    const setupWebSocket = (url: string, retryCount: number = 0) => {
        if (wsRefs.current[url] && wsRefs.current[url].readyState === WebSocket.OPEN) {
            console.log(`WebSocket already connected: ${url}`)
            return wsRefs.current[url]
        }

        if (wsRefs.current[url]) {
            wsRefs.current[url].close()
        }

        const ws = createWebSocket(
            url,
            (data) => {
                latestDataCache.current[url] = data
                getOrCreateSubject(url).next(data)
            },
            (error) => console.error(`WebSocket error for ${url}:`, error)
        )

        ws.onclose = () => {
            console.warn(`WebSocket for ${url} closed. Retrying...`)
            delete wsRefs.current[url]
            connectedCountRef.current = Math.max(0, connectedCountRef.current - 1)
            setWsConnectedCount(connectedCountRef.current)
            let delay = retryDelays.current[url] || 1000
            retryDelays.current[url] = Math.min(delay * 2, 30000)
            setTimeout(() => setupWebSocket(url, retryCount + 1), delay)
        }

        ws.onopen = () => {
            console.log(`WebSocket connected: ${url}`)
            retryDelays.current[url] = 1000
            connectedCountRef.current++
            setWsConnectedCount(connectedCountRef.current)
        }

        wsRefs.current[url] = ws
        return ws
    }

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

    const initializeWebSockets = useCallback(() => {
        console.log("Initializing all WebSocket connections...")

        setupWebSocket(websocketUrl.detectionAlert)
        setupWebSocket(websocketUrl.systemHealth)

        const directions = ["ingress", "egress"]
        const flowDirections = ["source", "destination"]
        const timeTypes = ["1min", "10min", "1hour"]

        directions.forEach(direction => {
            flowDirections.forEach(flow_direction => {
                timeTypes.forEach(timeType => {
                    setupWebSocket(websocketUrl.ipv4FlowStats(direction, flow_direction, timeType))
                    setupWebSocket(websocketUrl.ipv6FlowStats(direction, flow_direction, timeType))
                })
            })
        })

        console.log(`Total WebSocket connections: ${Object.keys(wsRefs.current).length}`)
    }, [])

    const closeWebSockets = useCallback(() => {
        console.log("Closing all WebSocket connections...")

        Object.entries(wsRefs.current).forEach(([url, ws]) => {
            try {
                ws.close()
            } catch (error) {
                console.error(`Failed to close WebSocket ${url}:`, error)
            }
        })
        wsRefs.current = {}

        Object.values(dataSubjects.current).forEach(subject => {
            subject.complete()
        })
        dataSubjects.current = {}
        latestDataCache.current = {}
    }, [])

    useEffect(() => {
        fetchBootTime()
        initializeWebSockets()
        return () => closeWebSockets()
    }, [])

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
            {children}
        </WebsocketContext.Provider>
    )
}