import React, { useCallback, useEffect, useMemo, useState } from 'react'
import Head from 'next/head'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faLaptop, faMagnifyingGlass, faSyncAlt } from '@fortawesome/free-solid-svg-icons'
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
                <div className="grid grid-cols-3 gap-3">
                    {[
                        { label: 'Devices', value: total },
                        { label: `Online (${ONLINE_SECS / 60} min)`, value: online },
                        { label: 'First seen in 24h', value: newToday },
                    ].map(({ label, value }) => (
                        <div key={label} className={`rounded-xl border p-3 ${isDark ? 'bg-[#0e1e2c] border-slate-700/40' : 'bg-white border-slate-200'}`}>
                            <p className={`text-xs mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{label}</p>
                            <p className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{value}</p>
                        </div>
                    ))}
                </div>

                {data?.learning_until && (
                    <div className={`rounded-lg px-4 py-2 text-xs ${isDark ? 'bg-sky-500/10 text-sky-300' : 'bg-sky-50 text-sky-700'}`}>
                        Learning the existing devices: new-device alerts start in about {Math.max(1, Math.ceil((data.learning_until - now) / 60))} min.
                    </div>
                )}

                <div className={`rounded-xl border overflow-hidden ${isDark ? 'bg-[#0e1e2c] border-slate-700/40' : 'bg-white border-slate-200'}`}>
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
                                        {sortHead('ip', 'IP')}
                                        {sortHead('mac', 'MAC')}
                                        {sortHead('vendor', 'Vendor')}
                                        <th className={headCls}>Other IPs</th>
                                        {sortHead('first_seen', 'First seen')}
                                        {sortHead('last_seen', 'Last seen')}
                                    </tr>
                                </thead>
                                <tbody className={`divide-y ${isDark ? 'divide-slate-700/40' : 'divide-slate-100'}`}>
                                    {devices.map(d => {
                                        const isOnline = now - d.last_seen <= ONLINE_SECS
                                        const isNew = now - d.first_seen <= DAY_SECS
                                        const others = d.ips.filter(ip => ip !== d.current_ip)
                                        return (
                                            <tr key={d.mac}>
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
                                                <td className={`${cellCls} font-mono`}>
                                                    {others.length > 0 ? others.join(', ') : <span className={mutedCls}>—</span>}
                                                </td>
                                                <td className={`${cellCls} whitespace-nowrap`} title={formatTime(d.first_seen)}>{formatRelative(d.first_seen, now)}</td>
                                                <td className={`${cellCls} whitespace-nowrap`} title={formatTime(d.last_seen)}>{formatRelative(d.last_seen, now)}</td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </>
    )
}

DevicesPage.getLayout = (page: React.ReactElement) => <Layout>{page}</Layout>

export default DevicesPage
