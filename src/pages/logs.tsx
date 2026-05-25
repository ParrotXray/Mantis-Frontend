import React, { useState, useEffect, useRef, useCallback } from 'react'
import Head from 'next/head'
import { motion, AnimatePresence } from 'framer-motion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faScroll,
    faCircle,
    faFilter,
    faTrash,
    faArrowDown,
    faPause,
    faPlay,
} from '@fortawesome/free-solid-svg-icons'
import { useTheme } from '../providers/ThemeProvider'
import { websocketUrl } from '../config'
import Layout from '../components/Layout'

interface LogRecord {
    timestamp: string
    level: string
    message: string
}

type LevelFilter = 'ALL' | 'ERROR' | 'WARN' | 'INFO' | 'DEBUG' | 'TRACE'

const LEVEL_STYLES: Record<string, { badge: string; text: string; dot: string }> = {
    ERROR: { badge: 'bg-red-500/20 text-red-400 border-red-500/30',   text: 'text-red-400',    dot: 'text-red-500'    },
    WARN:  { badge: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', text: 'text-yellow-400', dot: 'text-yellow-500' },
    INFO:  { badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30',   text: 'text-blue-400',   dot: 'text-blue-500'   },
    DEBUG: { badge: 'bg-gray-500/20 text-gray-400 border-gray-500/30',   text: 'text-gray-400',   dot: 'text-gray-500'   },
    TRACE: { badge: 'bg-purple-500/20 text-purple-400 border-purple-500/30', text: 'text-purple-400', dot: 'text-purple-500' },
}

const DEFAULT_STYLE = LEVEL_STYLES.DEBUG

const MAX_LOGS = 1000

const LogsPage: React.FC = () => {
    const { actualTheme } = useTheme()
    const isDark = actualTheme === 'dark'

    const [logs, setLogs] = useState<LogRecord[]>([])
    const [levelFilter, setLevelFilter] = useState<LevelFilter>('ALL')
    const [isPaused, setIsPaused] = useState(false)
    const [isConnected, setIsConnected] = useState(false)
    const [autoScroll, setAutoScroll] = useState(true)

    const wsRef = useRef<WebSocket | null>(null)
    const isPausedRef = useRef(isPaused)
    const bottomRef = useRef<HTMLDivElement>(null)
    const bufferRef = useRef<LogRecord[]>([])

    useEffect(() => { isPausedRef.current = isPaused }, [isPaused])

    useEffect(() => {
        const connect = () => {
            const ws = new WebSocket(websocketUrl.logs)
            wsRef.current = ws

            ws.onopen = () => setIsConnected(true)
            ws.onclose = () => {
                setIsConnected(false)
                setTimeout(connect, 3000)
            }
            ws.onerror = () => ws.close()

            ws.onmessage = (e) => {
                try {
                    const record: LogRecord = JSON.parse(e.data)
                    if (isPausedRef.current) {
                        bufferRef.current.push(record)
                        return
                    }
                    setLogs(prev => {
                        const next = [...prev, record]
                        return next.length > MAX_LOGS ? next.slice(next.length - MAX_LOGS) : next
                    })
                } catch {}
            }
        }

        connect()
        return () => wsRef.current?.close()
    }, [])

    // Flush buffer when unpaused
    useEffect(() => {
        if (!isPaused && bufferRef.current.length > 0) {
            const buffered = bufferRef.current.splice(0)
            setLogs(prev => {
                const next = [...prev, ...buffered]
                return next.length > MAX_LOGS ? next.slice(next.length - MAX_LOGS) : next
            })
        }
    }, [isPaused])

    // Auto-scroll to bottom
    useEffect(() => {
        if (autoScroll && !isPaused) {
            bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
        }
    }, [logs, autoScroll, isPaused])

    const clearLogs = useCallback(() => {
        setLogs([])
        bufferRef.current = []
    }, [])

    const filteredLogs = levelFilter === 'ALL'
        ? logs
        : logs.filter(l => l.level === levelFilter)

    const counts = logs.reduce<Record<string, number>>((acc, l) => {
        acc[l.level] = (acc[l.level] ?? 0) + 1
        return acc
    }, {})

    const formatTimestamp = (ts: string) => {
        try {
            const d = new Date(ts)
            return d.toLocaleTimeString('en', { hour12: false }) + '.' + String(d.getMilliseconds()).padStart(3, '0')
        } catch {
            return ts
        }
    }

    const levelKeys: LevelFilter[] = ['ALL', 'ERROR', 'WARN', 'INFO', 'DEBUG', 'TRACE']

    return (
        <>
            <Head>
                <title>Logs - Mantis</title>
            </Head>
            <Layout>
                {/* Header */}
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
                    <div className="flex items-center justify-between">
                        <h1 className={`text-3xl font-bold flex items-center gap-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            <FontAwesomeIcon icon={faScroll} className="text-teal-500" />
                            System Logs
                        </h1>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setAutoScroll(v => !v)}
                                title="Auto-scroll"
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                                    autoScroll
                                        ? 'bg-teal-600 text-white'
                                        : isDark
                                            ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                            : 'border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-400'
                                }`}
                            >
                                <FontAwesomeIcon icon={faArrowDown} className="text-xs" />
                                Auto-scroll
                            </button>
                            <button
                                onClick={() => setIsPaused(v => !v)}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                                    isPaused
                                        ? 'bg-yellow-600 text-white'
                                        : isDark
                                            ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                            : 'border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-400'
                                }`}
                            >
                                <FontAwesomeIcon icon={isPaused ? faPlay : faPause} className="text-xs" />
                                {isPaused ? `Resume (${bufferRef.current.length})` : 'Pause'}
                            </button>
                            <button
                                onClick={clearLogs}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                                    isDark
                                        ? 'bg-gray-700 text-gray-300 hover:bg-red-900/40 hover:text-red-400'
                                        : 'border border-gray-300 bg-white text-gray-600 hover:bg-red-50 hover:border-red-300 hover:text-red-600'
                                }`}
                            >
                                <FontAwesomeIcon icon={faTrash} className="text-xs" />
                                Clear
                            </button>
                        </div>
                    </div>
                </motion.div>

                {/* Level filter tabs + live status */}
                <div className="flex items-center justify-between mb-4">
                    <div className={`flex items-center gap-1 p-1 rounded-lg border ${
                        isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
                    }`}>
                        <FontAwesomeIcon icon={faFilter} className={`ml-2 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                        {levelKeys.map(lvl => {
                            const style = lvl !== 'ALL' ? LEVEL_STYLES[lvl] : null
                            const count = lvl === 'ALL' ? logs.length : (counts[lvl] ?? 0)
                            return (
                                <button
                                    key={lvl}
                                    onClick={() => setLevelFilter(lvl)}
                                    className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                                        levelFilter === lvl
                                            ? isDark ? 'bg-gray-600 text-white' : 'bg-white text-gray-900 shadow-sm'
                                            : isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'
                                    }`}
                                >
                                    {lvl !== 'ALL' && style && (
                                        <FontAwesomeIcon icon={faCircle} className={`mr-1 text-[8px] ${style.dot}`} />
                                    )}
                                    {lvl}
                                    {count > 0 && (
                                        <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${
                                            isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'
                                        }`}>
                                            {count > 999 ? '999+' : count}
                                        </span>
                                    )}
                                </button>
                            )
                        })}
                    </div>

                    <div className="flex items-center gap-2">
                        <FontAwesomeIcon
                            icon={faCircle}
                            className={`text-xs ${isConnected ? 'text-green-400' : 'text-red-400'}`}
                        />
                        <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            {isConnected ? 'Live' : 'Disconnected'} · {logs.length} entries
                        </span>
                    </div>
                </div>

                {/* Log list */}
                <div className={`rounded-xl border overflow-hidden ${isDark ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="h-[calc(100vh-320px)] min-h-64 overflow-y-auto font-mono text-xs">
                        {filteredLogs.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full gap-3">
                                <FontAwesomeIcon icon={faScroll} className={`text-4xl ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
                                <p className={isDark ? 'text-gray-500' : 'text-gray-400'}>
                                    {isConnected ? 'Waiting for logs...' : 'Connecting...'}
                                </p>
                            </div>
                        ) : (
                            <div className="divide-y divide-transparent">
                                {filteredLogs.map((log, i) => {
                                    const style = LEVEL_STYLES[log.level] ?? DEFAULT_STYLE
                                    return (
                                        <div
                                            key={i}
                                            className={`flex items-start gap-3 px-4 py-1.5 transition-colors ${
                                                isDark ? 'hover:bg-gray-800' : 'hover:bg-white'
                                            }`}
                                        >
                                            <span className={`flex-shrink-0 w-[85px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                                {formatTimestamp(log.timestamp)}
                                            </span>
                                            <span className={`flex-shrink-0 inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-bold uppercase w-[46px] justify-center ${style.badge}`}>
                                                {log.level.slice(0, 4)}
                                            </span>
                                            <span className={`flex-1 break-all leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                                {log.message}
                                            </span>
                                        </div>
                                    )
                                })}
                                <div ref={bottomRef} />
                            </div>
                        )}
                    </div>
                </div>

                {isPaused && bufferRef.current.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-3 px-4 py-2 bg-yellow-500/20 border border-yellow-500/30 rounded-lg text-yellow-400 text-sm flex items-center justify-between"
                    >
                        <span>{bufferRef.current.length} new entries buffered while paused</span>
                        <button onClick={() => setIsPaused(false)} className="font-medium hover:underline">
                            Resume
                        </button>
                    </motion.div>
                )}
            </Layout>
        </>
    )
}

export default LogsPage