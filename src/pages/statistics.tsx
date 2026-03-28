import React, { useContext, useState, useEffect, useCallback, useMemo, useRef } from "react";
import Head from 'next/head';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faChartBar, 
    faNetworkWired, 
    faGlobe, 
    faSearch,
    faFilter,
    faSortUp,
    faSortDown,
    faSort,
    faRefresh,
    faDownload,
    faInfoCircle,
    faPause,
    faPlay,
    faClock
} from '@fortawesome/free-solid-svg-icons';
import { WebsocketContext } from "../providers/WebSocketProvider";
import Layout from '../components/Layout';
import LoadingSpinner from '../components/LoadingSpinner';
import { combineLatest, of } from 'rxjs';
import { map, catchError, throttleTime, distinctUntilChanged } from 'rxjs/operators';

// 常量定義
const TRAFFIC_TYPES = ["source", "destination"];
const DIRECTIONS = ["ingress", "egress"];
const TIME_RANGES = ["1min", "10min", "1hour"];

// 更新频率选項 (毫秒)
const UPDATE_INTERVALS = [
    { label: "即時", value: 0 },
    { label: "1秒", value: 1000 },
    { label: "3秒", value: 3000 },
    { label: "5秒", value: 5000 },
    { label: "10秒", value: 10000 }
];

// 格式化時間戳
const formatTimestamp = (timestamp: number | string, bootTime: number | null): string => {
    if (!timestamp || !bootTime) return "Loading...";
    const date = new Date((bootTime + Number(timestamp)) / 1e6);
    date.setHours(date.getHours() + 8); // GMT+8
    return date.toISOString().replace("T", " ").split(".")[0];
};

// 解析流量資料
const parseFlowData = (rawData: any): any => {
    try {
        if (typeof rawData === 'object' && rawData !== null) {
            return rawData;
        }
        return JSON.parse(rawData);
    } catch (error) {
        console.error("Error parsing flow data:", error);
        return {};
    }
};

// 格式化位元組大小
const formatBytes = (bytes: number): string => {
    const units = ["B", "KB", "MB", "GB", "TB"];
    if (bytes < 1024) return `${bytes} B`;
    
    let i = 0;
    let value = bytes;
    
    while (value >= 1024 && i < units.length - 1) {
        value /= 1024;
        i++;
    }
    
    return `${value.toFixed(2)} ${units[i]}`;
};

// IP 排序輔助函數
const getIPSortValue = (ip: string, isIPv6: boolean): any => {
    if (isIPv6) {
        const cleanIPv6 = ip.replace(/\[|\]|:[0-9]+/g, "");
        const expandIPv6 = (ip: string) => {
            const parts = ip.split("::");
            const left = (parts[0] || "").split(":");
            const right = (parts[1] || "").split(":");
            const missingZeros = 8 - (left.length + right.length);
            const zeros = Array(missingZeros).fill("0");
            return [...left, ...zeros, ...right].map((part) => part || "0");
        };

        const expanded = expandIPv6(cleanIPv6);
        try {
            const hexString = expanded.reduce((acc, part) => acc + part.padStart(4, "0"), "");
            return BigInt("0x" + hexString);
        } catch (error) {
            console.error("Error converting IPv6 to number:", error);
            return ip;
        }
    } else {
        try {
            return ip.split(".").reduce((acc, octet) => acc * 256 + parseInt(octet, 10), 0);
        } catch (error) {
            console.error("Error converting IPv4 to number:", error);
            return ip;
        }
    }
};

// 切換按鈕組件
interface ToggleButtonProps {
    isActive: boolean;
    onClick: () => void;
    children: React.ReactNode;
    className?: string;
}

const ToggleButton: React.FC<ToggleButtonProps> = ({ isActive, onClick, children, className = "" }) => (
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
);

// 表格標題組件
interface TableHeaderProps {
    column: { key: string; label: string };
    sortConfig: { key: string | null; direction: string };
    onSort: (key: string) => void;
}

