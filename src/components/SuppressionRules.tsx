import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowRight, faBellSlash, faClock, faSyncAlt, faTrash } from '@fortawesome/free-solid-svg-icons'
import { useTheme } from '../providers/ThemeProvider'
import { deleteData, patchData } from '../utils/connectionUtils'
import { urls } from '../utils/apiManager'
import { SuppressionRule } from '../types/SuppressionTypes'

interface SuppressionRulesProps {
    rules: SuppressionRule[]
    isLoading: boolean
    error: string | null
    onRefresh: () => void
    showNotification: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void
}

const DAY_SECS = 24 * 60 * 60
const EXPIRING_SOON_SECS = 7 * DAY_SECS
// A rule with no hits for this long may no longer be needed.
const UNUSED_SECS = 14 * DAY_SECS
const EXTEND_DAYS = 30

const PROTOCOL_NAMES: Record<number, string> = { 1: 'ICMP', 6: 'TCP', 17: 'UDP', 58: 'ICMPv6' }

// "10.0.0.5/32" reads better as a bare address.
const formatNet = (net: string | null): string => {
    if (net === null) return '*'
    const [addr, prefix] = net.split('/')
    const full = addr.includes(':') ? '128' : '32'
    return prefix === full ? addr : net
}

const formatEndpoint = (net: string | null, port: number | null): string => {
    const addr = formatNet(net)
    const shown = addr.includes(':') && addr !== '*' ? `[${addr}]` : addr
    return `${shown}:${port ?? '*'}`
}

const formatRelative = (secs: number, now: number): string => {
    const diff = secs - now
    const abs = Math.abs(diff)
    const value =
        abs < 60 ? `${abs}s`
            : abs < 3600 ? `${Math.floor(abs / 60)}m`
                : abs < DAY_SECS ? `${Math.floor(abs / 3600)}h`
                    : `${Math.floor(abs / DAY_SECS)}d`
    return diff >= 0 ? `in ${value}` : `${value} ago`
}

