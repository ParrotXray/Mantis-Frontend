import React, { useContext, useState, useEffect, useCallback, useRef } from 'react'
import Head from 'next/head'
import { motion } from 'framer-motion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
    faNetworkWired, 
    faGlobe, 
    faArrowUp, 
    faArrowDown,
    faServer,
    faChartLine,
    faPause,
    faPlay,
    faClock
} from '@fortawesome/free-solid-svg-icons'
import { WebsocketContext } from '../providers/WebSocketProvider'
import Layout from '../components/Layout'
import LoadingSpinner from '../components/LoadingSpinner'
import { combineLatest } from 'rxjs'
import { map, catchError } from 'rxjs/operators'
import { of } from 'rxjs'
import ReactEcharts from 'echarts-for-react'
import echarts from 'echarts'

// 更新频率選項 (毫秒)
const UPDATE_INTERVALS = [
    { label: "即時", value: 0 },
    { label: "0.5秒", value: 500 },
    { label: "1秒", value: 1000 },
    { label: "2秒", value: 2000 },
    { label: "3秒", value: 3000 },
    { label: "5秒", value: 5000 },
    { label: "10秒", value: 10000 }
];

// 智能格式化位元組大小（返回数值和单位）
const formatBytesWithUnit = (bytes: number): {value: number, unit: string} => {
    const units = ["B", "KB", "MB", "GB", "TB"]
    if (bytes < 1024) return {value: bytes, unit: "B"}
    
    let i = 0
    let value = bytes
    
    while (value >= 1024 && i < units.length - 1) {
        value /= 1024
        i++
    }
    
    return {value: parseFloat(value.toFixed(2)), unit: units[i]}
}

// 格式化位元組大小（用于显示）
const formatBytes = (bytes: number): string => {
    const {value, unit} = formatBytesWithUnit(bytes)
    return `${value} ${unit}`
}

// 获取最适合的图表单位（更保守的切换策略）
const getBestChartUnit = (dataArray: TrendDataPoint[]): {unit: string, divisor: number} => {
    if (dataArray.length === 0) return {unit: "B", divisor: 1}
    
    // 找到数组中的最大值（原始字节）
    const maxBytes = Math.max(...dataArray.map(point => point.value))
    
    // 更保守的单位切换策略
    if (maxBytes < 10 * 1024) { // 小于 10KB 使用 B
        return {unit: "B", divisor: 1}
    } else if (maxBytes < 10 * 1024 * 1024) { // 小于 10MB 使用 KB
        return {unit: "KB", divisor: 1024}
    } else if (maxBytes < 10 * 1024 * 1024 * 1024) { // 小于 10GB 使用 MB
        return {unit: "MB", divisor: 1024 * 1024}
    } else {
        return {unit: "GB", divisor: 1024 * 1024 * 1024}
    }
}

// 解析流量資料
const parseFlowData = (rawData: any): any => {
    try {
        if (typeof rawData === 'object' && rawData !== null) {
            return rawData
        }
        return JSON.parse(rawData)
    } catch (error) {
        console.error("Error parsing flow data:", error)
        return {}
    }
}

// 趨勢資料點類型
interface TrendDataPoint {
    time: string
    value: number
}

// 趨勢資料結構
interface TrendData {
    ingressSource: TrendDataPoint[]
    egressSource: TrendDataPoint[]
}

// 流量資料結構
interface TrafficData {
    ipv4: {
        ingressSource: number
        egressSource: number
    }
    ipv6: {
        ingressSource: number
        egressSource: number
    }
}

// 更新控制面板组件
interface UpdateControlProps {
    updateInterval: number;
    setUpdateInterval: (value: number) => void;
    isPaused: boolean;
    setIsPaused: (value: boolean) => void;
    lastUpdateTime: Date | null;
    connectionStatus: string;
}

