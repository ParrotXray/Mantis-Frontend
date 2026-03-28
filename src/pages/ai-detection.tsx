import React, { useContext, useEffect, useState, useCallback, useMemo } from 'react'
import Head from 'next/head'
import { motion, AnimatePresence } from 'framer-motion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
    faRobot,
    faShieldAlt,
    faExclamationTriangle,
    faFilter,
    faCheck,
    faNetworkWired,
    faGlobe,
    faTimes,
    faInfoCircle,
    faClock,
    faArrowRight,
    faEye,
    faList,
    faPause,
    faPlay,
    faRefresh
} from '@fortawesome/free-solid-svg-icons'
import { WebsocketContext } from '../providers/WebSocketProvider'
import { putData } from '../utils/connectionUtils'
import { urls } from '../config'
import Layout from '../components/Layout'
import LoadingSpinner from '../components/LoadingSpinner'

// 介面定義
interface AlertLog {
    timestamp: string
    message: string
    source_ip: string
    source_port: string
    destination_ip: string
    destination_port: string
    classification: string
    priority: string
    protocol: string
    signature_id: string
}

interface PriorityInfo {
    color: string
    bgColor: string
    icon: any
    label: string
}

interface NotificationProps {
    message: string
    type: 'success' | 'error' | 'warning' | 'info'
    onClose: () => void
}

interface AlertDetailsProps {
    log: AlertLog
    onClose: () => void
    showNotification: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void
}

interface AlertItemProps {
    log: AlertLog
    index: number
    onClick: (index: number) => void
}

// 建立基本的空日誌項
const createEmptyLogEntry = (): AlertLog => ({
    timestamp: "N/A",
    message: "Error parsing log data",
    source_ip: "Unknown",
    source_port: "Unknown",
    destination_ip: "Unknown",
    destination_port: "Unknown",
    classification: "Unknown",
    priority: "Unknown",
    protocol: "Unknown",
    signature_id: "Unknown"
})

// 從字符串手動解析
const parseManuallyFromString = (str: string): Partial<AlertLog> => {
    const result: any = {}
    const cleanStr = str.replace(/^\{|\}$/g, '')
    const fields = cleanStr.split(',')

    fields.forEach(field => {
        const matches = field.match(/(\\?)(\w+)(\\?):(\\?)([^,]+)/)
        if (matches && matches.length >= 6) {
            const key = matches[2]
            const value = matches[5].trim().replace(/^\\|\\$/g, '').replace(/^"|"$/g, '')
            result[key] = value
        }
    })

    return result
}

// 解析 AI 日誌數據
const parseAILogData = (rawData: any): AlertLog => {
    try {
        const dataStr = typeof rawData === 'string' ? rawData : JSON.stringify(rawData)
        let parsedData: any

        try {
            parsedData = JSON.parse(dataStr)
        } catch (initialError) {
            if (dataStr.includes('\\')) {
                try {
                    const cleanedData = dataStr.replace(/\\/g, "")
                    parsedData = JSON.parse(cleanedData)
                } catch (innerError) {
                    parsedData = parseManuallyFromString(dataStr)
                }
            } else {
                parsedData = parseManuallyFromString(dataStr)
            }
        }

        // 確保返回一個標準化格式的物件
        return {
            timestamp: parsedData.timestamp || "N/A",
            message: parsedData.message || "No message",
            source_ip: parsedData.source_ip || "Unknown",
            source_port: parsedData.source_port || "Unknown",
            destination_ip: parsedData.destination_ip || "Unknown",
            destination_port: parsedData.destination_port || "Unknown",
            classification: parsedData.classification || "Unknown",
            priority: parsedData.priority || "Unknown",
            protocol: parsedData.protocol || "Unknown",
            signature_id: parsedData.signature_id || "Unknown"
        }
    } catch (error) {
        console.error("AI WebSocket 資料解析錯誤：", error, "原始資料：", rawData)
        return createEmptyLogEntry()
    }
}