const SuppressionRules: React.FC<SuppressionRulesProps> = ({ rules, isLoading, error, onRefresh, showNotification }) => {
    const { actualTheme } = useTheme()
    const isDark = actualTheme === 'dark'
    const now = Math.floor(Date.now() / 1000)

    const handleExtend = (rule: SuppressionRule) => {
        patchData(
            urls.suppressions.item(rule.id),
            { expires_in_days: EXTEND_DAYS },
            () => { showNotification(`Rule #${rule.id} now expires in ${EXTEND_DAYS} days`, 'success'); onRefresh() },
            (e) => showNotification(`Failed to extend rule #${rule.id}: ${e.message}`, 'error'),
        )
    }

    const handleDelete = (rule: SuppressionRule) => {
        if (!window.confirm(`Delete suppression rule #${rule.id}? Matching ML alerts will start appearing again.`)) return
        deleteData(
            urls.suppressions.item(rule.id),
            null,
            () => { showNotification(`Rule #${rule.id} deleted`, 'success'); onRefresh() },
            (e) => showNotification(`Failed to delete rule #${rule.id}: ${e.message}`, 'error'),
        )
    }

    const headCls = `px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`
    const cellCls = `px-3 py-2 text-xs align-top ${isDark ? 'text-slate-300' : 'text-slate-700'}`
    const mutedCls = isDark ? 'text-slate-500' : 'text-slate-400'
    const badge = (text: string, tone: 'amber' | 'slate' | 'red') => {
        const tones = {
            amber: isDark ? 'bg-amber-500/15 text-amber-300' : 'bg-amber-100 text-amber-700',
            slate: isDark ? 'bg-slate-700/50 text-slate-400' : 'bg-slate-100 text-slate-500',
            red: isDark ? 'bg-red-500/15 text-red-300' : 'bg-red-100 text-red-700',
        }
        return <span className={`ml-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${tones[tone]}`}>{text}</span>
    }

    return (
        <div className={`rounded-xl border overflow-hidden flex flex-col ${isDark ? 'bg-[#0e1e2c] border-slate-700/40' : 'bg-white border-slate-200'}`}
             style={{ minHeight: '400px' }}>
            <div className={`px-5 py-3 border-b flex items-center justify-between flex-shrink-0 ${isDark ? 'border-slate-700/40' : 'border-slate-200'}`}>
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-[#4ab5cc]/15 flex items-center justify-center">
                        <FontAwesomeIcon icon={faBellSlash} className="text-[#4ab5cc] text-xs" />
                    </div>
                    <span className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>Suppression Rules</span>
                    <span className={`text-xs ${mutedCls}`}>Hide confirmed false-positive ML alerts. Blocking and Suricata are not affected.</span>
                </div>
                <button
                    onClick={onRefresh}
                    className={`px-2 py-1 rounded-md text-xs transition-colors ${isDark ? 'text-slate-300 hover:bg-slate-700/50' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                    <FontAwesomeIcon icon={faSyncAlt} className={`mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {error ? (
                <div className="p-6 text-sm text-red-400">{error}</div>
            ) : rules.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
                    <FontAwesomeIcon icon={faBellSlash} className={`text-4xl mb-3 ${isDark ? 'text-slate-600' : 'text-slate-300'}`} />
                    <p className={`text-sm font-medium mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>No suppression rules</p>
                    <p className={`text-xs ${mutedCls}`}>Open an ML alert and choose Mark as false positive to create one.</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className={isDark ? 'bg-[#131929]' : 'bg-slate-50'}>
                            <tr>
                                <th className={headCls}>Pattern</th>
                                <th className={headCls}>Score cap</th>
                                <th className={headCls}>Hits</th>
                                <th className={headCls}>Last hit</th>
                                <th className={headCls}>Expires</th>
                                <th className={headCls}>Created</th>
                                <th className={headCls}>Reason</th>
                                <th className={headCls}></th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${isDark ? 'divide-slate-700/40' : 'divide-slate-100'}`}>
                            {rules.map(rule => {
                                const expired = rule.expires_at !== null && rule.expires_at <= now
                                const expiringSoon = !expired && rule.expires_at !== null && rule.expires_at - now <= EXPIRING_SOON_SECS
                                const unused = !expired && now - (rule.last_hit_at ?? rule.created_at) >= UNUSED_SECS
                                return (
                                    <tr key={rule.id} className={expired ? 'opacity-50' : ''}>
                                        <td className={`${cellCls} font-mono whitespace-nowrap`}>
                                            {formatEndpoint(rule.src_ip, rule.src_port)}
                                            <FontAwesomeIcon icon={faArrowRight} className={`mx-1.5 text-[10px] ${mutedCls}`} />
                                            {formatEndpoint(rule.dst_ip, rule.dst_port)}
                                            <span className={`ml-1.5 ${mutedCls}`}>
                                                {rule.protocol !== null ? (PROTOCOL_NAMES[rule.protocol] ?? rule.protocol) : 'any'}
                                                {rule.direction ? ` / ${rule.direction}` : ''}
                                            </span>
                                        </td>
                                        <td className={`${cellCls} font-mono`}>{rule.score_cap.toFixed(4)}</td>
                                        <td className={`${cellCls} font-mono`}>
                                            {rule.hit_count}
                                            {unused && badge('unused', 'slate')}
                                        </td>
                                        <td className={cellCls}>{rule.last_hit_at !== null ? formatRelative(rule.last_hit_at, now) : <span className={mutedCls}>never</span>}</td>
                                        <td className={`${cellCls} whitespace-nowrap`}>
                                            {rule.expires_at === null ? 'permanent' : formatRelative(rule.expires_at, now)}
                                            {expired && badge('expired', 'red')}
                                            {expiringSoon && badge('soon', 'amber')}
                                        </td>
                                        <td className={`${cellCls} whitespace-nowrap`}>
                                            {rule.created_by}
                                            <div className={`text-[11px] ${mutedCls}`}>{formatRelative(rule.created_at, now)}</div>
                                        </td>
                                        <td className={`${cellCls} max-w-xs break-words`}>{rule.reason}</td>
                                        <td className={`${cellCls} whitespace-nowrap text-right`}>
                                            <button
                                                onClick={() => handleExtend(rule)}
                                                title={`Expire ${EXTEND_DAYS} days from now`}
                                                className={`px-2 py-1 rounded-md text-xs transition-colors ${isDark ? 'text-slate-300 hover:bg-slate-700/50' : 'text-slate-600 hover:bg-slate-100'}`}
                                            >
                                                <FontAwesomeIcon icon={faClock} className="mr-1" />
                                                {EXTEND_DAYS}d
                                            </button>
                                            <button
                                                onClick={() => handleDelete(rule)}
                                                title="Delete rule"
                                                className={`ml-1 px-2 py-1 rounded-md text-xs transition-colors ${isDark ? 'text-red-400 hover:bg-red-500/10' : 'text-red-600 hover:bg-red-50'}`}
                                            >
                                                <FontAwesomeIcon icon={faTrash} />
                                            </button>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}

export default SuppressionRules
