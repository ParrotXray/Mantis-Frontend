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
import { useTheme } from '../providers/ThemeProvider';
import Layout from '../components/Layout';
import LoadingSpinner from '../components/LoadingSpinner';
import { combineLatest, of } from 'rxjs';
import { map, catchError, throttleTime, distinctUntilChanged } from 'rxjs/operators';
import {
    ToggleButtonProps,
    TableHeaderProps,
    UpdateControlProps,
    ControlPanelProps,
    DataTableProps,
    NoDataStateProps,
    StatsOverviewProps
} from '../types/StatisticsTypes';

const TRAFFIC_TYPES = ["source", "destination"];
const DIRECTIONS = ["ingress", "egress"];
const TIME_RANGES = ["1min", "10min", "1hour"];

const UPDATE_INTERVALS = [
    { label: "immediate", value: 0 },
    { label: "1s", value: 1000 },
    { label: "3s", value: 3000 },
    { label: "5s", value: 5000 },
    { label: "10s", value: 10000 }
];

const formatTimestamp = (timestamp: number | string, bootTime: number | null): string => {
    if (!timestamp || !bootTime) return "Loading...";
    const date = new Date((bootTime + Number(timestamp)) / 1e6);
    date.setHours(date.getHours() + 8); // GMT+8
    return date.toISOString().replace("T", " ").split(".")[0];
};

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

