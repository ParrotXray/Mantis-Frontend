import React, { useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react'
import Head from 'next/head'
import { motion, AnimatePresence } from 'framer-motion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faRobot,
    faShieldAlt,
    faExclamationTriangle,
    faFilter,
    faCheck,
    faGlobe,
    faTimes,
    faClock,
    faArrowRight,
    faEye,
    faList,
    faPause,
    faPlay,
} from '@fortawesome/free-solid-svg-icons'
import { WebsocketContext } from '../providers/WebSocketProvider'
import { useTheme } from '../providers/ThemeProvider'
import { putData } from '../utils/connectionUtils'
import { urls } from '../config'
import Layout from '../components/Layout'
import LoadingSpinner from '../components/LoadingSpinner'

type AlertSource = 'ml' | 'rule' | 'fusion'
type AlertSeverity = 'high' | 'critical'

interface UnifiedAlert {
    timestamp: number
    flow_key: string
    src_ip: string
    dst_ip: string
    src_port: number
    dst_port: number
    protocol: number
    source: AlertSource
    severity: AlertSeverity
    is_attack: boolean
    attack_type: string | null
    confidence: number
    ae_score: number
    rule_sid: number | null
    rule_msg: string | null
}

interface PriorityInfo {
    color: string
    bgColor: string
    label: string
}

interface NotificationProps {
    message: string
    type: 'success' | 'error' | 'warning' | 'info'
    onClose: () => void
}

interface AlertDetailsProps {
    log: UnifiedAlert
    onClose: () => void
    showNotification: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void
}

interface AlertItemProps {
    log: UnifiedAlert
    index: number
    onClick: (index: number) => void
}

interface FilterButtonProps {
    isActive: boolean
    onClick: () => void
    children: React.ReactNode
    className?: string
    activeClassName?: string
    activeHoverClassName?: string
}

const UPDATE_INTERVALS = [
    { label: 'immediate', value: 0 },
    { label: '1s', value: 1000 },
    { label: '3s', value: 3000 },
    { label: '5s', value: 5000 },
    { label: '10s', value: 10000 },
]

const SOURCE_CONFIG: Record<AlertSource, { label: string; color: string; bgColor: string }> = {
    ml:     { label: 'ML',     color: '#818cf8', bgColor: 'rgba(129,140,248,0.1)' },
    rule:   { label: 'Rule',   color: '#0284c7', bgColor: 'rgba(2,132,199,0.1)'  },
    fusion: { label: 'Fusion', color: '#0f766e', bgColor: 'rgba(15,118,110,0.1)' },
}

const SEVERITY_CONFIG: Record<AlertSeverity, PriorityInfo> = {
    critical: { color: '#e53e3e', bgColor: 'rgba(239,68,68,0.1)',  label: 'Critical' },
    high:     { color: '#dd6b20', bgColor: 'rgba(251,146,60,0.1)', label: 'High'     },
}

const getProtocolName = (protocol: number): string => {
    switch (protocol) {
        case 1:  return 'ICMP'
        case 6:  return 'TCP'
        case 17: return 'UDP'
        case 47: return 'GRE'
        case 50: return 'ESP'
        case 51: return 'AH'
        case 58: return 'ICMPv6'
        default: return `Proto ${protocol}`
    }
}

const formatTimestamp = (timestamp: number): string => {
    if (!timestamp) return 'N/A'
    return new Date(timestamp * 1000).toLocaleString('en-GB', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
    })
}

const parseAlertData = (rawData: any): UnifiedAlert | null => {
    try {
        const data = typeof rawData === 'string' ? JSON.parse(rawData) : rawData
        if (!data || typeof data !== 'object') return null

        const source: AlertSource = data.source === 'ml' || data.source === 'rule' || data.source === 'fusion'
            ? data.source : 'ml'
        const severity: AlertSeverity = data.severity === 'critical' ? 'critical' : 'high'

        return {
            timestamp:   data.timestamp   ?? 0,
            flow_key:    data.flow_key    ?? '',
            src_ip:      data.src_ip      ?? 'Unknown',
            dst_ip:      data.dst_ip      ?? 'Unknown',
            src_port:    data.src_port    ?? 0,
            dst_port:    data.dst_port    ?? 0,
            protocol:    data.protocol    ?? 0,
            source,
            severity,
            is_attack:   data.is_attack   ?? false,
            attack_type: data.attack_type ?? null,
            confidence:  data.confidence  ?? 0,
            ae_score:    data.ae_score    ?? 0,
            rule_sid:    data.rule_sid    ?? null,
            rule_msg:    data.rule_msg    ?? null,
        }
    } catch {
        return null
    }
}

