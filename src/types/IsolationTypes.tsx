// Mirrors backend model/isolation.rs (GET /ebpf/isolation).
export interface IsolationStatus {
    enabled: boolean
    // Unix seconds when isolation was turned on.
    since: number | null
    enabled_by: string | null
}
