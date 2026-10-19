import { ByteCap, ConfigKey, ConfigSection, ConfigValue, ConfigView, FieldLimit } from '../types/ConfigTypes'
import { Format } from './format'

const isPowerOfTwo = (value: number) => Number.isInteger(value) && value > 0 && (value & (value - 1)) === 0

export const ConfigCheck = {
    section(key: ConfigKey): ConfigSection {
        return key.includes('.') ? (key.split('.')[0] as ConfigSection) : 'general'
    },

    lookup<K extends ConfigKey>(view: ConfigView, key: K): ConfigValue<K> {
        return key.split('.').reduce<any>((value, part) => value?.[part], view)
    },

    at<K extends ConfigKey>(view: ConfigView, key: K): { key: K; value: ConfigValue<K> } {
        return { key, value: ConfigCheck.lookup(view, key) }
    },

    hint(limit?: FieldLimit): string | undefined {
        if (!limit) return undefined
        const range = `${limit.min.toLocaleString()} - ${limit.max.toLocaleString()}`
        return limit.power_of_two ? `${range}, power of 2` : range
    },

    number(limit: FieldLimit | undefined, value: unknown): string | null {
        if (!limit) return null
        if (typeof value !== 'number' || Number.isNaN(value)) return 'Must be a number'
        if (value < limit.min || value > limit.max) return `Must be between ${limit.min.toLocaleString()} and ${limit.max.toLocaleString()}`
        if (limit.power_of_two && !isPowerOfTwo(value)) return 'Must be a power of 2'
        return null
    },

    byteCap(cap: ByteCap, view: ConfigView): string | null {
        const total = cap.fields.reduce((product, field) => product * Number(ConfigCheck.lookup(view, field)), cap.multiplier)
        if (!(total > cap.max)) return null
        const names = cap.fields.map((field) => field.split('.').pop()).join(' × ')
        const formula = cap.multiplier > 1 ? `${names} × ${cap.multiplier}` : names
        return `${formula} = ${Format.bytes(total)}, must not exceed ${Format.bytes(cap.max)}`
    },

    cpuList(cpus: number[]): string {
        const ranges: string[] = []
        let i = 0
        while (i < cpus.length) {
            let j = i
            while (j + 1 < cpus.length && cpus[j + 1] === cpus[j] + 1) j++
            ranges.push(i === j ? `${cpus[i]}` : `${cpus[i]}-${cpus[j]}`)
            i = j + 1
        }
        return ranges.join(', ')
    },

    cpu(cpus: number[], cpu: number): string | null {
        return cpus.includes(cpu) ? null : `Core ${cpu} is not available (available: ${ConfigCheck.cpuList(cpus)})`
    },

    cpuRange(cpus: number[], [start, end]: [number, number]): string | null {
        if (start > end) return 'Start must not be greater than end'
        for (let cpu = start; cpu <= end; cpu++) {
            const error = ConfigCheck.cpu(cpus, cpu)
            if (error) return error
        }
        return null
    },

    ifname(name: string, maxLen: number): string | null {
        if (!name || name.length > maxLen || name === '.' || name === '..' || /[/:\s]/.test(name)) {
            return `1 to ${maxLen} characters, without '/', ':' or whitespace`
        }
        return null
    },

    cidr(entry: string): string | null {
        const [ip, prefix, extra] = entry.split('/')
        if (prefix === undefined || extra !== undefined || !/^\d+$/.test(prefix)) return `${entry}: not CIDR notation (e.g. 192.168.1.0/24)`
        const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(ip)
        const ipv6 = !ipv4 && ip.includes(':') && /^[0-9a-fA-F:.]+$/.test(ip)
        if (ipv4 && ipv4.slice(1).some((octet) => Number(octet) > 255)) return `${entry}: invalid IP address`
        if (!ipv4 && !ipv6) return `${entry}: invalid IP address`
        if (Number(prefix) > (ipv4 ? 32 : 128)) return `${entry}: prefix must be at most ${ipv4 ? 32 : 128}`
        return null
    },
}
