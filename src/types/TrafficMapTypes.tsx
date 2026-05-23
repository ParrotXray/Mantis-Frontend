export interface MapPoint {
    id: string;
    ip: string;
    latitude: number;
    longitude: number;
    bytes: number;
    packets: number;
    code: string;
    city: string;
    regions: string;
    type: 'source' | 'destination';
}

export interface MapConfig {
    center: [number, number];
    zoom: number;
    minZoom: number,
    maxZoom: number,
    scrollZoom: boolean,
    boxZoom: boolean,
    doubleClickZoom: boolean,
    touchZoomRotate: boolean,
    dragRotate: boolean,
    pitchWithRotate: boolean,
    renderWorldCopies: boolean
}

export interface GeoLocation {
    latitude: number | null;
    longitude: number | null;
    city?: string;
    country?: string;
    country_code?: string;
}

export interface FlowDetails {
    bytes: number;
    packets: number;
    geo: GeoLocation;
}

export interface FlowDataRecord {
    [ipPort: string]: FlowDetails;
}

export interface ProtocolData {
    ipv4?: FlowDataRecord;
    ipv6?: FlowDataRecord;
}

export interface FlowDataState {
    [key: string]: ProtocolData;
}