// 根據優先級獲取對應的顏色和圖標
const getPriorityInfo = (priority: string): PriorityInfo => {
    const level = typeof priority === 'string' ? parseInt(priority, 10) : priority

    switch (level) {
        case 1:
            return { 
                color: '#e53e3e', 
                bgColor: 'rgba(239, 68, 68, 0.1)', 
                icon: faExclamationTriangle, 
                label: 'Critical' 
            }
        case 2:
            return { 
                color: '#dd6b20', 
                bgColor: 'rgba(251, 146, 60, 0.1)', 
                icon: faExclamationTriangle, 
                label: 'High' 
            }
        case 3:
            return { 
                color: '#d69e2e', 
                bgColor: 'rgba(251, 191, 36, 0.1)', 
                icon: faExclamationTriangle, 
                label: 'Medium' 
            }
        case 4:
            return { 
                color: '#38a169', 
                bgColor: 'rgba(34, 197, 94, 0.1)', 
                icon: faExclamationTriangle, 
                label: 'Low' 
            }
        default:
            return { 
                color: '#718096', 
                bgColor: 'rgba(107, 114, 128, 0.1)', 
                icon: faExclamationTriangle, 
                label: 'Unknown' 
            }
    }
}

// 通知組件
const Notification: React.FC<NotificationProps> = ({ message, type, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose()
        }, 4000)

        return () => clearTimeout(timer)
    }, [onClose])

    const typeStyles = {
        success: 'bg-green-100 border-green-400 text-green-700',
        error: 'bg-red-100 border-red-400 text-red-700',
        warning: 'bg-yellow-100 border-yellow-400 text-yellow-700',
        info: 'bg-blue-100 border-blue-400 text-blue-700'
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
                <button
                    onClick={onClose}
                    className="ml-3 text-xl font-bold hover:opacity-70 transition-opacity"
                >
                    ×
                </button>
            </div>
        </motion.div>
    )
}

