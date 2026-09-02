export type XskBindMode = 'copy' | 'zero'

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
    xsk_cpu_set: [number, number] | null
    ml_cpu: number | null
}

export interface MLConfig {
    max_concurrent_flows: number
    inference_interval_secs: number
    aggregator_window_secs: number
    aggregator_alert_mode: string
    aggregator_alert_limit: number
    inference_batch_size: number
    flow_timeout_us: number
    traffic_logging_mode: boolean
    fusion_mode: string
    fusion_window_secs: number
    ae_threshold_method: string
    adaptive_threshold_enabled: boolean
    adaptive_alpha: number
    adaptive_recalibrate_secs: number
    adaptive_target_alerts_min: number
    adaptive_target_alerts_max: number
    adaptive_max_lenient_method: string
}

export interface SuricataConfig {
    home_net: string[]
    worker_cpu_set: [number, number] | null
    management_cpu: number | null
    af_packet_threads: string
    af_packet_ring_size: number
    af_packet_block_size: number
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
    nic: NICConfig
    cpu_affinity: CPUAffinityConfig
    ml: MLConfig
    suricata: SuricataConfig | null
}

export interface GetConfigResponse {
    config: ConfigView
    risks: RiskNote[]
    num_cpus: number
}

export type ConfigSection = 'general' | 'nic' | 'cpu_affinity' | 'ml' | 'suricata'

export interface ConfigUpdate {
    http_server_bind_port?: number
    refresh_interval?: number
    nic?: NICConfig
    cpu_affinity?: CPUAffinityConfig
    ml?: MLConfig
    suricata?: SuricataConfig
}
