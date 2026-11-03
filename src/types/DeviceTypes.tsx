// Mirrors backend model/device.rs (GET /devices).

export interface Device {
    // Lower-case, colon separated.
    mac: string
    vendor: string | null
    // Locally administered (privacy) MAC: no vendor, may rotate.
    randomized: boolean
    current_ip: string
    // Most recent last.
    ips: string[]
    // Unix seconds.
    first_seen: number
    last_seen: number
}

export interface DeviceList {
    devices: Device[]
    // Unix seconds until which new-device alerts are held back on a fresh inventory.
    learning_until: number | null
}