// 警報詳情組件
const AlertDetails: React.FC<AlertDetailsProps> = ({ log, onClose, showNotification }) => {
    const priorityInfo = getPriorityInfo(log.priority)

    // 判斷 IP 是 IPv4 還是 IPv6
    const isIPv6Source = log.source_ip.includes(':') && !log.source_ip.includes('.')
    const isIPv6Dest = log.destination_ip.includes(':') && !log.destination_ip.includes('.')

    // 處理添加到黑名單
    const handleBlockIP = useCallback((ip: string, port: string, isSource: boolean, blockAllPorts = false) => {
        const isIPv6 = isSource ? isIPv6Source : isIPv6Dest
        const formattedIp = isIPv6 ? `[${ip}]` : ip
        const listType = "black_list"
        const url = isIPv6
            ? urls.access_control.ipv6[listType]
            : urls.access_control.ipv4[listType]

        const portToSend = blockAllPorts ? "0" : port
        const displayPort = blockAllPorts ? "*" : port

        putData(
            url,
            `${formattedIp}:${portToSend}`,
            () => {
                showNotification(`已成功添加到黑名單: ${ip}:${displayPort}`, "success")
            },
            (error) => {
                showNotification(`添加到黑名單失敗: ${error.message}`, "error")
            }
        )
    }, [isIPv6Source, isIPv6Dest, showNotification])

    // 處理添加到白名單
    const handleAllowIP = useCallback((ip: string, port: string, isSource: boolean, allowAllPorts = false) => {
        const isIPv6 = isSource ? isIPv6Source : isIPv6Dest
        const formattedIp = isIPv6 ? `[${ip}]` : ip
        const listType = "white_list"
        const url = isIPv6
            ? urls.access_control.ipv6[listType]
            : urls.access_control.ipv4[listType]

        const portToSend = allowAllPorts ? "0" : port
        const displayPort = allowAllPorts ? "*" : port

        putData(
            url,
            `${formattedIp}:${portToSend}`,
            () => {
                showNotification(`已成功添加到白名單: ${ip}:${displayPort}`, "success")
            },
            (error) => {
                showNotification(`添加到白名單失敗: ${error.message}`, "error")
            }
        )
    }, [isIPv6Source, isIPv6Dest, showNotification])

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-white rounded-lg shadow-md p-6 max-h-[calc(100vh-2rem)] overflow-y-auto"
            >
                {/* 標題 */}
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                        <FontAwesomeIcon icon={faEye} className="mr-2 text-blue-600" />
                        警報詳情
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <FontAwesomeIcon icon={faTimes} />
                    </button>
                </div>

                {/* 基本信息 */}
                <div className="space-y-4 mb-6">
                    <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-600">時間戳:</span>
                        <span className="text-sm text-gray-900">{log.timestamp}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-600">優先級:</span>
                        <span 
                            className="inline-flex px-2 py-1 text-xs font-medium rounded-full"
                            style={{ backgroundColor: priorityInfo.bgColor, color: priorityInfo.color }}
                        >
                            <FontAwesomeIcon icon={priorityInfo.icon} className="mr-1" />
                            {priorityInfo.label} ({log.priority})
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-600">分類:</span>
                        <span className="text-sm text-gray-900">{log.classification}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-600">協議:</span>
                        <span className="text-sm text-gray-900">{log.protocol}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-600">簽名ID:</span>
                        <span className="text-sm text-gray-900">{log.signature_id}</span>
                    </div>
                </div>

                {/* 訊息 */}
                <div className="mb-6">
                    <span className="text-sm font-medium text-gray-600">訊息:</span>
                    <div className="mt-1 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-900">{log.message}</p>
                    </div>
                </div>

                {/* 連接詳情 */}
                <div className="mb-6">
                    <h4 className="text-lg font-medium text-gray-900 mb-3">連接詳情</h4>
                    <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
                        <div className="text-center">
                            <div className="text-sm font-medium text-gray-600">來源</div>
                            <div className="text-lg font-semibold text-blue-600">{log.source_ip}</div>
                            <div className="text-sm text-gray-500">Port: {log.source_port}</div>
                        </div>
                        <FontAwesomeIcon icon={faArrowRight} className="text-gray-400" />
                        <div className="text-center">
                            <div className="text-sm font-medium text-gray-600">目標</div>
                            <div className="text-lg font-semibold text-red-600">{log.destination_ip}</div>
                            <div className="text-sm text-gray-500">Port: {log.destination_port}</div>
                        </div>
                    </div>
                </div>

                {/* IP 管理操作 */}
                <div className="space-y-6">
                    <h4 className="text-lg font-medium text-gray-900">IP 管理操作</h4>
                    
                    {/* 來源 IP 操作 */}
                    <div className="bg-blue-50 rounded-lg p-4">
                        <h5 className="font-medium text-gray-900 mb-3">來源 IP: {log.source_ip}</h5>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                className="px-3 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
                                onClick={() => handleBlockIP(log.source_ip, log.source_port, true)}
                            >
                                <FontAwesomeIcon icon={faFilter} className="mr-1" />
                                封鎖端口 {log.source_port}
                            </button>
                            <button
                                className="px-3 py-2 bg-red-700 text-white text-sm rounded-lg hover:bg-red-800 transition-colors"
                                onClick={() => handleBlockIP(log.source_ip, log.source_port, true, true)}
                            >
                                <FontAwesomeIcon icon={faFilter} className="mr-1" />
                                封鎖所有端口
                            </button>
                            <button
                                className="px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                                onClick={() => handleAllowIP(log.source_ip, log.source_port, true)}
                            >
                                <FontAwesomeIcon icon={faCheck} className="mr-1" />
                                允許端口 {log.source_port}
                            </button>
                            <button
                                className="px-3 py-2 bg-green-700 text-white text-sm rounded-lg hover:bg-green-800 transition-colors"
                                onClick={() => handleAllowIP(log.source_ip, log.source_port, true, true)}
                            >
                                <FontAwesomeIcon icon={faCheck} className="mr-1" />
                                允許所有端口
                            </button>
                        </div>
                    </div>

                    {/* 目標 IP 操作 */}
                    <div className="bg-red-50 rounded-lg p-4">
                        <h5 className="font-medium text-gray-900 mb-3">目標 IP: {log.destination_ip}</h5>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                className="px-3 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
                                onClick={() => handleBlockIP(log.destination_ip, log.destination_port, false)}
                            >
                                <FontAwesomeIcon icon={faFilter} className="mr-1" />
                                封鎖端口 {log.destination_port}
                            </button>
                            <button
                                className="px-3 py-2 bg-red-700 text-white text-sm rounded-lg hover:bg-red-800 transition-colors"
                                onClick={() => handleBlockIP(log.destination_ip, log.destination_port, false, true)}
                            >
                                <FontAwesomeIcon icon={faFilter} className="mr-1" />
                                封鎖所有端口
                            </button>
                            <button
                                className="px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                                onClick={() => handleAllowIP(log.destination_ip, log.destination_port, false)}
                            >
                                <FontAwesomeIcon icon={faCheck} className="mr-1" />
                                允許端口 {log.destination_port}
                            </button>
                            <button
                                className="px-3 py-2 bg-green-700 text-white text-sm rounded-lg hover:bg-green-800 transition-colors"
                                onClick={() => handleAllowIP(log.destination_ip, log.destination_port, false, true)}
                            >
                                <FontAwesomeIcon icon={faCheck} className="mr-1" />
                                允許所有端口
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    )
}

