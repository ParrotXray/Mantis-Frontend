let httpProtocol = "http";
let websocketProtocol = "ws";
const hostname = "192.168.1.3";
const port = 8080;
export const host = `${hostname}:${port}`;
export const siteUrl = `${httpProtocol}://${host}`

export const urls = {
    bootTime: `${httpProtocol}://${host}/misc/boot_time`,
    access_control: {
        ipv4: {
            white_list: `${httpProtocol}://${host}/ebpf/access_control/ipv4/source/white_list`,
            black_list: `${httpProtocol}://${host}/ebpf/access_control/ipv4/source/black_list`,
        },
        ipv6: {
            white_list: `${httpProtocol}://${host}/ebpf/access_control/ipv6/source/white_list`,
            black_list: `${httpProtocol}://${host}/ebpf/access_control/ipv6/source/black_list`,
        }
    }
} as const;

export const websocketUrl = {
    ipv4FlowStats: (direction: string, flow_direction: string, timeType: string) =>
        `${websocketProtocol}://${host}/ebpf/statistics/websocket/ipv4/${direction}/${flow_direction}/${timeType}`,
    ipv6FlowStats: (direction: string, flow_direction: string, timeType: string) =>
        `${websocketProtocol}://${host}/ebpf/statistics/websocket/ipv6/${direction}/${flow_direction}/${timeType}`,

    systemHealth: `${websocketProtocol}://${host}/health/websocket/metrics`,
    detectionAlert: `${websocketProtocol}://${host}/detection/websocket/alert`,
} as const;

export const REFRESH_INTERVAL = 50000;