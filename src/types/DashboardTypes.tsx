export interface TrendDataPoint {
    time: string
    value: number
}

export interface TrendData {
    ingressSource: TrendDataPoint[]
    egressSource: TrendDataPoint[]
}

export interface TrafficData {
    ipv4: {
        ingressSource: number
        egressSource: number
    }
    ipv6: {
        ingressSource: number
        egressSource: number
    }
}

export interface UpdateControlProps {
    updateInterval: number;
    setUpdateInterval: (value: number) => void;
    isPaused: boolean;
    setIsPaused: (value: boolean) => void;
    lastUpdateTime: Date | null;
    connectionStatus: string;
}

export interface EChartsComponentProps {
    data: TrendData
    type: 'ipv4' | 'ipv6'
    isPaused: boolean
}
