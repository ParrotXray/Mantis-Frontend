export interface AccessControlItem {
    ip: string
    ports: (string | number)[]
}

export interface NotificationProps {
    message: string
    type: 'success' | 'error' | 'warning' | 'info'
    onClose: () => void
}

export interface ModalProps {
    title: string
    children: React.ReactNode
    onClose: () => void
    onSubmit?: () => void
    submitLabel?: string
    submitDisabled?: boolean
}

export interface ToggleButtonProps {
    isActive: boolean
    onClick: () => void
    children: React.ReactNode
    className?: string
}

export interface StatsCardProps {
    title: string
    value: number
    icon: any
    color: string
}