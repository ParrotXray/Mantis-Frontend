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
import { putData, deleteData } from '../utils/connectionUtils'
import { urls } from '../config'
import Layout from '../components/Layout'
import LoadingSpinner from '../components/LoadingSpinner'

// 接口定義
interface AccessControlItem {
    ip: string
    ports: (string | number)[]
}

interface NotificationProps {
    message: string
    type: 'success' | 'error' | 'warning' | 'info'
    onClose: () => void
}

interface ModalProps {
    title: string
    children: React.ReactNode
    onClose: () => void
    onSubmit?: () => void
    submitLabel?: string
    submitDisabled?: boolean
}

interface ToggleButtonProps {
    isActive: boolean
    onClick: () => void
    children: React.ReactNode
    className?: string
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

// 模態框組件
const Modal: React.FC<ModalProps> = ({ 
    title, 
    children, 
    onClose, 
    onSubmit, 
    submitLabel = 'Submit',
    submitDisabled = false 
}) => (
    <AnimatePresence>
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
            onClick={onClose}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <FontAwesomeIcon icon={faTimes} />
                        </button>
                    </div>
                </div>
                
                <div className="px-6 py-4">
                    {children}
                </div>
                
                <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                        取消
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

// 切換按鈕組件
const ToggleButton: React.FC<ToggleButtonProps> = ({ 
    isActive, 
    onClick, 
    children, 
    className = "" 
}) => (
    <button
        className={`px-4 py-2 rounded-lg transition-all duration-200 font-medium ${className} ${
            isActive 
                ? "bg-blue-600 text-white shadow-lg" 
                : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
        }`}
        onClick={onClick}
    >
        {children}
    </button>
)

// 統計卡片組件
interface StatsCardProps {
    title: string
    value: number
    icon: any
    color: string
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon, color }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg shadow-md p-6"
    >
        <div className="flex items-center justify-between">
            <div>
                <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
                <p className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>
            </div>
            <div className={`${color} p-3 rounded-lg`}>
                <FontAwesomeIcon icon={icon} className="text-white text-xl" />
            </div>
        </div>
    </motion.div>
)

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
            showNotification('資料已更新', 'success')
        } catch (error) {
            showNotification('更新失敗', 'error')
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
            showNotification('請輸入有效的 IP 地址', 'error')
            return
        }

        if (!validateIP(newIp.trim(), isIPv6)) {
            showNotification(`請輸入有效的 ${isIPv6 ? 'IPv6' : 'IPv4'} 地址`, 'error')
            return
        }

        if (!blockAllPorts && !validatePort(newPort)) {
            showNotification('請輸入有效的端口號 (1-65535)', 'error')
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
                            `成功添加: ${newIp.trim()}:${blockAllPorts ? '*' : portToSend}`, 
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
                        showNotification(`添加失敗: ${error.message}`, 'error')
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
                            `成功刪除: ${formattedIp}:${port === "0" || port === 0 ? "*" : port}`, 
                            'success'
                        )
                        // 更新当前資料
                        refreshData(isIPv6, listType)
                        setIsConfirmModalOpen(false)
                        setItemToDelete(null)
                        resolve()
                    },
                    (error) => {
                        showNotification(`刪除失敗: ${error.message}`, 'error')
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
                <title>存取控制 - NetGuardia</title>
                <meta name="description" content="NetGuardia 存取控制管理 - IP 白名單與黑名單" />
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
                            <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
                                <FontAwesomeIcon icon={faShieldAlt} className="mr-3 text-blue-600" />
                                存取控制管理
                            </h1>
                            <p className="text-gray-600">
                                管理 IPv4 和 IPv6 網路存取白名單與黑名單
                            </p>
                        </div>
                    </div>
                </motion.div>

                {/* 統計卡片 */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <StatsCard
                        title="唯一 IP 數"
                        value={stats.uniqueIPs}
                        icon={faGlobe}
                        color="bg-blue-500"
                    />
                    <StatsCard
                        title="總規則數"
                        value={stats.totalEntries}
                        icon={faNetworkWired}
                        color="bg-green-500"
                    />
                    <StatsCard
                        title="全端口規則"
                        value={stats.allPortsEntries}
                        icon={faFilter}
                        color="bg-purple-500"
                    />
                    <StatsCard
                        title="特定端口規則"
                        value={stats.specificPortEntries}
                        icon={faCheck}
                        color="bg-orange-500"
                    />
                </div>

                {/* 控制面板 */}
                <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-lg shadow-md p-6 mb-6"
                >
                    <div className="flex flex-wrap items-center gap-4">
                        {/* 搜索框 */}
                        <div className="flex-1 min-w-64">
                            <div className="relative">
                                <FontAwesomeIcon 
                                    icon={faSearch} 
                                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" 
                                />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={handleSearchChange}
                                    placeholder="搜索 IP 地址..."
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        {/* IP 版本選擇 */}
                        <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-gray-600">IP 版本:</span>
                            <div className="flex space-x-1">
                                <ToggleButton
                                    isActive={!isIPv6}
                                    onClick={() => handleIPVersionChange(false)}
                                >
                                    IPv4
                                </ToggleButton>
                                <ToggleButton
                                    isActive={isIPv6}
                                    onClick={() => handleIPVersionChange(true)}
                                >
                                    IPv6
                                </ToggleButton>
                            </div>
                        </div>

                        {/* 列表類型選擇 */}
                        <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-gray-600">列表類型:</span>
                            <div className="flex space-x-1">
                                <ToggleButton
                                    isActive={listType === "black_list"}
                                    onClick={() => handleListTypeChange("black_list")}
                                >
                                    <FontAwesomeIcon icon={faFilter} className="mr-1" />
                                    黑名單
                                </ToggleButton>
                                <ToggleButton
                                    isActive={listType === "white_list"}
                                    onClick={() => handleListTypeChange("white_list")}
                                >
                                    <FontAwesomeIcon icon={faCheck} className="mr-1" />
                                    白名單
                                </ToggleButton>
                            </div>
                        </div>

                        {/* 操作按鈕 */}
                        <div className="flex items-center space-x-2">
                            <button 
                                className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-2"
                                onClick={handleRefresh}
                                title="更新資料"
                            >
                                <FontAwesomeIcon icon={faRefresh} />
                                <span>更新</span>
                            </button>
                            
                            <button 
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2" 
                                onClick={handleAddItemClick}
                            >
                                <FontAwesomeIcon icon={faPlus} />
                                <span>添加規則</span>
                            </button>
                        </div>
                    </div>
                </motion.div>

                {/* 資料表格 */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-lg shadow-md overflow-hidden"
                >
                    <div className="px-6 py-4 border-b border-gray-200">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                                {isIPv6 ? 'IPv6' : 'IPv4'} {listType === 'black_list' ? '黑名單' : '白名單'}
                                {isLoading && (
                                    <div className="ml-3">
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                    </div>
                                )}
                            </h2>
                            <span className="text-sm text-gray-500">
                                {flatData.length} 條規則
                            </span>
                        </div>
                    </div>

                    {/* 简化表格切换，移除奇怪的动画 */}
                    {flatData.length === 0 ? (
                        <div className="p-12 text-center">
                            <FontAwesomeIcon icon={faInfoCircle} className="text-6xl text-gray-300 mb-4" />
                            <h3 className="text-xl font-semibold text-gray-700 mb-2">
                                {searchTerm ? '沒有找到匹配的結果' : '暫無資料'}
                            </h3>
                            <p className="text-gray-500 mb-4">
                                {searchTerm ? '請嘗試調整搜索條件' : '點擊上方按鈕添加第一條規則'}
                            </p>
                            {!searchTerm && (
                                <button 
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                    onClick={handleAddItemClick}
                                >
                                    <FontAwesomeIcon icon={faPlus} className="mr-2" />
                                    添加規則
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            IP 地址
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            端口
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            操作
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {flatData.map(({ ip, port }, index) => (
                                        <tr 
                                            key={`${ip}-${port}-${index}`}
                                            className="hover:bg-gray-50 transition-colors"
                                        >
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                {ip}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                                    port === "0" || port === 0 
                                                        ? 'bg-red-100 text-red-800' 
                                                        : 'bg-blue-100 text-blue-800'
                                                }`}>
                                                    {port === "0" || port === 0 ? "所有端口 (*)" : port}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                <button
                                                    className="text-red-600 hover:text-red-800 transition-colors"
                                                    onClick={() => handleDeleteClick(ip, port)}
                                                    title="刪除規則"
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
                        title={`添加 ${isIPv6 ? 'IPv6' : 'IPv4'} ${listType === 'black_list' ? '黑名單' : '白名單'}規則`}
                        onClose={handleModalClose}
                        onSubmit={handleAddItemSubmit}
                        submitLabel="添加"
                        submitDisabled={isSubmitting}
                    >
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    IP 地址
                                </label>
                                <input
                                    type="text"
                                    value={newIp}
                                    onChange={(e) => setNewIp(e.target.value)}
                                    placeholder={isIPv6 ? "2001:db8::" : "192.168.1.1"}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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
                                    <label htmlFor="block-all-ports" className="text-sm font-medium text-gray-700">
                                        阻擋所有端口
                                    </label>
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    端口
                                </label>
                                <input
                                    type="text"
                                    value={blockAllPorts ? "" : newPort}
                                    onChange={(e) => setNewPort(e.target.value)}
                                    placeholder="80"
                                    disabled={blockAllPorts}
                                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${
                                        blockAllPorts ? 'bg-gray-100 text-gray-500' : ''
                                    }`}
                                />
                                {blockAllPorts && (
                                    <p className="mt-1 text-sm text-gray-500">
                                        將阻擋此 IP 的所有端口
                                    </p>
                                )}
                            </div>
                            
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                <div className="flex items-start">
                                    <FontAwesomeIcon icon={faInfoCircle} className="text-blue-400 mt-0.5 mr-2" />
                                    <div className="text-sm text-blue-700">
                                        <p className="font-medium mb-1">
                                            將添加到 {listType === 'black_list' ? '黑名單' : '白名單'}
                                        </p>
                                        <p>
                                            {listType === 'black_list' 
                                                ? '黑名單中的 IP 將被拒絕存取'
                                                : '只有白名單中的 IP 可以存取'
                                            }
                                            {blockAllPorts && '，所有端口都將受到影響'}
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
                        title="確認刪除"
                        onClose={handleDeleteCancel}
                        onSubmit={handleDeleteConfirm}
                        submitLabel="刪除"
                        submitDisabled={isSubmitting}
                    >
                        <div className="space-y-4">
                            <div className="flex items-center text-yellow-600 mb-4">
                                <FontAwesomeIcon icon={faExclamationTriangle} className="mr-2" />
                                <span className="font-medium">警告</span>
                            </div>
                            
                            <p className="text-gray-700">
                                您確定要刪除此規則嗎？
                            </p>
                            
                            {itemToDelete && (
                                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                    <div className="space-y-2">
                                        <div className="flex justify-between">
                                            <span className="font-medium text-gray-700">IP 地址:</span>
                                            <span className="text-gray-900">{itemToDelete.ip}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="font-medium text-gray-700">端口:</span>
                                            <span className="text-gray-900">
                                                {itemToDelete.port === "0" || itemToDelete.port === 0 
                                                    ? "所有端口 (*)" 
                                                    : itemToDelete.port
                                                }
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="font-medium text-gray-700">列表類型:</span>
                                            <span className="text-gray-900">
                                                {listType === 'black_list' ? '黑名單' : '白名單'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                            
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                <div className="flex items-start">
                                    <FontAwesomeIcon icon={faExclamationTriangle} className="text-red-400 mt-0.5 mr-2" />
                                    <p className="text-sm text-red-700">
                                        此操作無法撤銷。刪除後，此規則將立即失效。
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