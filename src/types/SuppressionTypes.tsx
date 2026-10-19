import { NicType } from './AccessControlTypes'

export interface SuppressionAnchor {
    src_ip: string
    src_port: number
    dst_ip: string
    dst_port: number
    protocol: number
    timestamp: number
}

export interface SuppressionRule {
    id: number
    src_ip: string | null
    src_port: number | null
    dst_ip: string | null
    dst_port: number | null
    protocol: number | null
    direction: NicType | null
    score_cap: number
    reason: string
    created_by: string
    created_at: number
    expires_at: number | null
    hit_count: number
    last_hit_at: number | null
    anchor: SuppressionAnchor
}

export interface SuppressionList {
    rules: SuppressionRule[]
    default_score_cap: number
}

export interface CreateSuppression {
    src_ip: string | null
    src_port: number | null
    dst_ip: string | null
    dst_port: number | null
    protocol: number | null
    direction: NicType | null
    score_cap: number
    expires_in_days: number | null
    reason: string
    anchor: SuppressionAnchor
}

export interface SuppressibleAlert {
    timestamp: number
    src_ip: string
    dst_ip: string
    src_port: number
    dst_port: number
    protocol: number
    source: string
    ae_score: number
    direction: NicType | null
}
