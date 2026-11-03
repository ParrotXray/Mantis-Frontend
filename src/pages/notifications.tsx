import React, { useMemo, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBell, faSyncAlt } from '@fortawesome/free-solid-svg-icons'
import { useTheme } from '../providers/ThemeProvider'
import { useNotifications } from '../providers/NotificationProvider'
import { LEVEL_STYLE, formatAgo, notificationIcon } from '../components/NotificationBell'
import Layout from '../components/Layout'
import { NextPageWithLayout } from '../types/NextPageWithLayout'
import { NotificationCategory, NotificationLevel } from '../types/NotificationTypes'

type Filter = 'all' | NotificationCategory | NotificationLevel

const FILTERS: { value: Filter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'system', label: 'System' },
    { value: 'device', label: 'Devices' },
    { value: 'warning', label: 'Warnings' },
    { value: 'critical', label: 'Critical' },
]

const NotificationsPage: NextPageWithLayout = () => {
    const { actualTheme } = useTheme()
    const isDark = actualTheme === 'dark'
    const { notifications, readId, unreadCount, markAllRead, refresh } = useNotifications()
    const [filter, setFilter] = useState<Filter>('all')
    const now = Math.floor(Date.now() / 1000)

    const shown = useMemo(() => notifications.filter(n =>
        filter === 'all' || n.category === filter || n.level === filter), [notifications, filter])

    const muted = isDark ? 'text-slate-500' : 'text-slate-400'

    return (
        <>
            <Head>
                <title>Notifications - Mantis</title>
                <meta name="description" content="System and device notifications" />
            </Head>

            <div className="max-w-4xl mx-auto flex flex-col gap-4">
                <div className={`rounded-xl border overflow-hidden ${isDark ? 'bg-[#0e1e2c] border-slate-700/40' : 'bg-white border-slate-200'}`}>
                    <div className={`px-5 py-3 border-b flex flex-wrap items-center gap-3 ${isDark ? 'border-slate-700/40' : 'border-slate-200'}`}>
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-md bg-[#4ab5cc]/15 flex items-center justify-center">
                                <FontAwesomeIcon icon={faBell} className="text-[#4ab5cc] text-xs" />
                            </div>
                            <span className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>Notifications</span>
                            <span className={`text-xs ${muted}`}>{unreadCount} unread</span>
                        </div>
                        <div className="flex items-center gap-1">
                            {FILTERS.map(f => (
                                <button key={f.value} onClick={() => setFilter(f.value)}
                                        className={`px-2.5 py-1 rounded-md text-xs transition-colors ${filter === f.value
                                            ? 'bg-[#4ab5cc] text-white'
                                            : isDark ? 'text-slate-300 hover:bg-slate-700/50' : 'text-slate-600 hover:bg-slate-100'}`}>
                                    {f.label}
                                </button>
                            ))}
                        </div>
                        <div className="ml-auto flex items-center gap-1">
                            <button onClick={markAllRead} disabled={unreadCount === 0}
                                    className={`px-2 py-1 rounded-md text-xs ${unreadCount === 0 ? muted : 'text-[#4ab5cc] hover:underline'}`}>
                                Mark all read
                            </button>
                            <button onClick={refresh}
                                    className={`px-2 py-1 rounded-md text-xs transition-colors ${isDark ? 'text-slate-300 hover:bg-slate-700/50' : 'text-slate-600 hover:bg-slate-100'}`}>
                                <FontAwesomeIcon icon={faSyncAlt} className="mr-1" />
                                Refresh
                            </button>
                        </div>
                    </div>

                    {shown.length === 0 ? (
                        <div className="p-10 text-center">
                            <FontAwesomeIcon icon={faBell} className={`text-4xl mb-3 ${isDark ? 'text-slate-600' : 'text-slate-300'}`} />
                            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>No notifications</p>
                            <p className={`text-xs mt-1 ${muted}`}>Threat alerts are on the Detection page; this lists system and device events.</p>
                        </div>
                    ) : (
                        <ul className={`divide-y ${isDark ? 'divide-slate-700/40' : 'divide-slate-100'}`}>
                            {shown.map(n => {
                                const unread = n.id > readId
                                return (
                                    <li key={n.id} className={`flex gap-3 px-5 py-3 ${unread ? (isDark ? 'bg-[#4ab5cc]/5' : 'bg-sky-50/60') : ''}`}>
                                        <FontAwesomeIcon icon={notificationIcon(n)} className="text-sm mt-0.5" style={{ color: LEVEL_STYLE[n.level].color }} />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className={`text-sm font-medium ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{n.title}</span>
                                                {unread && <span className="w-1.5 h-1.5 rounded-full bg-red-500" />}
                                                <span className={`ml-auto text-[11px] whitespace-nowrap ${muted}`}
                                                      title={new Date(n.timestamp * 1000).toLocaleString()}>
                                                    {formatAgo(n.timestamp, now)}
                                                </span>
                                            </div>
                                            <p className={`text-xs mt-0.5 break-words ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{n.message}</p>
                                            {n.link && (
                                                <Link href={n.link} className="text-[11px] text-[#4ab5cc] hover:underline no-underline">Open</Link>
                                            )}
                                        </div>
                                    </li>
                                )
                            })}
                        </ul>
                    )}
                </div>
            </div>
        </>
    )
}

NotificationsPage.getLayout = (page: React.ReactElement) => <Layout>{page}</Layout>

export default NotificationsPage
