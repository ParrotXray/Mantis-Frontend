import { Time } from '../constants/time'

export const Format = {
    scale(bytes: number): { value: number; unit: string } {
        const units = ['B', 'KB', 'MB', 'GB', 'TB']
        if (bytes < 1024) return { value: bytes, unit: 'B' }

        let i = 0
        let value = bytes
        while (value >= 1024 && i < units.length - 1) {
            value /= 1024
            i++
        }
        return { value, unit: units[i] }
    },

    bytesWithUnit(bytes: number): { value: number; unit: string } {
        const { value, unit } = Format.scale(bytes)
        return { value: parseFloat(value.toFixed(2)), unit }
    },

    bytes(bytes: number, fractionDigits = 2): string {
        const { value, unit } = Format.scale(bytes)
        return unit === 'B' ? `${value} B` : `${value.toFixed(fractionDigits)} ${unit}`
    },

    protocolName(protocol: number): string {
        switch (protocol) {
            case 1: return 'ICMP'
            case 6: return 'TCP'
            case 17: return 'UDP'
            case 47: return 'GRE'
            case 50: return 'ESP'
            case 51: return 'AH'
            case 58: return 'ICMPv6'
            default: return `Proto ${protocol}`
        }
    },

    relative(secs: number, now: number): string {
        const diff = secs - now
        const abs = Math.abs(diff)
        const value =
            abs < 60 ? `${abs}s`
                : abs < 3600 ? `${Math.floor(abs / 60)}m`
                    : abs < Time.daySecs ? `${Math.floor(abs / 3600)}h`
                        : `${Math.floor(abs / Time.daySecs)}d`
        return diff > 0 ? `in ${value}` : `${value} ago`
    },
}
