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

const SystemDetailModal: React.FC<SystemDetailModalProps> = ({ isOpen, onClose, systemHealth, type }) => {
    const {actualTheme} = useTheme()
    const isDark = actualTheme === 'dark'

    if (!isOpen || !systemHealth) return null

    const SectionHeader: React.FC<{ icon: any; iconColor: string; label: string }> = ({ icon, iconColor, label }) => (
        <div className="flex items-center gap-2 mb-3">
            <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 ${isDark ? 'bg-slate-700/60' : 'bg-slate-100'}`}>
                <FontAwesomeIcon icon={icon} className={`text-[10px] ${iconColor}`} />
            </div>
            <span className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{label}</span>
        </div>
    )

    const sectionCls = isDark ? 'bg-[#131929] border-slate-700/40' : 'bg-slate-50 border-slate-200'
    const innerCellCls = isDark ? 'bg-[#0e1e2c] border-slate-700/40' : 'bg-white border-slate-200'
    const labelCls = isDark ? 'text-slate-400' : 'text-slate-500'
    const valueCls = isDark ? 'text-slate-200' : 'text-slate-800'

    const getModalContent = () => {
        switch (type) {
            case 'cpu':
                return {
                    title: 'CPU Details',
                    icon: faMicrochip,
                    color: 'text-[#4ab5cc]',
                    content: (
                        <div className="space-y-4">
                            {/* Processor Information */}
                            <div className={`rounded-xl border p-4 ${sectionCls}`}>
                                <SectionHeader icon={faMicrochip} iconColor="text-[#4ab5cc]" label="Processor Information" />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {[
                                        { label: 'Processor model', value: systemHealth.cpu_details?.cpu_brand },
                                        { label: 'Number of cores', value: `${systemHealth.cpu_details?.core_count} cores` },
                                        { label: 'Base frequency', value: `${systemHealth.cpu_details?.cpu_frequency} MHz` },
                                        { label: 'Overall usage', value: `${systemHealth.cpu_details?.cpu_usage.toFixed(1)}%` },
                                    ].map(({ label, value }) => (
                                        <div key={label} className={`rounded-lg border p-3 ${innerCellCls}`}>
                                            <div className={`text-xs mb-0.5 ${labelCls}`}>{label}</div>
                                            <div className={`text-sm font-medium ${valueCls}`}>{value}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Usage per core */}
                            {systemHealth.cpu_details?.cores && (
                                <div className={`rounded-xl border p-4 ${sectionCls}`}>
                                    <SectionHeader icon={faTachometerAlt} iconColor="text-[#4ab5cc]" label="Usage per core" />
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                        {systemHealth.cpu_details.cores.map((core) => {
                                            const usage = core.usage_percent
                                            const status = getStatusFromValue(usage, 'cpu')
                                            const statusColors = getStatusColor(status)
                                            return (
                                                <div key={core.core_id} className={`rounded-lg border p-3 ${innerCellCls}`}>
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className={`text-xs font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Core {core.core_id}</span>
                                                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${statusColors.bgColor} ${statusColors.color}`}>
                                                            {usage.toFixed(1)}%
                                                        </span>
                                                    </div>
                                                    <div className={`w-full rounded-full h-1.5 mb-1.5 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
                                                        <div
                                                            className={`h-1.5 rounded-full transition-all duration-300 ${status === 'good' ? 'bg-emerald-500' : status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'}`}
                                                            style={{ width: `${Math.min(usage, 100)}%` }}
                                                        />
                                                    </div>
                                                    <div className={`text-xs text-center ${labelCls}`}>{core.frequency} MHz</div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* System load average */}
                            {systemHealth.load_average ? (
                                <div className={`rounded-xl border p-4 ${sectionCls}`}>
                                    <SectionHeader icon={faWeight} iconColor="text-amber-400" label="System load average" />
                                    <div className="grid grid-cols-3 gap-3">
                                        {[
                                            { label: '1 minute',   value: systemHealth.load_average.one_minute    },
                                            { label: '5 minutes',  value: systemHealth.load_average.five_minute   },
                                            { label: '15 minutes', value: systemHealth.load_average.fifteen_minute },
                                        ].map((load) => {
                                            const status = getStatusFromValue(load.value, 'load')
                                            const statusColors = getStatusColor(status)
                                            return (
                                                <div key={load.label} className={`rounded-lg border p-3 text-center ${innerCellCls}`}>
                                                    <div className={`text-xs mb-1 ${labelCls}`}>{load.label}</div>
                                                    <div className={`text-lg font-bold mb-2 ${valueCls}`}>{load.value.toFixed(2)}</div>
                                                    <div className={`w-full rounded-full h-1.5 mb-2 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
                                                        <div
                                                            className={`h-1.5 rounded-full transition-all duration-300 ${status === 'good' ? 'bg-emerald-500' : status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'}`}
                                                            style={{ width: `${Math.min(load.value * 20, 100)}%` }}
                                                        />
                                                    </div>
                                                    <div className={`text-xs px-2 py-0.5 rounded-full ${statusColors.bgColor} ${statusColors.color}`}>
                                                        {status === 'good' ? 'Normal' : status === 'warning' ? 'Warning' : 'Overloaded'}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            ) : (
                                <div className={`rounded-xl border p-4 text-center py-8 ${sectionCls}`}>
                                    <FontAwesomeIcon icon={faExclamationCircle} className={`text-3xl mb-2 ${labelCls}`} />
                                    <p className={`text-sm ${labelCls}`}>System load data unavailable</p>
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
                    color: 'text-emerald-400',
                    content: (
                        <div className="space-y-4">
                            {/* Physical Memory */}
                            <div className={`rounded-xl border p-4 ${sectionCls}`}>
                                <SectionHeader icon={faMemory} iconColor="text-emerald-400" label="Physical Memory (RAM)" />
                                <div className="flex items-center justify-center mb-4">
                                    <div className="relative w-28 h-28">
                                        <svg className="w-28 h-28 transform -rotate-90" viewBox="0 0 100 100">
                                            <circle cx="50" cy="50" r="45" stroke={isDark ? '#334155' : '#e2e8f0'} strokeWidth="8" fill="none" />
                                            <circle
                                                cx="50" cy="50" r="45"
                                                stroke={memoryPercent < 60 ? '#10b981' : memoryPercent < 85 ? '#f59e0b' : '#ef4444'}
                                                strokeWidth="8" fill="none" strokeLinecap="round"
                                                strokeDasharray={`${(memoryPercent / 100) * 283} 283`}
                                                className="transition-all duration-500"
                                            />
                                        </svg>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="text-center">
                                                <div className={`text-lg font-bold ${valueCls}`}>{memoryPercent.toFixed(1)}%</div>
                                                <div className={`text-xs ${labelCls}`}>Used</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { label: 'Total Capacity', value: formatBytes(memoryTotal),    color: valueCls },
                                        { label: 'Used',           value: formatBytes(memoryUsed),     color: valueCls },
                                        { label: 'Available',      value: formatBytes(memoryAvailable), color: valueCls },
                                        { label: 'Usage',          value: `${memoryPercent.toFixed(1)}%`,
                                          color: memoryPercent < 60 ? 'text-emerald-400' : memoryPercent < 85 ? 'text-yellow-400' : 'text-red-400' },
                                    ].map(({ label, value, color }) => (
                                        <div key={label} className={`rounded-lg border p-3 ${innerCellCls}`}>
                                            <div className={`text-xs mb-0.5 ${labelCls}`}>{label}</div>
                                            <div className={`text-sm font-semibold ${color}`}>{value}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Swap */}
                            {swapTotal > 0 && (
                                <div className={`rounded-xl border p-4 ${sectionCls}`}>
                                    <SectionHeader icon={faHdd} iconColor="text-[#4ab5cc]" label="Swap" />
                                    <div className="flex justify-between text-xs mb-1.5">
                                        <span className={labelCls}>Usage</span>
                                        <span className={`font-medium ${valueCls}`}>{swapPercent.toFixed(1)}%</span>
                                    </div>
                                    <div className={`w-full rounded-full h-2 mb-3 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
                                        <div
                                            className={`h-2 rounded-full transition-all duration-300 ${swapPercent < 30 ? 'bg-emerald-500' : swapPercent < 70 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                            style={{ width: `${swapPercent}%` }}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className={`rounded-lg border p-3 ${innerCellCls}`}>
                                            <div className={`text-xs mb-0.5 ${labelCls}`}>Total Capacity</div>
                                            <div className={`text-sm font-semibold ${valueCls}`}>{formatBytes(swapTotal)}</div>
                                        </div>
                                        <div className={`rounded-lg border p-3 ${innerCellCls}`}>
                                            <div className={`text-xs mb-0.5 ${labelCls}`}>Used</div>
                                            <div className={`text-sm font-semibold ${valueCls}`}>{formatBytes(swapUsed)}</div>
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
                    color: 'text-orange-400',
                    content: (
                        <div className="space-y-4">
                            {/* Current temperature */}
                            <div className={`rounded-xl border p-4 ${sectionCls}`}>
                                <SectionHeader icon={faThermometerHalf} iconColor="text-orange-400" label="Current system temperature" />
                                <div className="text-center mb-5">
                                    <div className={`text-5xl font-bold mb-2 ${valueCls}`}>
                                        {temp.toFixed(1)}<span className="text-3xl">°C</span>
                                    </div>
                                    <div className={`inline-flex items-center gap-2 text-sm px-4 py-1.5 rounded-full ${tempColors.bgColor} ${tempColors.color}`}>
                                        <FontAwesomeIcon icon={tempStatus === 'good' ? faCheckCircle : tempStatus === 'warning' ? faExclamationTriangle : faFire} className="text-xs" />
                                        <span className="font-medium">
                                            {tempStatus === 'good' ? 'Normal temperature' : tempStatus === 'warning' ? 'High temperature' : 'Too high a temperature'}
                                        </span>
                                    </div>
                                </div>
                                <div className="relative">
                                    <div className={`relative h-7 rounded-full overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
                                        <div className="absolute inset-0 opacity-25" style={{ background: 'linear-gradient(to right, #3b82f6 0%, #10b981 20%, #84cc16 40%, #fbbf24 60%, #f97316 80%, #ef4444 100%)' }} />
                                        <div
                                            className="absolute inset-y-0 left-0 transition-all duration-500 rounded-full"
                                            style={{
                                                width: `${tempPercent}%`,
                                                background: tempStatus === 'good'
                                                    ? 'linear-gradient(to right, #3b82f6, #10b981)'
                                                    : tempStatus === 'warning'
                                                        ? 'linear-gradient(to right, #10b981, #fbbf24, #f97316)'
                                                        : 'linear-gradient(to right, #fbbf24, #f97316, #ef4444)',
                                            }}
                                        />
                                    </div>
                                    <div className="flex justify-between mt-1.5 px-0.5">
                                        {[0, 25, 45, 70, 100].map((value) => (
                                            <div key={value} className="flex flex-col items-center">
                                                <span className={`text-xs ${labelCls}`}>{value}°</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Legend */}
                            <div className={`rounded-xl border p-4 ${sectionCls}`}>
                                <div className="grid grid-cols-3 gap-3 text-center">
                                    {[
                                        { gradient: 'from-blue-500 to-emerald-500', textColor: 'text-emerald-400', label: 'Normal',  range: '0–45°C'   },
                                        { gradient: 'from-yellow-400 to-orange-500', textColor: 'text-yellow-400', label: 'Warn',    range: '45–70°C'  },
                                        { gradient: 'from-orange-500 to-red-500',   textColor: 'text-red-400',    label: 'Danger',  range: '70–100°C' },
                                    ].map(({ gradient, textColor, label, range }) => (
                                        <div key={label} className={`rounded-lg border p-3 ${innerCellCls}`}>
                                            <div className="flex justify-center mb-2">
                                                <div className={`w-8 h-1.5 rounded-full bg-gradient-to-r ${gradient}`} />
                                            </div>
                                            <div className={`text-sm font-semibold mb-0.5 ${textColor}`}>{label}</div>
                                            <div className={`text-xs ${labelCls}`}>{range}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )
                }
            default:
                return {title: '', icon: faServer, color: 'text-slate-400', content: <div>No Data</div>}
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
                    className={`rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden ${isDark ? 'bg-[#0b111c] border border-slate-700/40' : 'bg-white border border-slate-200'}`}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className={`sticky top-0 border-b px-5 py-3.5 rounded-t-xl flex items-center justify-between ${isDark ? 'bg-[#0e1e2c] border-slate-700/40' : 'bg-white border-slate-200'}`}>
                        <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? 'bg-[#4ab5cc]/15' : 'bg-slate-100'}`}>
                                <FontAwesomeIcon icon={modalContent.icon} className={`text-sm ${modalContent.color}`}/>
                            </div>
                            <h2 className={`text-base font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                                {modalContent.title}
                            </h2>
                        </div>
                        <button
                            onClick={onClose}
                            className={`p-1.5 rounded-lg transition-colors ${isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/40' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
                        >
                            <FontAwesomeIcon icon={faTimes}/>
                        </button>
                    </div>

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
    const isDark = actualTheme === 'dark'
    const isClickable = ['CPU Usage', 'Memory Usage', 'System Temperature'].includes(metric.name)

    const pct = typeof metric.value === 'number'
        ? Math.min(Math.max(metric.value, 0), 100)
        : 0

    const barColor = metric.status === 'good' ? '#22c55e'
        : metric.status === 'warning' ? '#f59e0b'
        : '#ef4444'

    const statusLabel = metric.status === 'good' ? 'Normal'
        : metric.status === 'warning' ? 'Warning'
        : 'Critical'

    return (
        <motion.div
            initial={{opacity: 0, y: 16}}
            animate={{opacity: 1, y: 0}}
            transition={{delay: index * 0.08}}
            onClick={isClickable ? onClick : undefined}
            className={`rounded-xl border p-5 transition-all duration-200 ${
                isClickable ? 'cursor-pointer hover:shadow-lg hover:-translate-y-0.5' : ''
            } ${isDark ? 'bg-[#0e1e2c] border-slate-700/40' : 'bg-white border-slate-200'}`}
        >
            {/* Top row: icon + name + status badge */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: 'rgba(74,181,204,0.12)' }}>
                        <FontAwesomeIcon icon={metric.icon} className="text-sm" style={{ color: '#4ab5cc' }} />
                    </div>
                    <span className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {metric.name}
                    </span>
                </div>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full`}
                    style={{ color: barColor, background: `${barColor}18` }}>
                    {statusLabel}
                </span>
            </div>

            {/* Value */}
            <div className={`text-3xl font-bold tabular-nums mb-3 ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
                {typeof metric.value === 'number'
                    ? metric.value.toFixed(1)
                    : metric.value}
                <span className={`text-base font-normal ml-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    {metric.unit}
                </span>
            </div>

            {/* Progress bar */}
            <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-slate-700/60' : 'bg-slate-100'}`}>
                <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, background: barColor }}
                />
            </div>

            {/* Sub label */}
            {metric.description && (
                <p className={`text-xs mt-2 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                    {metric.description}
                </p>
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
                className="bg-white rounded-xl border border-slate-200 p-6"
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
            className="bg-white rounded-xl border border-slate-200 p-6"
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
        {key: 'ingress', name: 'Ingress Network', icon: faArrowDown, color: 'text-[#4ab5cc]'},
        {key: 'egress', name: 'Egress Network', icon: faArrowUp, color: 'text-green-600'},
    ]

    return (
        <motion.div
            initial={{opacity: 0, y: 20}}
            animate={{opacity: 1, y: 0}}
            transition={{delay: 0.7}}
            className={`rounded-xl border p-5 h-full flex flex-col ${isDark ? 'bg-[#0e1e2c] border-slate-700/40' : 'bg-white border-slate-200'}`}
        >
            <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-lg bg-[#4ab5cc]/15 flex items-center justify-center flex-shrink-0">
                    <FontAwesomeIcon icon={faWifi} className="text-[#4ab5cc] text-sm"/>
                </div>
                <h3 className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                    Network Interface Status
                </h3>
            </div>

            <div className="flex-1 flex flex-col gap-4">
                {interfaces.map((iface, index) => {
                    const stats = networkStats[iface.key as keyof typeof networkStats]
                    const hasErrors = stats.errors_received > 0 || stats.errors_transmitted > 0

                    return (
                        <div
                            key={iface.key}
                            className={`flex-1 rounded-lg border p-4 ${isDark ? 'border-slate-700/40 bg-[#131929]' : 'border-slate-100 bg-slate-50'}`}
                        >
                            <div className="flex items-center justify-between mb-2.5">
                                <div className="flex items-center gap-2">
                                    <FontAwesomeIcon icon={iface.icon} className={`text-sm ${iface.color}`}/>
                                    <span className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                        {iface.name}
                                    </span>
                                    <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                        ({stats.interface})
                                    </span>
                                </div>
                                {hasErrors
                                    ? <FontAwesomeIcon icon={faExclamationTriangle} className="text-amber-500 text-xs"/>
                                    : <FontAwesomeIcon icon={faCheckCircle} className="text-green-500 text-xs"/>
                                }
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                    <div className={`text-xs mb-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Received</div>
                                    <div className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{formatBytes(stats.bytes_received)}</div>
                                    <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{stats.packets_received.toLocaleString()} packets</div>
                                </div>
                                <div>
                                    <div className={`text-xs mb-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Transmitted</div>
                                    <div className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{formatBytes(stats.bytes_transmitted)}</div>
                                    <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{stats.packets_transmitted.toLocaleString()} packets</div>
                                </div>
                            </div>

                            {hasErrors && (
                                <div className={`mt-2 pt-2 border-t text-xs text-amber-500 ${isDark ? 'border-slate-700/40' : 'border-slate-200'}`}>
                                    Errors: RX {stats.errors_received} · TX {stats.errors_transmitted}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </motion.div>
    )
}

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

    const [modalState, setModalState] = useState<{
        isOpen: boolean
        type: 'cpu' | 'memory' | 'temperature' | null
    }>({
        isOpen: false,
        type: null
    })

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date())
        }, 1000)

        return () => clearInterval(timer)
    }, [])

    const processSystemHealthData = useCallback((rawData: any) => {
        if (isPaused) return

        try {
            const parsedData = typeof rawData === 'object' ? rawData : JSON.parse(rawData)

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

    useEffect(() => {
        if (!getSystemHealthStream) {
            setError('WebSocket service unavailable')
            setIsLoading(false)
            return
        }

        console.log("Initializing System Health WebSocket subscription...")
        setError(null)
        setIsLoading(true)

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

        return () => {
            console.log("Unsubscribing from System Health stream")
            subscription.unsubscribe()
        }
    }, [getSystemHealthStream, processSystemHealthData])

    useEffect(() => {
        if (!isPaused && systemHealth) {
            setLastUpdateTime(new Date())
        }
    }, [isPaused, systemHealth])

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
                color: 'bg-[#4ab5cc]',
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

    const closeModal = useCallback(() => {
        setModalState({isOpen: false, type: null})
    }, [])

    const quickNavigation = [
        {
            title: 'Network Traffic Monitoring',
            description: 'View IPv4/IPv6 traffic statistics and trend analysis',
            icon: faChartLine,
            color: 'bg-[#4ab5cc]',
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
    ]

    if (isLoading && !systemHealth) {
        return (
            <>
                <Head>
                    <title>Dashboard - Mantis</title>
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
                <title>Mantis - Network Security Monitoring System</title>
                <meta name="description" content="Mantis - Network Security Monitoring System"/>
                <meta name="viewport" content="width=device-width, initial-scale=1"/>
                <link rel="icon" href="/favicon.ico"/>
            </Head>

            <Layout>
                <SystemDetailModal
                    isOpen={modalState.isOpen}
                    onClose={closeModal}
                    systemHealth={systemHealth}
                    type={modalState.type!}
                />

                {/* Compact status bar */}
                <motion.div
                    initial={{opacity: 0, y: -10}}
                    animate={{opacity: 1, y: 0}}
                    className={`flex items-center justify-between mb-6 px-4 py-2.5 rounded-xl border ${
                        isDark ? 'bg-[#0e1e2c] border-slate-700/40' : 'bg-white border-slate-200'
                    }`}
                >
                    <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${
                            error ? 'bg-red-500' : systemHealth ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'
                        }`}/>
                        <span className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                            {error ? 'Connection Error' : systemHealth ? 'All Systems Operational' : 'Connecting…'}
                        </span>
                        {lastUpdateTime && (
                            <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                · Updated {lastUpdateTime.toLocaleTimeString()}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsPaused(!isPaused)}
                            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                                isPaused
                                    ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20'
                                    : 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20'
                            }`}
                        >
                            <FontAwesomeIcon icon={isPaused ? faPlay : faPause} className="mr-1.5"/>
                            {isPaused ? 'Resume' : 'Pause'}
                        </button>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-3 py-1 bg-[#4ab5cc]/10 text-[#4ab5cc] hover:bg-[#4ab5cc]/20 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
                        >
                            <FontAwesomeIcon icon={faRefresh} className="text-xs"/>
                            Refresh
                        </button>
                    </div>
                </motion.div>

                {error && (
                    <motion.div
                        initial={{opacity: 0, y: 10}}
                        animate={{opacity: 1, y: 0}}
                        className={`border rounded-xl p-4 mb-6 flex items-center gap-3 ${
                            isDark
                                ? 'bg-red-900/20 border-red-800/50 text-red-300'
                                : 'bg-red-50 border-red-200 text-red-700'
                        }`}
                    >
                        <FontAwesomeIcon icon={faExclamationTriangle} className="text-red-500 flex-shrink-0"/>
                        <span className="text-sm font-medium">System status loading failed: {error}</span>
                    </motion.div>
                )}

                {/* Health metric cards */}
                {healthMetrics.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
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

                {/* System Info + Network Stats side by side */}
                {systemHealth && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6 items-stretch">
                        {/* System Information */}
                        <motion.div
                            initial={{opacity: 0, y: 20}}
                            animate={{opacity: 1, y: 0}}
                            transition={{delay: 0.4}}
                            className={`rounded-xl border p-5 ${isDark ? 'bg-[#0e1e2c] border-slate-700/40' : 'bg-white border-slate-200'}`}
                        >
                            <div className="flex items-center gap-2.5 mb-4">
                                <div className="w-8 h-8 rounded-lg bg-[#4ab5cc]/15 flex items-center justify-center flex-shrink-0">
                                    <FontAwesomeIcon icon={faServer} className="text-[#4ab5cc] text-sm"/>
                                </div>
                                <h3 className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                                    System Information
                                </h3>
                            </div>
                            <div className="space-y-2.5">
                                {[
                                    { label: 'Platform', value: `${systemHealth.system_info.os_name} ${systemHealth.system_info.os_version}` },
                                    { label: 'Architecture', value: `${systemHealth.system_info.architecture}` },
                                    { label: 'Kernel', value: systemHealth.system_info.kernel_version },
                                    ...(systemHealth.cpu_details ? [
                                        { label: 'CPU', value: systemHealth.cpu_details.cpu_brand },
                                        { label: 'Cores', value: `${systemHealth.cpu_details.core_count} cores · ${systemHealth.cpu_details.cpu_frequency} MHz` },
                                    ] : []),
                                    { label: 'Memory', value: formatBytes(systemHealth.memory_usage.total) },
                                    { label: 'System Time', value: new Date(systemHealth.timestamp * 1000).toLocaleString('zh-TW') },
                                    ...(systemHealth.uptime_seconds ? [{ label: 'Uptime', value: formatUptimeFromSeconds(systemHealth.uptime_seconds) }] : []),
                                ].map(({ label, value }) => (
                                    <div key={label} className={`flex items-baseline justify-between gap-4 text-sm py-1 border-b last:border-b-0 ${
                                        isDark ? 'border-slate-700/30' : 'border-slate-100'
                                    }`}>
                                        <span className={`flex-shrink-0 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{label}</span>
                                        <span className={`text-right font-medium truncate ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{value}</span>
                                    </div>
                                ))}
                            </div>
                        </motion.div>

                        {/* Network Stats */}
                        <motion.div
                            initial={{opacity: 0, y: 20}}
                            animate={{opacity: 1, y: 0}}
                            transition={{delay: 0.5}}
                            className="h-full"
                        >
                            <NetworkStats networkStats={systemHealth.network_stats}/>
                        </motion.div>
                    </div>
                )}
            </Layout>
        </>
    )
}