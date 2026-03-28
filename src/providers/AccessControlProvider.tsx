import React, { createContext, useState, useCallback, useMemo, useRef } from 'react'
import { fetchData } from '../utils/connectionUtils'
import { urls } from '../config'

interface AccessControlItem {
    ip: string;
    ports: (string | number)[];
}

interface CachedData {
    [key: string]: {
        data: AccessControlItem[];
        timestamp: number;
        isLoading: boolean;
    }
}

interface AccessControlContextType {
    // 当前显示的数据
    currentData: AccessControlItem[];
    filteredData: AccessControlItem[];
    isLoading: boolean;
    
    // 数据管理方法
    setFilteredData: (data: AccessControlItem[]) => void;
    switchTo: (isIPv6: boolean, listType: string) => void;
    refreshData: (isIPv6?: boolean, listType?: string) => Promise<void>;
    
    // 缓存状态
    getCacheStatus: () => { [key: string]: { lastUpdate: Date; isStale: boolean } };
}

export const AccessControlContext = createContext<AccessControlContextType>({
    currentData: [],
    filteredData: [],
    isLoading: false,
    setFilteredData: () => {},
    switchTo: () => {},
    refreshData: async () => {},
    getCacheStatus: () => ({}),
})

interface AccessControlProviderProps {
    children: React.ReactNode
}

// 缓存过期时间 (10分钟)
const CACHE_EXPIRE_TIME = 10 * 60 * 1000;

// 生成缓存键
const getCacheKey = (isIPv6: boolean, listType: string): string => {
    return `${isIPv6 ? 'ipv6' : 'ipv4'}_${listType}`;
}

// 检查缓存是否过期
const isCacheStale = (timestamp: number): boolean => {
    return Date.now() - timestamp > CACHE_EXPIRE_TIME;
}

