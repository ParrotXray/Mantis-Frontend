export interface SystemHealthData {
  timestamp: number
  boot_time?: number
  uptime_seconds?: number
  system_info: {
    kernel_version: string,
    os_name: string,
    os_version: string,
    architecture: string,
    total_processes: number
  }
  cpu_details?: {
    cpu_brand: string
    core_count: number
    cpu_usage: number
    cpu_frequency: number
    cores: Array<{
      core_id: number
      usage_percent: number
      frequency: number
    }>
  }
  memory_usage: {
    total: number
    used: number
    available: number
    usage_percent: number
    swap_total: number
    swap_used: number
  }
  network_stats: {
    ingress: NetworkInterface
    egress: NetworkInterface
    management: NetworkInterface
  }
  load_average: {
    one_minute: number
    five_minute: number
    fifteen_minute: number
  } | null
  temperature: number
}

export interface NetworkInterface {
  interface: string
  bytes_received: number
  bytes_transmitted: number
  packets_received: number
  packets_transmitted: number
  errors_received: number
  errors_transmitted: number
}

export interface HealthMetric {
  name: string
  value: number | string
  unit?: string
  status: 'good' | 'warning' | 'critical' | 'unknown'
  icon: any
  color: string
  bgColor: string
  description?: string
}

export interface SystemDetailModalProps {
  isOpen: boolean
  onClose: () => void
  systemHealth: SystemHealthData | null
  type: 'cpu' | 'memory' | 'temperature'
}

export interface HealthCardProps {
  metric: HealthMetric
  index: number
  systemHealth?: SystemHealthData | null
  onClick?: () => void
}

export interface LoadAverageProps {
  loadAverage: SystemHealthData['load_average']
}

export interface NetworkStatsProps {
  networkStats: SystemHealthData['network_stats']
}
