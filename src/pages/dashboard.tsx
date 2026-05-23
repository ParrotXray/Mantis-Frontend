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
    faClock,
    faShieldAlt
} from '@fortawesome/free-solid-svg-icons'
import { WebsocketContext } from '../providers/WebSocketProvider'
import Layout from '../components/Layout'
import LoadingSpinner from '../components/LoadingSpinner'
import { combineLatest } from 'rxjs'
import { map, catchError } from 'rxjs/operators'
import { of } from 'rxjs'
import ReactEcharts from 'echarts-for-react'
import * as echarts from 'echarts'
import {
    TrendData,
    TrendDataPoint,
    TrafficData,
    UpdateControlProps,
    EChartsComponentProps
} from '../types/DashboardTypes'
import { useTheme } from "../providers/ThemeProvider"

const UPDATE_INTERVALS = [
    { label: "immediate", value: 0 },
    { label: "0.5s", value: 500 },
    { label: "1s", value: 1000 },
    { label: "2s", value: 2000 },
    { label: "3s", value: 3000 },
    { label: "5s", value: 5000 },
    { label: "10s", value: 10000 }
];

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

const formatBytes = (bytes: number): string => {
    const {value, unit} = formatBytesWithUnit(bytes)
    return `${value} ${unit}`
}

const getBestChartUnit = (dataArray: TrendDataPoint[]): {unit: string, divisor: number} => {
    if (dataArray.length === 0) return {unit: "B", divisor: 1}

    const maxBytes = Math.max(...dataArray.map(point => point.value))

    if (maxBytes < 10 * 1024) {
        return {unit: "B", divisor: 1}
    } else if (maxBytes < 10 * 1024 * 1024) {
        return {unit: "KB", divisor: 1024}
    } else if (maxBytes < 10 * 1024 * 1024 * 1024) {
        return {unit: "MB", divisor: 1024 * 1024}
    } else {
        return {unit: "GB", divisor: 1024 * 1024 * 1024}
    }
}

const getProtocolName = (protocol: number): string => {
    switch (protocol) {
        case 1: return 'ICMP'
        case 6: return 'TCP'
        case 17: return 'UDP'
        case 47: return 'GRE'
        case 50: return 'ESP'
        case 51: return 'AH'
        case 58: return 'ICMPv6'
        default: return `Proto ${protocol}`
    }
}

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

