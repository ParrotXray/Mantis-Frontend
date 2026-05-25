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
    TRACE: { badge: 'bg-slate-500/20 text-slate-400 border-slate-500/30', text: 'text-slate-400', dot: 'text-slate-500' },
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
                {/* Compact controls + filter bar */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex flex-wrap items-center gap-3 px-4 py-2.5 rounded-xl border mb-4 ${
                        isDark ? 'bg-[#0e1e2c] border-slate-700/40' : 'bg-white border-slate-200'
                    }`}
                >
                    {/* Level filter tabs */}
                    <div className={`flex items-center gap-1 p-0.5 rounded-lg border ${
                        isDark ? 'bg-[#131929] border-slate-700/50' : 'bg-slate-50 border-slate-200'
                    }`}>
                        <FontAwesomeIcon icon={faFilter} className={`ml-1.5 text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                        {levelKeys.map(lvl => {
                            const style = lvl !== 'ALL' ? LEVEL_STYLES[lvl] : null
                            const count = lvl === 'ALL' ? logs.length : (counts[lvl] ?? 0)
                            return (
                                <button
                                    key={lvl}
                                    onClick={() => setLevelFilter(lvl)}
                                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                                        levelFilter === lvl
                                            ? isDark ? 'bg-[#0e1e2c] text-white shadow-sm' : 'bg-white text-slate-900 shadow-sm'
                                            : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'
                                    }`}
                                >
                                    {lvl !== 'ALL' && style && (
                                        <FontAwesomeIcon icon={faCircle} className={`mr-1 text-[8px] ${style.dot}`} />
                                    )}
                                    {lvl}
                                    {count > 0 && (
                                        <span className={`ml-1 px-1 py-0.5 rounded-full text-[10px] ${
                                            isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-500'
                                        }`}>
                                            {count > 999 ? '999+' : count}
                                        </span>
                                    )}
                                </button>
                            )
                        })}
                    </div>

                    <div className="flex items-center gap-2 ml-auto">
                        {/* Live status */}
                        <div className="flex items-center gap-1.5">
                            <FontAwesomeIcon icon={faCircle} className={`text-[8px] ${isConnected ? 'text-green-400' : 'text-red-400'}`} />
                            <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                {isConnected ? 'Live' : 'Disconnected'} · {logs.length}
                            </span>
                        </div>

                        <div className={`w-px h-4 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />

                        <button
                            onClick={() => setAutoScroll(v => !v)}
                            title="Auto-scroll"
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                                autoScroll
                                    ? 'bg-[#4ab5cc]/15 text-[#4ab5cc]'
                                    : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            <FontAwesomeIcon icon={faArrowDown} className="text-xs" />
                            Auto-scroll
                        </button>
                        <button
                            onClick={() => setIsPaused(v => !v)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                                isPaused
                                    ? 'bg-amber-500/10 text-amber-500'
                                    : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            <FontAwesomeIcon icon={isPaused ? faPlay : faPause} className="text-xs" />
                            {isPaused ? `Resume (${bufferRef.current.length})` : 'Pause'}
                        </button>
                        <button
                            onClick={clearLogs}
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                                isDark
                                    ? 'text-slate-400 hover:text-red-400'
                                    : 'text-slate-500 hover:text-red-500'
                            }`}
                        >
                            <FontAwesomeIcon icon={faTrash} className="text-xs" />
                            Clear
                        </button>
                    </div>
                </motion.div>

                {/* Log list */}
                <div className={`rounded-xl border overflow-hidden ${isDark ? 'bg-[#0b0f17] border-slate-700/50' : 'bg-slate-50 border-slate-200'}`}>
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
                                                isDark ? 'hover:bg-[#1a2236]' : 'hover:bg-white'
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