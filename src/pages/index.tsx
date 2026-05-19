// src/pages/index.tsx
import Head from 'next/head'
import {motion, AnimatePresence} from 'framer-motion'
import {useEffect, useState, useContext, useMemo, useCallback} from 'react'
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome'
import {
    faShieldAlt,
    faNetworkWired,
    faServer,
    faChartLine,
    faExclamationTriangle,
    faGlobe,
    faEye,
    faFireAlt,
    faRobot,
    faClock,
    faArrowUp,
    faArrowDown,
    faBolt,
    faUsers,
    faDatabase,
    faLock,
    faPlay,
    faMemory,
    faThermometerHalf,
    faWifi,
    faCheckCircle,
    faExclamationCircle,
    faTimesCircle,
    faRefresh,
    faPause,
    faDesktop,
    faWeight,
    faTachometerAlt,
    faTimes,
    faMicrochip,
    faHdd,
    faFire,
    faInfoCircle,
} from '@fortawesome/free-solid-svg-icons'
import Layout from '../components/Layout'
import {WebsocketContext} from '../providers/WebSocketProvider'
import {useTheme} from '../providers/ThemeProvider'
import LoadingSpinner from '../components/LoadingSpinner'
import Link from 'next/link'
import {
    SystemHealthData,
    HealthMetric,
    SystemDetailModalProps,
    HealthCardProps,
    LoadAverageProps,
    NetworkStatsProps
} from '../types/HomeTypes'

// 工具函數
const formatBytes = (bytes: number): string => {
    const units = ['B', 'KB', 'MB', 'GB', 'TB']
    if (bytes === 0) return '0 B'

    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    const value = bytes / Math.pow(1024, i)

    return `${value.toFixed(1)} ${units[i]}`
}

const formatUptimeFromSeconds = (seconds: number): string => {
    const days = Math.floor(seconds / (24 * 3600))
    const hours = Math.floor((seconds % (24 * 3600)) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)

    if (days > 0) {
        return `${days} days ${hours} hours ${minutes} minutes`
    } else if (hours > 0) {
        return `${hours} hours ${minutes} minutes`
    } else {
        return `${minutes} minutes`
    }
}

const getStatusFromValue = (value: number, type: 'cpu' | 'memory' | 'temperature' | 'load'): 'good' | 'warning' | 'critical' => {
    switch (type) {
        case 'cpu':
            if (value < 50) return 'good'
            if (value < 80) return 'warning'
            return 'critical'
        case 'memory':
            if (value < 60) return 'good'
            if (value < 85) return 'warning'
            return 'critical'
        case 'temperature':
            if (value < 45) return 'good'
            if (value < 70) return 'warning'
            return 'critical'
        case 'load':
            if (value < 1.0) return 'good'
            if (value < 2.0) return 'warning'
            return 'critical'
        default:
            return 'good'
    }
}

const getStatusColor = (status: 'good' | 'warning' | 'critical' | 'unknown') => {
    switch (status) {
        case 'good':
            return {
                color: 'text-green-600',
                bgColor: 'bg-green-100',
                iconColor: 'text-green-500',
                dotColor: 'bg-green-500'
            }
        case 'warning':
            return {
                color: 'text-yellow-600',
                bgColor: 'bg-yellow-100',
                iconColor: 'text-yellow-500',
                dotColor: 'bg-yellow-500'
            }
        case 'critical':
            return {
                color: 'text-red-600',
                bgColor: 'bg-red-100',
                iconColor: 'text-red-500',
                dotColor: 'bg-red-500'
            }
        default:
            return {
                color: 'text-gray-600',
                bgColor: 'bg-gray-100',
                iconColor: 'text-gray-500',
                dotColor: 'bg-gray-500'
            }
    }
}

