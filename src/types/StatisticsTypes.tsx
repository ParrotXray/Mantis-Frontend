export interface ToggleButtonProps {
    isActive: boolean;
    onClick: () => void;
    children: React.ReactNode;
    className?: string;
}

export interface TableHeaderProps {
    column: { key: string; label: string };
    sortConfig: { key: string | null; direction: string };
    onSort: (key: string) => void;
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
    data: any[];
    sortConfig: { key: string | null; direction: string };
    handleSort: (key: string) => void;
    bootTime: number | null;
    isUpdating: boolean;
}

export interface NoDataStateProps {
    isSearchFiltered: boolean;
}

export interface StatsOverviewProps {
    data: any[];
    isIPv6: boolean;
    direction: string;
    trafficType: string;
}