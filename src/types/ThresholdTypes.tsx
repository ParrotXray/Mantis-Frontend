// Mirrors backend model/threshold.rs (GET /detection/threshold).

export interface ThresholdRung {
    method: string
    value: number
}

export type LoosenHold =
    | 'none'
    | 'confirmed_attack'
    | 'structural_attack'
    | 'not_marginal'
    | 'awaiting_streak'
    | 'daily_budget'
    | 'at_ceiling'
    | 'network_isolated'

export interface ThresholdEvaluation {
    // Unix seconds.
    timestamp: number
    before: number
    after: number
    target_method: string
    target_value: number
    alert_count: number
    marginal: number
    corroborated: number
    structural: number
    moved: boolean
    loosen_hold: LoosenHold
}

export interface AdaptiveThresholdStatus {
    recalibrate_secs: number
    target_alerts_min: number
    target_alerts_max: number
    min_strict: ThresholdRung
    max_lenient: ThresholdRung
    loosen_consecutive: number
    max_loosen_steps_per_day: number
    loosen_steps_last_24h: number
    over_target_streak: number
    // Strictest first.
    ladder: ThresholdRung[]
    // Oldest first, since process start.
    history: ThresholdEvaluation[]
}

export interface ThresholdStatus {
    // Null when ML inference is disabled.
    current: number | null
    baseline: ThresholdRung
    // Null when adaptive_threshold_enabled is false.
    adaptive: AdaptiveThresholdStatus | null
}