const Notification: React.FC<NotificationProps> = ({ message, type, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 4000)
        return () => clearTimeout(timer)
    }, [onClose])

    const typeStyles = {
        success: 'bg-green-100 border-green-400 text-green-700',
        error:   'bg-red-100 border-red-400 text-red-700',
        warning: 'bg-yellow-100 border-yellow-400 text-yellow-700',
        info:    'bg-blue-100 border-blue-400 text-blue-700',
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.95 }}
            className={`fixed top-4 right-4 z-50 px-4 py-3 border rounded-lg shadow-lg max-w-md ${typeStyles[type]}`}
        >
            <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{message}</span>
                <button onClick={onClose} className="ml-3 text-xl font-bold hover:opacity-70 transition-opacity">×</button>
            </div>
        </motion.div>
    )
}

const AlertDetails: React.FC<AlertDetailsProps> = ({ log, onClose, showNotification }) => {
    const { actualTheme } = useTheme()
    const isDark = actualTheme === 'dark'
    const priorityInfo = SEVERITY_CONFIG[log.severity]
    const sourceInfo   = SOURCE_CONFIG[log.source]

    const isIPv6Source = log.src_ip.includes(':') && !log.src_ip.includes('.')
    const isIPv6Dest   = log.dst_ip.includes(':') && !log.dst_ip.includes('.')

    const handleBlockIP = useCallback((ip: string, port: number, isSource: boolean, blockAllPorts = false) => {
        const isIPv6 = isSource ? isIPv6Source : isIPv6Dest
        const formattedIp = isIPv6 ? `[${ip}]` : ip
        const ipVersion = isIPv6 ? 'ipv6' as const : 'ipv4' as const
        const url = urls.access_control('ingress', ipVersion, 'source', 'black_list')
        const portToSend = blockAllPorts ? '0' : String(port)
        const displayPort = blockAllPorts ? '*' : String(port)

        putData(
            url,
            `${formattedIp}:${portToSend}`,
            () => showNotification(`Successfully added to blacklist: ${ip}:${displayPort}`, 'success'),
            (error) => showNotification(`Failed to add to blacklist: ${error.message}`, 'error'),
        )
    }, [isIPv6Source, isIPv6Dest, showNotification])

    const handleAllowIP = useCallback((ip: string, port: number, isSource: boolean, allowAllPorts = false) => {
        const isIPv6 = isSource ? isIPv6Source : isIPv6Dest
        const formattedIp = isIPv6 ? `[${ip}]` : ip
        const ipVersion = isIPv6 ? 'ipv6' as const : 'ipv4' as const
        const url = urls.access_control('ingress', ipVersion, 'source', 'white_list')
        const portToSend = allowAllPorts ? '0' : String(port)
        const displayPort = allowAllPorts ? '*' : String(port)

        putData(
            url,
            `${formattedIp}:${portToSend}`,
            () => showNotification(`Successfully added to whitelist: ${ip}:${displayPort}`, 'success'),
            (error) => showNotification(`Failed to add to whitelist: ${error.message}`, 'error'),
        )
    }, [isIPv6Source, isIPv6Dest, showNotification])

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className={`rounded-xl border flex flex-col h-full ${isDark ? 'bg-[#0e1e2c] border-slate-700/40' : 'bg-white border-slate-200'}`}
                style={{ maxHeight: 'calc(100vh - 280px)', minHeight: '400px' }}
            >
                {/* Header */}
                <div className={`px-5 py-3 border-b flex items-center justify-between flex-shrink-0 ${isDark ? 'border-slate-700/40' : 'border-slate-200'}`}>
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-[#4ab5cc]/15 flex items-center justify-center">
                            <FontAwesomeIcon icon={faEye} className="text-[#4ab5cc] text-xs" />
                        </div>
                        <span className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>Alert Details</span>
                    </div>
                    <button
                        onClick={onClose}
                        className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
                    >
                        <FontAwesomeIcon icon={faTimes} className="text-xs" />
                    </button>
                </div>

                {/* Scrollable content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {/* Basic info */}
                    <div className={`rounded-lg border p-3 space-y-2.5 ${isDark ? 'bg-[#131929] border-slate-700/40' : 'bg-slate-50 border-slate-200'}`}>
                        {[
                            { label: 'Timestamp', value: formatTimestamp(log.timestamp) },
                            { label: 'Attack Type', value: log.attack_type ?? '—' },
                            { label: 'Protocol', value: getProtocolName(log.protocol) },
                        ].map(({ label, value }) => (
                            <div key={label} className="flex justify-between items-center">
                                <span className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{label}</span>
                                <span className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{value}</span>
                            </div>
                        ))}
                        <div className="flex justify-between items-center">
                            <span className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Severity</span>
                            <span
                                className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full"
                                style={{ backgroundColor: priorityInfo.bgColor, color: priorityInfo.color }}
                            >
                                <FontAwesomeIcon icon={faExclamationTriangle} className="mr-1 text-[10px]" />
                                {priorityInfo.label}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Source</span>
                            <span
                                className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full"
                                style={{ backgroundColor: sourceInfo.bgColor, color: sourceInfo.color }}
                            >
                                {sourceInfo.label}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Is Attack</span>
                            <span className={`text-xs font-semibold ${log.is_attack ? 'text-amber-400' : 'text-emerald-400'}`}>
                                {log.is_attack ? 'Yes' : 'No'}
                            </span>
                        </div>
                    </div>

                    {/* ML Score Details */}
                    {(log.source === 'ml' || log.source === 'fusion') && (
                        <div>
                            <span className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>ML Score Details</span>
                            <div className={`mt-2 rounded-lg border p-3 space-y-2 ${isDark ? 'bg-[#131929] border-slate-700/40' : 'bg-slate-50 border-slate-200'}`}>
                                {[
                                    { label: 'Confidence', value: log.confidence },
                                    { label: 'AE Score',   value: log.ae_score   },
                                ].map(({ label, value }) => (
                                    <div key={label} className="flex justify-between items-center">
                                        <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{label}</span>
                                        <span className={`text-xs font-mono font-semibold ${
                                            value >= 1.0 ? 'text-red-400' :
                                                value >= 0.5 ? 'text-orange-400' :
                                                    value >= 0.1 ? 'text-yellow-400' :
                                                        'text-emerald-400'
                                        }`}>
                                            {value.toFixed(4)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Rule Match */}
                    {(log.source === 'rule' || log.source === 'fusion') && (log.rule_sid !== null || log.rule_msg !== null) && (
                        <div>
                            <span className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Rule Match</span>
                            <div className={`mt-2 rounded-lg border p-3 space-y-2 ${isDark ? 'bg-[#131929] border-slate-700/40' : 'bg-slate-50 border-slate-200'}`}>
                                {log.rule_sid !== null && (
                                    <div className="flex justify-between items-center">
                                        <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>SID</span>
                                        <span className={`text-xs font-mono ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{log.rule_sid}</span>
                                    </div>
                                )}
                                {log.rule_msg !== null && (
                                    <div className="flex justify-between gap-4">
                                        <span className={`text-xs flex-shrink-0 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Message</span>
                                        <span className={`text-xs text-right ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{log.rule_msg}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Connection Details */}
                    <div>
                        <span className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Connection</span>
                        <div className={`mt-2 rounded-lg border p-3 flex items-center justify-between ${isDark ? 'bg-[#131929] border-slate-700/40' : 'bg-slate-50 border-slate-200'}`}>
                            <div className="text-center">
                                <div className={`text-xs font-medium mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Source</div>
                                <div className="text-sm font-semibold text-[#4ab5cc] font-mono">{log.src_ip}</div>
                                <div className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>:{log.src_port}</div>
                            </div>
                            <FontAwesomeIcon icon={faArrowRight} className={`text-xs ${isDark ? 'text-slate-600' : 'text-slate-400'}`} />
                            <div className="text-center">
                                <div className={`text-xs font-medium mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Destination</div>
                                <div className="text-sm font-semibold text-amber-400 font-mono">{log.dst_ip}</div>
                                <div className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>:{log.dst_port}</div>
                            </div>
                        </div>
                    </div>

                    {/* IP Management */}
                    <div>
                        <span className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>IP Management</span>
                        <div className="mt-2 space-y-2">
                            {[
                                { label: 'Source IP',      ip: log.src_ip, port: log.src_port, isSource: true  },
                                { label: 'Destination IP', ip: log.dst_ip, port: log.dst_port, isSource: false },
                            ].map(({ label, ip, port, isSource }) => (
                                <div key={label} className={`rounded-lg border p-3 ${isDark ? 'bg-[#131929] border-slate-700/40' : 'bg-slate-50 border-slate-200'}`}>
                                    <div className={`text-xs font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                        {label}: <span className={`font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{ip}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-1.5">
                                        <button
                                            className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-colors border ${isDark ? 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20' : 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'}`}
                                            onClick={() => handleBlockIP(ip, port, isSource)}
                                        >
                                            <FontAwesomeIcon icon={faFilter} className="mr-1 text-[10px]" />
                                            Block :{port}
                                        </button>
                                        <button
                                            className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-colors border ${isDark ? 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20' : 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'}`}
                                            onClick={() => handleBlockIP(ip, port, isSource, true)}
                                        >
                                            <FontAwesomeIcon icon={faFilter} className="mr-1 text-[10px]" />
                                            Block All
                                        </button>
                                        <button
                                            className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-colors border ${isDark ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20' : 'bg-green-50 border-green-200 text-green-600 hover:bg-green-100'}`}
                                            onClick={() => handleAllowIP(ip, port, isSource)}
                                        >
                                            <FontAwesomeIcon icon={faCheck} className="mr-1 text-[10px]" />
                                            Allow :{port}
                                        </button>
                                        <button
                                            className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-colors border ${isDark ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20' : 'bg-green-50 border-green-200 text-green-600 hover:bg-green-100'}`}
                                            onClick={() => handleAllowIP(ip, port, isSource, true)}
                                        >
                                            <FontAwesomeIcon icon={faCheck} className="mr-1 text-[10px]" />
                                            Allow All
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    )
}

const AlertItem: React.FC<AlertItemProps> = ({ log, index, onClick }) => {
    const { actualTheme } = useTheme()
    const isDark = actualTheme === 'dark'
    const priorityInfo = SEVERITY_CONFIG[log.severity]
    const sourceInfo   = SOURCE_CONFIG[log.source]

    const handleClick = useCallback(() => onClick(index), [index, onClick])

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`border rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow duration-200 ${
                isDark ? 'bg-[#131929] border-slate-700/50' : 'bg-white border-slate-200'
            }`}
            onClick={handleClick}
        >
            <div className="flex items-start space-x-4">
                <div
                    className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: priorityInfo.bgColor }}
                >
                    <FontAwesomeIcon icon={faExclamationTriangle} style={{ color: priorityInfo.color }} className="text-sm" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                        <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            {formatTimestamp(log.timestamp)}
                        </span>
                        <div className="flex items-center gap-1">
                            <span
                                className="text-xs px-2 py-0.5 rounded-full font-medium"
                                style={{ backgroundColor: sourceInfo.bgColor, color: sourceInfo.color }}
                            >
                                {sourceInfo.label}
                            </span>
                            {log.attack_type && (
                                <span className={`text-xs px-2 py-1 rounded-full ${
                                    isDark ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-800'
                                }`}>
                                    {log.attack_type}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className={`text-sm mb-2 ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
                        <span>{log.src_ip}:{log.src_port} </span>
                        <FontAwesomeIcon icon={faArrowRight} className={isDark ? 'text-gray-500' : 'text-gray-400'} />
                        <span> {log.dst_ip}:{log.dst_port}</span>
                        <span className="ml-1 text-xs opacity-70">({getProtocolName(log.protocol)})</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span
                            className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{ backgroundColor: priorityInfo.bgColor, color: priorityInfo.color }}
                        >
                            {priorityInfo.label}
                        </span>
                        {(log.source === 'ml' || log.source === 'fusion') && (
                            <span className={`text-xs font-mono ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                {log.confidence.toFixed(4)}
                            </span>
                        )}
                        {(log.source === 'rule' || log.source === 'fusion') && log.rule_sid !== null && (
                            <span className={`text-xs font-mono ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                SID {log.rule_sid}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    )
}

const FilterButton: React.FC<FilterButtonProps> = ({
                                                       isActive, onClick, children,
                                                       className = '', activeClassName = '', activeHoverClassName = '',
                                                   }) => {
    const { actualTheme } = useTheme()
    const isDark = actualTheme === 'dark'

    return (
        <button
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                isActive
                    ? `${activeClassName || 'bg-[#4ab5cc] text-white shadow-sm'} ${activeHoverClassName}`
                    : `${isDark ? 'bg-[#131929] text-slate-300 hover:bg-slate-700/40' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} ${className}`
            }`}
            onClick={onClick}
        >
            {children}
        </button>
    )
}

const Detection: React.FC = () => {
    const { getDetectionAlertStream } = useContext(WebsocketContext)
    const { actualTheme } = useTheme()
    const isDark = actualTheme === 'dark'

    const [logs, setLogs] = useState<UnifiedAlert[]>([])
    const [selectedLogIndex, setSelectedLogIndex] = useState<number | null>(null)
    const [severityFilter, setSeverityFilter] = useState<string>('all')
    const [sourceFilter, setSourceFilter] = useState<string>('all')
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isPaused, setIsPaused] = useState(false)
    const [updateInterval, setUpdateInterval] = useState(0)
    const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null)

    const bufferRef = useRef<UnifiedAlert[]>([])
    const updateIntervalRef = useRef<number>(updateInterval)
    const isPausedRef = useRef<boolean>(isPaused)

    useEffect(() => { updateIntervalRef.current = updateInterval }, [updateInterval])
    useEffect(() => { isPausedRef.current = isPaused }, [isPaused])

    const showNotification = useCallback((message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
        setNotification({ message, type })
    }, [])

    const closeNotification = useCallback(() => setNotification(null), [])

    const flushBuffer = useCallback(() => {
        if (bufferRef.current.length === 0) return
        const newEntries = [...bufferRef.current]
        bufferRef.current = []
        setLogs(prev => [...newEntries, ...prev].slice(0, 200))
        setLastUpdateTime(new Date())
    }, [])

    useEffect(() => {
        if (updateInterval === 0 || isPaused) return
        const timer = setInterval(flushBuffer, updateInterval)
        return () => clearInterval(timer)
    }, [updateInterval, isPaused, flushBuffer])

    // Reads isPaused via ref so this callback never changes, avoiding WS re-subscription on pause toggle
    const processNewLogData = useCallback((rawData: any) => {
        if (isPausedRef.current) return
        const alert = parseAlertData(rawData)
        if (!alert) return

        if (updateIntervalRef.current === 0) {
            setLogs(prev => [alert, ...prev.slice(0, 199)])
            setLastUpdateTime(new Date())
        } else {
            bufferRef.current.push(alert)
        }
    }, [])

    useEffect(() => {
        if (!getDetectionAlertStream) {
            setIsLoading(false)
            return
        }

        const loadingTimeout = setTimeout(() => setIsLoading(false), 3000)

        const subscription = getDetectionAlertStream().subscribe({
            next: (data: any) => {
                clearTimeout(loadingTimeout)
                processNewLogData(data)
                setIsLoading(false)
            },
            error: () => {
                clearTimeout(loadingTimeout)
                setIsLoading(false)
            },
        })

        return () => {
            clearTimeout(loadingTimeout)
            subscription.unsubscribe()
        }
    }, [getDetectionAlertStream, processNewLogData])

    const filteredLogs = useMemo(() => {
        return logs.filter(log => {
            const severityOk = severityFilter === 'all' || log.severity === severityFilter
            const sourceOk   = sourceFilter   === 'all' || log.source   === sourceFilter
            return severityOk && sourceOk
        })
    }, [logs, severityFilter, sourceFilter])

    const stats = useMemo(() => ({
        total:     logs.length,
        critical:  logs.filter(l => l.severity === 'critical').length,
        high:      logs.filter(l => l.severity === 'high').length,
        ml:        logs.filter(l => l.source === 'ml').length,
        rule:      logs.filter(l => l.source === 'rule').length,
        fusion:    logs.filter(l => l.source === 'fusion').length,
        uniqueIPs: new Set([...logs.map(l => l.src_ip), ...logs.map(l => l.dst_ip)]).size,
    }), [logs])

    const handleAlertClick   = useCallback((index: number) => setSelectedLogIndex(index), [])
    const handleCloseDetails = useCallback(() => setSelectedLogIndex(null), [])
    const togglePause        = useCallback(() => setIsPaused(p => !p), [])

    if (isLoading) {
        return (
            <>
                <Head><title>Detection - Mantis</title></Head>
                <Layout>
                    <div className="flex items-center justify-center w-full h-full min-h-[calc(100vh-4rem)]">
                        <LoadingSpinner />
                    </div>
                </Layout>
            </>
        )
    }

    return (
        <>
            <Head>
                <title>Detection - Mantis</title>
                <meta name="description" content="Mantis Unified Threat Detection" />
            </Head>

            <Layout>
                <AnimatePresence>
                    {notification && (
                        <Notification message={notification.message} type={notification.type} onClose={closeNotification} />
                    )}
                </AnimatePresence>

                {/* Stats strip */}
                <div className="grid grid-cols-4 lg:grid-cols-7 gap-3 mb-5">
                    {[
                        { label: 'Total',      value: stats.total,     icon: faList,                color: '#4ab5cc' },
                        { label: 'Critical',   value: stats.critical,  icon: faExclamationTriangle, color: '#ef4444' },
                        { label: 'High',       value: stats.high,      icon: faExclamationTriangle, color: '#f97316' },
                        { label: 'ML',         value: stats.ml,        icon: faRobot,               color: '#64748b' },
                        { label: 'Rule',       value: stats.rule,      icon: faShieldAlt,           color: '#4ab5cc' },
                        { label: 'Fusion',     value: stats.fusion,    icon: faShieldAlt,           color: '#14b8a6' },
                        { label: 'Unique IPs', value: stats.uniqueIPs, icon: faGlobe,               color: '#6366f1' },
                    ].map(({ label, value, icon, color }, i) => (
                        <motion.div
                            key={label}
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.04 }}
                            className={`rounded-xl border p-3 ${isDark ? 'bg-[#0e1e2c] border-slate-700/40' : 'bg-white border-slate-200'}`}
                        >
                            <p className={`text-xs mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{label}</p>
                            <div className="flex items-center justify-between">
                                <span className={`text-xl font-bold tabular-nums ${isDark ? 'text-white' : 'text-slate-900'}`}>{value}</span>
                                <FontAwesomeIcon icon={icon} style={{ color }} className="text-sm opacity-80" />
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Compact controls + filter bar */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex flex-wrap items-center gap-3 px-4 py-2.5 rounded-xl border mb-5 ${
                        isDark ? 'bg-[#0e1e2c] border-slate-700/40' : 'bg-white border-slate-200'
                    }`}
                >
                    {/* Update interval */}
                    <div className="flex items-center gap-1.5">
                        <FontAwesomeIcon icon={faClock} className="text-[#4ab5cc] text-xs" />
                        <select
                            value={updateInterval}
                            onChange={(e) => setUpdateInterval(Number(e.target.value))}
                            className={`text-xs border rounded-lg px-2 py-1 focus:outline-none focus:border-[#4ab5cc] ${
                                isDark ? 'bg-[#131929] border-slate-600 text-slate-300' : 'bg-white border-slate-300 text-slate-700'
                            }`}
                        >
                            {UPDATE_INTERVALS.map(i => (
                                <option key={i.value} value={i.value}>{i.label}</option>
                            ))}
                        </select>
                    </div>

                    <button
                        onClick={togglePause}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                            isPaused
                                ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20'
                                : 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20'
                        }`}
                    >
                        <FontAwesomeIcon icon={isPaused ? faPlay : faPause} className="mr-1" />
                        {isPaused ? 'Resume' : 'Pause'}
                    </button>

                    <div className={`w-px h-4 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />

                    {/* Severity filters */}
                    <div className="flex items-center gap-1.5">
                        <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Severity:</span>
                        <FilterButton isActive={severityFilter === 'all'} onClick={() => { setSeverityFilter('all'); setSelectedLogIndex(null) }}>All</FilterButton>
                        <FilterButton isActive={severityFilter === 'critical'} onClick={() => { setSeverityFilter('critical'); setSelectedLogIndex(null) }}
                            activeClassName="bg-red-600 text-white shadow-sm" activeHoverClassName="hover:bg-red-700">
                            Critical
                        </FilterButton>
                        <FilterButton isActive={severityFilter === 'high'} onClick={() => { setSeverityFilter('high'); setSelectedLogIndex(null) }}
                            activeClassName="bg-orange-600 text-white shadow-sm" activeHoverClassName="hover:bg-orange-700">
                            High
                        </FilterButton>
                    </div>

                    <div className={`w-px h-4 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />

                    {/* Source filters */}
                    <div className="flex items-center gap-1.5">
                        <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Source:</span>
                        <FilterButton isActive={sourceFilter === 'all'} onClick={() => { setSourceFilter('all'); setSelectedLogIndex(null) }}>All</FilterButton>
                        <FilterButton isActive={sourceFilter === 'ml'} onClick={() => { setSourceFilter('ml'); setSelectedLogIndex(null) }}
                            activeClassName="bg-[#4ab5cc] text-white shadow-sm" activeHoverClassName="hover:bg-[#3da5bc]">ML</FilterButton>
                        <FilterButton isActive={sourceFilter === 'rule'} onClick={() => { setSourceFilter('rule'); setSelectedLogIndex(null) }}
                            activeClassName="bg-sky-600 text-white shadow-sm" activeHoverClassName="hover:bg-sky-700">Rule</FilterButton>
                        <FilterButton isActive={sourceFilter === 'fusion'} onClick={() => { setSourceFilter('fusion'); setSelectedLogIndex(null) }}
                            activeClassName="bg-teal-600 text-white shadow-sm" activeHoverClassName="hover:bg-teal-700">Fusion</FilterButton>
                    </div>

                    {lastUpdateTime && (
                        <span className={`ml-auto text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                            Updated {lastUpdateTime.toLocaleTimeString()}
                        </span>
                    )}
                </motion.div>

                {/* Alert list + detail panel */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1, duration: 0.2, ease: 'easeOut' }}
                        className={selectedLogIndex !== null && filteredLogs[selectedLogIndex] ? 'lg:col-span-7' : 'lg:col-span-12'}
                    >
                        <div className={`rounded-xl border overflow-hidden flex flex-col ${isDark ? 'bg-[#0e1e2c] border-slate-700/40' : 'bg-white border-slate-200'}`}
                            style={{ maxHeight: 'calc(100vh - 280px)', minHeight: '400px' }}>
                            <div className={`px-5 py-3 border-b flex items-center justify-between flex-shrink-0 ${isDark ? 'border-slate-700/40' : 'border-slate-200'}`}>
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-md bg-[#4ab5cc]/15 flex items-center justify-center">
                                        <FontAwesomeIcon icon={faShieldAlt} className="text-[#4ab5cc] text-xs" />
                                    </div>
                                    <span className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>Security Alerts</span>
                                </div>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-slate-700/50 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                                    {filteredLogs.length} alerts
                                </span>
                            </div>

                            <div className="flex-1 overflow-y-auto">
                                {filteredLogs.length === 0 ? (
                                    <div className="py-16 text-center">
                                        <FontAwesomeIcon icon={faShieldAlt} className={`text-4xl mb-3 ${isDark ? 'text-slate-600' : 'text-slate-300'}`} />
                                        <p className={`text-sm font-medium mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                            {logs.length === 0 ? 'No Alerts Detected' : 'No Matching Alerts'}
                                        </p>
                                        <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                            {logs.length === 0 ? 'Threats will appear here when detected' : 'Try adjusting filter criteria'}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="p-4 space-y-3">
                                        {filteredLogs.map((log, index) => (
                                            <AlertItem
                                                key={`${log.flow_key}-${log.timestamp}-${index}`}
                                                log={log}
                                                index={index}
                                                onClick={handleAlertClick}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>

                    {selectedLogIndex !== null && filteredLogs[selectedLogIndex] && (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="lg:col-span-5 h-full"
                        >
                            <AlertDetails
                                log={filteredLogs[selectedLogIndex]}
                                onClose={handleCloseDetails}
                                showNotification={showNotification}
                            />
                        </motion.div>
                    )}
                </div>
            </Layout>
        </>
    )
}

export default Detection