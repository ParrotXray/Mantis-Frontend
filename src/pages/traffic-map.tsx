import React, { useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Head from 'next/head';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faMapMarkedAlt,
    faGlobe,
    faNetworkWired,
    faFilter,
    faLayerGroup,
    faExpand,
    faCompress,
    faInfoCircle,
    faTimes,
    faPause,
    faPlay,
    faClock,
    faRefresh
} from '@fortawesome/free-solid-svg-icons';
import Layout from '../components/Layout';
import LoadingSpinner from '../components/LoadingSpinner';
import { useTheme } from '../providers/ThemeProvider';
import { WebsocketContext } from '../providers/WebSocketProvider';
import { combineLatest, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import {
    MapPoint,
    MapConfig,
    GeoLocation,
    FlowDetails,
    FlowDataRecord,
    ProtocolData,
    FlowDataState
} from "../types/TrafficMapTypes";

const INITIAL_MAP_CONFIG: MapConfig = {
    center: [0, 20],
    zoom: 0,
    minZoom: 0,
    maxZoom: 8,
    scrollZoom: true,
    boxZoom: false,
    doubleClickZoom: false,
    touchZoomRotate: false,
    dragRotate: false,
    pitchWithRotate: false,
    renderWorldCopies: false
};

const formatBytes = (bytes: number): string => {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes < 1024) return `${bytes} B`;

    let i = 0;
    let value = bytes;

    while (value >= 1024 && i < units.length - 1) {
        value /= 1024;
        i++;
    }

    return `${value.toFixed(2)} ${units[i]}`;
};

