export type NicType = 'ingress' | 'egress'
export type FlowType = 'source' | 'destination'
export type ListType = 'white_list' | 'black_list'
export type IpVersion = 'ipv4' | 'ipv6'

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