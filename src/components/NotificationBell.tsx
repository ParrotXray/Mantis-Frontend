import React, { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBell, faShieldHalved } from '@fortawesome/free-solid-svg-icons'
import { useTheme } from '../providers/ThemeProvider'
import { useNotifications } from '../providers/NotificationProvider'
import { NotificationStyle } from '../constants/notification'
import { UI } from '../constants/ui'
import { Format } from '../utils/format'

const SHOWN = 8

const NotificationBell: React.FC = () => {
    const { actualTheme } = useTheme()
    const isDark = actualTheme === 'dark'
    const { notifications, readId, unreadCount, newAlertCount, markAllRead, markAlertsSeen } = useNotifications()
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)
    const hasDot = unreadCount > 0 || newAlertCount > 0
    const now = Math.floor(Date.now() / 1000)

    useEffect(() => {
        if (!open) return
        const onClick = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
        }
        document.addEventListener('mousedown', onClick)
        return () => document.removeEventListener('mousedown', onClick)
    }, [open])

    const muted = isDark ? 'text-slate-500' : 'text-slate-400'

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setOpen(o => !o)}
                title={hasDot ? `${unreadCount} unread notifications, ${newAlertCount} new alerts` : 'Notifications'}
                aria-label="Notifications"
                className="relative w-7 h-7 flex items-center justify-center rounded-md transition-colors"
                style={{ color: open ? UI.accent : 'rgba(74,181,204,0.6)' }}
            >
                <FontAwesomeIcon icon={faBell} className="text-xs" />
                {hasDot && (
                    <span data-testid="bell-dot" className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 ring-2"
                          style={{ ['--tw-ring-color' as any]: isDark ? '#0c1a24' : '#ffffff' }} />
                )}
            </button>

            {open && (
                <div className={`absolute right-0 mt-2 w-80 rounded-xl border shadow-lg z-50 overflow-hidden ${isDark ? 'bg-[#0e1e2c] border-slate-700/60' : 'bg-white border-slate-200'}`}>
                    <div className={`px-3 py-2 flex items-center justify-between border-b ${isDark ? 'border-slate-700/40' : 'border-slate-200'}`}>
                        <span className={`text-xs font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>Notifications</span>
                        <button onClick={markAllRead} disabled={unreadCount === 0}
                                className={`text-[11px] ${unreadCount === 0 ? muted : 'text-[#4ab5cc] hover:underline'}`}>
                            Mark all read
                        </button>
                    </div>

                    {newAlertCount > 0 && (
                        <Link href="/detection" onClick={() => { markAlertsSeen(); setOpen(false) }}
                              className={`flex items-center gap-2 px-3 py-2 border-b no-underline ${isDark ? 'border-slate-700/40 bg-red-500/10 hover:bg-red-500/15' : 'border-slate-200 bg-red-50 hover:bg-red-100'}`}>
                            <FontAwesomeIcon icon={faShieldHalved} className="text-xs text-red-500" />
                            <span className={`text-xs ${isDark ? 'text-red-300' : 'text-red-700'}`}>
                                {newAlertCount} new threat alert{newAlertCount === 1 ? '' : 's'}
                            </span>
                        </Link>
                    )}

                    <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <p className={`px-3 py-6 text-center text-xs ${muted}`}>No notifications yet</p>
                        ) : notifications.slice(0, SHOWN).map(n => {
                            const unread = n.id > readId
                            const body = (
                                <div className={`flex gap-2 px-3 py-2 ${unread ? (isDark ? 'bg-[#4ab5cc]/5' : 'bg-sky-50/60') : ''}`}>
                                    <FontAwesomeIcon icon={NotificationStyle.icon(n)} className="text-xs mt-0.5" style={{ color: NotificationStyle.level[n.level].color }} />
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className={`text-xs font-medium truncate ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{n.title}</span>
                                            <span className={`text-[10px] whitespace-nowrap ${muted}`}>{Format.relative(n.timestamp, now)}</span>
                                        </div>
                                        <p className={`text-[11px] leading-snug break-words ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{n.message}</p>
                                    </div>
                                    {unread && <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />}
                                </div>
                            )
                            return n.link ? (
                                <Link key={n.id} href={n.link} onClick={() => setOpen(false)} className={`block no-underline ${isDark ? 'hover:bg-slate-700/30' : 'hover:bg-slate-50'}`}>{body}</Link>
                            ) : <div key={n.id}>{body}</div>
                        })}
                    </div>

                    <Link href="/notifications" onClick={() => setOpen(false)}
                          className={`block text-center text-[11px] py-2 border-t no-underline text-[#4ab5cc] hover:underline ${isDark ? 'border-slate-700/40' : 'border-slate-200'}`}>
                        View all
                    </Link>
                </div>
            )}
        </div>
    )
}

export default NotificationBell
