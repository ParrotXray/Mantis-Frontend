import { faCircleExclamation, faCircleInfo, faLaptop, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons'
import { AppNotification, NotificationLevel } from '../types/NotificationTypes'
import { UI } from './ui'

export const NotificationStyle = {
    level: {
        info: { icon: faCircleInfo, color: UI.accent },
        warning: { icon: faTriangleExclamation, color: '#f59e0b' },
        critical: { icon: faCircleExclamation, color: '#ef4444' },
    } as Record<NotificationLevel, { icon: any; color: string }>,

    icon(n: AppNotification) {
        return n.category === 'device' ? faLaptop : NotificationStyle.level[n.level].icon
    },
}
