import React, { useCallback, useEffect, useMemo, useState } from 'react'
import Head from 'next/head'
import { motion } from 'framer-motion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronDown, faChevronRight, faLaptop, faMagnifyingGlass, faSyncAlt } from '@fortawesome/free-solid-svg-icons'
import { useTheme } from '../providers/ThemeProvider'
import { fetchData } from '../utils/connectionUtils'
import { urls } from '../utils/apiManager'
import Layout from '../components/Layout'
import { NextPageWithLayout } from '../types/NextPageWithLayout'
import { Device, DeviceList } from '../types/DeviceTypes'

const POLL_MS = 30_000
const DAY_SECS = 24 * 60 * 60
// Seen within this long counts as online.
const ONLINE_SECS = 5 * 60

type SortKey = 'last_seen' | 'first_seen' | 'ip' | 'mac' | 'vendor'

const formatRelative = (secs: number, now: number): string => {
    const diff = Math.max(0, now - secs)
    if (diff < 60) return `${diff}s ago`
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < DAY_SECS) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / DAY_SECS)}d ago`
}

const formatTime = (secs: number) =>
    new Date(secs * 1000).toLocaleString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })

// Numeric order for IPv4 ("192.168.1.10" after "192.168.1.9").
const ipKey = (ip: string): string =>
    ip.includes('.') ? ip.split('.').map(p => p.padStart(3, '0')).join('.') : ip

const compare = (a: Device, b: Device, key: SortKey): number => {
    switch (key) {
        case 'last_seen': return b.last_seen - a.last_seen
        case 'first_seen': return b.first_seen - a.first_seen
        case 'ip': return ipKey(a.current_ip).localeCompare(ipKey(b.current_ip))
        case 'mac': return a.mac.localeCompare(b.mac)
        case 'vendor': return (a.vendor ?? '￿').localeCompare(b.vendor ?? '￿')
    }
}

const DevicesPage: NextPageWithLayout = () => {
    const { actualTheme } = useTheme()
    const isDark = actualTheme === 'dark'

    const [data, setData] = useState<DeviceList | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [query, setQuery] = useState('')
    // MACs whose detail row is open.
    const [expanded, setExpanded] = useState<Set<string>>(new Set())
    const toggleExpanded = (mac: string) => setExpanded(prev => {
        const next = new Set(prev)
        if (next.has(mac)) next.delete(mac)
        else next.add(mac)
        return next
    })
    const [sortKey, setSortKey] = useState<SortKey>('last_seen')

    const load = useCallback(() => {
        setIsLoading(true)
        fetchData(
            urls.devices,
            (raw) => { setData(JSON.parse(raw)); setError(null); setIsLoading(false) },
            (e) => { setError(e?.message || 'Failed to load devices'); setIsLoading(false) },
        )
    }, [])

    useEffect(() => {
        load()
        const id = setInterval(load, POLL_MS)
        return () => clearInterval(id)
    }, [load])

    const now = Math.floor(Date.now() / 1000)
    const devices = useMemo(() => {
        const q = query.trim().toLowerCase()
        const list = (data?.devices ?? []).filter(d =>
            q === '' ||
            d.mac.includes(q.replace(/-/g, ':')) ||
            d.ips.some(ip => ip.includes(q)) ||
            (d.vendor ?? '').toLowerCase().includes(q))
        return [...list].sort((a, b) => compare(a, b, sortKey))
    }, [data, query, sortKey])

    const total = data?.devices.length ?? 0
    const online = (data?.devices ?? []).filter(d => now - d.last_seen <= ONLINE_SECS).length
    const newToday = (data?.devices ?? []).filter(d => now - d.first_seen <= DAY_SECS).length

    const mutedCls = isDark ? 'text-slate-500' : 'text-slate-400'
    const headCls = `px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider select-none ${mutedCls}`
    const cellCls = `px-3 py-2 text-xs align-top ${isDark ? 'text-slate-300' : 'text-slate-700'}`
    const badge = (text: string, cls: string) => (
        <span className={`ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${cls}`}>{text}</span>
    )
    const sortHead = (key: SortKey, label: string) => (
        <th className={`${headCls} cursor-pointer hover:underline`} onClick={() => setSortKey(key)}>
            {label}{sortKey === key ? ' ▾' : ''}
        </th>
    )

    return (
        <>
            <Head>
                <title>Devices - Mantis</title>
                <meta name="description" content="Devices seen on the internal network, by MAC address" />
            </Head>

            <div className="flex flex-col gap-4">
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-3 gap-3"
                >
                    {[
                        { label: 'Devices', value: total },
                        { label: `Online (${ONLINE_SECS / 60} min)`, value: online },
                        { label: 'First seen in 24h', value: newToday },
                    ].map(({ label, value }, index) => (
                        <motion.div
                            key={label}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className={`rounded-xl border p-3 ${isDark ? 'bg-[#0e1e2c] border-slate-700/40' : 'bg-white border-slate-200'}`}
                        >
                            <p className={`text-xs mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{label}</p>
                            <p className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{value}</p>
                        </motion.div>
                    ))}
                </motion.div>

                {data?.learning_until && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`rounded-lg px-4 py-2 text-xs ${isDark ? 'bg-sky-500/10 text-sky-300' : 'bg-sky-50 text-sky-700'}`}
                    >
                        Learning the existing devices: new-device alerts start in about {Math.max(1, Math.ceil((data.learning_until - now) / 60))} min.
                    </motion.div>
                )}

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className={`rounded-xl border overflow-hidden ${isDark ? 'bg-[#0e1e2c] border-slate-700/40' : 'bg-white border-slate-200'}`}
                >
                    <div className={`px-5 py-3 border-b flex flex-wrap items-center gap-3 ${isDark ? 'border-slate-700/40' : 'border-slate-200'}`}>
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-md bg-[#4ab5cc]/15 flex items-center justify-center">
                                <FontAwesomeIcon icon={faLaptop} className="text-[#4ab5cc] text-xs" />
                            </div>
                            <span className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>Devices</span>
                            <span className={`text-xs ${mutedCls}`}>Learned from traffic on the internal interface</span>
                        </div>
                        <div className="ml-auto flex items-center gap-2">
                            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md border ${isDark ? 'border-slate-700 bg-[#0a1620]' : 'border-slate-300 bg-white'}`}>
                                <FontAwesomeIcon icon={faMagnifyingGlass} className={`text-[11px] ${mutedCls}`} />
                                <input
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="IP, MAC or vendor"
                                    className={`bg-transparent outline-none text-xs w-48 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}
                                />
                            </div>
                            <button
                                onClick={load}
                                className={`px-2 py-1 rounded-md text-xs transition-colors ${isDark ? 'text-slate-300 hover:bg-slate-700/50' : 'text-slate-600 hover:bg-slate-100'}`}
                            >
                                <FontAwesomeIcon icon={faSyncAlt} className={`mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                                Refresh
                            </button>
                        </div>
                    </div>

                    {error ? (
                        <div className="p-6 text-sm text-red-400">{error}</div>
                    ) : devices.length === 0 ? (
                        <div className="p-10 text-center">
                            <FontAwesomeIcon icon={faLaptop} className={`text-4xl mb-3 ${isDark ? 'text-slate-600' : 'text-slate-300'}`} />
                            <p className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                {total === 0 ? 'No devices seen yet' : 'No device matches the search'}
                            </p>
                            {total === 0 && (
                                <p className={`text-xs mt-1 ${mutedCls}`}>Devices appear once they send traffic from an address inside home_net.</p>
                            )}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className={isDark ? 'bg-[#131929]' : 'bg-slate-50'}>
                                    <tr>
                                        <th className={`${headCls} w-6`}></th>
                                        {sortHead('ip', 'IP')}
                                        {sortHead('mac', 'MAC')}
                                        {sortHead('vendor', 'Vendor')}
                                        {sortHead('first_seen', 'First seen')}
                                        {sortHead('last_seen', 'Last seen')}
                                    </tr>
                                </thead>
                                <tbody className={`divide-y ${isDark ? 'divide-slate-700/40' : 'divide-slate-100'}`}>
                                    {devices.map((d, index) => {
                                        const isOnline = now - d.last_seen <= ONLINE_SECS
                                        const isNew = now - d.first_seen <= DAY_SECS
                                        const isExpanded = expanded.has(d.mac)
                                        // Most recent first.
                                        const history = [...d.ips].reverse()
                                        return (
                                            <React.Fragment key={d.mac}>
                                                <motion.tr
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    transition={{ delay: Math.min(index * 0.01, 0.5) }}
                                                    onClick={() => toggleExpanded(d.mac)}
                                                    aria-expanded={isExpanded}
                                                    className={`cursor-pointer ${isDark ? 'hover:bg-slate-700/20' : 'hover:bg-slate-50'}`}
                                                >
                                                    <td className={`${cellCls} ${mutedCls}`}>
                                                        <FontAwesomeIcon icon={isExpanded ? faChevronDown : faChevronRight} className="text-[10px]" />
                                                    </td>
                                                    <td className={`${cellCls} font-mono whitespace-nowrap`}>
                                                        <span className={`inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle ${isOnline ? 'bg-emerald-400' : isDark ? 'bg-slate-600' : 'bg-slate-300'}`} />
                                                        {d.current_ip}
                                                        {isNew && badge('new', isDark ? 'bg-sky-500/15 text-sky-300' : 'bg-sky-100 text-sky-700')}
                                                    </td>
                                                    <td className={`${cellCls} font-mono whitespace-nowrap`}>{d.mac}</td>
                                                    <td className={cellCls}>
                                                        {d.randomized
                                                            ? <span className={mutedCls}>Randomized MAC</span>
                                                            : d.vendor ?? <span className={mutedCls}>Unknown</span>}
                                                    </td>
                                                    <td className={`${cellCls} whitespace-nowrap`} title={formatTime(d.first_seen)}>{formatRelative(d.first_seen, now)}</td>
                                                    <td className={`${cellCls} whitespace-nowrap`} title={formatTime(d.last_seen)}>{formatRelative(d.last_seen, now)}</td>
                                                </motion.tr>
                                                {isExpanded && (
                                                    <motion.tr
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        transition={{ duration: 0.15 }}
                                                        className={isDark ? 'bg-[#131929]' : 'bg-slate-50'}
                                                    >
                                                        <td></td>
                                                        <td colSpan={5} className="px-3 py-3">
                                                            <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-4 text-xs">
                                                                <dl className="space-y-1.5">
                                                                    {[
                                                                        ['MAC', <span key="m" className="font-mono">{d.mac}</span>],
                                                                        ['Vendor', d.randomized ? 'Randomized MAC (no vendor; may change over time)' : d.vendor ?? 'Unknown'],
                                                                        ['First seen', formatTime(d.first_seen)],
                                                                        ['Last seen', `${formatTime(d.last_seen)} (${formatRelative(d.last_seen, now)})`],
                                                                    ].map(([label, value]) => (
                                                                        <div key={label as string} className="flex gap-2">
                                                                            <dt className={`w-20 flex-shrink-0 ${mutedCls}`}>{label}</dt>
                                                                            <dd className={isDark ? 'text-slate-300' : 'text-slate-700'}>{value}</dd>
                                                                        </div>
                                                                    ))}
                                                                </dl>
                                                                <div>
                                                                    <p className={`mb-1.5 ${mutedCls}`}>
                                                                        IP addresses ({history.length}, most recent first)
                                                                    </p>
                                                                    <ul className="flex flex-wrap gap-1.5">
                                                                        {history.map(ip => (
                                                                            <li key={ip}
                                                                                className={`px-2 py-0.5 rounded font-mono ${ip === d.current_ip
                                                                                    ? 'bg-[#4ab5cc]/15 text-[#4ab5cc]'
                                                                                    : isDark ? 'bg-slate-700/50 text-slate-300' : 'bg-white border border-slate-200 text-slate-600'}`}>
                                                                                {ip}{ip === d.current_ip ? ' (current)' : ''}
                                                                            </li>
                                                                        ))}
                                                                    </ul>
                                                                    {history.length >= 8 && (
                                                                        <p className={`mt-2 text-[11px] ${mutedCls}`}>
                                                                            Many addresses on one MAC can mean a NAT device (an AP or router not in bridge mode) sits behind Mantis, hiding the devices behind it.
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </motion.tr>
                                                )}
                                            </React.Fragment>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </motion.div>
            </div>
        </>
    )
}

DevicesPage.getLayout = (page: React.ReactElement) => <Layout>{page}</Layout>

export default DevicesPage
