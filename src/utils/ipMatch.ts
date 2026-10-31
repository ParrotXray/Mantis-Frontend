// Minimal IP / CIDR matching, used to preview which alerts a suppression rule
// would cover before it is created. The backend does the authoritative match.

const parseIPv4 = (ip: string): number[] | null => {
    const parts = ip.split('.')
    if (parts.length !== 4) return null
    const bytes = parts.map(p => (/^\d{1,3}$/.test(p) ? Number(p) : NaN))
    return bytes.every(b => b >= 0 && b <= 255) ? bytes : null
}

const parseIPv6 = (ip: string): number[] | null => {
    const halves = ip.split('::')
    if (halves.length > 2) return null
    const toGroups = (s: string) => (s === '' ? [] : s.split(':'))
    const head = toGroups(halves[0])
    const tail = halves.length === 2 ? toGroups(halves[1]) : []
    const missing = 8 - head.length - tail.length
    if (halves.length === 1 ? missing !== 0 : missing < 1) return null
    const groups = [...head, ...Array(halves.length === 2 ? missing : 0).fill('0'), ...tail]
    const words = groups.map(g => (/^[0-9a-fA-F]{1,4}$/.test(g) ? parseInt(g, 16) : NaN))
    if (words.some(w => Number.isNaN(w))) return null
    // Split each 16-bit word into two bytes so both families compare the same way.
    return words.flatMap(w => [w >> 8, w & 0xff])
}

export const parseIp = (ip: string): number[] | null =>
    ip.includes(':') ? parseIPv6(ip) : parseIPv4(ip)

export const isIPv6 = (ip: string): boolean => ip.includes(':')

// `cidr` is "addr/prefix" or a bare address (full-length prefix).
export const cidrContains = (cidr: string, ip: string): boolean => {
    const [netStr, prefixStr] = cidr.split('/')
    const net = parseIp(netStr)
    const addr = parseIp(ip)
    if (!net || !addr || net.length !== addr.length) return false
    const prefix = prefixStr === undefined ? net.length * 8 : Number(prefixStr)
    if (!Number.isInteger(prefix) || prefix < 0 || prefix > net.length * 8) return false
    for (let bit = 0; bit < prefix; bit += 8) {
        const i = bit / 8
        const bitsHere = Math.min(8, prefix - bit)
        const mask = (0xff << (8 - bitsHere)) & 0xff
        if ((net[i] & mask) !== (addr[i] & mask)) return false
    }
    return true
}