const UpdateControl: React.FC<UpdateControlProps> = ({ 
    updateInterval, 
    setUpdateInterval, 
    isPaused, 
    setIsPaused, 
    lastUpdateTime,
    connectionStatus
}) => {
    return (
        <div className="flex items-center space-x-4">
            {/* 更新頻率控制 */}
            <div className="flex items-center space-x-2">
                <FontAwesomeIcon icon={faClock} className="text-gray-500" />
                <label className="text-sm text-gray-600">更新間隔:</label>
                <select 
                    value={updateInterval}
                    onChange={(e) => setUpdateInterval(Number(e.target.value))}
                    className="text-sm border border-gray-300 rounded px-2 py-1 bg-white focus:outline-none focus:border-blue-500"
                >
                    {UPDATE_INTERVALS.map(interval => (
                        <option key={interval.value} value={interval.value}>
                            {interval.label}
                        </option>
                    ))}
                </select>
            </div>
            
            {/* 暫停/恢復按鈕 */}
            <button
                onClick={() => setIsPaused(!isPaused)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors flex items-center space-x-1 ${
                    isPaused 
                        ? "bg-green-100 text-green-700 hover:bg-green-200" 
                        : "bg-orange-100 text-orange-700 hover:bg-orange-200"
                }`}
            >
                <FontAwesomeIcon icon={isPaused ? faPlay : faPause} className="text-xs" />
                <span>{isPaused ? "恢復" : "暫停"}</span>
            </button>
            
            {/* 連接狀態和最後更新時間 */}
            <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${
                        connectionStatus === 'connected' && !isPaused ? 'bg-green-500 animate-pulse' : 
                        connectionStatus === 'connected' && isPaused ? 'bg-yellow-500' :
                        connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'
                    }`}></div>
                    <span className={`text-sm font-medium ${
                        connectionStatus === 'connected' && !isPaused ? 'text-green-600' : 
                        connectionStatus === 'connected' && isPaused ? 'text-yellow-600' :
                        connectionStatus === 'connecting' ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                        {isPaused ? '已暫停' :
                         connectionStatus === 'connected' ? `每 ${updateInterval === 0 ? '即時' : updateInterval/1000 + 's'} 更新` : 
                         connectionStatus === 'connecting' ? '連線中...' : '連線失敗'}
                    </span>
                </div>
                
                {lastUpdateTime && !isPaused && (
                    <div className="text-xs text-gray-500">
                        最後更新: {lastUpdateTime.toLocaleTimeString()}
                    </div>
                )}
            </div>
        </div>
    );
};

// ECharts 組件 - 改用 ReactEcharts
interface EChartsComponentProps {
    data: TrendData
    title: string
    type: 'ipv4' | 'ipv6'
    isPaused: boolean
}

const EChartsComponent: React.FC<EChartsComponentProps> = ({ data, title, type, isPaused }) => {
    const chartRef = useRef<ReactEcharts>(null)
    
    // 获取图表配置
    const getOption = useCallback(() => {
        if (!data.ingressSource.length || !data.egressSource.length) {
            return {}
        }

        // 验证資料完整性
        const validateData = (dataArray: TrendDataPoint[]) => {
            return dataArray.every(point => 
                point && 
                typeof point.value === 'number' && 
                !isNaN(point.value) && 
                point.time
            )
        }

        if (!validateData(data.ingressSource) || !validateData(data.egressSource)) {
            console.warn(`Invalid chart data detected for ${type}, skipping update`)
            return {}
        }

        const colors = type === 'ipv4' 
            ? ['#3B82F6', '#EF4444'] // 藍色和紅色
            : ['#10B981', '#F59E0B'] // 綠色和黃色

        // 确保时间轴資料一致性，并根据資料动态调整单位
        const timeLabels = data.ingressSource.map(point => point.time)
        
        // 合并所有資料来确定最佳单位
        const allData = [...data.ingressSource, ...data.egressSource]
        const {unit, divisor} = getBestChartUnit(allData)
        
        // 根据最佳单位转换資料
        const ingressValues = data.ingressSource.map(point => 
            typeof point.value === 'number' && !isNaN(point.value) ? 
            Math.max(0, point.value / divisor) : 0
        )
        const egressValues = data.egressSource.map(point => 
            typeof point.value === 'number' && !isNaN(point.value) ? 
            Math.max(0, point.value / divisor) : 0
        )

        // 创建线性渐变函数，支持不同的ECharts版本
        const createLinearGradient = (color: string, opacity1: string, opacity2: string) => {
            // 尝试使用echarts.graphic.LinearGradient，如果失败则使用fallback
            try {
                if (echarts && echarts.graphic && echarts.graphic.LinearGradient) {
                    return new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: color + opacity1 },
                        { offset: 1, color: color + opacity2 }
                    ])
                }
            } catch (error) {
                console.warn('Failed to create LinearGradient, using fallback color')
            }
            
            // Fallback to solid color with opacity
            return color + '80' // 50% opacity
        }

        return {
            // 关键修复：专门针对滑动窗口資料的动画配置
            animation: true,
            animationDuration: 0, // 入場動畫關閉
            animationEasing: 'linear' as const,
            animationDurationUpdate: 200, // 更新動畫極短
            animationEasingUpdate: 'linear' as const,
            animationDelay: 0,
            animationDelayUpdate: 0, // 無延迟更新
                        
            title: {
                text: title + (isPaused ? ' (已暫停)' : ''),
                left: 'center',
                textStyle: {
                    fontSize: 16,
                    fontWeight: 'bold',
                    color: isPaused ? '#F59E0B' : '#374151'
                }
            },
            tooltip: {
                trigger: 'axis',
                axisPointer: {
                    type: 'cross',
                    label: {
                        backgroundColor: '#6a7985'
                    }
                },
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                textStyle: {
                    color: '#fff'
                },
                formatter: function(params: any) {
                    let result = `時間: ${params[0].name}<br/>`
                    let totalTraffic = 0
                    params.forEach((param: any) => {
                        const value = typeof param.value === 'number' ? param.value : 0
                        result += `${param.seriesName}: ${value.toFixed(2)} ${unit}<br/>`
                        totalTraffic += value
                    })
                    result += `<b>總流量: ${totalTraffic.toFixed(2)} ${unit}</b>`
                    return result
                }
            },
            legend: {
                data: [
                    `${type.toUpperCase()} 來源流量`,
                    `${type.toUpperCase()} 目標流量`
                ],
                top: 30,
                textStyle: {
                    color: '#6B7280'
                }
            },
            grid: {
                left: '3%',
                right: '4%',
                bottom: '3%',
                top: '60px',
                containLabel: true
            },
            xAxis: {
                type: 'category',
                boundaryGap: false,
                data: timeLabels,
                axisLabel: {
                    color: '#6B7280',
                    rotate: 45,
                    interval: Math.max(1, Math.floor(timeLabels.length / 6))
                },
                axisLine: {
                    lineStyle: {
                        color: '#E5E7EB'
                    }
                }
            },
            yAxis: {
                type: 'value',
                name: `流量 (${unit})`,
                nameTextStyle: {
                    color: '#6B7280'
                },
                axisLabel: {
                    color: '#6B7280',
                    formatter: `{value} ${unit}`
                },
                axisLine: {
                    lineStyle: {
                        color: '#E5E7EB'
                    }
                },
                splitLine: {
                    lineStyle: {
                        color: '#F3F4F6'
                    }
                },
                min: 0
            },
            series: [
                {
                    name: `${type.toUpperCase()} 來源流量`,
                    type: 'line',
                    stack: 'Total',
                    smooth: false,
                    symbol: 'none',
                    lineStyle: {
                        width: 0
                    },
                    areaStyle: {
                        color: createLinearGradient(colors[0], 'CC', '88')
                    },
                    data: ingressValues.map((value, index) => ({
                        name: `point_${index}`,
                        value: value
                    })),
                    emphasis: {
                        focus: 'series'
                    },
                    animation: false
                },
                {
                    name: `${type.toUpperCase()} 目標流量`,
                    type: 'line',
                    stack: 'Total',
                    smooth: false,
                    symbol: 'none',
                    lineStyle: {
                        width: 0
                    },
                    areaStyle: {
                        color: createLinearGradient(colors[1], 'CC', '88')
                    },
                    data: egressValues.map((value, index) => ({
                        name: `point_${index}`,
                        value: value
                    })),
                    emphasis: {
                        focus: 'series'
                    },
                    animation: false
                }
            ]
        }
    }, [data, title, type, isPaused])

    // 处理图表事件
    const onChartReady = useCallback((chart: any) => {
        // 图表准备就绪时的回调
        console.log(`${type} chart ready`)
    }, [type])

    const onEvents = {
        'click': (params: any) => {
            console.log('Chart clicked:', params)
        }
    }

    return (
        <ReactEcharts
            ref={chartRef}
            option={getOption()}
            style={{ width: '100%', height: '320px' }}
            onChartReady={onChartReady}
            onEvents={onEvents}
            notMerge={false}
            lazyUpdate={false}
            theme="default"
        />
    )
}

const Dashboard: React.FC = () => {
    const { getIPv4FlowStream, getIPv6FlowStream } = useContext(WebsocketContext)
    const [isLoading, setIsLoading] = useState(true)
    const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting')
    const [networkData, setNetworkData] = useState<any>({})
    
    // 更新频率控制和暂停功能
    const [updateInterval, setUpdateInterval] = useState<number>(2000) // 默认2秒，可调整
    const [isPaused, setIsPaused] = useState<boolean>(false)
    const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null)
    
    // API 时间范围控制
    const [apiTimeRange, setApiTimeRange] = useState<string>("1min") // 默认1分钟

    // 用于存储最新資料的 refs
    const latestDataRef = useRef<any>({})
    const lastUpdateRef = useRef<number>(0)
    const updateIntervalRef = useRef<number>(updateInterval)
    const isPausedRef = useRef<boolean>(isPaused)

    // 同步 refs 与 state
    useEffect(() => {
        updateIntervalRef.current = updateInterval
    }, [updateInterval])

    useEffect(() => {
        isPausedRef.current = isPaused
    }, [isPaused])

    // IPv4 和 IPv6 趨勢資料
    const [trendDataIPv4, setTrendDataIPv4] = useState<TrendData>({
        ingressSource: [],
        egressSource: []
    })

    const [trendDataIPv6, setTrendDataIPv6] = useState<TrendData>({
        ingressSource: [],
        egressSource: []
    })

    // 當前流量資料
    const [trafficData, setTrafficData] = useState<TrafficData>({
        ipv4: {
            ingressSource: 0,
            egressSource: 0
        },
        ipv6: {
            ingressSource: 0,
            egressSource: 0
        }
    })

    // 改进的計算吞吐量函数
    const calculateThroughput = useCallback((
        ipVersion: string, 
        trafficType: string, 
        direction: string
    ): number => {
        try {
            const key = `${trafficType}_${direction}`
            const connections = latestDataRef.current[key]?.[ipVersion] || {}
            let totalBytes = 0

            for (const connection in connections) {
                const connectionData = connections[connection]
                if (connectionData && typeof connectionData.bytes === "number" && connectionData.bytes >= 0) {
                    totalBytes += connectionData.bytes
                }
            }
            
            return Math.max(0, totalBytes)
        } catch (error) {
            console.error(`Error calculating throughput for ${ipVersion} ${trafficType} ${direction}:`, error)
            return 0
        }
    }, [])

    // 改进的更新圖表資料函数
    const updateChartData = useCallback(() => {
        if (isPausedRef.current) return; // 暂停时不更新图表資料

        // 計算各種流量
        const ipv4IngressSource = calculateThroughput("ipv4", "ingress", "source")
        const ipv4EgressSource = calculateThroughput("ipv4", "egress", "source")
        const ipv6IngressSource = calculateThroughput("ipv6", "ingress", "source")
        const ipv6EgressSource = calculateThroughput("ipv6", "egress", "source")

        // 更新流量資料
        setTrafficData({
            ipv4: {
                ingressSource: ipv4IngressSource,
                egressSource: ipv4EgressSource
            },
            ipv6: {
                ingressSource: ipv6IngressSource,
                egressSource: ipv6EgressSource
            }
        })

        const currentTime = new Date().toLocaleTimeString('zh-TW', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit' 
        })

        // 统一的資料更新函数，使用字节存储原始資料
        const updateTrendArray = (prevArray: TrendDataPoint[], newValue: number) => {
            const maxPoints = 16
            const newPoint = {
                time: currentTime,
                value: Math.max(0, newValue) // 存储原始字节数，不转换
            }
            
            // 如果数组长度小于最大值，直接追加
            if (prevArray.length < maxPoints) {
                return [...prevArray, newPoint]
            }
            
            // 如果已满，移除第一个元素，添加新元素
            return [...prevArray.slice(1), newPoint]
        }

        // 同时更新 IPv4 和 IPv6，确保完全同步
        setTrendDataIPv4(prev => ({
            ingressSource: updateTrendArray(prev.ingressSource, ipv4IngressSource),
            egressSource: updateTrendArray(prev.egressSource, ipv4EgressSource)
        }))

        setTrendDataIPv6(prev => ({
            ingressSource: updateTrendArray(prev.ingressSource, ipv6IngressSource),
            egressSource: updateTrendArray(prev.egressSource, ipv6EgressSource)
        }))

        setLastUpdateTime(new Date())
    }, [calculateThroughput])

    // 处理 WebSocket 資料的核心函数
    const processWebSocketData = useCallback((results: any[]) => {
        const validResults = results.filter(result => result !== null)
        if (validResults.length === 0) return

        const newData: any = {}
        validResults.forEach(result => {
            const { key, protocol, data } = result
            if (!newData[key]) {
                newData[key] = {}
            }
            newData[key][protocol] = data
        })

        if (Object.keys(newData).length > 0) {
            // 更新到 ref 以便其他函数访问最新資料
            latestDataRef.current = { ...latestDataRef.current, ...newData }
            
            // 更新显示的网络資料
            setNetworkData(prevData => {
                const updatedData = { ...prevData }
                Object.entries(newData).forEach(([key, protocolData]: [string, any]) => {
                    if (!updatedData[key]) {
                        updatedData[key] = {}
                    }
                    Object.entries(protocolData).forEach(([protocol, data]) => {
                        updatedData[key][protocol] = data
                    })
                })
                return updatedData
            })

            // 根据当前状态决定是否立即更新图表
            const now = Date.now()
            const currentUpdateInterval = updateIntervalRef.current
            const currentIsPaused = isPausedRef.current
            
            const shouldUpdate = !currentIsPaused && 
                (currentUpdateInterval === 0 || (now - lastUpdateRef.current) >= currentUpdateInterval)
            
            if (shouldUpdate) {
                updateChartData()
                lastUpdateRef.current = now
            }
        }
    }, [updateChartData])

    // 处理暂停/恢复切换
    useEffect(() => {
        if (!isPaused && Object.keys(latestDataRef.current).length > 0) {
            // 恢复时立即更新一次
            updateChartData()
            lastUpdateRef.current = Date.now()
        }
    }, [isPaused, updateChartData])

    // 定时更新控制器 - 仅在非即時模式且未暂停时工作
    useEffect(() => {
        if (updateInterval === 0 || isPaused) {
            return
        }

        const intervalId = setInterval(() => {
            const now = Date.now()
            if (Object.keys(latestDataRef.current).length > 0 && 
                (now - lastUpdateRef.current) >= updateInterval &&
                !isPausedRef.current) {
                updateChartData()
                lastUpdateRef.current = now
            }
        }, Math.min(updateInterval / 4, 1000)) // 检查频率为更新间隔的1/4，最少1秒

        return () => clearInterval(intervalId)
    }, [updateInterval, isPaused, updateChartData])

    // WebSocket 連線效果 - 只在初始化时建立一次连接
    useEffect(() => {
        if (!getIPv4FlowStream || !getIPv6FlowStream) {
            console.warn("WebSocket streams not available")
            setConnectionStatus('error')
            setIsLoading(false)
            return
        }

        console.log("Initializing WebSocket connections (one-time setup)...")
        setConnectionStatus('connecting')

        // 清理訂閱
        return () => {
            console.log("Component unmounting - cleaning up WebSocket subscriptions")
        }
    }, [getIPv4FlowStream, getIPv6FlowStream]) // 只依赖WebSocket函数

    // 单独的資料订阅 effect - 根据时间范围获取資料
    useEffect(() => {
        if (!getIPv4FlowStream || !getIPv6FlowStream || connectionStatus === 'error') {
            return
        }

        console.log(`Fetching data with ${apiTimeRange} time range...`)

        // 清空现有資料，准备新的时间范围資料
        setTrendDataIPv4({ ingressSource: [], egressSource: [] })
        setTrendDataIPv6({ ingressSource: [], egressSource: [] })
        setNetworkData({})
        latestDataRef.current = {}

        // 流量配置
        const flowConfigs = [
            { protocol: "ipv4", direction: "ingress", flowDirection: "source" },
            { protocol: "ipv4", direction: "egress", flowDirection: "source" },
            { protocol: "ipv6", direction: "ingress", flowDirection: "source" },
            { protocol: "ipv6", direction: "egress", flowDirection: "source" }
        ]

        // 創建流量串流 - 使用选定的时间范围
        const streams = flowConfigs.map(config => {
            const { protocol, direction, flowDirection } = config
            const getStream = protocol === "ipv4" ? getIPv4FlowStream : getIPv6FlowStream

            return getStream(direction, flowDirection, apiTimeRange).pipe(
                map((rawData: any) => {
                    const parsedData = parseFlowData(rawData)
                    return {
                        key: `${direction}_${flowDirection}`,
                        protocol,
                        data: parsedData
                    }
                }),
                catchError(error => {
                    console.error(`Error in ${protocol} ${direction} ${flowDirection} stream:`, error)
                    return of(null)
                })
            )
        })

        // 訂閱合併的流量資料
        const subscription = combineLatest(streams).subscribe({
            next: (results) => {
                processWebSocketData(results)
                setConnectionStatus('connected')
                setIsLoading(false)
            },
            error: (error) => {
                console.error("WebSocket subscription error:", error)
                setConnectionStatus('error')
                setIsLoading(false)
            }
        })

        // 清理訂閱
        return () => {
            console.log(`Cleaning up ${apiTimeRange} data subscription`)
            subscription.unsubscribe()
        }
    }, [getIPv4FlowStream, getIPv6FlowStream, apiTimeRange, connectionStatus, processWebSocketData]) // 依赖时间范围

    // 統計卡片資料
    const statsCards = [
        {
            title: 'IPv4 來源流量',
            value: formatBytes(trafficData.ipv4.ingressSource),
            icon: faGlobe,
            color: 'from-blue-500 to-blue-600',
            iconColor: 'text-blue-600',
            bgColor: 'bg-blue-50'
        },
        {
            title: 'IPv4 目標流量',
            value: formatBytes(trafficData.ipv4.egressSource),
            icon: faNetworkWired,
            color: 'from-red-500 to-red-600',
            iconColor: 'text-red-600',
            bgColor: 'bg-red-50'
        },
        {
            title: 'IPv6 來源流量',
            value: formatBytes(trafficData.ipv6.ingressSource),
            icon: faGlobe,
            color: 'from-green-500 to-green-600',
            iconColor: 'text-green-600',
            bgColor: 'bg-green-50'
        },
        {
            title: 'IPv6 目標流量',
            value: formatBytes(trafficData.ipv6.egressSource),
            icon: faNetworkWired,
            color: 'from-yellow-500 to-yellow-600',
            iconColor: 'text-yellow-600',
            bgColor: 'bg-yellow-50'
        }
    ]

    if (isLoading) {
        return (
            <>
                <Head>
                    <title>Dashboard - NetGuardia</title>
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

    if (connectionStatus === 'error') {
        return (
            <>
                <Head>
                    <title>Dashboard - NetGuardia</title>
                </Head>
                <Layout>
                    <div className="flex items-center justify-center min-h-[60vh]">
                        <div className="text-center">
                            <div className="text-red-500 text-6xl mb-4">
                                <FontAwesomeIcon icon={faServer} />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-800 mb-2">連線錯誤</h2>
                            <p className="text-gray-600 mb-4">無法建立 WebSocket 連線，請檢查網路狀態</p>
                            <button 
                                onClick={() => window.location.reload()} 
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                重新載入
                            </button>
                        </div>
                    </div>
                </Layout>
            </>
        )
    }

    return (
        <>
            <Head>
                <title>Dashboard - NetGuardia</title>
                <meta name="description" content="NetGuardia 網路流量監控儀表板" />
            </Head>

            <Layout>
                {/* 頁面標題 */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">
                                網路流量監控
                            </h1>
                            <p className="text-gray-600">
                                即時監控 IPv4 和 IPv6 網路流量狀態
                            </p>
                        </div>
                        
                        {/* 控制區域 - 統一在同一排 */}
                        <div className="flex items-center space-x-6">
                            {/* API 時間範圍控制 */}
                            <div className="flex items-center space-x-2">
                                <FontAwesomeIcon icon={faClock} className="text-gray-500" />
                                <label className="text-sm text-gray-600">時間範圍:</label>
                                <select 
                                    value={apiTimeRange}
                                    onChange={(e) => setApiTimeRange(e.target.value)}
                                    className="text-sm border border-gray-300 rounded px-3 py-1 bg-white focus:outline-none focus:border-blue-500"
                                >
                                    <option value="1min">1 分鐘</option>
                                    <option value="10min">10 分鐘</option>
                                    <option value="1hour">1 小時</option>
                                </select>
                            </div>
                            
                            {/* 更新控制面板 */}
                            <UpdateControl
                                updateInterval={updateInterval}
                                setUpdateInterval={setUpdateInterval}
                                isPaused={isPaused}
                                setIsPaused={setIsPaused}
                                lastUpdateTime={lastUpdateTime}
                                connectionStatus={connectionStatus}
                            />
                        </div>
                    </div>
                </motion.div>

                {/* 統計卡片 */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {statsCards.map((card, index) => (
                        <motion.div
                            key={card.title}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className={`bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow duration-300 ${
                                isPaused ? 'opacity-75' : ''
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600 mb-1">
                                        {card.title}
                                    </p>
                                    <p className="text-2xl font-bold text-gray-900">
                                        {card.value}
                                    </p>
                                    {isPaused && (
                                        <p className="text-xs text-yellow-600 mt-1 flex items-center space-x-1">
                                            <FontAwesomeIcon icon={faPause} className="text-xs" />
                                            <span>已暫停</span>
                                        </p>
                                    )}
                                </div>
                                <div className={`${card.bgColor} p-3 rounded-lg`}>
                                    <FontAwesomeIcon 
                                        icon={card.icon} 
                                        className={`${card.iconColor} text-xl`}
                                    />
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* 圖表區域 */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    {/* IPv4 圖表 */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 }}
                        className={`bg-white rounded-lg shadow-md p-6 ${
                            isPaused ? 'opacity-75' : ''
                        }`}
                    >
                        <div className="flex items-center mb-4">
                            <FontAwesomeIcon icon={faChartLine} className="text-blue-600 mr-2" />
                            <h2 className="text-xl font-semibold text-gray-900">IPv4 網路使用趨勢</h2>
                            {isPaused && (
                                <div className="ml-auto flex items-center space-x-1 text-yellow-600">
                                    <FontAwesomeIcon icon={faPause} className="text-sm" />
                                    <span className="text-sm">已暫停</span>
                                </div>
                            )}
                        </div>
                        <EChartsComponent 
                            data={trendDataIPv4} 
                            title="IPv4 網路流量趨勢" 
                            type="ipv4"
                            isPaused={isPaused}
                        />
                    </motion.div>

                    {/* IPv6 圖表 */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.6 }}
                        className={`bg-white rounded-lg shadow-md p-6 ${
                            isPaused ? 'opacity-75' : ''
                        }`}
                    >
                        <div className="flex items-center mb-4">
                            <FontAwesomeIcon icon={faChartLine} className="text-green-600 mr-2" />
                            <h2 className="text-xl font-semibold text-gray-900">IPv6 網路使用趨勢</h2>
                            {isPaused && (
                                <div className="ml-auto flex items-center space-x-1 text-yellow-600">
                                    <FontAwesomeIcon icon={faPause} className="text-sm" />
                                    <span className="text-sm">已暫停</span>
                                </div>
                            )}
                        </div>
                        <EChartsComponent 
                            data={trendDataIPv6} 
                            title="IPv6 網路流量趨勢" 
                            type="ipv6"
                            isPaused={isPaused}
                        />
                    </motion.div>
                </div>
            </Layout>
        </>
    )
}

export default Dashboard