// 系統詳情模態框組件
const SystemDetailModal: React.FC<SystemDetailModalProps> = ({ isOpen, onClose, systemHealth, type }) => {
    const {actualTheme} = useTheme()
    const isDark = actualTheme === 'dark'

    if (!isOpen || !systemHealth) return null

    const getModalContent = () => {
        switch (type) {
            case 'cpu':
                return {
                    title: 'CPU Details',
                    icon: faMicrochip,
                    color: 'text-blue-600',
                    content: (
                        <div className="space-y-6">
                            {/* CPU 基本資訊 */}
                            <div className={`rounded-lg p-4 ${isDark ? 'bg-slate-600' : 'bg-blue-50'}`}>
                                <h4 className={`font-semibold mb-3 flex items-center ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
                                    <FontAwesomeIcon icon={faMicrochip}
                                                     className={`mr-2 ${isDark ? 'text-blue-400' : 'text-blue-900'}`}/>
                                    Processor Information
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                    <div>
                                        <span
                                            className={isDark ? 'text-gray-300' : 'text-gray-600'}>Processor model:</span>
                                        <div
                                            className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>{systemHealth.cpu_details?.cpu_brand}</div>
                                    </div>
                                    <div>
                                        <span
                                            className={isDark ? 'text-gray-300' : 'text-gray-600'}>Number of cores:</span>
                                        <div
                                            className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>{systemHealth.cpu_details?.core_count} cores
                                        </div>
                                    </div>
                                    <div>
                                        <span
                                            className={isDark ? 'text-gray-300' : 'text-gray-600'}>Base frequency:</span>
                                        <div
                                            className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>{systemHealth.cpu_details?.cpu_frequency} MHz
                                        </div>
                                    </div>
                                    <div>
                                        <span
                                            className={isDark ? 'text-gray-300' : 'text-gray-600'}>Overall usage:</span>
                                        <div
                                            className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>{systemHealth.cpu_details?.cpu_usage.toFixed(1)}%
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 各核心使用率 */}
                            {systemHealth.cpu_details?.cores && (
                                <div className={`rounded-lg p-4 ${isDark ? 'bg-slate-600' : 'bg-blue-50'}`}>
                                    <h4 className={`font-semibold mb-3 flex items-center ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
                                        <FontAwesomeIcon icon={faTachometerAlt}
                                                         className={`mr-2 ${isDark ? 'text-purple-400' : 'text-purple-600'}`}/>
                                        Usage per core
                                    </h4>
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                        {systemHealth.cpu_details.cores.map((core) => {
                                            const usage = core.usage_percent
                                            const status = getStatusFromValue(usage, 'cpu')
                                            const statusColors = getStatusColor(status)

                                            return (
                                                <div key={core.core_id}
                                                     className={`rounded-lg p-3 border border-gray-200 ${isDark ? 'bg-gray-700' : 'bg-white'}`}>
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                                          Core {core.core_id}
                                                        </span>
                                                        <span
                                                            className={`text-xs px-2 py-1 rounded-full ${statusColors.bgColor} ${statusColors.color}`}>
                                                          {usage.toFixed(1)}%
                                                        </span>
                                                    </div>

                                                    {/* 進度條 */}
                                                    <div
                                                        className={`w-full rounded-full h-2 mb-2 ${isDark ? 'bg-gray-500' : 'bg-gray-200'}`}>
                                                        <div
                                                            className={`h-2 rounded-full transition-all duration-300 ${
                                                                status === 'good' ? 'bg-green-500' :
                                                                    status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                                                            }`}
                                                            style={{width: `${Math.min(usage, 100)}%`}}
                                                        ></div>
                                                    </div>

                                                    <div
                                                        className={`text-xs text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                                        {core.frequency} MHz
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* 系統負載 */}
                            {systemHealth.load_average ? (
                                <div className={`rounded-lg p-4 ${isDark ? 'bg-slate-600' : 'bg-blue-50'}`}>
                                    <h4 className={`font-semibold mb-3 flex items-center ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
                                        <FontAwesomeIcon icon={faWeight}
                                                         className={`mr-2 ${isDark ? 'text-yellow-400' : 'text-yellow-900'}`}/>
                                        System load average
                                    </h4>
                                    <div className="grid grid-cols-3 gap-4">
                                        {[
                                            {label: '1 minute', value: systemHealth.load_average.one_minute},
                                            {label: '5 minutes', value: systemHealth.load_average.five_minute},
                                            {label: '15 minutes', value: systemHealth.load_average.fifteen_minute}
                                        ].map((load) => {
                                            const status = getStatusFromValue(load.value, 'load')
                                            const statusColors = getStatusColor(status)

                                            return (
                                                <div key={load.label}
                                                     className={`rounded-lg p-3 text-center border border-gray-200 ${isDark ? 'bg-gray-700' : 'bg-white'}`}>
                                                    <div
                                                        className={`text-sm mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{load.label}</div>
                                                    <div
                                                        className={`text-lg font-bold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
                                                        {load.value.toFixed(2)}
                                                    </div>
                                                    <div
                                                        className={`w-full rounded-full h-2 mb-2 ${isDark ? 'bg-gray-500' : 'bg-gray-200'}`}>
                                                        <div
                                                            className={`h-2 rounded-full transition-all duration-300 ${
                                                                status === 'good' ? 'bg-green-500' :
                                                                    status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                                                            }`}
                                                            style={{width: `${Math.min(load.value, 100)}%`}}
                                                        ></div>
                                                    </div>
                                                    <div
                                                        className={`text-xs px-2 py-1 rounded-full ${statusColors.bgColor} ${statusColors.color}`}>
                                                        {status === 'good' ? 'Normal' : status === 'warning' ? 'Warning' : 'Overloaded'}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            ) : (
                                <div className={`rounded-lg p-4 ${isDark ? 'bg-slate-600' : 'bg-blue-50'}`}>
                                    <div className={`text-center py-8 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                        <FontAwesomeIcon icon={faExclamationCircle} className="text-4xl mb-2"/>
                                        <p>System load data unavailable</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                }

            case 'memory':
                const memoryUsed = systemHealth.memory_usage.used
                const memoryTotal = systemHealth.memory_usage.total
                const memoryAvailable = systemHealth.memory_usage.available
                const memoryPercent = systemHealth.memory_usage.usage_percent
                const swapUsed = systemHealth.memory_usage.swap_used
                const swapTotal = systemHealth.memory_usage.swap_total
                const swapPercent = swapTotal > 0 ? (swapUsed / swapTotal) * 100 : 0

                return {
                    title: 'Memory Details',
                    icon: faMemory,
                    color: 'text-green-600',
                    content: (
                        <div className="space-y-6">
                            {/* 實體記憶體 */}
                            <div className={`rounded-lg p-4 ${isDark ? 'bg-slate-600' : 'bg-blue-50'}`}>
                                <h4 className={`font-semibold mb-4 flex items-center ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
                                    <FontAwesomeIcon icon={faMemory}
                                                     className={`mr-2 ${isDark ? ' text-green-400' : ' text-green-900'}`}/>
                                    Physical Memory (RAM)
                                </h4>

                                {/* 記憶體使用率圓餅圖式進度條 */}
                                <div className="flex items-center justify-center mb-4">
                                    <div className="relative w-32 h-32">
                                        <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
                                            {/* 背景圓環 */}
                                            <circle
                                                cx="50"
                                                cy="50"
                                                r="45"
                                                stroke={isDark ? "#6a7282" : "#e5e7eb"}
                                                strokeWidth="8"
                                                fill="none"
                                            />
                                            {/* 進度圓環 */}
                                            <circle
                                                cx="50"
                                                cy="50"
                                                r="45"
                                                stroke={memoryPercent < 60 ? "#10b981" : memoryPercent < 85 ? "#f59e0b" : "#ef4444"}
                                                strokeWidth="8"
                                                fill="none"
                                                strokeLinecap="round"
                                                strokeDasharray={`${(memoryPercent / 100) * 283} 283`}
                                                className="transition-all duration-500"
                                            />
                                        </svg>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="text-center">
                                                <div
                                                    className={`text-xl font-bold ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>{memoryPercent.toFixed(1)}%
                                                </div>
                                                <div
                                                    className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Used
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div className={`rounded-lg p-3 ${isDark ? 'bg-slate-600' : 'bg-blue-50'}`}>
                                        <div className={isDark ? 'text-gray-300' : 'text-gray-600'}>Total Capacity</div>
                                        <div
                                            className={`font-semibold ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>{formatBytes(memoryTotal)}</div>
                                    </div>
                                    <div className={`rounded-lg p-3 ${isDark ? 'bg-slate-600' : 'bg-blue-50'}`}>
                                        <div className={isDark ? 'text-gray-300' : 'text-gray-600'}>Used</div>
                                        <div
                                            className={`font-semibold ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{formatBytes(memoryUsed)}</div>
                                    </div>
                                    <div className={`rounded-lg p-3 ${isDark ? 'bg-slate-600' : 'bg-blue-50'}`}>
                                        <div className={isDark ? 'text-gray-300' : 'text-gray-600'}>Available</div>
                                        <div
                                            className={`font-semibold ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{formatBytes(memoryAvailable)}</div>
                                    </div>
                                    <div className={`rounded-lg p-3 ${isDark ? 'bg-slate-600' : 'bg-blue-50'}`}>
                                        <div className={isDark ? 'text-gray-300' : 'text-gray-600'}>Usage</div>
                                        <div className={`font-semibold ${
                                            memoryPercent < 60 ? 'text-green-600' :
                                                memoryPercent < 85 ? 'text-yellow-600' : 'text-red-600'
                                        }`}>
                                            {memoryPercent.toFixed(1)}%
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 交換空間 */}
                            {swapTotal > 0 && (
                                <div className={`rounded-lg p-4 ${isDark ? 'bg-slate-600' : 'bg-blue-50'}`}>
                                    <h4 className={`font-semibold mb-3 flex items-center ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
                                        <FontAwesomeIcon icon={faHdd}
                                                         className={`mr-2 ${isDark ? 'text-blue-400' : 'text-blue-900'}`}/>
                                        Swap
                                    </h4>

                                    <div className="mb-3">
                                        <div className="flex justify-between text-sm mb-2">
                                            <span className={isDark ? 'text-gray-300' : 'text-gray-600'}>Usage</span>
                                            <span
                                                className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{swapPercent.toFixed(1)}%
                                            </span>
                                        </div>
                                        <div
                                            className={`w-full rounded-full h-3 ${isDark ? 'bg-gray-500' : 'bg-gray-200'}`}>
                                            <div
                                                className={`h-3 rounded-full transition-all duration-300 ${
                                                    swapPercent < 30 ? 'bg-green-500' : swapPercent < 70 ? 'bg-yellow-500' : 'bg-red-500'
                                                }`}
                                                style={{width: `${swapPercent}%`}}
                                            ></div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        <div
                                            className={`rounded-lg p-3 border border-gray-200 ${isDark ? 'bg-gray-700' : 'bg-white'}`}>
                                            <div className={isDark ? 'text-gray-300' : 'text-gray-600'}>Total Capacity
                                            </div>
                                            <div
                                                className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
                                            </div>
                                        </div>
                                        <div
                                            className={`rounded-lg p-3 border border-gray-200 ${isDark ? 'bg-gray-700' : 'bg-white'}`}>
                                            <div className={isDark ? 'text-gray-300' : 'text-gray-600'}>Used</div>
                                            <div
                                                className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>{formatBytes(swapUsed)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                }

            case 'temperature':
                const temp = systemHealth.temperature
                const tempStatus = getStatusFromValue(temp, 'temperature')
                const tempColors = getStatusColor(tempStatus)
                const tempPercent = Math.min((temp / 100) * 100, 100)

                return {
                    title: 'Temperature Details',
                    icon: faThermometerHalf,
                    color: 'text-orange-600',
                    content: (
                        <div className="space-y-6">
                            {/* 溫度顯示 */}
                            <div className={`rounded-lg p-6 ${isDark ? 'bg-slate-600' : 'bg-blue-50'}`}>
                                <h4 className={`font-semibold mb-4 flex items-center ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
                                    <FontAwesomeIcon icon={faThermometerHalf}
                                                     className={`mr-2 ${isDark ? 'text-orange-400' : 'text-orange-900'}`}/>
                                    Current system temperature
                                </h4>

                                {/* 溫度數值顯示 */}
                                <div className="text-center mb-6">
                                    <div
                                        className={`text-5xl font-bold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
                                        {temp.toFixed(1)}<span className="text-3xl">°C</span>
                                    </div>
                                    <div
                                        className={`inline-flex items-center space-x-2 text-sm px-4 py-2 rounded-full ${tempColors.bgColor} ${tempColors.color}`}>
                                        <FontAwesomeIcon icon={
                                            tempStatus === 'good' ? faCheckCircle :
                                                tempStatus === 'warning' ? faExclamationTriangle : faFire
                                        }/>
                                        <span className="font-medium">
                                            {tempStatus === 'good' ? 'Normal temperature' :
                                            tempStatus === 'warning' ? 'High temperature' : 'Too high a temperature'}
                                        </span>
                                    </div>
                                </div>

                                {/* 漸層溫度條 */}
                                <div className="relative mb-6">
                                    {/* 溫度條容器 */}
                                    <div
                                        className={`relative h-8 rounded-full overflow-hidden ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                                        {/* 漸層背景 */}
                                        <div
                                            className="absolute inset-0 opacity-30"
                                            style={{
                                                background: 'linear-gradient(to right, #3b82f6 0%, #10b981 20%, #84cc16 40%, #fbbf24 60%, #f97316 80%, #ef4444 100%)'
                                            }}
                                        ></div>

                                        {/* 當前溫度進度 */}
                                        <div
                                            className="absolute inset-y-0 left-0 transition-all duration-500 rounded-full"
                                            style={{
                                                width: `${tempPercent}%`,
                                                background: tempStatus === 'good'
                                                    ? 'linear-gradient(to right, #3b82f6, #10b981)'
                                                    : tempStatus === 'warning'
                                                        ? 'linear-gradient(to right, #10b981, #fbbf24, #f97316)'
                                                        : 'linear-gradient(to right, #fbbf24, #f97316, #ef4444)',
                                                boxShadow: '0 0 15px rgba(0,0,0,0.2)'
                                            }}
                                        ></div>
                                    </div>

                                    {/* 溫度刻度 */}
                                    <div className="flex justify-between mt-2 px-1">
                                        {[0, 25, 45, 70, 100].map((value) => (
                                            <div key={value} className="flex flex-col items-center">
                                                <div
                                                    className={`w-0.5 h-2 ${isDark ? 'bg-gray-500' : 'bg-gray-400'}`}></div>
                                                <span className={`text-xs mt-1 ${
                                                    isDark ? 'text-gray-400' : 'text-gray-600'
                                                }`}>
                                                    {value}°
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* 溫度控制建議 */}
                            <div className={`rounded-lg p-4 ${isDark ? 'bg-slate-600' : 'bg-blue-50'}`}>
                                <div className="grid grid-cols-3 gap-3 text-center text-sm">
                                    <div className={`rounded-lg p-3 border border-gray-200 ${isDark ? 'bg-gray-700' : 'bg-white'}`}>
                                        <div className="flex items-center justify-center mb-2">
                                            <div
                                                className="w-8 h-2 rounded-full bg-gradient-to-r from-blue-500 to-green-500"></div>
                                        </div>
                                        <div
                                            className={`font-bold mb-1 ${isDark ? 'text-green-400' : 'text-green-600'}`}>Normal
                                        </div>
                                        <div
                                            className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>0-45°C
                                        </div>
                                    </div>
                                    <div className={`rounded-lg p-3 border border-gray-200 ${isDark ? 'bg-gray-700' : 'bg-white'}`}>
                                        <div className="flex items-center justify-center mb-2">
                                            <div
                                                className="w-8 h-2 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500"></div>
                                        </div>
                                        <div
                                            className={`font-bold mb-1 ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`}>Warn
                                        </div>
                                        <div
                                            className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>45-70°C
                                        </div>
                                    </div>
                                    <div className={`rounded-lg p-3 border border-gray-200 ${isDark ? 'bg-gray-700' : 'bg-white'}`}>
                                        <div className="flex items-center justify-center mb-2">
                                            <div
                                                className="w-8 h-2 rounded-full bg-gradient-to-r from-orange-500 to-red-500"></div>
                                        </div>
                                        <div
                                            className={`font-bold mb-1 ${isDark ? 'text-red-400' : 'text-red-600'}`}>Danger
                                        </div>
                                        <div
                                            className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>70-100°C
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                }
            default:
                return {title: '', icon: faServer, color: 'text-gray-600', content: <div>No Data</div>}
        }
    }

    const modalContent = getModalContent()

    return (
        <AnimatePresence>
            <motion.div
                initial={{opacity: 0}}
                animate={{opacity: 1}}
                exit={{opacity: 0}}
                className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/30 p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{opacity: 0, scale: 0.95, y: 20}}
                    animate={{opacity: 1, scale: 1, y: 0}}
                    exit={{opacity: 0, scale: 0.95, y: 20}}
                    className={`rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden ${isDark ? 'bg-gray-800' : 'bg-white'}`}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* 模態框標題 */}
                    <div
                        className={`sticky top-0 border-b border-gray-200 px-6 py-4 rounded-t-xl ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                        <div className="flex items-center justify-between">
                            <h2 className={`text-2xl font-bold flex items-center ${modalContent.color}`}>
                                <FontAwesomeIcon icon={modalContent.icon} className="mr-3"/>
                                {modalContent.title}
                            </h2>
                            <button
                                onClick={onClose}
                                className="text-gray-400 hover:text-gray-600 transition-colors p-2"
                            >
                                <FontAwesomeIcon icon={faTimes} className="text-xl"/>
                            </button>
                        </div>
                    </div>

                    {/* 模態框內容 */}
                    <div className="p-6 overflow-y-auto max-h-[calc(90vh-64px)]">
                        {modalContent.content}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    )
}

const HealthCard: React.FC<HealthCardProps> = ({metric, index, systemHealth, onClick}) => {
    const {actualTheme} = useTheme()
    const statusColors = getStatusColor(metric.status)
    const [showTooltip, setShowTooltip] = useState(false)
    const isDark = actualTheme === 'dark'

    // 計算進度條百分比
    const getProgressPercentage = (): number => {
        if (typeof metric.value !== 'number') return 0

        switch (metric.name) {
            case 'CPU usage':
            case 'Memory usage':
                return metric.value
            case 'System temperature':
                // 溫度以100°C為最大值計算百分比
                return Math.min((metric.value / 100) * 100, 100)
            default:
                return 0
        }
    }

    // 獲取詳細資訊
    const getDetailedInfo = (): string => {
        if (!systemHealth) return ''

        switch (metric.name) {
            case 'CPU usage':
                return `Processor Load: ${systemHealth.cpu_details?.cpu_usage.toFixed(1)}%\nStatus: ${metric.status === 'good' ? 'Normal' : metric.status === 'warning' ? 'Warning' : 'Critical'}`
            case 'Memory usage':
                return `Total Memory: ${formatBytes(systemHealth.memory_usage.total)}\nUsed: ${formatBytes(systemHealth.memory_usage.used)}\nAvailable Memory: ${formatBytes(systemHealth.memory_usage.available)}\nUsage: ${systemHealth.memory_usage.usage_percent.toFixed(1)}%`
            case 'System temperature':
                return `Current Temperature: ${systemHealth.temperature.toFixed(1)}°C\nStatus: ${metric.status === 'good' ? 'Normal' : metric.status === 'warning' ? 'High' : 'Critical'}`
            default:
                return metric.description || ''
        }
    }

    const progressPercentage = getProgressPercentage()
    const hasProgressBar = metric.name.includes('usage') || metric.name.includes('temperature')
    const isClickable = ['CPU Usage', 'Memory Usage', 'System Temperature'].includes(metric.name)

    return (
        <motion.div
            initial={{opacity: 0, y: 20}}
            animate={{opacity: 1, y: 0}}
            transition={{delay: index * 0.1}}
            className={`rounded-lg shadow-md p-6 transition-all duration-300 group border-l-4 relative ${
                isClickable ? 'hover:shadow-lg cursor-pointer hover:scale-105' : 'hover:shadow-lg'
            } ${isDark ? 'bg-gray-600' : 'bg-white'}`}
            style={{
                borderLeftColor: statusColors.dotColor.replace('bg-', '').replace('-500', '') === 'green' ? '#10b981' :
                    statusColors.dotColor.replace('bg-', '').replace('-500', '') === 'yellow' ? '#f59e0b' :
                        statusColors.dotColor.replace('bg-', '').replace('-500', '') === 'red' ? '#ef4444' : '#6b7280'
            }}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            onClick={isClickable ? onClick : undefined}
        >
            <div className="flex items-center justify-between">
                <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                        <p className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                            {metric.name}
                        </p>
                        <div className={`w-2 h-2 rounded-full ${statusColors.dotColor} ${
                            metric.status === 'good' ? 'animate-pulse' : ''
                        }`}></div>
                    </div>
                    <p className={`text-2xl font-bold mb-1 ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
                        {typeof metric.value === 'number' ?
                            metric.value.toFixed(metric.name.includes('Usage') || metric.name.includes('Temperature') ? 1 : 0) :
                            metric.value
                        }
                        {metric.unit && <span
                            className={`text-lg ml-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{metric.unit}</span>}
                    </p>
                    {metric.description && (
                        <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{metric.description}</p>
                    )}

                    {/* 進度條 */}
                    {hasProgressBar && (
                        <div className="mt-2 mb-2">
                            <div className={`w-3/4 rounded-full h-1.5 ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                                <div
                                    className={`h-1.5 rounded-full transition-all duration-500 ${
                                        metric.status === 'good' ? 'bg-green-500' :
                                            metric.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                                    }`}
                                    style={{width: `${progressPercentage}%`}}
                                ></div>
                            </div>
                        </div>
                    )}

                    <div className="flex items-center justify-between mt-2">
            <span className={`text-xs uppercase tracking-wide font-medium ${statusColors.color}`}>
              {metric.status === 'good' ? 'Normal' :
                  metric.status === 'warning' ? 'Warn' :
                      metric.status === 'critical' ? 'Urgent' : 'Unknown'}
            </span>
                    </div>
                </div>
                <div
                    className={`${statusColors.bgColor} p-3 rounded-lg group-hover:scale-110 transition-transform duration-300`}>
                    <FontAwesomeIcon
                        icon={metric.icon}
                        className={`${statusColors.iconColor} text-xl`}
                    />
                </div>
            </div>

            {/* 懸停提示框 */}
            {showTooltip && getDetailedInfo() && !isClickable && (
                <div
                    className={`absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 text-xs rounded-lg shadow-lg min-w-max max-w-xs ${
                        isDark ? 'bg-gray-700 text-gray-200' : 'bg-gray-900 text-white'
                    }`}>
                    <div className="whitespace-pre-line">{getDetailedInfo()}</div>
                    {/* 箭頭 */}
                    <div
                        className={`absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent ${
                            isDark ? 'border-t-gray-700' : 'border-t-gray-900'
                        }`}></div>
                </div>
            )}
        </motion.div>
    )
}

const LoadAverageDetails: React.FC<LoadAverageProps> = ({loadAverage}) => {
    if (!loadAverage) {
        return (
            <motion.div
                initial={{opacity: 0, y: 20}}
                animate={{opacity: 1, y: 0}}
                transition={{delay: 0.8}}
                className="bg-white rounded-lg shadow-md p-6"
            >
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <FontAwesomeIcon icon={faTachometerAlt} className="mr-2 text-yellow-600"/>
                    System Load Average
                </h3>
                <div className="text-center text-gray-500 py-8">
                    <FontAwesomeIcon icon={faExclamationCircle} className="text-4xl mb-2"/>
                    <p>System load data is not available</p>
                </div>
            </motion.div>
        )
    }

    const loadMetrics = [
        {
            label: '1 minute',
            value: loadAverage.one_minute,
            color: getStatusFromValue(loadAverage.one_minute, 'load')
        },
        {
            label: '5 minutes',
            value: loadAverage.five_minute,
            color: getStatusFromValue(loadAverage.five_minute, 'load')
        },
        {
            label: '15 minutes',
            value: loadAverage.fifteen_minute,
            color: getStatusFromValue(loadAverage.fifteen_minute, 'load')
        }
    ]

    const getLoadDescription = (value: number): string => {
        if (value < 0.5) return 'System Idle'
        if (value < 1.0) return 'Load Normal'
        if (value < 1.5) return 'Load High'
        if (value < 2.0) return 'Load Very High'
        return 'System Overloaded'
    }

    const getBarWidth = (value: number): number => {
        // 以 3.0 為最大值來計算進度條寬度
        return Math.min((value / 3.0) * 100, 100)
    }

    return (
        <motion.div
            initial={{opacity: 0, y: 20}}
            animate={{opacity: 1, y: 0}}
            transition={{delay: 0.8}}
            className="bg-white rounded-lg shadow-md p-6"
        >
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <FontAwesomeIcon icon={faTachometerAlt} className="mr-2 text-yellow-600"/>
                System Load Average
            </h3>

            <div className="space-y-4">
                {loadMetrics.map((metric, index) => {
                    const statusColors = getStatusColor(metric.color)
                    const barWidth = getBarWidth(metric.value)

                    return (
                        <motion.div
                            key={metric.label}
                            initial={{opacity: 0, x: -20}}
                            animate={{opacity: 1, x: 0}}
                            transition={{delay: 0.9 + index * 0.1}}
                            className="space-y-2"
                        >
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-gray-700">{metric.label}</span>
                                <div className="flex items-center space-x-2">
                  <span className="text-lg font-bold text-gray-900">
                    {metric.value.toFixed(2)}
                  </span>
                                    <span
                                        className={`text-xs px-2 py-1 rounded-full ${statusColors.bgColor} ${statusColors.color}`}>
                    {getLoadDescription(metric.value)}
                  </span>
                                </div>
                            </div>

                            {/* 進度條 */}
                            <div className="w-full bg-gray-200 rounded-full h-3">
                                <div
                                    className={`h-3 rounded-full transition-all duration-500 ${
                                        metric.color === 'good' ? 'bg-green-500' :
                                            metric.color === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                                    }`}
                                    style={{width: `${barWidth}%`}}
                                ></div>
                            </div>

                            <div className="flex justify-between text-xs text-gray-500">
                                <span>0.0</span>
                                <span>1.0</span>
                                <span>2.0</span>
                                <span>3.0+</span>
                            </div>
                        </motion.div>
                    )
                })}
            </div>
        </motion.div>
    )
}

const NetworkStats: React.FC<NetworkStatsProps> = ({networkStats}) => {
    const {actualTheme} = useTheme();
    const isDark = actualTheme === 'dark';
    const interfaces = [
        {key: 'ingress', name: 'Ingress Network', icon: faArrowDown, color: 'text-blue-600'},
        {key: 'egress', name: 'Egress Network', icon: faArrowUp, color: 'text-green-600'},
        // {key: 'management', name: 'Management Network', icon: faDesktop, color: 'text-purple-600'}
    ]

    return (
        <motion.div
            initial={{opacity: 0, y: 20}}
            animate={{opacity: 1, y: 0}}
            transition={{delay: 0.7}}
            className={`rounded-lg shadow-md p-6 ${isDark ? 'bg-gray-600' : 'bg-white'}`}
        >
            <h3 className={`text-lg font-semibold mb-4 flex items-center ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
                <FontAwesomeIcon icon={faWifi} className="mr-2 text-blue-600"/>
                Network Interface Status
            </h3>

            <div className="space-y-4">
                {interfaces.map((iface, index) => {
                    const stats = networkStats[iface.key as keyof typeof networkStats]
                    const hasErrors = stats.errors_received > 0 || stats.errors_transmitted > 0

                    return (
                        <motion.div
                            key={iface.key}
                            initial={{opacity: 0, x: -20}}
                            animate={{opacity: 1, x: 0}}
                            transition={{delay: 0.8 + index * 0.1}}
                            className="border border-gray-200 rounded-lg p-4"
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center space-x-2">
                                    <FontAwesomeIcon icon={iface.icon} className={iface.color}/>
                                    <span
                                        className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>{iface.name}</span>
                                    <span
                                        className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-500'}`}>({stats.interface})</span>
                                </div>
                                {hasErrors ? (
                                    <FontAwesomeIcon icon={faExclamationTriangle} className="text-yellow-500"/>
                                ) : (
                                    <FontAwesomeIcon icon={faCheckCircle} className="text-green-500"/>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <div className={isDark ? 'text-white' : 'text-gray-600'}>Received</div>
                                    <div
                                        className={`font-medium ${isDark ? 'text-white' : 'text-gray-600'}`}>{formatBytes(stats.bytes_received)}</div>
                                    <div
                                        className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{stats.packets_received.toLocaleString()} packets
                                    </div>
                                </div>
                                <div>
                                    <div className={isDark ? 'text-white' : 'text-gray-600'}>Transmitted</div>
                                    <div
                                        className={`font-medium ${isDark ? 'text-white' : 'text-gray-600'}`}>{formatBytes(stats.bytes_transmitted)}</div>
                                    <div
                                        className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{stats.packets_transmitted.toLocaleString()} packets
                                    </div>
                                </div>
                            </div>

                            {hasErrors && (
                                <div className="mt-2 pt-2 border-t border-gray-200">
                                    <div className="text-sm text-yellow-600">
                                        Errors: Received {stats.errors_received}, Transmitted {stats.errors_transmitted}
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    )
                })}
            </div>
        </motion.div>
    )
}

// 主要組件
export default function Home() {
    const {actualTheme} = useTheme()
    const {bootTime, getSystemHealthStream} = useContext(WebsocketContext)
    const [currentTime, setCurrentTime] = useState(new Date())
    const [systemHealth, setSystemHealth] = useState<SystemHealthData | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isPaused, setIsPaused] = useState(false)
    const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null)
    const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting')

    const isDark = actualTheme === 'dark'

    // 模態框狀態
    const [modalState, setModalState] = useState<{
        isOpen: boolean
        type: 'cpu' | 'memory' | 'temperature' | null
    }>({
        isOpen: false,
        type: null
    })

    // 更新當前時間
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date())
        }, 1000)

        return () => clearInterval(timer)
    }, [])

    const processSystemHealthData = useCallback((rawData: any) => {
        if (isPaused) return

        try {
            // 解析 WebSocket 資料
            const parsedData = typeof rawData === 'object' ? rawData : JSON.parse(rawData)

            // 驗證必要欄位
            if (parsedData && typeof parsedData === 'object') {
                const healthData: SystemHealthData = {
                    timestamp: parsedData.timestamp || Date.now() / 1000,
                    boot_time: parsedData.boot_time,
                    uptime_seconds: parsedData.uptime_seconds,
                    system_info: {
                        kernel_version: parsedData.system_info?.kernel_version || 'Unknown',
                        os_name: parsedData.system_info?.os_name || 'Unknown',
                        os_version: parsedData.system_info?.os_version || 'Unknown',
                        architecture: parsedData.system_info?.architecture || 'Unknown',
                        total_processes: parsedData.system_info?.total_processes || 0
                    },
                    cpu_details: parsedData.cpu_details ? {
                        cpu_brand: parsedData.cpu_details.cpu_brand || 'Unknown',
                        core_count: parsedData.cpu_details.core_count || 0,
                        cpu_usage: parsedData.cpu_details.cpu_usage || 0,
                        cpu_frequency: parsedData.cpu_details.cpu_frequency || 0,
                        cores: parsedData.cpu_details.cores || []
                    } : undefined,
                    memory_usage: {
                        total: parsedData.memory_usage?.total || 0,
                        used: parsedData.memory_usage?.used || 0,
                        available: parsedData.memory_usage?.available || 0,
                        usage_percent: parsedData.memory_usage?.usage_percent || 0,
                        swap_total: parsedData.memory_usage?.swap_total || 0,
                        swap_used: parsedData.memory_usage?.swap_used || 0
                    },
                    network_stats: {
                        ingress: parsedData.network_stats?.ingress || {
                            interface: 'Unknown',
                            bytes_received: 0,
                            bytes_transmitted: 0,
                            packets_received: 0,
                            packets_transmitted: 0,
                            errors_received: 0,
                            errors_transmitted: 0
                        },
                        egress: parsedData.network_stats?.egress || {
                            interface: 'Unknown',
                            bytes_received: 0,
                            bytes_transmitted: 0,
                            packets_received: 0,
                            packets_transmitted: 0,
                            errors_received: 0,
                            errors_transmitted: 0
                        },
                        management: parsedData.network_stats?.management || {
                            interface: 'Unknown',
                            bytes_received: 0,
                            bytes_transmitted: 0,
                            packets_received: 0,
                            packets_transmitted: 0,
                            errors_received: 0,
                            errors_transmitted: 0
                        }
                    },
                    load_average: parsedData.load_average || null,
                    temperature: parsedData.temperature || 0
                }

                setSystemHealth(healthData)
                setLastUpdateTime(new Date())
            }
        } catch (error) {
            console.error("Error processing system health data:", error)
        }
    }, [isPaused])

    // WebSocket 訂閱效果
    useEffect(() => {
        if (!getSystemHealthStream) {
            setError('WebSocket service unavailable')
            setIsLoading(false)
            return
        }

        console.log("Initializing System Health WebSocket subscription...")
        setError(null)
        setIsLoading(true)

        // 訂閱系統健康串流
        const subscription = getSystemHealthStream().subscribe({
            next: (data: any) => {
                processSystemHealthData(data)
                setConnectionStatus('connected')
                setIsLoading(false)
            },
            error: (error: any) => {
                console.error("System health WebSocket error:", error)
                setConnectionStatus('error')
                setError('WebSocket connection failed')
                setIsLoading(false)
            }
        })

        // 清理函數：只取消訂閱，不關閉 WebSocket 連線
        return () => {
            console.log("Unsubscribing from System Health stream")
            subscription.unsubscribe()
        }
    }, [getSystemHealthStream, processSystemHealthData])

    // 暫停/恢復處理
    useEffect(() => {
        if (!isPaused && systemHealth) {
            // 恢復時更新時間戳
            setLastUpdateTime(new Date())
        }
    }, [isPaused, systemHealth])

    // 連接狀態初始化（可選，用於顯示連接狀態）
    useEffect(() => {
        if (!getSystemHealthStream) {
            console.warn("WebSocket streams not available")
            setConnectionStatus('error')
            setIsLoading(false)
            return
        }

        console.log("WebSocket service available")
        setConnectionStatus('connecting')
    }, [getSystemHealthStream])

    // 計算系統健康指標
    const healthMetrics = useMemo((): HealthMetric[] => {
        if (!systemHealth) return []

        const cpuUsage = systemHealth.cpu_details?.cpu_usage || 0
        const memoryUsage = systemHealth.memory_usage.usage_percent
        const temperature = systemHealth.temperature

        const metrics: HealthMetric[] = [
            {
                name: 'CPU Usage',
                value: cpuUsage,
                unit: '%',
                status: getStatusFromValue(cpuUsage, 'cpu'),
                icon: faMicrochip,
                color: 'bg-blue-500',
                bgColor: 'bg-blue-50',
                description: `Processor Load`
            },
            {
                name: 'Memory Usage',
                value: memoryUsage,
                unit: '%',
                status: getStatusFromValue(memoryUsage, 'memory'),
                icon: faMemory,
                color: 'bg-green-500',
                bgColor: 'bg-green-50',
                description: `Used ${formatBytes(systemHealth.memory_usage.used)} / ${formatBytes(systemHealth.memory_usage.total)}`
            },
            {
                name: 'System Temperature',
                value: temperature,
                unit: '°C',
                status: getStatusFromValue(temperature, 'temperature'),
                icon: faThermometerHalf,
                color: 'bg-orange-500',
                bgColor: 'bg-orange-50',
                description: 'Hardware Temperature'
            }
        ]

        return metrics
    }, [systemHealth])

    // 處理卡片點擊
    const handleCardClick = useCallback((metricName: string) => {
        let type: 'cpu' | 'memory' | 'temperature' | null = null

        switch (metricName) {
            case 'CPU Usage':
                type = 'cpu'
                break
            case 'Memory Usage':
                type = 'memory'
                break
            case 'System Temperature':
                type = 'temperature'
                break
            default:
                return
        }

        setModalState({isOpen: true, type})
    }, [])

    // 關閉模態框
    const closeModal = useCallback(() => {
        setModalState({isOpen: false, type: null})
    }, [])

    // 快速導航項目
    const quickNavigation = [
        {
            title: 'Network Traffic Monitoring',
            description: 'View IPv4/IPv6 traffic statistics and trend analysis',
            icon: faChartLine,
            color: 'bg-blue-500',
            href: '/dashboard',
            badge: 'Real-time'
        },
        {
            title: 'Statistics Analysis',
            description: 'In-depth analysis of network usage patterns and performance metrics',
            icon: faDatabase,
            color: 'bg-green-500',
            href: '/statistics',
            badge: 'Analysis'
        },
        {
            title: 'Access Control',
            description: 'Manage IP whitelists, blacklists, and firewall rules',
            icon: faLock,
            color: 'bg-red-500',
            href: '/access-control',
            badge: 'Security'
        },
        // {
        //   title: 'AI Threat Detection',
        //   description: 'Intelligent detection of abnormal behavior and potential network threats',
        //   icon: faRobot,
        //   color: 'bg-purple-500',
        //   href: '/ai-detection',
        //   badge: 'AI'
        // }
    ]

    if (isLoading && !systemHealth) {
        return (
            <>
                <Head>
                    <title>Dashboard - NetGuardia</title>
                </Head>
                <Layout>
                    <div className="flex items-center justify-center w-full h-full min-h-[calc(100vh-4rem)]">
                        <div className="flex flex-col items-center space-y-4">
                            <LoadingSpinner/>
                        </div>
                    </div>
                </Layout>
            </>
        )
    }

    return (
        <>
            <Head>
                <title>NetGuardia - Network Security Monitoring System</title>
                <meta name="description" content="NetGuardia - Network Security Monitoring System"/>
                <meta name="viewport" content="width=device-width, initial-scale=1"/>
                <link rel="icon" href="/favicon.ico"/>
            </Head>

            <Layout>
                {/* 系統詳情模態框 */}
                <SystemDetailModal
                    isOpen={modalState.isOpen}
                    onClose={closeModal}
                    systemHealth={systemHealth}
                    type={modalState.type!}
                />

                {/* 歡迎標題 */}
                <motion.div
                    initial={{opacity: 0, y: -20}}
                    animate={{opacity: 1, y: 0}}
                    className="mb-8"
                >
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div>
                            <h1 className={`text-3xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                Welcome to NetGuardia
                            </h1>
                            <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                                Network Security Monitoring System - Protecting your network environment with
                                comprehensive security monitoring
                            </p>
                        </div>

                        {/* 系統狀態控制 */}
                        <div className="flex items-center space-x-4">
                            {/* 系統狀態指示器 */}
                            <div className={`rounded-lg shadow-md px-3 py-1 flex items-center ${
                                isDark ? 'bg-gray-600' : 'bg-white'
                            }`}>
                                <div className={`w-3 h-3 rounded-full mr-2 ${
                                    error ? 'bg-red-500' :
                                        systemHealth ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'
                                }`}></div>
                                <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {error ? 'System Error' : systemHealth ? 'System Normal' : 'Connecting'}
                </span>
                            </div>

                            {/* 暫停/恢復按鈕 */}
                            <button
                                onClick={() => setIsPaused(!isPaused)}
                                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                                    isPaused
                                        ? "bg-green-100 text-green-700 hover:bg-green-200"
                                        : "bg-orange-100 text-orange-700 hover:bg-orange-200"
                                }`}
                            >
                                <FontAwesomeIcon icon={isPaused ? faPlay : faPause} className="mr-1"/>
                                {isPaused ? "Resume" : "Pause"}
                            </button>

                            {/* 手動更新按鈕 */}
                            <button
                                onClick={() => window.location.reload()}
                                className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors flex items-center space-x-1"
                            >
                                <FontAwesomeIcon icon={faRefresh} className="text-xs"/>
                                <span>Update</span>
                            </button>

                            {/* 最後更新時間 */}
                            {lastUpdateTime && (
                                <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                    Last Updated: {lastUpdateTime.toLocaleTimeString()}
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>

                {/* 錯誤狀態 */}
                {error && (
                    <motion.div
                        initial={{opacity: 0, y: 20}}
                        animate={{opacity: 1, y: 0}}
                        className={`border rounded-lg p-4 mb-6 ${
                            isDark
                                ? 'bg-red-900/20 border-red-800 text-red-300'
                                : 'bg-red-50 border-red-200 text-red-700'
                        }`}
                    >
                        <div className="flex items-center">
                            <FontAwesomeIcon icon={faExclamationTriangle} className="text-red-500 mr-2"/>
                            <span className="font-medium">System status loading failed: {error}</span>
                        </div>
                    </motion.div>
                )}

                {/* 系統健康狀態卡片 - 可點擊 */}
                {healthMetrics.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        {healthMetrics.map((metric, index) => (
                            <HealthCard
                                key={metric.name}
                                metric={metric}
                                index={index}
                                systemHealth={systemHealth}
                                onClick={() => handleCardClick(metric.name)}
                            />
                        ))}
                    </div>
                )}

                {/* 系統詳細資訊 */}
                {systemHealth && (
                    <div className="space-y-8 mb-8">
                        {/* 系統資訊 */}
                        <motion.div
                            initial={{opacity: 0, y: 20}}
                            animate={{opacity: 1, y: 0}}
                            transition={{delay: 1.0}}
                            className={`rounded-lg shadow-md p-6 ${isDark ? 'bg-gray-600' : 'bg-white'}`}
                        >
                            <h3 className={`text-lg font-semibold mb-4 flex items-center ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
                                <FontAwesomeIcon icon={faServer} className="mr-2 text-blue-600"/>
                                System Information
                            </h3>

                            <div className="max-h-60 overflow-y-auto pr-2 space-y-4">
                                {/* 基本系統資訊 */}
                                <div className="space-y-3">
                                    <div className="flex justify-between">
                                        <span className={isDark ? 'text-white' : 'text-gray-600'}>System</span>
                                        <span
                                            className={`font-medium ${isDark ? 'text-white' : 'text-gray-600'}`}>{systemHealth.system_info.os_name} {systemHealth.system_info.os_version} ({systemHealth.system_info.architecture}, {systemHealth.system_info.kernel_version})</span>
                                    </div>
                                    {systemHealth.cpu_details && (
                                        <>
                                            <div className="flex justify-between">
                                                <span
                                                    className={isDark ? 'text-white' : 'text-gray-600'}>CPU Model</span>
                                                <span
                                                    className={`font-medium ${isDark ? 'text-white' : 'text-gray-600'}`}>{systemHealth.cpu_details.cpu_brand}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span
                                                    className={isDark ? 'text-white' : 'text-gray-600'}>CPU Cores</span>
                                                <span
                                                    className={`font-medium ${isDark ? 'text-white' : 'text-gray-600'}`}>{systemHealth.cpu_details.core_count}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span
                                                    className={isDark ? 'text-white' : 'text-gray-600'}>CPU Frequency</span>
                                                <span
                                                    className={`font-medium ${isDark ? 'text-white' : 'text-gray-600'}`}>{systemHealth.cpu_details.cpu_frequency} MHz</span>
                                            </div>
                                        </>
                                    )}
                                    <div className="flex justify-between">
                                        <span className={isDark ? 'text-white' : 'text-gray-600'}>RAM Size</span>
                                        <span
                                            className={`font-medium ${isDark ? 'text-white' : 'text-gray-600'}`}>{formatBytes(systemHealth.memory_usage.total)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className={isDark ? 'text-white' : 'text-gray-600'}>System Time</span>
                                        <span
                                            className={`font-medium ${isDark ? 'text-white' : 'text-gray-600'}`}>{new Date(systemHealth.timestamp * 1000).toLocaleString('zh-TW')}</span>
                                    </div>
                                    {systemHealth.uptime_seconds && (
                                        <div className="flex justify-between">
                                            <span className={isDark ? 'text-white' : 'text-gray-600'}>Uptime</span>
                                            <span
                                                className={`font-medium ${isDark ? 'text-white' : 'text-gray-600'}`}>{formatUptimeFromSeconds(systemHealth.uptime_seconds)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}

                {/* 網路狀態和系統負載 */}
                {systemHealth && (
                    <div className="space-y-8 mb-8">
                        {/* 網路狀態 - 占滿整行 */}
                        <NetworkStats networkStats={systemHealth.network_stats}/>
                    </div>
                )}

                {/* 快速導航 */}
                <motion.div
                    initial={{opacity: 0, y: 20}}
                    animate={{opacity: 1, y: 0}}
                    transition={{delay: 1.2}}
                    className="mb-8"
                >
                    <h2 className={`text-2xl font-bold mb-6 ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>Quick
                        Navigation</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {quickNavigation.map((item, index) => (
                            <motion.div
                                key={item.title}
                                initial={{opacity: 0, y: 20}}
                                animate={{opacity: 1, y: 0}}
                                transition={{delay: 1.3 + index * 0.1}}
                                whileHover={{y: -4}}
                                className="group"
                            >
                                <Link href={item.href}>
                                    <div
                                        className={`rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300 border-l-4 border-transparent hover:border-blue-500 ${
                                            isDark ? 'bg-gray-600' : 'bg-white'
                                        }`}>
                                        <div className="flex items-start justify-between mb-4">
                                            <div
                                                className={`${item.color} p-3 rounded-lg group-hover:scale-110 transition-transform duration-300`}>
                                                <FontAwesomeIcon icon={item.icon} className="text-white text-xl"/>
                                            </div>
                                            <span
                                                className="px-2 py-1 bg-blue-100 text-blue-600 text-xs font-medium rounded-full">
                        {item.badge}
                      </span>
                                        </div>
                                        <h3 className={`text-lg font-semibold mb-2 group-hover:text-blue-600 transition-colors ${
                                            isDark ? 'text-gray-300' : 'text-gray-900'
                                        }`}>
                                            {item.title}
                                        </h3>
                                        <p className={`text-sm leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                            {item.description}
                                        </p>
                                    </div>
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            </Layout>
        </>
    )
}