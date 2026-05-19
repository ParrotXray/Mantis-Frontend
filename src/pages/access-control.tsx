import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react'
import Head from 'next/head'
import { motion, AnimatePresence } from 'framer-motion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faPlus,
    faTrash,
    faSearch,
    faFilter,
    faCheck,
    faShieldAlt,
    faNetworkWired,
    faGlobe,
    faInfoCircle,
    faTimes,
    faExclamationTriangle,
    faRefresh,
    faClock
} from '@fortawesome/free-solid-svg-icons'
import { AccessControlContext } from '../providers/AccessControlProvider'
import { useTheme } from '../providers/ThemeProvider'
import { putData, deleteData } from '../utils/connectionUtils'
import { urls } from '../config'
import Layout from '../components/Layout'
import LoadingSpinner from '../components/LoadingSpinner'
import {
    AccessControlItem,
    NotificationProps,
    ModalProps,
    ToggleButtonProps,
    StatsCardProps
} from '../types/AccessControlTypes'

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

// 模態框組件
const Modal: React.FC<ModalProps> = ({
                                         title,
                                         children,
                                         onClose,
                                         onSubmit,
                                         submitLabel = 'Submit',
                                         submitDisabled = false
                                     }) => {
    const { actualTheme } = useTheme()
    const isDark = actualTheme === 'dark'

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/30 p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className={`rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto ${isDark ? 'bg-gray-800' : 'bg-white'}`}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className={`px-6 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                        <div className="flex items-center justify-between">
                            <h2 className={`text-xl font-semibold ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>{title}</h2>
                            <button
                                onClick={onClose}
                                className={`transition-colors ${isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                <FontAwesomeIcon icon={faTimes} />
                            </button>
                        </div>
                    </div>

                    <div className="px-6 py-4">
                        {children}
                    </div>

                    <div className={`px-6 py-4 border-t flex justify-end space-x-3 ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                        <button
                            onClick={onClose}
                            className={`px-4 py-2 rounded-lg transition-colors ${
                                isDark ? 'text-gray-300 bg-gray-700 hover:bg-gray-600' : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
                            }`}
                        >
                            Cancel
                        </button>
                        {onSubmit && (
                            <button
                                onClick={onSubmit}
                                disabled={submitDisabled}
                                className={`px-4 py-2 rounded-lg transition-colors ${
                                    submitDisabled
                                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                        : 'bg-blue-600 text-white hover:bg-blue-700'
                                }`}
                            >
                                {submitLabel}
                            </button>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    )
}

// 切換按鈕組件
const ToggleButton: React.FC<ToggleButtonProps> = ({ isActive, onClick, children, className = "" }) => {
    const { actualTheme } = useTheme()
    const isDark = actualTheme === 'dark'

    return (
        <button
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${className} ${
                isActive
                    ? "bg-blue-600 text-white"
                    : `${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-650' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`
            }`}
            onClick={onClick}
        >
            {children}
        </button>
    )
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon, color }) => {
    const { actualTheme } = useTheme()
    const isDark = actualTheme === 'dark'

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-lg shadow-md p-6 ${isDark ? 'bg-gray-600' : 'bg-white'}`}
        >
            <div className="flex items-center justify-between">
                <div>
                    <p className={`text-sm font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{title}</p>
                    <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{value.toLocaleString()}</p>
                </div>
                <div className={`${color} p-3 rounded-lg`}>
                    <FontAwesomeIcon icon={icon} className="text-white text-xl" />
                </div>
            </div>
        </motion.div>
    )
}

// 主要組件
const AccessControl: React.FC = () => {
    const {
        currentData,
        filteredData,
        isLoading,
        setFilteredData,
        switchTo,
        refreshData,
        getCacheStatus
    } = useContext(AccessControlContext)

    const { actualTheme } = useTheme()
    const isDark = actualTheme === 'dark'

    // 狀態管理
    const [isIPv6, setIsIPv6] = useState(false)
    const [listType, setListType] = useState<'black_list' | 'white_list'>('black_list')
    const [searchTerm, setSearchTerm] = useState('')
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [newIp, setNewIp] = useState('')
    const [newPort, setNewPort] = useState('')
    const [blockAllPorts, setBlockAllPorts] = useState(false)
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)
    const [itemToDelete, setItemToDelete] = useState<{ ip: string; port: string | number } | null>(null)
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // 切换IP版本和列表类型 - 无跳动的平滑切换
    const handleIPVersionChange = useCallback((newIsIPv6: boolean) => {
        if (newIsIPv6 !== isIPv6) {
            setIsIPv6(newIsIPv6)
            switchTo(newIsIPv6, listType)
        }
    }, [isIPv6, listType, switchTo])

    const handleListTypeChange = useCallback((newListType: 'black_list' | 'white_list') => {
        if (newListType !== listType) {
            setListType(newListType)
            switchTo(isIPv6, newListType)
        }
    }, [isIPv6, listType, switchTo])

    // 其他回调函数
    const handleAddItemClick = useCallback(() => {
        setIsModalOpen(true)
        setNewIp('')
        setNewPort('')
        setBlockAllPorts(false)
    }, [])

    const handleModalClose = useCallback(() => {
        setIsModalOpen(false)
        setNewIp('')
        setNewPort('')
        setBlockAllPorts(false)
    }, [])

    // 通知功能
    const showNotification = useCallback((message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
        setNotification({ message, type })
    }, [])

    const closeNotification = useCallback(() => {
        setNotification(null)
    }, [])

    // 手动更新資料
    const handleRefresh = useCallback(async () => {
        try {
            await refreshData(isIPv6, listType)
            showNotification('Data updated', 'success')
        } catch (error) {
            showNotification('Update failed', 'error')
        }
    }, [isIPv6, listType, refreshData, showNotification])

    // 初始化資料 - 组件挂载时加载默认資料
    useEffect(() => {
        switchTo(isIPv6, listType)
    }, []) // 只在组件挂载时执行一次

    // 搜索过滤 - 基于currentData而不是重新获取
    useEffect(() => {
        if (!searchTerm.trim()) {
            setFilteredData(currentData)
            return
        }

        const lowerSearchTerm = searchTerm.toLowerCase()
        const filtered = currentData.filter(({ ip }) =>
            ip.toLowerCase().includes(lowerSearchTerm)
        )
        setFilteredData(filtered)
    }, [searchTerm, currentData, setFilteredData])

    // 展平資料，便於表格顯示
    const flatData = useMemo(() =>
            filteredData.flatMap(({ ip, ports }) =>
                ports.map((port) => ({ ip, port }))
            ),
        [filteredData]
    )

    // 統計資料
    const stats = useMemo(() => {
        const uniqueIPs = new Set(filteredData.map(item => item.ip)).size
        const totalEntries = flatData.length
        const allPortsEntries = flatData.filter(item => item.port === "0" || item.port === 0).length

        return {
            uniqueIPs,
            totalEntries,
            allPortsEntries,
            specificPortEntries: totalEntries - allPortsEntries
        }
    }, [filteredData, flatData])

    // IP 驗證
    const validateIP = useCallback((ip: string, isIPv6: boolean): boolean => {
        if (isIPv6) {
            // 簡單的 IPv6 驗證
            const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/
            return ipv6Regex.test(ip) || ip.includes('::')
        } else {
            // IPv4 驗證
            const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/
            if (!ipv4Regex.test(ip)) return false

            const parts = ip.split('.')
            return parts.every(part => {
                const num = parseInt(part, 10)
                return num >= 0 && num <= 255
            })
        }
    }, [])

    // 端口驗證
    const validatePort = useCallback((port: string): boolean => {
        if (!port.trim()) return false
        const portNum = parseInt(port, 10)
        return !isNaN(portNum) && portNum >= 1 && portNum <= 65535
    }, [])

    // 添加項目
    const handleAddItemSubmit = useCallback(async () => {
        if (!newIp.trim()) {
            showNotification('Please enter a valid IP address', 'error')
            return
        }

        if (!validateIP(newIp.trim(), isIPv6)) {
            showNotification(`Please enter a valid ${isIPv6 ? 'IPv6' : 'IPv4'} address`, 'error')
            return
        }

        if (!blockAllPorts && !validatePort(newPort)) {
            showNotification('Please enter a valid port number (1-65535)', 'error')
            return
        }

        const portToSend = blockAllPorts ? "0" : newPort
        const url = isIPv6
            ? urls.access_control.ipv6[listType]
            : urls.access_control.ipv4[listType]

        setIsSubmitting(true)

        try {
            await new Promise<void>((resolve, reject) => {
                putData(
                    url,
                    `${newIp.trim()}:${portToSend}`,
                    () => {
                        showNotification(
                            `Successfully added: ${newIp.trim()}:${blockAllPorts ? '*' : portToSend}`,
                            'success'
                        )
                        setIsModalOpen(false)
                        setNewIp('')
                        setNewPort('')
                        setBlockAllPorts(false)
                        // 更新当前資料
                        refreshData(isIPv6, listType)
                        resolve()
                    },
                    (error) => {
                        showNotification(`Failed to add: ${error.message}`, 'error')
                        reject(error)
                    }
                )
            })
        } catch (error) {
            console.error('Add item error:', error)
        } finally {
            setIsSubmitting(false)
        }
    }, [newIp, newPort, blockAllPorts, isIPv6, listType, refreshData, showNotification, validateIP, validatePort])

    // 刪除處理
    const handleDeleteClick = useCallback((ip: string, port: string | number) => {
        setItemToDelete({ ip, port })
        setIsConfirmModalOpen(true)
    }, [])

    const handleDeleteCancel = useCallback(() => {
        setIsConfirmModalOpen(false)
        setItemToDelete(null)
    }, [])

    const handleDeleteConfirm = useCallback(async () => {
        if (!itemToDelete) return

        const { ip, port } = itemToDelete
        const formattedIp = isIPv6 ? `[${ip}]` : ip
        const url = isIPv6
            ? urls.access_control.ipv6[listType]
            : urls.access_control.ipv4[listType]

        setIsSubmitting(true)

        try {
            await new Promise<void>((resolve, reject) => {
                deleteData(
                    url,
                    `${formattedIp}:${port}`,
                    () => {
                        showNotification(
                            `Successfully deleted: ${formattedIp}:${port === "0" || port === 0 ? "*" : port}`,
                            'success'
                        )
                        // 更新当前資料
                        refreshData(isIPv6, listType)
                        setIsConfirmModalOpen(false)
                        setItemToDelete(null)
                        resolve()
                    },
                    (error) => {
                        showNotification(`Failed to delete: ${error.message}`, 'error')
                        setIsConfirmModalOpen(false)
                        setItemToDelete(null)
                        reject(error)
                    }
                )
            })
        } catch (error) {
            console.error('Delete item error:', error)
        } finally {
            setIsSubmitting(false)
        }
    }, [itemToDelete, isIPv6, listType, refreshData, showNotification])

    // 搜索處理
    const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value)
    }, [])

    // 全部端口勾選處理
    const handleBlockAllPortsChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setBlockAllPorts(e.target.checked)
        if (e.target.checked) {
            setNewPort('')
        }
    }, [])

    // 获取缓存状态用于调试
    const cacheStatus = getCacheStatus()

    return (
        <>
            <Head>
                <title>Access Control - NetGuardia</title>
                <meta name="description" content="NetGuardia Access Control Management - IP Whitelist and Blacklist" />
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
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className={`text-3xl font-bold mb-2 flex items-center ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                <FontAwesomeIcon icon={faShieldAlt} className="mr-3 text-blue-600" />
                                Access Control Management
                            </h1>
                            <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                                Manage IPv4 and IPv6 network access whitelists and blacklists
                            </p>
                        </div>
                    </div>
                </motion.div>

                {/* 統計卡片 */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <StatsCard
                        title="Unique IPs"
                        value={stats.uniqueIPs}
                        icon={faGlobe}
                        color="bg-blue-500"
                    />
                    <StatsCard
                        title="Total Rules"
                        value={stats.totalEntries}
                        icon={faNetworkWired}
                        color="bg-green-500"
                    />
                    <StatsCard
                        title="All Ports Rules"
                        value={stats.allPortsEntries}
                        icon={faFilter}
                        color="bg-purple-500"
                    />
                    <StatsCard
                        title="Specific Port Rules"
                        value={stats.specificPortEntries}
                        icon={faCheck}
                        color="bg-orange-500"
                    />
                </div>

                {/* 控制面板 */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`rounded-lg shadow-md p-6 mb-6 ${isDark ? 'bg-gray-600' : 'bg-white'}`}
                >
                    <div className="flex flex-wrap items-center gap-4">
                        {/* 搜索框 */}
                        <div className="flex-1 min-w-64">
                            <div className="relative">
                                <FontAwesomeIcon
                                    icon={faSearch}
                                    className={`absolute left-2.5 top-1/2 transform -translate-y-1/2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-400'}`}
                                />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Search IP Address..."
                                    className={`w-full pl-8 pr-3 py-1 text-sm border rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${
                                        isDark ? 'bg-gray-700 border-gray-500 text-gray-300 placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                                    }`}
                                />
                            </div>
                        </div>

                        {/* IP 版本選擇 */}
                        <div className="flex items-center space-x-2">
                            <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>IP Version:</span>
                            <div className="flex space-x-1">
                                <ToggleButton
                                    isActive={!isIPv6}
                                    onClick={() => setIsIPv6(false)}
                                >
                                    IPv4
                                </ToggleButton>
                                <ToggleButton
                                    isActive={isIPv6}
                                    onClick={() => setIsIPv6(true)}
                                >
                                    IPv6
                                </ToggleButton>
                            </div>
                        </div>

                        {/* 列表類型選擇 */}
                        <div className="flex items-center space-x-2">
                            <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>List Type:</span>
                            <div className="flex space-x-1">
                                <ToggleButton
                                    isActive={listType === "black_list"}
                                    onClick={() => handleListTypeChange("black_list")}
                                >
                                    <FontAwesomeIcon icon={faFilter} className="mr-1" />
                                    Blacklist
                                </ToggleButton>
                                <ToggleButton
                                    isActive={listType === "white_list"}
                                    onClick={() => handleListTypeChange("white_list")}
                                >
                                    <FontAwesomeIcon icon={faCheck} className="mr-1" />
                                    Whitelist
                                </ToggleButton>
                            </div>
                        </div>

                        {/* 操作按鈕 */}
                        <div className="flex items-center space-x-2 ml-auto">
                            <button
                                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1 ${
                                    isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-650' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                                onClick={handleRefresh}
                                title="Update"
                            >
                                <FontAwesomeIcon icon={faRefresh} className="text-xs" />
                                <span>Update</span>
                            </button>

                            <button
                                className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center space-x-1"
                                onClick={handleAddItemClick}
                            >
                                <FontAwesomeIcon icon={faPlus} className="text-xs" />
                                <span>Add Rule</span>
                            </button>
                        </div>
                    </div>
                </motion.div>

                {/* 資料表格 */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`rounded-lg shadow-md overflow-hidden ${isDark ? 'bg-gray-600' : 'bg-white'}`}
                >
                    <div className={`px-6 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                        <div className="flex justify-between items-center">
                            <h2 className={`text-xl font-semibold flex items-center ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
                                {isIPv6 ? 'IPv6' : 'IPv4'} {listType === 'black_list' ? 'Blacklist' : 'Whitelist'}
                                {isLoading && (
                                    <div className="ml-3">
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                    </div>
                                )}
                            </h2>
                            <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                {flatData.length} Rules
                            </span>
                        </div>
                    </div>

                    {/* 简化表格切换，移除奇怪的动画 */}
                    {flatData.length === 0 ? (
                        <div className="p-12 text-center">
                            <FontAwesomeIcon icon={faInfoCircle} className={`text-6xl mb-4 ${isDark ? 'text-gray-500' : 'text-gray-300'}`} />
                            <h3 className={`text-xl font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                {searchTerm ? 'No matching results found' : 'No data yet'}
                            </h3>
                            <p className={`mb-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                {searchTerm ? 'Please try adjusting your search criteria' : 'Click the button above to add the first rule'}
                            </p>
                            {!searchTerm && (
                                <button
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                    onClick={handleAddItemClick}
                                >
                                    <FontAwesomeIcon icon={faPlus} className="mr-2" />
                                    Add Rule
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className={`min-w-full divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
                                <thead className={isDark ? 'bg-gray-700' : 'bg-gray-50'}>
                                <tr>
                                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                        IP Address
                                    </th>
                                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                        Port
                                    </th>
                                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                        Action
                                    </th>
                                </tr>
                                </thead>
                                <tbody className={`divide-y ${isDark ? 'bg-gray-600 divide-gray-700' : 'bg-white divide-gray-200'}`}>
                                {flatData.map(({ ip, port }, index) => (
                                    <tr
                                        key={`${ip}-${port}-${index}`}
                                        className={`transition-colors ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}
                                    >
                                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
                                            {ip}
                                        </td>
                                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
                                                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                                    port === "0" || port === 0
                                                        ? 'bg-red-100 text-red-800'
                                                        : (isDark ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-800')
                                                }`}>
                                                    {port === "0" || port === 0 ? "All ports (*)" : port}
                                                </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <button
                                                className="px-3 py-1 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors flex items-center space-x-1"
                                                onClick={() => handleDeleteClick(ip, port)}
                                                title="Delete Rule"
                                            >
                                                <FontAwesomeIcon icon={faTrash} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </motion.div>

                {/* 添加規則模態框 */}
                {isModalOpen && (
                    <Modal
                        title={`Add ${isIPv6 ? 'IPv6' : 'IPv4'} ${listType === 'black_list' ? 'Blacklist' : 'Whitelist'} Rule`}
                        onClose={handleModalClose}
                        onSubmit={handleAddItemSubmit}
                        submitLabel="Add"
                        submitDisabled={isSubmitting}
                    >
                        <div className="space-y-4">
                            <div>
                                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                    IP Address
                                </label>
                                <input
                                    type="text"
                                    value={newIp}
                                    onChange={(e) => setNewIp(e.target.value)}
                                    placeholder={isIPv6 ? "2001:db8::" : "192.168.1.1"}
                                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${
                                        isDark ? 'bg-gray-700 border-gray-600 text-gray-300 placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                                    }`}
                                />
                            </div>

                            <div>
                                <div className="flex items-center space-x-2 mb-2">
                                    <input
                                        id="block-all-ports"
                                        type="checkbox"
                                        checked={blockAllPorts}
                                        onChange={handleBlockAllPortsChange}
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    />
                                    <label htmlFor="block-all-ports" className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                        Block All Ports
                                    </label>
                                </div>
                            </div>

                            <div>
                                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                    Port
                                </label>
                                <input
                                    type="text"
                                    value={blockAllPorts ? "" : newPort}
                                    onChange={(e) => setNewPort(e.target.value)}
                                    placeholder="80"
                                    disabled={blockAllPorts}
                                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${
                                        blockAllPorts
                                            ? (isDark ? 'bg-gray-600 text-gray-500 border-gray-600' : 'bg-gray-100 text-gray-500 border-gray-300')
                                            : (isDark ? 'bg-gray-700 border-gray-600 text-gray-300' : 'bg-white border-gray-300 text-gray-900')
                                    }`}
                                />
                                {blockAllPorts && (
                                    <p className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                        Block all ports for this IP
                                    </p>
                                )}
                            </div>

                            <div className={`border rounded-lg p-3 ${isDark ? 'bg-blue-900/30 border-blue-800' : 'bg-blue-50 border-blue-200'}`}>
                                <div className="flex items-start">
                                    <FontAwesomeIcon icon={faInfoCircle} className={`mt-0.5 mr-2 ${isDark ? 'text-blue-400' : 'text-blue-400'}`} />
                                    <div className={`text-sm ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                                        <p className="font-medium mb-1">
                                            Add to {listType === 'black_list' ? 'Blacklist' : 'Whitelist'}
                                        </p>
                                        <p>
                                            {listType === 'black_list'
                                                ? 'IP addresses in the Blacklist will be denied access'
                                                : 'Only IP addresses in the Whitelist can access'
                                            }
                                            {blockAllPorts && ', all ports will be affected'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Modal>
                )}

                {/* 確認刪除模態框 */}
                {isConfirmModalOpen && (
                    <Modal
                        title="Confirm Deletion"
                        onClose={handleDeleteCancel}
                        onSubmit={handleDeleteConfirm}
                        submitLabel="Delete"
                        submitDisabled={isSubmitting}
                    >
                        <div className="space-y-4">
                            <div className="flex items-center text-yellow-600 mb-4">
                                <FontAwesomeIcon icon={faExclamationTriangle} className="mr-2" />
                                <span className="font-medium">Warning</span>
                            </div>

                            <p className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                                Are you sure you want to delete this rule?
                            </p>

                            {itemToDelete && (
                                <div className={`border rounded-lg p-4 ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                                    <div className="space-y-2">
                                        <div className="flex justify-between">
                                            <span className={`font-medium ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>IP Address:</span>
                                            <span className={isDark ? 'text-gray-300' : 'text-gray-900'}>{itemToDelete.ip}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className={`font-medium ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>Port:</span>
                                            <span className={isDark ? 'text-gray-300' : 'text-gray-900'}>
                                                {itemToDelete.port === "0" || itemToDelete.port === 0
                                                    ? "All Ports (*)"
                                                    : itemToDelete.port
                                                }
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className={`font-medium ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>List Type:</span>
                                            <span className={isDark ? 'text-gray-300' : 'text-gray-900'}>
                                                {listType === 'black_list' ? 'Blacklist' : 'Whitelist'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className={`border rounded-lg p-3 ${isDark ? 'bg-red-900/30 border-red-800' : 'bg-red-50 border-red-200'}`}>
                                <div className="flex items-start">
                                    <FontAwesomeIcon icon={faExclamationTriangle} className={`mt-0.5 mr-2 ${isDark ? 'text-red-400' : 'text-red-400'}`} />
                                    <p className={`text-sm ${isDark ? 'text-red-300' : 'text-red-700'}`}>
                                        This action cannot be undone. Once deleted, this rule will take effect immediately.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </Modal>
                )}
            </Layout>
        </>
    )
}

export default AccessControl