const UpdateControl: React.FC<UpdateControlProps> = ({
                                                         updateInterval,
                                                         setUpdateInterval,
                                                         isPaused,
                                                         setIsPaused,
                                                         lastUpdateTime,
                                                         connectionStatus
                                                     }) => {
    const { actualTheme } = useTheme()
    const isDark = actualTheme === 'dark'

    return (
        <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
                <FontAwesomeIcon icon={faClock} className={isDark ? 'text-gray-400' : 'text-gray-500'} />
                <label className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Update interval:</label>
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

            <button
                onClick={() => setIsPaused(!isPaused)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors flex items-center space-x-1 ${
                    isPaused
                        ? "bg-green-100 text-green-700 hover:bg-green-200"
                        : "bg-orange-100 text-orange-700 hover:bg-orange-200"
                }`}
            >
                <FontAwesomeIcon icon={isPaused ? faPlay : faPause} className="text-xs" />
                <span>{isPaused ? "resume" : "pause"}</span>
            </button>

            <div className="flex items-center space-x-4">
                {lastUpdateTime && (
                    <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        Last update: {lastUpdateTime.toLocaleTimeString()}
                    </div>
                )}
            </div>
        </div>
    );
};

const EChartsComponent: React.FC<EChartsComponentProps> = ({ data, type, isPaused }) => {
    const chartRef = useRef<ReactEcharts>(null)
    const { actualTheme } = useTheme()

    const isDark = actualTheme === 'dark'

    const getOption = useCallback(() => {
        if (!data.ingressSource.length || !data.egressSource.length) {
            return {}
        }

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
            ? ['#3B82F6', '#EF4444']
            : ['#10B981', '#F59E0B']

        const timeLabels = data.ingressSource.map(point => point.time)

        const allData = [...data.ingressSource, ...data.egressSource]
        const {unit, divisor} = getBestChartUnit(allData)

        const ingressValues = data.ingressSource.map(point =>
            typeof point.value === 'number' && !isNaN(point.value) ?
                Math.max(0, point.value / divisor) : 0
        )
        const egressValues = data.egressSource.map(point =>
            typeof point.value === 'number' && !isNaN(point.value) ?
                Math.max(0, point.value / divisor) : 0
        )

        return {
            animation: false,

            title: {
                text: '',
                left: 'center',
                textStyle: {
                    fontSize: 16,
                    fontWeight: 'bold',
                    color: isPaused ? '#F59E0B' : (isDark ? '#E5E7EB' : '#374151')
                }
            },
            tooltip: {
                trigger: 'axis',
                axisPointer: {
                    type: 'cross',
                    label: {
                        backgroundColor: isDark ? '#4B5563' : '#6a7985'
                    }
                },
                backgroundColor: isDark ? 'rgba(31, 41, 55, 0.95)' : 'rgba(0, 0, 0, 0.8)',
                borderColor: isDark ? '#4B5563' : 'transparent',
                textStyle: {
                    color: isDark ? '#F3F4F6' : '#fff'
                },
                formatter: function(params: any) {
                    let result = `Time: ${params[0].name}<br/>`
                    let totalTraffic = 0
                    params.forEach((param: any) => {
                        const value = typeof param.value === 'number' ? param.value : 0
                        result += `${param.seriesName}: ${value.toFixed(2)} ${unit}<br/>`
                        totalTraffic += value
                    })
                    result += `<b>Total traffic: ${totalTraffic.toFixed(2)} ${unit}</b>`
                    return result
                }
            },
            legend: {
                data: [
                    `${type.toUpperCase()} Ingress Traffic`,
                    `${type.toUpperCase()} Egress Traffic`
                ],
                top: 30,
                textStyle: {
                    color: isDark ? '#D1D5DB' : '#6B7280'
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
                    color: isDark ? '#9CA3AF' : '#6B7280',
                    rotate: 45,
                    interval: Math.max(1, Math.floor(timeLabels.length / 6))
                },
                axisLine: {
                    lineStyle: {
                        color: isDark ? '#F3F4F6' : '#858997',
                    }
                },
                splitLine: {
                    show: false
                }
            },
            yAxis: {
                type: 'value',
                name: `Traffic (${unit})`,
                nameTextStyle: {
                    color: isDark ? '#9CA3AF' : '#6B7280'
                },
                axisLabel: {
                    color: isDark ? '#9CA3AF' : '#6B7280',
                    formatter: `{value} ${unit}`
                },
                axisLine: {
                    lineStyle: {
                        color: isDark ? '#4B5563' : '#E5E7EB'
                    }
                },
                splitLine: {
                    lineStyle: {
                        color: isDark ? '#F3F4F6' : '#858997'
                    }
                },
                min: 0
            },
            series: [
                {
                    name: `${type.toUpperCase()} Ingress Traffic`,
                    type: 'line',
                    smooth: true,
                    smoothMonotone: 'x',
                    symbol: 'circle',
                    symbolSize: 4,
                    showSymbol: true,
                    itemStyle: { color: colors[0] },
                    lineStyle: { width: 2.5, color: colors[0], cap: 'round', join: 'round' },
                    areaStyle: {
                        color: {
                            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
                            colorStops: [
                                { offset: 0, color: colors[0] + '80' },
                                { offset: 1, color: colors[0] + '20' }
                            ]
                        }
                    },
                    data: ingressValues,
                    emphasis: {
                        focus: 'series',
                        lineStyle: { width: 3 },
                        itemStyle: { shadowBlur: 10, shadowColor: colors[0] + '80' }
                    },
                    animation: false
                },
                {
                    name: `${type.toUpperCase()} Egress Traffic`,
                    type: 'line',
                    smooth: true,
                    smoothMonotone: 'x',
                    symbol: 'circle',
                    symbolSize: 4,
                    showSymbol: true,
                    itemStyle: { color: colors[1] },
                    lineStyle: { width: 2.5, color: colors[1], cap: 'round', join: 'round' },
                    areaStyle: {
                        color: {
                            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
                            colorStops: [
                                { offset: 0, color: colors[1] + '80' },
                                { offset: 1, color: colors[1] + '20' }
                            ]
                        }
                    },
                    data: egressValues,
                    emphasis: {
                        focus: 'series',
                        lineStyle: { width: 3 },
                        itemStyle: { shadowBlur: 10, shadowColor: colors[1] + '80' }
                    },
                    animation: false
                }
            ]
        }
    }, [data, type, isPaused, isDark])

    const onChartReady = useCallback((chart: any) => {
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
            lazyUpdate={true}
            theme="default"
        />
    )
}

const DONUT_COLORS: Array<{ start: string; end: string }> = [
    { start: '#EF4444', end: '#DC2626' },
    { start: '#F59E0B', end: '#D97706' },
    { start: '#3B82F6', end: '#2563EB' },
    { start: '#10B981', end: '#059669' },
    { start: '#8B5CF6', end: '#7C3AED' },
    { start: '#EC4899', end: '#DB2777' },
    { start: '#F97316', end: '#EA580C' },
    { start: '#06B6D4', end: '#0891B2' },
    { start: '#84CC16', end: '#65A30D' },
    { start: '#6366F1', end: '#4F46E5' }
]

const PROTOCOL_COLORS: Array<{ start: string; end: string }> = [
    { start: '#3B82F6', end: '#2563EB' },
    { start: '#10B981', end: '#059669' },
    { start: '#F59E0B', end: '#D97706' },
    { start: '#8B5CF6', end: '#7C3AED' },
    { start: '#EC4899', end: '#DB2777' },
    { start: '#06B6D4', end: '#0891B2' },
    { start: '#EF4444', end: '#DC2626' },
    { start: '#F97316', end: '#EA580C' },
    { start: '#84CC16', end: '#65A30D' },
    { start: '#6366F1', end: '#4F46E5' }
]

const DonutChart: React.FC<{
    data: Record<string, number>
    colors?: Array<{ start: string; end: string }>
    totalLabel?: string
}> = ({ data, colors = DONUT_COLORS, totalLabel = 'Total' }) => {
    const { actualTheme } = useTheme()
    const isDark = actualTheme === 'dark'

    const chartData = Object.entries(data)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)

    const totalAttacks = chartData.reduce((sum, item) => sum + item.value, 0)

    const getOption = () => {
        if (chartData.length === 0) {
            return {
                graphic: {
                    elements: [{
                        type: 'group',
                        left: 'center',
                        top: 'center',
                        children: [
                            {
                                type: 'text',
                                style: {
                                    text: 'Waiting for Data...',
                                    fontSize: 14,
                                    fill: isDark ? '#6B7280' : '#9CA3AF',
                                    textAlign: 'center'
                                }
                            }
                        ]
                    }]
                }
            }
        }

        return {
            graphic: { elements: [] },
            tooltip: {
                trigger: 'item',
                backgroundColor: isDark ? 'rgba(31, 41, 55, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                borderColor: isDark ? '#4B5563' : '#E5E7EB',
                borderWidth: 1,
                textStyle: {
                    color: isDark ? '#F3F4F6' : '#1F2937'
                },
                formatter: (params: any) => {
                    const colorDot = `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${params.color};margin-right:6px;"></span>`
                    return `${colorDot}<b>${params.name}</b><br/>Count: ${params.value}<br/>Proportion: ${params.percent}%`
                }
            },
            series: [
                {
                    type: 'pie',
                    radius: ['50%', '78%'],
                    center: ['50%', '50%'],
                    silent: true,
                    avoidLabelOverlap: true,
                    itemStyle: {
                        borderRadius: 6,
                        borderColor: isDark ? '#4B5563' : '#fff',
                        borderWidth: 3
                    },
                    label: {
                        show: true,
                        position: 'center',
                        formatter: () => `{total|${totalAttacks}}\n{label|${totalLabel}}`,
                        rich: {
                            total: {
                                fontSize: 28,
                                fontWeight: 'bold',
                                color: isDark ? '#F3F4F6' : '#1F2937',
                                lineHeight: 36
                            },
                            label: {
                                fontSize: 13,
                                color: isDark ? '#9CA3AF' : '#6B7280',
                                lineHeight: 22
                            }
                        }
                    },
                    labelLine: {
                        show: false
                    },
                    data: chartData.map((item, index) => {
                        const colorPair = colors[index % colors.length]
                        return {
                            ...item,
                            itemStyle: {
                                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                                    { offset: 0, color: colorPair.start },
                                    { offset: 1, color: colorPair.end }
                                ])
                            }
                        }
                    }),
                    animationType: 'scale',
                    animationEasing: 'elasticOut',
                    animationDelay: () => Math.random() * 200
                }
            ]
        }
    }

    return (
        <div>
            <ReactEcharts
                option={getOption()}
                style={{ width: '100%', height: '280px' }}
                notMerge={true}
                lazyUpdate={true}
            />
            {chartData.length > 0 && (
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-2 px-2">
                    {chartData.map((item, index) => {
                        const colorPair = colors[index % colors.length]
                        const percent = totalAttacks > 0 ? ((item.value / totalAttacks) * 100).toFixed(1) : '0'
                        return (
                            <div key={item.name} className="flex items-center justify-between text-sm">
                                <div className="flex items-center min-w-0">
                                    <span
                                        className="w-3 h-3 rounded-full flex-shrink-0 mr-2"
                                        style={{ background: colorPair.start }}
                                    />
                                    <span className={`truncate ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                        {item.name}
                                    </span>
                                </div>
                                <div className="flex items-center space-x-2 ml-2 flex-shrink-0">
                                    <span className={`font-semibold ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>
                                        {item.value}
                                    </span>
                                    <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                        {percent}%
                                    </span>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

const Dashboard: React.FC = () => {
    const { actualTheme } = useTheme()
    const { getIPv4FlowStream, getIPv6FlowStream, getDetectionAlertStream } = useContext(WebsocketContext)
    const [isLoading, setIsLoading] = useState(true)
    const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting')
    const [networkData, setNetworkData] = useState<any>({})

    const [updateInterval, setUpdateInterval] = useState<number>(2000)
    const [isPaused, setIsPaused] = useState<boolean>(false)
    const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null)

    const [apiTimeRange, setApiTimeRange] = useState<string>("1min")

    const [attackTypeCounts, setAttackTypeCounts] = useState<Record<string, number>>({})
    const [protocolCounts, setProtocolCounts] = useState<Record<string, number>>({})

    const latestDataRef = useRef<any>({})
    const lastUpdateRef = useRef<number>(0)
    const updateIntervalRef = useRef<number>(updateInterval)
    const isPausedRef = useRef<boolean>(isPaused)

    const isDark = actualTheme === 'dark'

    useEffect(() => { updateIntervalRef.current = updateInterval }, [updateInterval])
    useEffect(() => { isPausedRef.current = isPaused }, [isPaused])

    const [trendDataIPv4, setTrendDataIPv4] = useState<TrendData>({
        ingressSource: [],
        egressSource: []
    })

    const [trendDataIPv6, setTrendDataIPv6] = useState<TrendData>({
        ingressSource: [],
        egressSource: []
    })

    const [trafficData, setTrafficData] = useState<TrafficData>({
        ipv4: { ingressSource: 0, egressSource: 0 },
        ipv6: { ingressSource: 0, egressSource: 0 }
    })

    const calculateThroughput = useCallback((
        ipVersion: string,
        direction: string,
        trafficType: string
    ): number => {
        try {
            const key = `${direction}_${trafficType}`
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
            console.error(`Error calculating throughput for ${ipVersion} ${direction} ${trafficType}:`, error)
            return 0
        }
    }, [])

    const updateChartData = useCallback(() => {
        if (isPausedRef.current) return;

        const ipv4IngressSource = calculateThroughput("ipv4", "ingress", "source")
        const ipv4EgressSource = calculateThroughput("ipv4", "egress", "source")
        const ipv6IngressSource = calculateThroughput("ipv6", "ingress", "source")
        const ipv6EgressSource = calculateThroughput("ipv6", "egress", "source")

        setTrafficData({
            ipv4: { ingressSource: ipv4IngressSource, egressSource: ipv4EgressSource },
            ipv6: { ingressSource: ipv6IngressSource, egressSource: ipv6EgressSource }
        })

        const currentTime = new Date().toLocaleTimeString('en-GB', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        })

        const updateTrendArray = (prevArray: TrendDataPoint[], newValue: number) => {
            const maxPoints = 16
            const newPoint = { time: currentTime, value: Math.max(0, newValue) }

            if (prevArray.length < maxPoints) {
                return [...prevArray, newPoint]
            }

            return [...prevArray.slice(1), newPoint]
        }

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

    useEffect(() => {
        if (!isPaused && Object.keys(latestDataRef.current).length > 0) {
            updateChartData()
            lastUpdateRef.current = Date.now()
        }
    }, [isPaused, updateChartData])

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
        }, Math.min(updateInterval / 4, 1000))

        return () => clearInterval(intervalId)
    }, [updateInterval, isPaused, updateChartData])

    useEffect(() => {
        if (!getIPv4FlowStream || !getIPv6FlowStream) {
            console.warn("WebSocket streams not available")
            setConnectionStatus('error')
            setIsLoading(false)
            return
        }

        return () => {
            console.log("Component unmounting - cleaning up WebSocket subscriptions")
        }
    }, [getIPv4FlowStream, getIPv6FlowStream])

    useEffect(() => {
        if (!getIPv4FlowStream || !getIPv6FlowStream) {
            setConnectionStatus('error')
            setIsLoading(false)
            return
        }

        console.log(`[TIME RANGE CHANGE] Switching to ${apiTimeRange}`)

        setTrendDataIPv4({ ingressSource: [], egressSource: [] })
        setTrendDataIPv6({ ingressSource: [], egressSource: [] })
        setNetworkData({})
        latestDataRef.current = {}
        setConnectionStatus('connecting')

        const PROTOCOLS = ["ipv4", "ipv6"] as const
        const DIRECTIONS = ["ingress", "egress"] as const
        const FLOW_DIRECTIONS = ["source", "destination"] as const
        const TIME_RANGES = ["1min", "10min", "1hour"] as const

        const streamConfigs: Array<{
            protocol: typeof PROTOCOLS[number]
            direction: typeof DIRECTIONS[number]
            flowDirection: typeof FLOW_DIRECTIONS[number]
            range: typeof TIME_RANGES[number]
        }> = []

        PROTOCOLS.forEach(protocol => {
            DIRECTIONS.forEach(direction => {
                FLOW_DIRECTIONS.forEach(flowDirection => {
                    TIME_RANGES.forEach(range => {
                        streamConfigs.push({ protocol, direction, flowDirection, range })
                    })
                })
            })
        })

        const streams = streamConfigs.map(config => {
            const { protocol, direction, flowDirection } = config
            const getStream = protocol === "ipv4" ? getIPv4FlowStream : getIPv6FlowStream

            return getStream(direction, flowDirection, apiTimeRange).pipe(
                map((rawData: any) => {
                    if (rawData === null || rawData === undefined) {
                        return { key: `${direction}_${flowDirection}`, protocol, data: {} }
                    }

                    const parsedData = parseFlowData(rawData)

                    if (!parsedData || typeof parsedData !== 'object') {
                        return { key: `${direction}_${flowDirection}`, protocol, data: {} }
                    }

                    return { key: `${direction}_${flowDirection}`, protocol, data: parsedData }
                }),
                catchError(error => {
                    console.error(`${protocol} ${direction}/${flowDirection} (${apiTimeRange}):`, error)
                    return of({ key: `${direction}_${flowDirection}`, protocol, data: {} })
                })
            )
        })

        const subscription = combineLatest(streams).subscribe({
            next: (results) => {
                const validResults = results.filter(result => result !== null && result.data !== null)

                if (validResults.length === 0) {
                    setConnectionStatus('connected')
                    setIsLoading(false)
                    return
                }

                const newData: any = {}
                validResults.forEach(result => {
                    const { key, protocol, data } = result
                    if (!newData[key]) newData[key] = {}
                    newData[key][protocol] = data || {}
                })

                if (Object.keys(newData).length > 0) {
                    latestDataRef.current = { ...latestDataRef.current, ...newData }

                    setNetworkData((prevData: any) => {
                        const updatedData = { ...prevData }
                        Object.entries(newData).forEach(([key, protocolData]: [string, any]) => {
                            if (!updatedData[key]) updatedData[key] = {}
                            Object.entries(protocolData || {}).forEach(([protocol, data]) => {
                                updatedData[key][protocol] = data
                            })
                        })
                        return updatedData
                    })

                    const now = Date.now()
                    const currentUpdateInterval = updateIntervalRef.current
                    const currentIsPaused = isPausedRef.current

                    const shouldUpdate = !currentIsPaused &&
                        (currentUpdateInterval === 0 || (now - lastUpdateRef.current) >= currentUpdateInterval)

                    if (shouldUpdate) {
                        updateChartData()
                        lastUpdateRef.current = now
                    }

                    setConnectionStatus('connected')
                    setIsLoading(false)
                }
            },
            error: (error) => {
                console.error(`(${apiTimeRange}):`, error)
                setConnectionStatus('error')
                setIsLoading(false)
            }
        })

        return () => {
            console.log(`Cleaning up subscription for ${apiTimeRange}`)
            subscription.unsubscribe()
        }
    }, [getIPv4FlowStream, getIPv6FlowStream, apiTimeRange, updateChartData])

    useEffect(() => {
        if (!getDetectionAlertStream) return

        const subscription = getDetectionAlertStream().subscribe({
            next: (rawData: any) => {
                try {
                    const data = typeof rawData === 'string' ? JSON.parse(rawData) : rawData
                    if (!data || !data.is_attack) return

                    if (data.attack_type) {
                        setAttackTypeCounts(prev => ({
                            ...prev,
                            [data.attack_type]: (prev[data.attack_type] || 0) + 1
                        }))
                    }

                    if (data.protocol !== undefined) {
                        const protoName = getProtocolName(data.protocol)
                        setProtocolCounts(prev => ({
                            ...prev,
                            [protoName]: (prev[protoName] || 0) + 1
                        }))
                    }
                } catch (error) {
                    console.error("Error parsing detection alert for dashboard:", error)
                }
            },
            error: (error: any) => {
                console.error("Detection alert stream error in dashboard:", error)
            }
        })

        return () => subscription.unsubscribe()
    }, [getDetectionAlertStream])

    const statsCards = [
        {
            title: 'IPv4 Ingress Traffic',
            value: formatBytes(trafficData.ipv4.ingressSource),
            icon: faGlobe,
            iconColor: 'text-blue-600',
            bgColor: 'bg-blue-50'
        },
        {
            title: 'IPv4 Egress Traffic',
            value: formatBytes(trafficData.ipv4.egressSource),
            icon: faNetworkWired,
            iconColor: 'text-red-600',
            bgColor: 'bg-red-50'
        },
        {
            title: 'IPv6 Ingress Traffic',
            value: formatBytes(trafficData.ipv6.ingressSource),
            icon: faGlobe,
            iconColor: 'text-green-600',
            bgColor: 'bg-green-50'
        },
        {
            title: 'IPv6 Egress Traffic',
            value: formatBytes(trafficData.ipv6.egressSource),
            icon: faNetworkWired,
            iconColor: 'text-yellow-600',
            bgColor: 'bg-yellow-50'
        }
    ]

    if (isLoading) {
        return (
            <>
                <Head><title>Dashboard - Mantis</title></Head>
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
                <Head><title>Dashboard - Mantis</title></Head>
                <Layout>
                    <div className="flex items-center justify-center min-h-[60vh]">
                        <div className="text-center">
                            <div className="text-red-500 text-6xl mb-4">
                                <FontAwesomeIcon icon={faServer} />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-800 mb-2">Connection Error</h2>
                            <p className="text-gray-600 mb-4">Unable to establish WebSocket connection. Please check your network status.</p>
                            <button
                                onClick={() => window.location.reload()}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                Reload
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
                <title>Dashboard - Mantis</title>
                <meta name="description" content="Mantis Network Traffic Monitoring Dashboard" />
            </Head>

            <Layout>
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className={`text-3xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                Network Traffic Monitoring
                            </h1>
                            <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                                Real-time monitoring of IPv4 and IPv6 network traffic status
                            </p>
                        </div>

                        <div className="flex items-center space-x-6">
                            <div className="flex items-center space-x-2">
                                <FontAwesomeIcon icon={faClock} className={isDark ? 'text-gray-400' : 'text-gray-500'} />
                                <label className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Time Range:</label>
                                <select
                                    value={apiTimeRange}
                                    onChange={(e) => setApiTimeRange(e.target.value)}
                                    className="text-sm border border-gray-300 rounded px-3 py-1 bg-white focus:outline-none focus:border-blue-500"
                                >
                                    <option value="1min">1 Minute</option>
                                    <option value="10min">10 Minutes</option>
                                    <option value="1hour">1 Hour</option>
                                </select>
                            </div>

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

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {statsCards.map((card, index) => (
                        <motion.div
                            key={card.title}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className={`${isDark ? 'bg-gray-600' : 'bg-white'} rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow duration-300`}
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className={`text-sm font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                        {card.title}
                                    </p>
                                    <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                        {card.value}
                                    </p>
                                </div>
                                <div className={`${card.bgColor} p-3 rounded-lg`}>
                                    <FontAwesomeIcon icon={card.icon} className={`${card.iconColor} text-xl`} />
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 }}
                        className={`${isDark ? 'bg-gray-600' : 'bg-white'} rounded-lg shadow-md p-6`}
                    >
                        <div className="flex items-center mb-4">
                            <FontAwesomeIcon icon={faChartLine} className="text-blue-600 mr-2" />
                            <h2 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>IPv4 Network Usage Trends</h2>
                        </div>
                        <EChartsComponent data={trendDataIPv4} type="ipv4" isPaused={isPaused} />
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.6 }}
                        className={`${isDark ? 'bg-gray-600' : 'bg-white'} rounded-lg shadow-md p-6`}
                    >
                        <div className="flex items-center mb-4">
                            <FontAwesomeIcon icon={faChartLine} className="text-green-600 mr-2" />
                            <h2 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>IPv6 Network Usage Trends</h2>
                        </div>
                        <EChartsComponent data={trendDataIPv6} type="ipv6" isPaused={isPaused} />
                    </motion.div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mt-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7 }}
                        className={`${isDark ? 'bg-gray-600' : 'bg-white'} rounded-lg shadow-md p-6`}
                    >
                        <div className="flex items-center mb-4">
                            <FontAwesomeIcon icon={faShieldAlt} className="text-red-500 mr-2" />
                            <h2 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Attack Type Distribution</h2>
                        </div>
                        <DonutChart data={attackTypeCounts} totalLabel="Total" />
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8 }}
                        className={`${isDark ? 'bg-gray-600' : 'bg-white'} rounded-lg shadow-md p-6`}
                    >
                        <div className="flex items-center mb-4">
                            <FontAwesomeIcon icon={faNetworkWired} className="text-blue-500 mr-2" />
                            <h2 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Attack Protocol Distribution</h2>
                        </div>
                        <DonutChart data={protocolCounts} colors={PROTOCOL_COLORS} totalLabel="Total" />
                    </motion.div>
                </div>
            </Layout>
        </>
    )
}

export default Dashboard