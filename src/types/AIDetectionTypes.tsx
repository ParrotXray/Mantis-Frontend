// ai detection types
export interface AlertLog {
    timestamp: number
    flow_key: string
    src_ip: string
    dst_ip: string
    src_port: number
    dst_port: number
    protocol: number
    is_attack: boolean
    attack_type: string
    confidence: number
    ae_score: number
    rf_score: number
    ensemble_score: number
}

export interface PriorityInfo {
    color: string
    bgColor: string
    icon: any
    label: string
}

export interface NotificationProps {
    message: string
    type: 'success' | 'error' | 'warning' | 'info'
    onClose: () => void
}

export interface AlertDetailsProps {
    log: AlertLog
    onClose: () => void
    showNotification: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void
}

export interface AlertItemProps {
    log: AlertLog
    index: number
    onClick: (index: number) => void
}

export interface FilterButtonProps {
    isActive: boolean
    onClick: () => void
    children: React.ReactNode
    className?: string
    activeClassName?: string
    activeHoverClassName?: string
}