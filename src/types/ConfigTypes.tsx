export type XskBindMode = 'copy' | 'zero'

export type AlertMode = 'threshold' | 'limit' | 'both'

export type FusionMode = 'or' | 'and'

export interface NICConfig {
    ingress_ifname: string
    egress_ifname: string
    combined_queue_count: number
    channel_size: number
    fill_queue_size: number
    comp_queue_size: number
    tx_queue_size: number
    rx_queue_size: number
    frame_size: number
    frame_count: number
    xsk_bind_mode: XskBindMode
}

export interface CPUAffinityConfig {
    xsk_cpu_set: [number, number]
    ml_cpu: number
}

export interface MLConfig {
    max_concurrent_flows: number
    inference_interval_secs: number
    aggregator_window_secs: number
    aggregator_alert_mode: AlertMode
    aggregator_alert_limit: number
    inference_batch_size: number
    flow_timeout_us: number
    ml_inference_enabled: boolean
    fusion_mode: FusionMode
    fusion_window_secs: number
    ae_threshold_method: string
    adaptive_threshold_enabled: boolean
    adaptive_alpha: number
    adaptive_recalibrate_secs: number
    adaptive_target_alerts_min: number
    adaptive_target_alerts_max: number
    adaptive_min_strict_method: string
    adaptive_max_lenient_method: string
    adaptive_loosen_consecutive: number
    adaptive_max_loosen_steps_per_day: number
}

export interface SuricataConfig {
    worker_cpu_set: [number, number]
    management_cpu: number
    capture_ring_slots: number
    capture_slot_size: number
    event_ring_slots: number
    event_slot_size: number
    suppress: string[]
}

export type RiskLevel = 'low' | 'medium' | 'high'

export interface RiskNote {
    section: string
    level: RiskLevel
    message: string
}

export interface ConfigView {
    http_server_bind_port: number
    refresh_interval: number
    home_net: string[]
    session_idle_timeout_mins: number
    nic: NICConfig
    cpu_affinity: CPUAffinityConfig
    ml: MLConfig
    suricata: SuricataConfig
}

export interface FieldLimit {
    min: number
    max: number
    power_of_two: boolean
}

export interface ByteCap {
    fields: ConfigKey[]
    multiplier: number
    max: number
}

type ConfigLeaf = string | number | boolean | unknown[]

export type ConfigKey = {
    [S in keyof ConfigView & string]: ConfigView[S] extends ConfigLeaf ? S : `${S}.${keyof ConfigView[S] & string}`
}[keyof ConfigView & string]

export type ConfigValue<K extends ConfigKey> = K extends `${infer S extends keyof ConfigView}.${infer F}`
    ? F extends keyof ConfigView[S] ? ConfigView[S][F] : never
    : K extends keyof ConfigView ? ConfigView[K] : never

export interface GetConfigResponse {
    config: ConfigView
    risks: RiskNote[]
    cpus: number[]
    limits: Partial<Record<ConfigKey, FieldLimit>>
    ifname_max_len: number
    byte_caps: ByteCap[]
}

export type ConfigSection = 'general' | 'nic' | 'cpu_affinity' | 'ml' | 'suricata'

export interface ConfigUpdate {
    http_server_bind_port?: number
    refresh_interval?: number
    home_net?: string[]
    session_idle_timeout_mins?: number
    nic?: NICConfig
    cpu_affinity?: CPUAffinityConfig
    ml?: MLConfig
    suricata?: SuricataConfig
}
