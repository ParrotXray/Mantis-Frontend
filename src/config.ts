let httpProtocol = "http";
let websocketProtocol = "ws";
const hostname = "192.168.1.3";
const port = 8080;
export const host = `${hostname}:${port}`;
export const siteUrl = `${httpProtocol}://${host}`

export const TokenKey = 'mantis_auth_token'

export type NicType = 'ingress' | 'egress'
export type FlowType = 'source' | 'destination'
export type ListType = 'white_list' | 'black_list'
export type IpVersion = 'ipv4' | 'ipv6'

export const urls = {
    bootTime: `${httpProtocol}://${host}/misc/boot_time`,

    auth: {
        status: `${httpProtocol}://${host}/auth/status`,
        register: `${httpProtocol}://${host}/auth/register`,
        login: `${httpProtocol}://${host}/auth/login`,
        me: `${httpProtocol}://${host}/auth/me`,
        logout: `${httpProtocol}://${host}/auth/logout`,
    },

    access_control: (
        nic: NicType,
        ipVersion: IpVersion,
        flow: FlowType,
        listType: ListType
    ) => `${httpProtocol}://${host}/ebpf/access_control/${nic}/${ipVersion}/${flow}/${listType}`,
} as const;

export const websocketUrl = {
    ipv4FlowStats: (direction: string, flow_direction: string, timeType: string) =>
        `${websocketProtocol}://${host}/ebpf/statistics/websocket/ipv4/${direction}/${flow_direction}/${timeType}`,
    ipv6FlowStats: (direction: string, flow_direction: string, timeType: string) =>
        `${websocketProtocol}://${host}/ebpf/statistics/websocket/ipv6/${direction}/${flow_direction}/${timeType}`,

    systemHealth: `${websocketProtocol}://${host}/health/websocket/metrics`,
    detectionAlert: `${websocketProtocol}://${host}/detection/websocket/alert`,
    logs: `${websocketProtocol}://${host}/logs/websocket`,
} as const;

export const REFRESH_INTERVAL = 50000;
