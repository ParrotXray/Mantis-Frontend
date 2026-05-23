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
    currentData: AccessControlItem[];
    filteredData: AccessControlItem[];
    isLoading: boolean;
    
    setFilteredData: (data: AccessControlItem[]) => void;
    switchTo: (isIPv6: boolean, listType: string) => void;
    refreshData: (isIPv6?: boolean, listType?: string) => Promise<void>;
    
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

const CACHE_EXPIRE_TIME = 10 * 60 * 1000;

const getCacheKey = (isIPv6: boolean, listType: string): string => {
    return `${isIPv6 ? 'ipv6' : 'ipv4'}_${listType}`;
}

const isCacheStale = (timestamp: number): boolean => {
    return Date.now() - timestamp > CACHE_EXPIRE_TIME;
}

export const AccessControlProvider: React.FC<AccessControlProviderProps> = ({ children }) => {
    const [cache, setCache] = useState<CachedData>({})
    const [filteredData, setFilteredData] = useState<AccessControlItem[]>([])
    const [currentKey, setCurrentKey] = useState<string>('')
    
    const pendingRequests = useRef<Set<string>>(new Set())

    const fetchCachedData = useCallback(async (
        isIPv6: boolean, 
        listType: string,
        forceRefresh: boolean = false
    ): Promise<AccessControlItem[]> => {
        const key = getCacheKey(isIPv6, listType);
        const cachedItem = cache[key];
        
        if (!forceRefresh && cachedItem && !isCacheStale(cachedItem.timestamp) && !cachedItem.isLoading) {
            return cachedItem.data;
        }
        
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

        pendingRequests.current.add(key);
        
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
            pendingRequests.current.delete(key);
        }
    }, [cache]);

    const switchTo = useCallback(async (isIPv6: boolean, listType: string) => {
        const key = getCacheKey(isIPv6, listType);
        setCurrentKey(key);

        try {
            const data = await fetchCachedData(isIPv6, listType);
            setFilteredData(data);
        } catch (error) {
            console.error(`Failed to switch to ${key}:`, error);
            setFilteredData([]);
        }
    }, [fetchCachedData]);

    const refreshData = useCallback(async (isIPv6?: boolean, listType?: string) => {
        if (isIPv6 === undefined || listType === undefined) {
            if (!currentKey) return;
            const [ipVersion, list] = currentKey.split('_');
            const isV6 = ipVersion === 'ipv6';
            await switchTo(isV6, list);
            return;
        }

        try {
            const data = await fetchCachedData(isIPv6, listType, true);
            const key = getCacheKey(isIPv6, listType);
            
            if (key === currentKey) {
                setFilteredData(data);
            }
        } catch (error) {
            console.error(`Failed to refresh data for ${getCacheKey(isIPv6, listType)}:`, error);
            throw error;
        }
    }, [currentKey, fetchCachedData, switchTo]);

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

    const currentData = useMemo(() => {
        return currentKey ? (cache[currentKey]?.data || []) : [];
    }, [cache, currentKey]);

    const isLoading = useMemo(() => {
        return currentKey ? (cache[currentKey]?.isLoading || false) : false;
    }, [cache, currentKey]);

    React.useEffect(() => {
        const preloadKey = getCacheKey(false, 'black_list');
        if (!cache[preloadKey]) {
            fetchCachedData(false, 'black_list').catch(error => {
                console.warn('Failed to preload IPv4 blacklist:', error);
            });
        }
    }, []);

    React.useEffect(() => {
        const cleanupInterval = setInterval(() => {
            setCache(prev => {
                const now = Date.now();
                const cleaned: CachedData = {};
                
                Object.entries(prev).forEach(([key, item]) => {
                    if (now - item.timestamp < 30 * 60 * 1000) {
                        cleaned[key] = item;
                    }
                });
                
                return cleaned;
            });
        }, 5 * 60 * 1000);

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