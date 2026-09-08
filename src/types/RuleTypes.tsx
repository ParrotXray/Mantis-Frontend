export interface RuleFileSummary {
    filename: string
    enabled: boolean
    rule_count: number
    enabled_count: number
    size_bytes: number
}

export interface RuleLine {
    line_number: number
    enabled: boolean
    sid: number | null
    msg: string | null
    action: string | null
    proto: string | null
    raw: string
}

export interface RuleFileDetail {
    filename: string
    enabled: boolean
    content: string
    rules: RuleLine[]
}