// 警報項目組件
const AlertItem: React.FC<AlertItemProps> = ({ log, index, onClick }) => {
    const priorityInfo = getPriorityInfo(log.priority)

    const handleClick = useCallback(() => {
        onClick(index)
    }, [index, onClick])

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-white border border-gray-200 rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow duration-200"
            onClick={handleClick}
        >
            <div className="flex items-start space-x-4">
                <div 
                    className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: priorityInfo.bgColor }}
                >
                    <FontAwesomeIcon 
                        icon={priorityInfo.icon} 
                        style={{ color: priorityInfo.color }}
                        className="text-sm"
                    />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gray-500">{log.timestamp}</span>
                        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                            {log.classification}
                        </span>
                    </div>
                    <div className="text-sm text-gray-900 mb-2 line-clamp-2">
                        {log.message}
                    </div>
                    <div className="flex items-center text-xs text-gray-600 space-x-2">
                        <span>{log.source_ip}:{log.source_port}</span>
                        <FontAwesomeIcon icon={faArrowRight} className="text-gray-400" />
                        <span>{log.destination_ip}:{log.destination_port}</span>
                    </div>
                </div>
            </div>
        </motion.div>
    )
}

// 過濾按鈕組件
interface FilterButtonProps {
    isActive: boolean
    onClick: () => void
    children: React.ReactNode
    className?: string
    activeClassName?: string
    activeHoverClassName?: string
}

const FilterButton: React.FC<FilterButtonProps> = ({ 
    isActive, 
    onClick, 
    children, 
    className = "", 
    activeClassName = "",
    activeHoverClassName = ""
}) => (
    <button
        className={`px-4 py-2 rounded-lg transition-all duration-200 font-medium ${
            isActive 
                ? `${activeClassName || "bg-blue-600 text-white shadow-lg"} ${activeHoverClassName}` 
                : `bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 ${className}`
        }`}
        onClick={onClick}
    >
        {children}
    </button>
)

