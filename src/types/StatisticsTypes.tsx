import { GeoLocation } from './TrafficMapTypes';

export interface ToggleButtonProps {
    isActive: boolean;
    onClick: () => void;
    children: React.ReactNode;
    className?: string;
}

export interface TableHeaderProps {
    column: { key: StatisticsSortKey; label: string };
    sortConfig: SortConfig;
    onSort: (key: StatisticsSortKey) => void;
}

export interface UpdateControlProps {
    updateInterval: number;
    setUpdateInterval: (value: number) => void;
    isPaused: boolean;
    setIsPaused: (value: boolean) => void;
    lastUpdateTime: Date | null;
}

export interface ControlPanelProps {
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

export interface DataTableProps {
    data: StatisticsRow[];
    sortConfig: SortConfig;
    handleSort: (key: StatisticsSortKey) => void;
    bootTime: number | null;
}

export interface NoDataStateProps {
    isSearchFiltered: boolean;
}

export interface StatsOverviewProps {
    data: any[];
}
export interface StatisticsRow {
    ip: string;
    bytes: number;
    geo: GeoLocation | null;
    packets: number;
    last_seen: number;
}

export type StatisticsSortKey = keyof StatisticsRow;

export interface SortConfig {
    key: StatisticsSortKey | null;
    direction: 'asc' | 'desc';
}