const TableHeader: React.FC<TableHeaderProps> = ({ column, sortConfig, onSort }) => (
    <th
        onClick={() => onSort(column.key)}
        className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors ${
            sortConfig.key === column.key ? "bg-blue-50" : ""
        }`}
    >
        <div className="flex items-center space-x-1">
            <span>{column.label}</span>
            <FontAwesomeIcon 
                icon={
                    sortConfig.key === column.key 
                        ? sortConfig.direction === "asc" ? faSortUp : faSortDown
                        : faSort
                } 
                className="text-xs"
            />
        </div>
    </th>
);

// 更新控制面板组件
interface UpdateControlProps {
    updateInterval: number;
    setUpdateInterval: (value: number) => void;
    isPaused: boolean;
    setIsPaused: (value: boolean) => void;
    lastUpdateTime: Date | null;
}

const UpdateControl: React.FC<UpdateControlProps> = ({ 
    updateInterval, 
    setUpdateInterval, 
    isPaused, 
    setIsPaused, 
    lastUpdateTime 
}) => {
    return (
        <div className="flex flex-wrap items-center gap-4 bg-gray-50 p-3 rounded-lg">
            {/* 更新频率 */}
            <div className="flex items-center space-x-2">
                <FontAwesomeIcon icon={faClock} className="text-gray-500" />
                <span className="text-sm font-medium text-gray-600">更新頻率:</span>
                <select
                    value={updateInterval}
                    onChange={(e) => setUpdateInterval(Number(e.target.value))}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-blue-500"
                >
                    {UPDATE_INTERVALS.map(interval => (
                        <option key={interval.value} value={interval.value}>
                            {interval.label}
                        </option>
                    ))}
                </select>
            </div>
            
            {/* 暂停/恢复按钮 */}
            <button
                onClick={() => setIsPaused(!isPaused)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    isPaused 
                        ? "bg-green-100 text-green-700 hover:bg-green-200" 
                        : "bg-orange-100 text-orange-700 hover:bg-orange-200"
                }`}
            >
                <FontAwesomeIcon icon={isPaused ? faPlay : faPause} className="mr-1" />
                {isPaused ? "恢复" : "暂停"}
            </button>
            
            {/* 更新資料按钮 */}
            <button 
                onClick={() => window.location.reload()}
                className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors flex items-center space-x-1"
            >
                <FontAwesomeIcon icon={faRefresh} className="text-xs" />
                <span>更新</span>
            </button>
            
            {/* 最后更新时间 */}
            {lastUpdateTime && (
                <div className="text-xs text-gray-500 ml-auto">
                    最後更新: {lastUpdateTime.toLocaleTimeString()}
                </div>
            )}
        </div>
    );
};