// 主要 AI 檢測組件
const AIDetection: React.FC = () => {
    const { getAiAlertStream } = useContext(WebsocketContext)
    const [logs, setLogs] = useState<AlertLog[]>([])
    const [selectedLogIndex, setSelectedLogIndex] = useState<number | null>(null)
    const [filterStatus, setFilterStatus] = useState<string>("all")
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isPaused, setIsPaused] = useState(false)

    // 添加通知功能
    const showNotification = useCallback((message: string, type: 'success' | 'error' | 'warning' | 'info' = "success") => {
        setNotification({ message, type })
    }, [])

    const closeNotification = useCallback(() => {
        setNotification(null)
    }, [])

    // 處理新的警報數據
    const processNewLogData = useCallback((rawData: any) => {
        if (isPaused) return
        
        try {
            const logEntry = parseAILogData(rawData)
            setLogs(prevLogs => [logEntry, ...prevLogs.slice(0, 199)]) // 保留最近的200條記錄
        } catch (error) {
            console.error("Error processing AI alert data:", error)
        }
    }, [isPaused])

    // 設置 WebSocket 訂閱
    useEffect(() => {
        if (!getAiAlertStream) {
            setIsLoading(false)
            return
        }

        // 設置初始加載超時，3秒後無論如何都停止加載狀態
        const loadingTimeout = setTimeout(() => {
            setIsLoading(false)
        }, 3000)

        const subscription = getAiAlertStream().subscribe({
            next: (data: any) => {
                clearTimeout(loadingTimeout)
                processNewLogData(data)
                setIsLoading(false)
            },
            error: (error: any) => {
                console.error("WebSocket subscription error:", error)
                clearTimeout(loadingTimeout)
                setIsLoading(false)
            }
        })

        return () => {
            clearTimeout(loadingTimeout)
            subscription.unsubscribe()
        }
    }, [getAiAlertStream, processNewLogData])

    // 過濾後的日誌數據
    const filteredLogs = useMemo(() => {
        if (filterStatus === "all") return logs

        return logs.filter(log => {
            const priority = parseInt(log.priority, 10)

            switch (filterStatus) {
                case "critical":
                    return priority === 1
                case "high":
                    return priority === 2
                case "medium":
                    return priority === 3
                case "low":
                    return priority === 4
                default:
                    return true
            }
        })
    }, [logs, filterStatus])

    // 處理點擊警報項
    const handleAlertClick = useCallback((index: number) => {
        setSelectedLogIndex(index)
    }, [])

    // 關閉詳情面板
    const handleCloseDetails = useCallback(() => {
        setSelectedLogIndex(null)
    }, [])

    // 處理切換過濾狀態
    const handleFilterChange = useCallback((status: string) => {
        setFilterStatus(status)
    }, [])

    // 切換暫停狀態
    const togglePause = useCallback(() => {
        setIsPaused(!isPaused)
    }, [isPaused])

    // 統計資料
    const stats = useMemo(() => {
        const totalAlerts = logs.length
        const criticalAlerts = logs.filter(log => parseInt(log.priority) === 1).length
        const highAlerts = logs.filter(log => parseInt(log.priority) === 2).length
        const uniqueIPs = new Set([...logs.map(log => log.source_ip), ...logs.map(log => log.destination_ip)]).size

        return { totalAlerts, criticalAlerts, highAlerts, uniqueIPs }
    }, [logs])

    if (isLoading) {
        return (
            <>
                <Head>
                    <title>AI 威脅檢測 - NetGuardia</title>
                </Head>
                <Layout>
                    <div className="flex items-center justify-center w-full h-full min-h-[calc(100vh-4rem)]">
                        <div className="flex flex-col items-center space-y-4">
                            <LoadingSpinner />
                        </div>
                    </div>
                </Layout>
            </>
        )
    }

    return (
        <>
            <Head>
                <title>AI 威脅檢測 - NetGuardia</title>
                <meta name="description" content="NetGuardia AI 威脅檢測系統" />
            </Head>

            <Layout>
                {/* 通知 */}
                <AnimatePresence>
                    {notification && (
                        <Notification
                            message={notification.message}
                            type={notification.type}
                            onClose={closeNotification}
                        />
                    )}
                </AnimatePresence>

                {/* 頁面標題 */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
                            <FontAwesomeIcon icon={faRobot} className="mr-3 text-purple-600" />
                            AI 威脅檢測
                        </h1>
                        <p className="text-gray-600">
                            智能檢測網路威脅，實時監控異常行為
                        </p>
                    </div>
                </motion.div>

                {/* 過濾控制 */}
                <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-lg shadow-md p-6 mb-6"
                >
                    {/* 系統控制區域 */}
                    <div className="flex flex-wrap items-center gap-4 bg-gray-50 p-3 rounded-lg">
                        {/* 暫停/恢復按鈕 */}
                        <button
                            onClick={togglePause}
                            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                                isPaused 
                                    ? "bg-green-100 text-green-700 hover:bg-green-200" 
                                    : "bg-orange-100 text-orange-700 hover:bg-orange-200"
                            }`}
                        >
                            <FontAwesomeIcon icon={isPaused ? faPlay : faPause} className="mr-1" />
                            {isPaused ? "恢復" : "暫停"}
                        </button>
                        
                        {/* 運行狀態指示 */}
                        <div className="flex items-center space-x-2">
                            <div className={`w-3 h-3 rounded-full ${
                                isPaused ? 'bg-orange-500' : 'bg-green-500 animate-pulse'
                            }`}></div>
                            <span className={`text-sm font-medium ${
                                isPaused ? 'text-orange-600' : 'text-green-600'
                            }`}>
                                {isPaused ? 'AI 檢測已暫停' : 'AI 檢測運行中'}
                            </span>
                        </div>
                        
                        {/* 最後更新時間 */}
                        <div className="text-xs text-gray-500 ml-auto">
                            最後更新: {new Date().toLocaleTimeString('zh-TW')}
                        </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-4 mb-4">
                        <div className="flex items-center space-x-2">
                            <FontAwesomeIcon icon={faFilter} className="text-gray-500" />
                            <span className="text-sm font-medium text-gray-600">過濾條件:</span>
                        </div>
                        
                        <div className="flex flex-wrap gap-2">
                            <FilterButton
                                isActive={filterStatus === "all"}
                                onClick={() => handleFilterChange("all")}
                            >
                                全部 ({logs.length})
                            </FilterButton>
                            <FilterButton
                                isActive={filterStatus === "critical"}
                                onClick={() => handleFilterChange("critical")}
                                className="border-red-200 hover:bg-red-50"
                                activeClassName="bg-red-600 text-white shadow-lg"
                                activeHoverClassName="hover:bg-red-700"
                            >
                                嚴重 ({stats.criticalAlerts})
                            </FilterButton>
                            <FilterButton
                                isActive={filterStatus === "high"}
                                onClick={() => handleFilterChange("high")}
                                className="border-orange-200 hover:bg-orange-50"
                                activeClassName="bg-orange-600 text-white shadow-lg"
                                activeHoverClassName="hover:bg-orange-700"
                            >
                                高 ({stats.highAlerts})
                            </FilterButton>
                            <FilterButton
                                isActive={filterStatus === "medium"}
                                onClick={() => handleFilterChange("medium")}
                                className="border-yellow-200 hover:bg-yellow-50"
                                activeClassName="bg-yellow-600 text-white shadow-lg"
                                activeHoverClassName="hover:bg-yellow-700"
                            >
                                中 ({logs.filter(log => parseInt(log.priority) === 3).length})
                            </FilterButton>
                            <FilterButton
                                isActive={filterStatus === "low"}
                                onClick={() => handleFilterChange("low")}
                                className="border-green-200 hover:bg-green-50"
                                activeClassName="bg-green-600 text-white shadow-lg"
                                activeHoverClassName="hover:bg-green-700"
                            >
                                低 ({logs.filter(log => parseInt(log.priority) === 4).length})
                            </FilterButton>
                        </div>
                    </div>
                </motion.div>

                {/* 統計卡片 */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-lg shadow-md p-6"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600 mb-1">總警報數</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.totalAlerts}</p>
                            </div>
                            <div className="bg-blue-500 p-3 rounded-lg">
                                <FontAwesomeIcon icon={faList} className="text-white text-xl" />
                            </div>
                        </div>
                    </motion.div>
                    
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-white rounded-lg shadow-md p-6"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600 mb-1">嚴重警報</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.criticalAlerts}</p>
                            </div>
                            <div className="bg-red-500 p-3 rounded-lg">
                                <FontAwesomeIcon icon={faExclamationTriangle} className="text-white text-xl" />
                            </div>
                        </div>
                    </motion.div>
                    
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-white rounded-lg shadow-md p-6"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600 mb-1">高優先級</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.highAlerts}</p>
                            </div>
                            <div className="bg-orange-500 p-3 rounded-lg">
                                <FontAwesomeIcon icon={faExclamationTriangle} className="text-white text-xl" />
                            </div>
                        </div>
                    </motion.div>
                    
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-white rounded-lg shadow-md p-6"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600 mb-1">涉及 IP 數</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.uniqueIPs}</p>
                            </div>
                            <div className="bg-purple-500 p-3 rounded-lg">
                                <FontAwesomeIcon icon={faGlobe} className="text-white text-xl" />
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* 主要內容區域 */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* 警報列表 */}
                    <motion.div
                        initial={{ opacity: 0, x: -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1, duration: 0.25, ease: "linear" }}
                        className={selectedLogIndex !== null ? 'lg:col-span-7' : 'lg:col-span-12'}
                    >
                        <div className="bg-white rounded-lg shadow-md overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-200">
                                <div className="flex justify-between items-center">
                                    <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                                        <FontAwesomeIcon icon={faShieldAlt} className="mr-2 text-blue-600" />
                                        安全警報
                                    </h2>
                                    <span className="text-sm text-gray-500">
                                        {filteredLogs.length} 條警報
                                    </span>
                                </div>
                            </div>

                            <div className="max-h-[600px] overflow-y-auto">
                                {filteredLogs.length === 0 ? (
                                    <div className="p-12 text-center">
                                        <FontAwesomeIcon icon={faShieldAlt} className="text-6xl text-gray-300 mb-4" />
                                        <h3 className="text-xl font-semibold text-gray-700 mb-2">
                                            {logs.length === 0 ? '未檢測到警報' : '沒有符合條件的警報'}
                                        </h3>
                                        <p className="text-gray-500">
                                            {logs.length === 0 
                                                ? '當系統偵測到警報時，警報將顯示在此處' 
                                                : '請嘗試調整過濾條件'
                                            }
                                        </p>
                                        {isPaused && logs.length === 0 && (
                                            <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                                                <div className="flex items-center justify-center space-x-2 text-orange-700">
                                                    <FontAwesomeIcon icon={faPause} />
                                                    <span className="text-sm">檢測目前已暫停</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="p-4 space-y-4">
                                        {filteredLogs.map((log, index) => (
                                            <AlertItem
                                                key={`alert-${index}-${log.timestamp}`}
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

                    {/* 警報詳情 */}
                    {selectedLogIndex !== null && (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="lg:col-span-5"
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

export default AIDetection