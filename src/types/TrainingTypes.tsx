export interface TrainerNode {
    id: string
    name: string
    host: string
    port: number
    created_at: number
}

export interface TrainerNodeListResponse {
    items: TrainerNode[]
}

export type DatasetSource = 'kaggle' | 'upload'

export interface Dataset {
    id: string
    name: string
    source: DatasetSource
    row_count: number
    created_at: string
}

export interface DatasetListResponse {
    items: Dataset[]
}

export type JobStatus = 'pending' | 'running' | 'succeeded' | 'failed'

export interface TrainingJob {
    id: string
    dataset_id: string
    stages: string[]
    status: JobStatus
    current_stage: string | null
    error: string | null
    created_at: string
    started_at: string | null
    finished_at: string | null
    plots: string[]
}

export interface JobListResponse {
    items: TrainingJob[]
}

export interface JobStatusMessage {
    type: 'status'
    job_id: string
    status: JobStatus
    current_stage: string | null
    timestamp: number
}

export interface JobLogMessage {
    type: 'log'
    job_id: string
    log_line: string
    timestamp: number
}

export type JobSocketMessage = JobStatusMessage | JobLogMessage