// 控制面板組件
interface ControlPanelProps {
    isIPv6: boolean;
    setIsIPv6: (value: boolean) => void;
    direction: string;
    setDirection: (value: string) => void;
    trafficType: string;
    setTrafficType: (value: string) => void;
    timeRange: string;
    setTimeRange: (value: string) => void;
    searchTerm: string;
    setSearchTerm: (value: string) => void;
    updateInterval: number;
    setUpdateInterval: (value: number) => void;
    isPaused: boolean;
    setIsPaused: (value: boolean) => void;
    lastUpdateTime: Date | null;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
    isIPv6, setIsIPv6,
    direction, setDirection,
    trafficType, setTrafficType,
    timeRange, setTimeRange,
    searchTerm, setSearchTerm,
    updateInterval, setUpdateInterval,
    isPaused, setIsPaused,
    lastUpdateTime
}) => {
    return (
        <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow-md p-6 mb-6 space-y-4"
        >
            {/* 更新控制 */}
            <UpdateControl
                updateInterval={updateInterval}
                setUpdateInterval={setUpdateInterval}
                isPaused={isPaused}
                setIsPaused={setIsPaused}
                lastUpdateTime={lastUpdateTime}
            />
            
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
                            onChange={(e) => setSearchTerm(e.target.value)}
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

                {/* 流量方向 */}
                <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-600">方向:</span>
                    <div className="flex space-x-1">
                        {DIRECTIONS.map((dir) => (
                            <ToggleButton
                                key={dir}
                                isActive={direction === dir}
                                onClick={() => setDirection(dir)}
                            >
                                {dir === "ingress" ? "入站" : "出站"}
                            </ToggleButton>
                        ))}
                    </div>
                </div>

                {/* 流量類型 */}
                <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-600">類型:</span>
                    <div className="flex space-x-1">
                        {TRAFFIC_TYPES.map((type) => (
                            <ToggleButton
                                key={type}
                                isActive={trafficType === type}
                                onClick={() => setTrafficType(type)}
                            >
                                {type === "source" ? "來源" : "目標"}
                            </ToggleButton>
                        ))}
                    </div>
                </div>

                {/* 時間範圍 */}
                <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-600">時間:</span>
                    <div className="flex space-x-1">
                        {TIME_RANGES.map((range) => (
                            <ToggleButton
                                key={range}
                                isActive={timeRange === range}
                                onClick={() => setTimeRange(range)}
                            >
                                {range}
                            </ToggleButton>
                        ))}
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

// 資料表格組件
interface DataTableProps {
    data: any[];
    sortConfig: { key: string | null; direction: string };
    handleSort: (key: string) => void;
    bootTime: number | null;
    isUpdating: boolean;
}

const DataTable: React.FC<DataTableProps> = ({ data, sortConfig, handleSort, bootTime, isUpdating }) => {
    const columns = [
        { key: "ip", label: "IP 地址" },
        { key: "bytes", label: "位元組數" },
        { key: "packets", label: "封包數" },
        { key: "last_seen", label: "最後見到時間 (GMT+8)" }
    ];

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow-md overflow-hidden"
        >
            {/* 表格容器 - 设置最大高度和滚动 */}
            <div className="max-h-[600px] overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    {/* 固定表头 */}
                    <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr>
                            {columns.map((column) => (
                                <TableHeader
                                    key={column.key}
                                    column={column}
                                    sortConfig={sortConfig}
                                    onSort={handleSort}
                                />
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {data.map((row, index) => (
                            <motion.tr 
                                key={`${row.ip}-${index}`}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: Math.min(index * 0.01, 0.5) }}
                                className="hover:bg-gray-50 transition-colors"
                            >
                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {row.ip}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                    {formatBytes(row.bytes)}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                    {row.packets.toLocaleString()}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                    {formatTimestamp(row.last_seen, bootTime)}
                                </td>
                            </motion.tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            {/* 資料条数显示 */}
            {data.length > 0 && (
                <div className="bg-gray-50 px-4 py-2 border-t border-gray-200">
                    <div className="flex justify-between items-center text-sm text-gray-600">
                        <span>顯示 {data.length} 條記錄</span>
                    </div>
                </div>
            )}
        </motion.div>
    );
};

// 空資料狀態組件
interface NoDataStateProps {
    isSearchFiltered: boolean;
}

const NoDataState: React.FC<NoDataStateProps> = ({ isSearchFiltered }) => (
    <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-white rounded-lg shadow-md p-12 text-center"
    >
        <FontAwesomeIcon icon={faInfoCircle} className="text-6xl text-gray-300 mb-4" />
        {isSearchFiltered ? (
            <>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">沒有找到匹配的結果</h3>
                <p className="text-gray-500">請嘗試調整搜索條件</p>
            </>
        ) : (
            <>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">沒有找到資料</h3>
                <p className="text-gray-500">請嘗試更改篩選條件或時間範圍</p>
            </>
        )}
    </motion.div>
);

// 統計信息組件
interface StatsOverviewProps {
    data: any[];
    isIPv6: boolean;
    direction: string;
    trafficType: string;
}

const StatsOverview: React.FC<StatsOverviewProps> = ({ data, isIPv6, direction, trafficType }) => {
    const totalBytes = data.reduce((sum, item) => sum + item.bytes, 0);
    const totalPackets = data.reduce((sum, item) => sum + item.packets, 0);
    const uniqueIPs = new Set(
        data.map(item => {
            // 移除端口部分，只保留IP
            if (item.ip.includes('[') && item.ip.includes(']:')) {
                // IPv6: [ip]:port -> ip
                return item.ip.split(']:')[0] + ']';
            } else if (item.ip.includes(':') && !item.ip.includes('[')) {
                // IPv4: ip:port -> ip  
                return item.ip.split(':').slice(0, -1).join(':');
            }
            return item.ip;
        })
    ).size;

    const stats = [
        {
            title: '總流量',
            value: formatBytes(totalBytes),
            icon: faNetworkWired,
            color: 'bg-blue-500'
        },
        {
            title: '總封包數',
            value: totalPackets.toLocaleString(),
            icon: faChartBar,
            color: 'bg-green-500'
        },
        {
            title: '唯一 IP 數',
            value: uniqueIPs.toLocaleString(),
            icon: faGlobe,
            color: 'bg-purple-500'
        }
    ];

    return (
        <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6"
        >
            {stats.map((stat, index) => (
                <motion.div
                    key={stat.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white rounded-lg shadow-md p-6"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600 mb-1">
                                {stat.title}
                            </p>
                            <p className="text-2xl font-bold text-gray-900">
                                {stat.value}
                            </p>
                        </div>
                        <div className={`${stat.color} p-3 rounded-lg`}>
                            <FontAwesomeIcon 
                                icon={stat.icon} 
                                className="text-white text-xl"
                            />
                        </div>
                    </div>
                </motion.div>
            ))}
        </motion.div>
    );
};

// 主要統計組件
const Statistics: React.FC = () => {
    const { bootTime, getIPv4FlowStream, getIPv6FlowStream } = useContext(WebsocketContext);
    const [isIPv6, setIsIPv6] = useState(false);
    const [trafficType, setTrafficType] = useState("source");
    const [direction, setDirection] = useState("ingress");
    const [timeRange, setTimeRange] = useState("1min");
    const [sortConfig, setSortConfig] = useState({ key: null, direction: "desc" });
    const [searchTerm, setSearchTerm] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [flowData, setFlowData] = useState<any>({});
    const [error, setError] = useState<string | null>(null);
    
    // 更新控制状态
    const [updateInterval, setUpdateInterval] = useState(3000);
    const [isPaused, setIsPaused] = useState(false);
    const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);
    
    // 用于存储最新資料和控制更新的 refs
    const latestDataRef = useRef<any>({});
    const lastUpdateRef = useRef<number>(0);
    const updateIntervalRef = useRef<number>(updateInterval);
    const isPausedRef = useRef<boolean>(isPaused);

    // 同步 refs 与 state
    useEffect(() => {
        updateIntervalRef.current = updateInterval;
    }, [updateInterval]);

    useEffect(() => {
        isPausedRef.current = isPaused;
    }, [isPaused]);

    // 提取當前選擇的資料
    const parseCurrentData = useCallback(() => {
        const key = `${direction}_${trafficType}_${timeRange}`;
        const protocol = isIPv6 ? "ipv6" : "ipv4";
        const data = flowData[key]?.[protocol];

        if (!data) return null;

        return Object.entries(data).map(([ip, details]: [string, any]) => ({
            ip,
            bytes: details.bytes || 0,
            packets: details.packets || 0,
            last_seen: details.last_seen || 0,
        }));
    }, [flowData, direction, trafficType, timeRange, isIPv6]);

    // 排序和過濾資料
    const sortedData = useMemo(() => {
        const data = parseCurrentData();
        if (!data) return null;

        if (!sortConfig.key) {
            if (searchTerm.trim()) {
                return data.filter((row) =>
                    row.ip.toLowerCase().includes(searchTerm.trim().toLowerCase())
                );
            }
            return data;
        }

        // 排序
        const sortedData = [...data].sort((a, b) => {
            let valA = a[sortConfig.key as keyof typeof a];
            let valB = b[sortConfig.key as keyof typeof b];

            if (sortConfig.key === "ip") {
                valA = getIPSortValue(valA as string, isIPv6);
                valB = getIPSortValue(valB as string, isIPv6);
            }

            if (valA < valB) {
                return sortConfig.direction === "asc" ? -1 : 1;
            }
            if (valA > valB) {
                return sortConfig.direction === "asc" ? 1 : -1;
            }
            return 0;
        });

        // 过滤
        if (searchTerm.trim()) {
            return sortedData.filter((row) =>
                row.ip.toLowerCase().includes(searchTerm.trim().toLowerCase())
            );
        }

        return sortedData;
    }, [parseCurrentData, sortConfig, searchTerm, isIPv6]);

    // 檢查是否由於搜索而過濾
    const isSearchFiltered = useMemo(() => {
        return searchTerm.trim() !== "" && parseCurrentData() !== null;
    }, [searchTerm, parseCurrentData]);

    // 處理排序
    const handleSort = useCallback((key: string) => {
        setSortConfig(prevConfig => {
            const direction = prevConfig.key === key && prevConfig.direction === "asc" ? "desc" : "asc";
            return { key, direction };
        });
    }, []);

    // 核心資料处理函数 - 移除依赖，避免重复订阅
    const processWebSocketData = useCallback((results: any[]) => {
        const validResults = results.filter(result => result !== null);
        if (validResults.length === 0) return;

        const newData: any = {};
        validResults.forEach(result => {
            if (!result) return;
            const { key, protocol, data } = result;
            if (!newData[key]) {
                newData[key] = {};
            }
            newData[key][protocol] = data;
        });

        if (Object.keys(newData).length > 0) {
            latestDataRef.current = newData;
            
            // 根据当前状态决定是否立即更新UI
            const now = Date.now();
            const currentUpdateInterval = updateIntervalRef.current;
            const currentIsPaused = isPausedRef.current;
            
            const shouldUpdate = !currentIsPaused && 
                (currentUpdateInterval === 0 || (now - lastUpdateRef.current) >= currentUpdateInterval);
            
            if (shouldUpdate) {
                setIsUpdating(true);
                setFlowData(newData);
                setLastUpdateTime(new Date());
                lastUpdateRef.current = now;
                setTimeout(() => setIsUpdating(false), 300);
            }
        }
    }, []); // 移除所有依赖

    // WebSocket 資料订阅
    useEffect(() => {
        if (!getIPv4FlowStream || !getIPv6FlowStream) {
            setError("WebSocket 服務不可用");
            setIsLoading(false);
            return;
        }

        setError(null);
        setIsLoading(true);

        // 創建要訂閱的所有資料流配置
        const streamConfigs: any[] = [];
        DIRECTIONS.forEach(dir => {
            TRAFFIC_TYPES.forEach(type => {
                TIME_RANGES.forEach(range => {
                    streamConfigs.push({ dir, type, range, protocol: "ipv4" });
                    streamConfigs.push({ dir, type, range, protocol: "ipv6" });
                });
            });
        });

        // 創建所有資料流
        const streams = streamConfigs.map(config => {
            const { dir, type, range, protocol } = config;
            const getStream = protocol === "ipv4" ? getIPv4FlowStream : getIPv6FlowStream;

            return getStream(dir, type, range).pipe(
                map((rawData: any) => ({
                    key: `${dir}_${type}_${range}`,
                    protocol,
                    data: parseFlowData(rawData)
                })),
                catchError(error => {
                    console.error(`Error in ${protocol} stream (${dir}, ${type}, ${range}):`, error);
                    return of(null);
                })
            );
        });

        // 訂閱合併的資料流
        const subscription = combineLatest(streams).subscribe({
            next: (results) => {
                processWebSocketData(results);
                setIsLoading(false);
            },
            error: (error) => {
                console.error("WebSocket subscription error:", error);
                setError("WebSocket 連接錯誤");
                setIsLoading(false);
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [getIPv4FlowStream, getIPv6FlowStream, processWebSocketData]);

    // 处理暂停/恢复切换
    useEffect(() => {
        if (!isPaused && Object.keys(latestDataRef.current).length > 0) {
            // 恢复时立即更新一次
            setFlowData(latestDataRef.current);
            setLastUpdateTime(new Date());
            lastUpdateRef.current = Date.now();
        }
    }, [isPaused]);

    // 定时更新控制器 - 仅在非即時模式且未暂停时工作
    useEffect(() => {
        if (updateInterval === 0 || isPaused) {
            return;
        }

        const intervalId = setInterval(() => {
            const now = Date.now();
            if (Object.keys(latestDataRef.current).length > 0 && 
                (now - lastUpdateRef.current) >= updateInterval &&
                !isPausedRef.current) {
                setIsUpdating(true);
                setFlowData(latestDataRef.current);
                setLastUpdateTime(new Date());
                lastUpdateRef.current = now;
                setTimeout(() => setIsUpdating(false), 300);
            }
        }, Math.min(updateInterval / 4, 1000)); // 检查频率为更新间隔的1/4，最少1秒

        return () => clearInterval(intervalId);
    }, [updateInterval, isPaused]);

    if (isLoading) {
        return (
            <>
                <Head>
                    <title>Statistics - NetGuardia</title>
                </Head>
                <Layout>
                    <div className="flex items-center justify-center w-full h-full min-h-[calc(100vh-4rem)]">
                        <div className="flex flex-col items-center space-y-4">
                            <LoadingSpinner />
                        </div>
                    </div>
                </Layout>
            </>
        );
    }

    if (error) {
        return (
            <>
                <Head>
                    <title>Statistics - NetGuardia</title>
                </Head>
                <Layout>
                    <div className="flex items-center justify-center min-h-[60vh]">
                        <div className="text-center">
                            <div className="text-red-500 text-6xl mb-4">⚠️</div>
                            <h2 className="text-2xl font-bold text-gray-800 mb-2">載入錯誤</h2>
                            <p className="text-gray-600 mb-4">{error}</p>
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
        );
    }

    return (
        <>
            <Head>
                <title>Statistics - NetGuardia</title>
                <meta name="description" content="NetGuardia 網路流量統計分析" />
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
                                網路流量統計
                            </h1>
                            <p className="text-gray-600">
                                分析和監控網路流量資料，查看詳細的連接統計
                            </p>
                        </div>
                    </div>
                </motion.div>

                {/* 控制面板 */}
                <ControlPanel
                    isIPv6={isIPv6}
                    setIsIPv6={setIsIPv6}
                    direction={direction}
                    setDirection={setDirection}
                    trafficType={trafficType}
                    setTrafficType={setTrafficType}
                    timeRange={timeRange}
                    setTimeRange={setTimeRange}
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    updateInterval={updateInterval}
                    setUpdateInterval={setUpdateInterval}
                    isPaused={isPaused}
                    setIsPaused={setIsPaused}
                    lastUpdateTime={lastUpdateTime}
                />

                {/* 統計概覽 */}
                {sortedData && sortedData.length > 0 && (
                    <StatsOverview
                        data={sortedData}
                        isIPv6={isIPv6}
                        direction={direction}
                        trafficType={trafficType}
                    />
                )}

                {/* 資料表格 */}
                <div className="mb-8">
                    {sortedData === null ? (
                        <NoDataState isSearchFiltered={false} />
                    ) : sortedData.length === 0 ? (
                        <NoDataState isSearchFiltered={isSearchFiltered} />
                    ) : (
                        <DataTable
                            data={sortedData}
                            sortConfig={sortConfig}
                            handleSort={handleSort}
                            bootTime={bootTime}
                            isUpdating={isUpdating}
                        />
                    )}
                </div>
            </Layout>
        </>
    );
};

export default Statistics;