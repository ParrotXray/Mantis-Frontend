import { Config } from '../../config'

import { FlowType, IpVersion, ListType, NicType } from '../types/AccessControlTypes'

export const host = process.env.NODE_ENV === "development" || typeof window === "undefined"
    ? `${Config.hostname}:${Config.port}`
    : window.location.host;

export const siteUrl = `${Config.httpProtocol}://${host}`

const wsUrl = `${Config.websocketProtocol}://${host}`

export const urls = {
    bootTime: `${siteUrl}/misc/boot_time`,

    auth: {
        status: `${siteUrl}/auth/status`,
        register: `${siteUrl}/auth/register`,
        login: `${siteUrl}/auth/login`,
        me: `${siteUrl}/auth/me`,
        logout: `${siteUrl}/auth/logout`,
        activity: `${siteUrl}/auth/activity`,
    },

    access_control: (
        nic: NicType,
        ipVersion: IpVersion,
        flow: FlowType,
        listType: ListType,
        bothDirections: boolean = false
    ) => `${siteUrl}/ebpf/access_control/${nic}/${ipVersion}/${flow}/${listType}${bothDirections ? '?both_directions=true' : ''}`,

    access_control_note: (
        nic: NicType,
        ipVersion: IpVersion,
        flow: FlowType,
        listType: ListType
    ) => `${siteUrl}/ebpf/access_control/${nic}/${ipVersion}/${flow}/${listType}/note`,

    access_control_export: `${siteUrl}/ebpf/access_control/export`,
    access_control_import: `${siteUrl}/ebpf/access_control/import`,

    csvRecordsDownload: `${siteUrl}/records/download`,
    threatReportExport: (from?: string, to?: string) => {
        const params = new URLSearchParams()
        if (from) params.set('from', from)
        if (to) params.set('to', to)
        const query = params.toString()
        return `${siteUrl}/detection/export${query ? `?${query}` : ''}`
    },

    isolation: {
        status: `${siteUrl}/ebpf/isolation`,
        enable: `${siteUrl}/ebpf/isolation/enable`,
        disable: `${siteUrl}/ebpf/isolation/disable`,
    },

    detectionThreshold: `${siteUrl}/detection/threshold`,

    devices: `${siteUrl}/devices/list`,
    notifications: {
        list: `${siteUrl}/notifications/list`,
        read: `${siteUrl}/notifications/read`,
    },

    suppressions: {
        list: `${siteUrl}/detection/suppressions`,
        item: (id: number) => `${siteUrl}/detection/suppressions/${id}`,
    },

    config: `${siteUrl}/config`,
    systemRestart: `${siteUrl}/system/restart`,
    healthStatus: `${siteUrl}/health/status`,

    rules: {
        list: `${siteUrl}/rules`,
        file: (filename: string) => `${siteUrl}/rules/${encodeURIComponent(filename)}`,
        enable: (filename: string) => `${siteUrl}/rules/${encodeURIComponent(filename)}/enable`,
        disable: (filename: string) => `${siteUrl}/rules/${encodeURIComponent(filename)}/disable`,
        sid: (filename: string, sid: number) => `${siteUrl}/rules/${encodeURIComponent(filename)}/sid/${sid}`,
    },

} as const;

export const websocketUrl = {
    ipv4FlowStats: (direction: string, flow_direction: string, timeType: string) =>
        `${wsUrl}/ebpf/statistics/websocket/ipv4/${direction}/${flow_direction}/${timeType}`,
    ipv6FlowStats: (direction: string, flow_direction: string, timeType: string) =>
        `${wsUrl}/ebpf/statistics/websocket/ipv6/${direction}/${flow_direction}/${timeType}`,

    systemHealth: `${wsUrl}/health/websocket/metrics`,
    detectionAlert: `${wsUrl}/detection/websocket/alert`,
    notifications: `${wsUrl}/notifications/websocket`,
    logs: `${wsUrl}/logs/websocket`,
} as const;