export const AccessControlProvider: React.FC<AccessControlProviderProps> = ({ children }) => {
    // 缓存所有数据，避免重复请求
    const [cache, setCache] = useState<CachedData>({})
    const [filteredData, setFilteredData] = useState<AccessControlItem[]>([])
    const [currentKey, setCurrentKey] = useState<string>('')
    
    // 使用 ref 追踪正在进行的请求，避免重复请求
    const pendingRequests = useRef<Set<string>>(new Set())

    // 从缓存或 API 获取数据
    const fetchCachedData = useCallback(async (
        isIPv6: boolean, 
        listType: string,
        forceRefresh: boolean = false
    ): Promise<AccessControlItem[]> => {
        const key = getCacheKey(isIPv6, listType);
        const cachedItem = cache[key];
        
        // 如果有有效缓存且不强制刷新，直接返回
        if (!forceRefresh && cachedItem && !isCacheStale(cachedItem.timestamp) && !cachedItem.isLoading) {
            return cachedItem.data;
        }
        
        // 如果正在请求中，等待完成
        if (pendingRequests.current.has(key)) {
            return new Promise((resolve) => {
                const checkInterval = setInterval(() => {
                    if (!pendingRequests.current.has(key)) {
                        clearInterval(checkInterval);
                        const updatedCache = cache[key];
                        resolve(updatedCache ? updatedCache.data : []);
                    }
                }, 100);
            });
        }

        // 标记正在加载
        pendingRequests.current.add(key);
        
        // 立即更新缓存状态为加载中
        setCache(prev => ({
            ...prev,
            [key]: {
                data: cachedItem?.data || [],
                timestamp: cachedItem?.timestamp || 0,
                isLoading: true
            }
        }));

        try {
            const url = isIPv6
                ? urls.access_control.ipv6[listType as keyof typeof urls.access_control.ipv6]
                : urls.access_control.ipv4[listType as keyof typeof urls.access_control.ipv4];

            const data = await new Promise<AccessControlItem[]>((resolve, reject) => {
                fetchData(
                    url,
                    (response) => {
                        try {
                            const parsedData = JSON.parse(response);
                            const dataArray: AccessControlItem[] = Object.entries(parsedData).map(([ip, ports]) => ({
                                ip,
                                ports: ports as (string | number)[],
                            }));
                            resolve(dataArray);
                        } catch (error) {
                            console.error("Error parsing data:", error);
                            reject(new Error("Invalid data format"));
                        }
                    },
                    (error) => {
                        console.error(`Error fetching from ${url}:`, error);
                        reject(new Error("Network error: Please check your connection"));
                    }
                );
            });

            // 更新缓存
            setCache(prev => ({
                ...prev,
                [key]: {
                    data,
                    timestamp: Date.now(),
                    isLoading: false
                }
            }));

            return data;

        } catch (error) {
            // 发生错误时，恢复缓存状态
            setCache(prev => ({
                ...prev,
                [key]: {
                    data: cachedItem?.data || [],
                    timestamp: cachedItem?.timestamp || 0,
                    isLoading: false
                }
            }));
            
            throw error;
        } finally {
            // 移除请求标记
            pendingRequests.current.delete(key);
        }
    }, [cache]);

    // 切换到指定的IP版本和列表类型
    const switchTo = useCallback(async (isIPv6: boolean, listType: string) => {
        const key = getCacheKey(isIPv6, listType);
        setCurrentKey(key);

        try {
            const data = await fetchCachedData(isIPv6, listType);
            setFilteredData(data);
        } catch (error) {
            console.error(`Failed to switch to ${key}:`, error);
            // 发生错误时显示空数据，但不影响用户体验
            setFilteredData([]);
        }
    }, [fetchCachedData]);

    // 刷新数据
    const refreshData = useCallback(async (isIPv6?: boolean, listType?: string) => {
        // 如果没有指定参数，刷新当前数据
        if (isIPv6 === undefined || listType === undefined) {
            if (!currentKey) return;
            const [ipVersion, list] = currentKey.split('_');
            const isV6 = ipVersion === 'ipv6';
            await switchTo(isV6, list);
            return;
        }

        // 刷新指定数据
        try {
            const data = await fetchCachedData(isIPv6, listType, true);
            const key = getCacheKey(isIPv6, listType);
            
            // 如果刷新的是当前显示的数据，更新显示
            if (key === currentKey) {
                setFilteredData(data);
            }
        } catch (error) {
            console.error(`Failed to refresh data for ${getCacheKey(isIPv6, listType)}:`, error);
            throw error;
        }
    }, [currentKey, fetchCachedData, switchTo]);

    // 获取缓存状态（用于调试和监控）
    const getCacheStatus = useCallback(() => {
        const status: { [key: string]: { lastUpdate: Date; isStale: boolean } } = {};
        
        Object.entries(cache).forEach(([key, item]) => {
            status[key] = {
                lastUpdate: new Date(item.timestamp),
                isStale: isCacheStale(item.timestamp)
            };
        });
        
        return status;
    }, [cache]);

    // 计算当前数据和加载状态
    const currentData = useMemo(() => {
        return currentKey ? (cache[currentKey]?.data || []) : [];
    }, [cache, currentKey]);

    const isLoading = useMemo(() => {
        return currentKey ? (cache[currentKey]?.isLoading || false) : false;
    }, [cache, currentKey]);

    // 预加载常用数据（IPv4 黑名单）
    React.useEffect(() => {
        // 在组件挂载时预加载 IPv4 黑名单，这是最常用的
        const preloadKey = getCacheKey(false, 'black_list');
        if (!cache[preloadKey]) {
            fetchCachedData(false, 'black_list').catch(error => {
                console.warn('Failed to preload IPv4 blacklist:', error);
            });
        }
    }, []); // 只在组件挂载时执行一次

    // 定期清理过期缓存
    React.useEffect(() => {
        const cleanupInterval = setInterval(() => {
            setCache(prev => {
                const now = Date.now();
                const cleaned: CachedData = {};
                
                Object.entries(prev).forEach(([key, item]) => {
                    // 保留最近 30 分钟内的缓存
                    if (now - item.timestamp < 30 * 60 * 1000) {
                        cleaned[key] = item;
                    }
                });
                
                return cleaned;
            });
        }, 5 * 60 * 1000); // 每5分钟清理一次

        return () => clearInterval(cleanupInterval);
    }, []);

    const contextValue = useMemo((): AccessControlContextType => ({
        currentData,
        filteredData,
        isLoading,
        setFilteredData,
        switchTo,
        refreshData,
        getCacheStatus,
    }), [currentData, filteredData, isLoading, switchTo, refreshData, getCacheStatus]);

    return (
        <AccessControlContext.Provider value={contextValue}>
            {children}
        </AccessControlContext.Provider>
    );
};