import React, { createContext, useState, useEffect, useRef } from 'react'
import { websocketUrl, urls } from '../config'
import { createWebSocket, fetchData } from '../utils/connectionUtils'
import { Subject } from 'rxjs'

interface WebSocketContextType {
    bootTime: number | null;
    getAiAlertStream: () => any;
    getIPv4FlowStream: (direction: string, flow_direction: string, timeType: string) => any;
    getIPv6FlowStream: (direction: string, flow_direction: string, timeType: string) => any;
    getSystemHealthStream: () => any;
}

export const WebsocketContext = createContext<WebSocketContextType>({
    bootTime: null,
    getAiAlertStream: () => null,
    getIPv4FlowStream: () => null,
    getIPv6FlowStream: () => null,
    getSystemHealthStream: () => null,
})

interface WebSocketProviderProps {
    children: React.ReactNode
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
    const wsRefs = useRef<{ [key: string]: WebSocket }>({})
    const [bootTime, setBootTime] = useState<number | null>(null)
    const retryDelays = useRef<{ [key: string]: number }>({})
    const dataSubjects = useRef<{ [key: string]: Subject<any> }>({})

    const fetchBootTime = async () => {
        try {
            const data = await fetchData(
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

    const getWebSocketStream = (url: string) => {
        if (!dataSubjects.current[url]) {
            dataSubjects.current[url] = new Subject()
        }
        return dataSubjects.current[url].asObservable()
    }

    const setupWebSocket = (url: string, retryCount: number = 0) => {
        if (wsRefs.current[url]) {
            wsRefs.current[url].close()
        }

        const ws = createWebSocket(
            url,
            (data) => {
                if (dataSubjects.current[url]) {
                    dataSubjects.current[url].next(data)
                }
            },
            (error) => console.error(`WebSocket error for ${url}:`, error)
        )

        ws.onclose = () => {
            console.warn(`WebSocket for ${url} closed. Retrying...`)
            let delay = retryDelays.current[url] || 1000
            retryDelays.current[url] = Math.min(delay * 2, 30000)
            setTimeout(() => setupWebSocket(url, retryCount + 1), delay)
        }

        ws.onopen = () => {
            console.log(`WebSocket connected: ${url}`)
            // 重置重試延遲
            retryDelays.current[url] = 1000
        }

        wsRefs.current[url] = ws
        return ws
    }

    const getAiAlertStream = () => {
        return getWebSocketStream(websocketUrl.aiAlert)
    }

    const getIPv4FlowStream = (direction: string, flow_direction: string, timeType: string) => {
        const url = websocketUrl.ipv4FlowStats(direction, flow_direction, timeType)
        return getWebSocketStream(url)
    }

    const getIPv6FlowStream = (direction: string, flow_direction: string, timeType: string) => {
        const url = websocketUrl.ipv6FlowStats(direction, flow_direction, timeType)
        return getWebSocketStream(url)
    }

    const getSystemHealthStream = () => {
        return getWebSocketStream(websocketUrl.systemHealth)
    }

    const initializeWebSockets = () => {
        setupWebSocket(websocketUrl.aiAlert)
        
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
    }

    const closeWebSockets = () => {
        Object.entries(wsRefs.current).forEach(([url, ws]) => {
            try {
                ws.close()
                delete wsRefs.current[url]
            } catch (error) {
                console.error(`Failed to close WebSocket ${url}:`, error)
            }
        })

        Object.values(dataSubjects.current).forEach(subject => {
            subject.complete()
        })
        dataSubjects.current = {}
    }

    useEffect(() => {
        fetchBootTime()
        initializeWebSockets()

        return () => closeWebSockets()
    }, [])

    const contextValue: WebSocketContextType = {
        bootTime,
        getAiAlertStream,
        getIPv4FlowStream,
        getIPv6FlowStream,
        getSystemHealthStream,
    }

    return (
        <WebsocketContext.Provider value={contextValue}>
            {children}
        </WebsocketContext.Provider>
    )
}