const ToggleButton: React.FC<ToggleButtonProps> = ({ isActive, onClick, children, className = "" }) => {
    const { actualTheme } = useTheme();
    const isDark = actualTheme === 'dark';

    return (
        <button
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${className} ${
                isActive
                    ? "bg-[#4ab5cc] text-white"
                    : `${isDark ? 'bg-[#131929] text-slate-300 hover:bg-slate-700/40' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`
            }`}
            onClick={onClick}
        >
            {children}
        </button>
    );
};

const TableHeader: React.FC<TableHeaderProps> = ({ column, sortConfig, onSort }) => {
    const { actualTheme } = useTheme();
    const isDark = actualTheme === 'dark';

    return (
        <th
            onClick={() => onSort(column.key)}
            className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer transition-colors ${
                sortConfig.key === column.key
                    ? (isDark ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-50 text-gray-500')
                    : (isDark ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-100')
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
};

const UpdateControl: React.FC<UpdateControlProps> = ({
                                                         updateInterval,
                                                         setUpdateInterval,
                                                         isPaused,
                                                         setIsPaused,
                                                         lastUpdateTime
                                                     }) => {
    const { actualTheme } = useTheme();
    const isDark = actualTheme === 'dark';

    return (
        <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faClock} className="text-[#4ab5cc] text-xs" />
            <select
                value={updateInterval}
                onChange={(e) => setUpdateInterval(Number(e.target.value))}
                className={`text-xs border rounded-lg px-2 py-1 focus:outline-none focus:border-[#4ab5cc] ${
                    isDark ? 'bg-[#131929] border-slate-600 text-slate-300' : 'bg-white border-slate-300 text-slate-700'
                }`}
            >
                {UPDATE_INTERVALS.map(interval => (
                    <option key={interval.value} value={interval.value}>{interval.label}</option>
                ))}
            </select>
            <button
                onClick={() => setIsPaused(!isPaused)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                    isPaused
                        ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20'
                        : 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20'
                }`}
            >
                <FontAwesomeIcon icon={isPaused ? faPlay : faPause} className="mr-1" />
                {isPaused ? 'Resume' : 'Pause'}
            </button>
            <button
                onClick={() => window.location.reload()}
                className="px-2.5 py-1 bg-[#4ab5cc]/10 text-[#4ab5cc] hover:bg-[#4ab5cc]/20 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
            >
                <FontAwesomeIcon icon={faRefresh} className="text-xs" />
                Update
            </button>
            {lastUpdateTime && (
                <span className={`text-xs ml-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    Last Update: {lastUpdateTime.toLocaleTimeString()}
                </span>
            )}
        </div>
    );
};

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
    const { actualTheme } = useTheme();
    const isDark = actualTheme === 'dark';

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex flex-wrap items-center gap-3 px-4 py-2.5 rounded-xl border mb-5 ${
                isDark ? 'bg-[#0e1e2c] border-slate-700/40' : 'bg-white border-slate-200'
            }`}
        >
            {/* Update controls */}
            <UpdateControl
                updateInterval={updateInterval}
                setUpdateInterval={setUpdateInterval}
                isPaused={isPaused}
                setIsPaused={setIsPaused}
                lastUpdateTime={lastUpdateTime}
            />

            <div className={`w-px h-4 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />

            {/* Search */}
            <div className="relative flex-1 min-w-40">
                <FontAwesomeIcon icon={faSearch} className={`absolute left-2.5 top-1/2 -translate-y-1/2 text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search IP Address…"
                    className={`w-full pl-7 pr-3 py-1 text-xs border rounded-lg focus:outline-none focus:border-[#4ab5cc] ${
                        isDark ? 'bg-[#131929] border-slate-600 text-slate-300 placeholder-slate-500' : 'bg-white border-slate-300 text-slate-700 placeholder-slate-400'
                    }`}
                />
            </div>

            <div className={`w-px h-4 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />

            <div className="flex items-center gap-1.5">
                <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>IP:</span>
                <ToggleButton isActive={!isIPv6} onClick={() => setIsIPv6(false)}>IPv4</ToggleButton>
                <ToggleButton isActive={isIPv6} onClick={() => setIsIPv6(true)}>IPv6</ToggleButton>
            </div>

            <div className="flex items-center gap-1.5">
                <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Dir:</span>
                <ToggleButton isActive={direction === 'ingress'} onClick={() => setDirection('ingress')}>Ingress</ToggleButton>
                <ToggleButton isActive={direction === 'egress'} onClick={() => setDirection('egress')}>Egress</ToggleButton>
            </div>

            <div className="flex items-center gap-1.5">
                <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Traffic:</span>
                <ToggleButton isActive={trafficType === 'source'} onClick={() => setTrafficType('source')}>Source</ToggleButton>
                <ToggleButton isActive={trafficType === 'destination'} onClick={() => setTrafficType('destination')}>Destination</ToggleButton>
            </div>

            <div className="flex items-center gap-1.5">
                <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Time:</span>
                {TIME_RANGES.map((range) => (
                    <ToggleButton key={range} isActive={timeRange === range} onClick={() => setTimeRange(range)}>{range}</ToggleButton>
                ))}
            </div>
        </motion.div>
    );
};

const DataTable: React.FC<DataTableProps> = ({ data, sortConfig, handleSort, bootTime, isUpdating }) => {
    const { actualTheme } = useTheme();
    const isDark = actualTheme === 'dark';

    const columns = [
        { key: "ip", label: "IP Address" },
        { key: "geo", label: "Location" },
        { key: "bytes", label: "Bytes" },
        { key: "packets", label: "Packets" },
        { key: "last_seen", label: "Last Seen (GMT+8)" }
    ];

    const formatGeoLocation = (geo: any) => {
        if (!geo) {
            return (
                <span className={`text-sm px-2 py-1 rounded font-medium ${
                    isDark ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-700'
                }`}>
                    Unknown
                </span>
            );
        }

        return (
            <div className="flex items-center space-x-2">
                <span className={`text-sm px-2 py-1 rounded font-medium ${
                    isDark ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-700'
                }`}>
                    {geo.country_code || 'Unknown'}
                </span>
            </div>
        );
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-xl border overflow-hidden ${isDark ? 'bg-[#0e1e2c] border-slate-700/40' : 'bg-white border-slate-200'}`}
        >
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 390px)', minHeight: '200px' }}>
                <table className={`min-w-full divide-y ${isDark ? 'divide-slate-700/50' : 'divide-slate-200'}`}>
                    <thead className={`sticky top-0 z-10 ${isDark ? 'bg-[#131929]' : 'bg-slate-50'}`}>
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
                    <tbody className={`divide-y ${isDark ? 'bg-[#0e1e2c] divide-slate-700/40' : 'bg-white divide-slate-200'}`}>
                    {data.map((row, index) => (
                        <motion.tr
                            key={`${row.ip}-${index}`}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: Math.min(index * 0.01, 0.5) }}
                            className={`transition-colors ${isDark ? 'hover:bg-slate-700/30' : 'hover:bg-slate-50'}`}
                        >
                            <td className={`px-4 py-1.5 whitespace-nowrap text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
                                {row.ip}
                            </td>
                            <td className="px-4 py-1.5 text-sm">
                                {formatGeoLocation(row.geo)}
                            </td>
                            <td className={`px-4 py-1.5 whitespace-nowrap text-sm ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
                                {formatBytes(row.bytes)}
                            </td>
                            <td className={`px-4 py-1.5 whitespace-nowrap text-sm ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
                                {row.packets.toLocaleString()}
                            </td>
                            <td className={`px-4 py-1.5 whitespace-nowrap text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                {formatTimestamp(row.last_seen, bootTime)}
                            </td>
                        </motion.tr>
                    ))}
                    </tbody>
                </table>
            </div>

            {data.length > 0 && (
                <div className={`px-4 py-2 border-t ${isDark ? 'bg-[#131929] border-slate-700/50' : 'bg-slate-50 border-slate-200'}`}>
                    <div className={`flex justify-between items-center text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        <span>Showing {data.length} records</span>
                    </div>
                </div>
            )}
        </motion.div>
    );
};

const NoDataState: React.FC<NoDataStateProps> = ({ isSearchFiltered }) => {
    const { actualTheme } = useTheme();
    const isDark = actualTheme === 'dark';

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`rounded-xl border p-12 text-center ${isDark ? 'bg-[#0e1e2c] border-slate-700/40' : 'bg-white border-slate-200'}`}
        >
            <FontAwesomeIcon icon={faInfoCircle} className={`text-6xl mb-4 ${isDark ? 'text-gray-500' : 'text-gray-300'}`} />
            {isSearchFiltered ? (
                <>
                    <h3 className={`text-xl font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>No matching results found</h3>
                    <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>Please try adjusting your search criteria</p>
                </>
            ) : (
                <>
                    <h3 className={`text-xl font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>No data found</h3>
                    <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>Please try adjusting your filters or time range</p>
                </>
            )}
        </motion.div>
    );
};

const StatsOverview: React.FC<StatsOverviewProps> = ({ data, isIPv6, direction, trafficType }) => {
    const { actualTheme } = useTheme();
    const isDark = actualTheme === 'dark';

    const totalBytes = data.reduce((sum, item) => sum + item.bytes, 0);
    const totalPackets = data.reduce((sum, item) => sum + item.packets, 0);
    const uniqueIPs = new Set(
        data.map(item => {
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
            title: 'Total Traffic',
            value: formatBytes(totalBytes),
            icon: faNetworkWired,
            color: 'bg-[#4ab5cc]'
        },
        {
            title: 'Total Packets',
            value: totalPackets.toLocaleString(),
            icon: faChartBar,
            color: 'bg-green-500'
        },
        {
            title: 'Unique IPs',
            value: uniqueIPs.toLocaleString(),
            icon: faGlobe,
            color: 'bg-slate-500'
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
                    className={`rounded-xl border p-4 ${isDark ? 'bg-[#0e1e2c] border-slate-700/40' : 'bg-white border-slate-200'}`}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className={`text-sm font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                {stat.title}
                            </p>
                            <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
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

const Statistics: React.FC = () => {
    const { bootTime, getIPv4FlowStream, getIPv6FlowStream } = useContext(WebsocketContext);
    const { actualTheme } = useTheme();
    const isDark = actualTheme === 'dark';

    const [isIPv6, setIsIPv6] = useState(false);
    const [trafficType, setTrafficType] = useState("source");
    const [direction, setDirection] = useState("ingress");
    const [timeRange, setTimeRange] = useState("1min");
    const [sortConfig, setSortConfig] = useState({ key: null, direction: "desc" });
    const [searchTerm, setSearchTerm] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [flowData, setFlowData] = useState<any>({});
    const [error, setError] = useState<string | null>(null);

    const [updateInterval, setUpdateInterval] = useState(3000);
    const [isPaused, setIsPaused] = useState(false);
    const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);

    const latestDataRef = useRef<any>({});
    const lastUpdateRef = useRef<number>(0);
    const updateIntervalRef = useRef<number>(updateInterval);
    const isPausedRef = useRef<boolean>(isPaused);

    useEffect(() => {
        updateIntervalRef.current = updateInterval;
    }, [updateInterval]);

    useEffect(() => {
        isPausedRef.current = isPaused;
    }, [isPaused]);

    const parseFlowData = useCallback((rawData: any): any => {
        try {
            if (typeof rawData === 'object' && rawData !== null) {
                return rawData;
            }
            return JSON.parse(rawData);
        } catch (error) {
            console.error("Error parsing flow data:", error);
            return {};
        }
    }, []);

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
    }, []);

    useEffect(() => {
        if (!getIPv4FlowStream || !getIPv6FlowStream) {
            setError("WebSocket service unavailable");
            setIsLoading(false);
            return;
        }

        console.log("Initializing Statistics WebSocket subscriptions...");
        setError(null);
        setIsLoading(true);

        const DIRECTIONS = ['ingress', 'egress'] as const;
        const TRAFFIC_TYPES = ['source', 'destination'] as const;
        const TIME_RANGES = ['1min', '10min', '1hour'] as const;

        const streamConfigs: Array<{
            dir: typeof DIRECTIONS[number];
            type: typeof TRAFFIC_TYPES[number];
            range: typeof TIME_RANGES[number];
            protocol: 'ipv4' | 'ipv6';
        }> = [];

        DIRECTIONS.forEach(dir => {
            TRAFFIC_TYPES.forEach(type => {
                TIME_RANGES.forEach(range => {
                    streamConfigs.push({ dir, type, range, protocol: "ipv4" });
                    streamConfigs.push({ dir, type, range, protocol: "ipv6" });
                });
            });
        });

        console.log(`Total stream configs: ${streamConfigs.length}`); // 應該是 24

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

        const subscription = combineLatest(streams).subscribe({
            next: (results) => {
                processWebSocketData(results);
                setIsLoading(false);
            },
            error: (error) => {
                console.error("WebSocket subscription error:", error);
                setError("WebSocket connection error");
                setIsLoading(false);
            }
        });

        // 清理函數：只取消訂閱，不關閉 WebSocket 連線
        return () => {
            console.log("Unsubscribing from Statistics WebSocket streams");
            subscription.unsubscribe();
        };
    }, [getIPv4FlowStream, getIPv6FlowStream, parseFlowData, processWebSocketData]);

    useEffect(() => {
        if (!isPaused && Object.keys(latestDataRef.current).length > 0) {
            setFlowData(latestDataRef.current);
            setLastUpdateTime(new Date());
            lastUpdateRef.current = Date.now();
        }
    }, [isPaused]);

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
        }, Math.min(updateInterval / 4, 1000)); // 檢查頻率為更新間隔的 1/4，最少 1 秒

        return () => clearInterval(intervalId);
    }, [updateInterval, isPaused]);

    const parseCurrentData = useCallback(() => {
        const key = `${direction}_${trafficType}_${timeRange}`;
        const protocol = isIPv6 ? "ipv6" : "ipv4";
        const data = flowData[key]?.[protocol];

        if (!data) return null;

        return Object.entries(data).map(([ip, details]: [string, any]) => ({
            ip,
            bytes: details.bytes || 0,
            geo: details.geo || null,
            packets: details.packets || 0,
            last_seen: details.last_seen || 0,
        }));
    }, [flowData, direction, trafficType, timeRange, isIPv6]);

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

        if (searchTerm.trim()) {
            return sortedData.filter((row) =>
                row.ip.toLowerCase().includes(searchTerm.trim().toLowerCase())
            );
        }

        return sortedData;
    }, [parseCurrentData, sortConfig, searchTerm, isIPv6]);

    const isSearchFiltered = useMemo(() => {
        return searchTerm.trim() !== "" && parseCurrentData() !== null;
    }, [searchTerm, parseCurrentData]);


    const handleSort = useCallback((key: string) => {
        setSortConfig(prevConfig => {
            const direction = prevConfig.key === key && prevConfig.direction === "asc" ? "desc" : "asc";
            return { key, direction };
        });
    }, []);

    const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
    }, []);

    if (isLoading) {
        return (
            <>
                <Head>
                    <title>Statistics - Mantis</title>
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
                    <title>Statistics - Mantis</title>
                </Head>
                <Layout>
                    <div className="flex items-center justify-center min-h-[60vh]">
                        <div className="text-center">
                            <div className="text-red-500 text-6xl mb-4">⚠️</div>
                            <h2 className={`text-2xl font-bold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>Loading Error</h2>
                            <p className={`mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{error}</p>
                            <button
                                onClick={() => window.location.reload()}
                                className="px-4 py-2 bg-[#4ab5cc] text-white rounded-lg hover:bg-[#4ab5cc] transition-colors"
                            >
                                Reload
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
                <title>Statistics - Mantis</title>
                <meta name="description" content="Mantis Network Traffic Statistics" />
            </Head>

            <Layout>
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

                {sortedData && sortedData.length > 0 && (
                    <StatsOverview
                        data={sortedData}
                        isIPv6={isIPv6}
                        direction={direction}
                        trafficType={trafficType}
                    />
                )}

                <div>
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