const ToggleButton: React.FC<{
    isActive: boolean;
    onClick: () => void;
    children: React.ReactNode;
    isDark?: boolean;
}> = ({ isActive, onClick, children, isDark = false }) => (
    <button
        className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
            isActive
                ? 'bg-blue-600 text-white'
                : `${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'} hover:bg-gray-200`
        }`}
        onClick={onClick}
    >
        {children}
    </button>
);

const ControlPanel: React.FC<{
    isIPv6: boolean;
    setIsIPv6: (value: boolean) => void;
    direction: string;
    setDirection: (value: string) => void;
    trafficType: string;
    setTrafficType: (value: string) => void;
    timeRange: string;
    setTimeRange: (value: string) => void;
    isPaused: boolean;
    setIsPaused: (value: boolean) => void;
    onRefresh: () => void;
    lastUpdateTime: Date | null;
}> = ({
          isIPv6,
          setIsIPv6,
          direction,
          setDirection,
          trafficType,
          setTrafficType,
          timeRange,
          setTimeRange,
          isPaused,
          setIsPaused,
          onRefresh,
          lastUpdateTime
      }) => {
    const { actualTheme } = useTheme();
    const isDark = actualTheme === 'dark';

    const TIME_RANGES = ["1min", "10min", "1hour"];

    return (
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-lg shadow-md p-4 mb-6 ${isDark ? 'bg-gray-600' : 'bg-white'}`}
        >
            <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center space-x-2">
                    <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>IP Version:</span>
                    <div className="flex space-x-1">
                        <ToggleButton
                            isActive={!isIPv6}
                            onClick={() => setIsIPv6(false)}
                            isDark={isDark}
                        >
                            IPv4
                        </ToggleButton>
                        <ToggleButton
                            isActive={isIPv6}
                            onClick={() => setIsIPv6(true)}
                            isDark={isDark}
                        >
                            IPv6
                        </ToggleButton>
                    </div>
                </div>

                <div className="flex items-center space-x-2">
                    <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Direction:</span>
                    <div className="flex space-x-1">
                        <ToggleButton
                            isActive={direction === 'ingress'}
                            onClick={() => setDirection('ingress')}
                            isDark={isDark}
                        >
                            Ingress
                        </ToggleButton>
                        <ToggleButton
                            isActive={direction === 'egress'}
                            onClick={() => setDirection('egress')}
                            isDark={isDark}
                        >
                            Egress
                        </ToggleButton>
                    </div>
                </div>

                <div className="flex items-center space-x-2">
                    <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Traffic Type:</span>
                    <div className="flex space-x-1">
                        <ToggleButton
                            isActive={trafficType === 'source'}
                            onClick={() => setTrafficType('source')}
                            isDark={isDark}
                        >
                            Source
                        </ToggleButton>
                        <ToggleButton
                            isActive={trafficType === 'destination'}
                            onClick={() => setTrafficType('destination')}
                            isDark={isDark}
                        >
                            Destination
                        </ToggleButton>
                    </div>
                </div>

                <div className="flex items-center space-x-2">
                    <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Time:</span>
                    <div className="flex space-x-1">
                        {TIME_RANGES.map((range) => (
                            <ToggleButton
                                key={range}
                                isActive={timeRange === range}
                                onClick={() => setTimeRange(range)}
                                isDark={isDark}
                            >
                                {range}
                            </ToggleButton>
                        ))}
                    </div>
                </div>

                <div className="flex items-center space-x-2 ml-auto">
                    <button
                        onClick={() => setIsPaused(!isPaused)}
                        className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                            isPaused
                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                        }`}
                    >
                        <FontAwesomeIcon icon={isPaused ? faPlay : faPause} className="mr-1" />
                        {isPaused ? 'Resume' : 'Pause'}
                    </button>

                    <button
                        onClick={onRefresh}
                        className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                        <FontAwesomeIcon icon={faRefresh} className="mr-1" />
                        Refresh
                    </button>

                    {lastUpdateTime && (
                        <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            Last Update: {lastUpdateTime.toLocaleTimeString()}
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

const MapComponent: React.FC<{
    points: MapPoint[];
    isDark: boolean;
}> = ({ points, isDark }) => {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<any>(null);

    useEffect(() => {
        if (!mapContainer.current) return;

        const initMap = async () => {
            const maplibregl = await import('maplibre-gl');

            if (map.current) return;

            map.current = new maplibregl.Map({
                container: mapContainer.current!,
                style: isDark
                    ? 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
                    : 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
                center: INITIAL_MAP_CONFIG.center,
                zoom: INITIAL_MAP_CONFIG.zoom,
                minZoom: INITIAL_MAP_CONFIG.minZoom,
                maxZoom: INITIAL_MAP_CONFIG.maxZoom,
                scrollZoom: INITIAL_MAP_CONFIG.scrollZoom,
                boxZoom: INITIAL_MAP_CONFIG.boxZoom,
                doubleClickZoom: INITIAL_MAP_CONFIG.doubleClickZoom,
                touchZoomRotate: INITIAL_MAP_CONFIG.touchZoomRotate,
                dragRotate: INITIAL_MAP_CONFIG.dragRotate,
                pitchWithRotate: INITIAL_MAP_CONFIG.pitchWithRotate,
                renderWorldCopies: INITIAL_MAP_CONFIG.renderWorldCopies
            });

            map.current.on('load', () => {
                if (!map.current) return;

                const style = map.current.getStyle();
                if (style && style.layers) {
                    style.layers.forEach((layer: any) => {
                        if (layer.type === 'symbol') {
                            map.current.setLayoutProperty(layer.id, 'visibility', 'none');
                        }
                    });
                }
            });
        };

        initMap().catch(error => {
            console.error('Failed to initialize map:', error);
        });

        return () => {
            if (map.current) {
                map.current.remove();
                map.current = null;
            }
        };
    }, [isDark]);

    useEffect(() => {
        if (!map.current) return;

        const updateMarkers = async () => {
            const maplibregl = await import('maplibre-gl');

            const updateLayers = () => {
                if (!map.current) return;

                if (!points.length) {
                    if (map.current.getSource('traffic-points')) {
                        const source = map.current.getSource('traffic-points') as any;
                        source.setData({
                            type: 'FeatureCollection',
                            features: []
                        });
                    }
                    return;
                }

                const geojsonData = {
                    type: 'FeatureCollection',
                    features: points.map(point => ({
                        type: 'Feature',
                        geometry: {
                            type: 'Point',
                            coordinates: [point.longitude, point.latitude]
                        },
                        properties: {
                            ip: point.ip,
                            regions: point.regions,
                            code: point.code,
                            city: point.city,
                            bytes: point.bytes,
                            packets: point.packets,
                            type: point.type,
                            traffic: formatBytes(point.bytes)
                        }
                    }))
                };

                if (map.current.getSource('traffic-points')) {
                    const source = map.current.getSource('traffic-points') as any;
                    source.setData(geojsonData);
                    return;
                }

                map.current.addSource('traffic-points', {
                    type: 'geojson',
                    data: geojsonData
                });

                map.current.addLayer({
                    id: 'traffic-points-glow',
                    type: 'circle',
                    source: 'traffic-points',
                    paint: {
                        'circle-color': [
                            'match',
                            ['get', 'type'],
                            'source', '#3B82F6',
                            'destination', '#EF4444',
                            '#8B5CF6'
                        ],
                        'circle-radius': 16,
                        'circle-opacity': 0.3,
                        'circle-blur': 1
                    }
                });

                map.current.addLayer({
                    id: 'traffic-points-layer',
                    type: 'circle',
                    source: 'traffic-points',
                    paint: {
                        'circle-color': [
                            'match',
                            ['get', 'type'],
                            'source', '#3B82F6',
                            'destination', '#EF4444',
                            '#8B5CF6'
                        ],
                        'circle-radius': 5,
                        'circle-opacity': 0.9,
                        'circle-blur': 0.2
                    }
                });

                map.current.on('mouseenter', 'traffic-points-layer', (e: any) => {
                    const coordinates = e.features[0].geometry.coordinates.slice();
                    const props = e.features[0].properties;

                    const popupContent = `
                        <div style="padding: 8px; font-family: sans-serif;">
                            <strong style="font-size: 14px; color: #1f2937;">${props.ip}</strong><br/>
                            <span style="color: #6b7280; font-size: 12px;">Regions: ${props.regions}</span><br/>
                            <span style="color: #6b7280; font-size: 12px;">Code: ${props.code}</span><br/>
                            <span style="color: #6b7280; font-size: 12px;">City: ${props.city}</span><br/>
                            <span style="color: #6b7280; font-size: 12px;">Traffic: ${props.traffic}</span><br/>
                            <span style="color: #6b7280; font-size: 12px;">Packets: ${props.packets.toLocaleString()}</span><br/>
                            <span style="color: #6b7280; font-size: 12px;">Type: ${props.type}</span>
                        </div>
                    `;

                    const popup = new maplibregl.Popup({
                        closeButton: false,
                        closeOnClick: false
                    })
                        .setLngLat(coordinates)
                        .setHTML(popupContent)
                        .addTo(map.current);

                    (map.current as any)._hoverPopup = popup;
                    map.current.getCanvas().style.cursor = 'pointer';
                });

                map.current.on('mouseleave', 'traffic-points-layer', () => {
                    if ((map.current as any)._hoverPopup) {
                        (map.current as any)._hoverPopup.remove();
                        (map.current as any)._hoverPopup = null;
                    }
                    map.current.getCanvas().style.cursor = '';
                });
            };

            if (map.current.isStyleLoaded()) {
                updateLayers();
            } else {
                map.current.once('load', updateLayers);
            }
        };

        updateMarkers();
    }, [points]);

    return (
        <div className="relative w-full h-full">
            <div
                ref={mapContainer}
                className="w-full h-full rounded-lg"
                style={{ minHeight: '500px' }}
            />
        </div>
    );
};

const StatsCard: React.FC<{
    title: string;
    value: string | number;
    icon: any;
    color: string;
}> = ({ title, value, icon, color }) => {
    const { actualTheme } = useTheme();
    const isDark = actualTheme === 'dark';

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-lg shadow-md p-6 ${isDark ? 'bg-gray-600' : 'bg-white'}`}
        >
            <div className="flex items-center justify-between">
                <div>
                    <p className={`text-sm font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        {title}
                    </p>
                    <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {value}
                    </p>
                </div>
                <div className={`${color} p-3 rounded-lg`}>
                    <FontAwesomeIcon icon={icon} className="text-white text-xl" />
                </div>
            </div>
        </motion.div>
    );
};

const TrafficMap: React.FC = () => {
    const { actualTheme } = useTheme();
    const { getIPv4FlowStream, getIPv6FlowStream, bootTime } = useContext(WebsocketContext);
    const isDark = actualTheme === 'dark';

    const [isIPv6, setIsIPv6] = useState(false);
    const [direction, setDirection] = useState('ingress');
    const [trafficType, setTrafficType] = useState('source');
    const [timeRange, setTimeRange] = useState('1min');
    const [isPaused, setIsPaused] = useState(false);
    const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [mapPoints, setMapPoints] = useState<MapPoint[]>([]);
    const [flowData, setFlowData] = useState<FlowDataState>({});

    const latestDataRef = useRef<any>({});
    const isPausedRef = useRef<boolean>(isPaused);

    useEffect(() => {
        isPausedRef.current = isPaused;
    }, [isPaused]);

    const parseFlowData = useCallback((rawData: any): FlowDataRecord => {
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
        if (isPausedRef.current) return;

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
            setFlowData(newData);
            setLastUpdateTime(new Date());
        }
    }, []);

    useEffect(() => {
        if (!getIPv4FlowStream || !getIPv6FlowStream) {
            setError("WebSocket service unavailable");
            setIsLoading(false);
            return;
        }

        console.log("Initializing Traffic Map WebSocket subscriptions...");
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

        console.log(`Total stream configs for Traffic Map: ${streamConfigs.length}`); // 24

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
                    console.error(`Error in ${protocol} stream (${dir}/${type}/${range}):`, error);
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

        return () => {
            console.log("Unsubscribing from Traffic Map WebSocket streams");
            subscription.unsubscribe();
        };
    }, [getIPv4FlowStream, getIPv6FlowStream, parseFlowData, processWebSocketData]);

    useEffect(() => {
        if (!isPaused && Object.keys(latestDataRef.current).length > 0) {
            setFlowData(latestDataRef.current);
            setLastUpdateTime(new Date());
        }
    }, [isPaused]);

    useEffect(() => {
        const key = `${direction}_${trafficType}_${timeRange}`;
        const protocol = isIPv6 ? "ipv6" : "ipv4";
        const data: FlowDataRecord | undefined = flowData[key]?.[protocol];

        if (!data) {
            setMapPoints([]);
            return;
        }

        const points: MapPoint[] = [];
        const seenLocations: Record<string, MapPoint> = {};

        Object.entries(data).forEach(([ipPort, details]: [string, FlowDetails]) => {
            if (!details.geo ||
                details.geo.latitude === null ||
                details.geo.longitude === null) {
                return;
            }

            let ip = ipPort;
            if (ipPort.includes('[') && ipPort.includes(']:')) {
                // IPv6 格式: [ip]:port
                ip = ipPort.split(']:')[0].replace('[', '') + ']';
            } else if (ipPort.includes(':')) {
                // IPv4 格式: ip:port
                const parts = ipPort.split(':');
                ip = parts.slice(0, -1).join(':');
            }

            const locationKey = `${details.geo.latitude},${details.geo.longitude}`;

            if (seenLocations[locationKey]) {
                const existingPoint = seenLocations[locationKey];
                existingPoint.bytes += details.bytes || 0;
                existingPoint.packets += details.packets || 0;
                if (!existingPoint.ip.includes(ip)) {
                    existingPoint.ip += `, ${ip}`;
                }
            } else {
                const newPoint: MapPoint = {
                    id: ipPort,
                    ip: ip,
                    latitude: details.geo.latitude,
                    longitude: details.geo.longitude,
                    bytes: details.bytes || 0,
                    packets: details.packets || 0,
                    regions: details.geo.country || 'Unknown',
                    city: details.geo.city || 'Unknown',
                    code: details.geo.country_code || 'Unknown',
                    type: trafficType as 'source' | 'destination'
                };
                seenLocations[locationKey] = newPoint;
                points.push(newPoint);
            }
        });

        setMapPoints(points);
    }, [flowData, direction, trafficType, timeRange, isIPv6]);

    const handleRefresh = useCallback(() => {
        if (!isPaused && Object.keys(latestDataRef.current).length > 0) {
            setFlowData(latestDataRef.current);
            setLastUpdateTime(new Date());
        }
    }, [isPaused]);

    const stats = useMemo(() => {
        const totalBytes = mapPoints.reduce((sum, point) => sum + point.bytes, 0);
        const totalPackets = mapPoints.reduce((sum, point) => sum + point.packets, 0);

        const uniqueIPs = new Set<string>();
        mapPoints.forEach(point => {
            const ips = point.ip.split(',').map(ip => ip.trim());
            ips.forEach(ip => uniqueIPs.add(ip));
        });

        const uniqueRegions = new Set(mapPoints.map(point => point.regions)).size;

        return {
            totalBytes: formatBytes(totalBytes),
            totalPackets: totalPackets.toLocaleString(),
            uniqueIPs: uniqueIPs.size,
            uniqueRegions
        };
    }, [mapPoints]);

    if (isLoading) {
        return (
            <>
                <Head>
                    <title>Traffic Map - Mantis</title>
                </Head>
                <Layout>
                    <div className="flex items-center justify-center w-full h-full min-h-[calc(100vh-4rem)]">
                        <LoadingSpinner />
                    </div>
                </Layout>
            </>
        );
    }

    return (
        <>
            <Head>
                <title>Traffic Map - Mantis</title>
                <meta name="description" content="Mantis Network Traffic Geographic Map" />
                <link href='https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.css' rel='stylesheet' />
            </Head>

            <Layout>
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <h1 className={`text-3xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        <FontAwesomeIcon icon={faMapMarkedAlt} className="mr-3 text-blue-600" />
                        Network Traffic Map
                    </h1>
                    <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                        Visualize network traffic geographic distribution in real-time
                    </p>
                </motion.div>

                <ControlPanel
                    isIPv6={isIPv6}
                    setIsIPv6={setIsIPv6}
                    direction={direction}
                    setDirection={setDirection}
                    trafficType={trafficType}
                    setTrafficType={setTrafficType}
                    timeRange={timeRange}
                    setTimeRange={setTimeRange}
                    isPaused={isPaused}
                    setIsPaused={setIsPaused}
                    onRefresh={handleRefresh}
                    lastUpdateTime={lastUpdateTime}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                    <StatsCard
                        title="Total Traffic"
                        value={stats.totalBytes}
                        icon={faNetworkWired}
                        color="bg-blue-500"
                    />
                    <StatsCard
                        title="Total Packets"
                        value={stats.totalPackets}
                        icon={faLayerGroup}
                        color="bg-green-500"
                    />
                    <StatsCard
                        title="Unique IPs"
                        value={stats.uniqueIPs}
                        icon={faGlobe}
                        color="bg-purple-500"
                    />
                    <StatsCard
                        title="Regions"
                        value={stats.uniqueRegions}
                        icon={faMapMarkedAlt}
                        color="bg-orange-500"
                    />
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`rounded-lg shadow-md overflow-hidden ${isDark ? 'bg-gray-600' : 'bg-white'}`}
                >
                    <MapComponent points={mapPoints} isDark={isDark} />
                </motion.div>
            </Layout>
        </>
    );
};

export default TrafficMap;