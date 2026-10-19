export interface Device {
    mac: string
    vendor: string | null
    randomized: boolean
    current_ip: string
    ips: string[]
    first_seen: number
    last_seen: number
}

export interface DeviceList {
    devices: Device[]
    learning_until: number | null
}
