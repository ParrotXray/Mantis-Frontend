import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBan, faPlug } from '@fortawesome/free-solid-svg-icons'
import { useTheme } from '../providers/ThemeProvider'
import { useIsolation } from '../providers/IsolationProvider'

interface NetworkIsolationCardProps {
    showNotification: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void
}

const formatSince = (secs: number | null) =>
    secs === null ? 'unknown time' : new Date(secs * 1000).toLocaleString()

const NetworkIsolationCard: React.FC<NetworkIsolationCardProps> = ({ showNotification }) => {
    const { actualTheme } = useTheme()
    const isDark = actualTheme === 'dark'
    const { status, busy, setEnabled } = useIsolation()
    const enabled = status?.enabled ?? false

    const toggle = async () => {
        const message = enabled
            ? 'Restore traffic?\n\nPackets will flow through both interfaces again, subject to the normal access lists and detection.'
            : 'Isolate the whole network?\n\nEvery packet on both interfaces will be dropped: internal hosts cannot reach the outside and nothing from outside gets in. The Mantis web UI is on a separate interface and stays reachable. Isolation survives a Mantis restart until it is turned off here.'
        if (!window.confirm(message)) return
        const error = await setEnabled(!enabled)
        if (error) {
            showNotification(`Failed to ${enabled ? 'disable' : 'enable'} network isolation: ${error}`, 'error')
        } else {
            showNotification(enabled ? 'Network isolation disabled; traffic flows again' : 'Network isolated: all traffic is dropped', enabled ? 'success' : 'warning')
        }
    }

    const tone = enabled
        ? (isDark ? 'bg-red-500/10 border-red-500/40' : 'bg-red-50 border-red-300')
        : (isDark ? 'bg-[#0e1e2c] border-slate-700/40' : 'bg-white border-slate-200')

    return (
        <div className={`rounded-xl border p-4 mb-5 flex flex-wrap items-center justify-between gap-3 ${tone}`}>
            <div className="flex items-center gap-3 min-w-0">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${enabled ? 'bg-red-500/20' : (isDark ? 'bg-slate-700/40' : 'bg-slate-100')}`}>
                    <FontAwesomeIcon icon={faBan} className={enabled ? 'text-red-500' : (isDark ? 'text-slate-400' : 'text-slate-500')} />
                </div>
                <div className="min-w-0">
                    <div className={`text-sm font-semibold ${enabled ? 'text-red-500' : (isDark ? 'text-slate-200' : 'text-slate-800')}`}>
                        Network isolation: {status === null ? '...' : enabled ? 'ON' : 'off'}
                    </div>
                    <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {enabled
                            ? `All traffic on both interfaces is dropped since ${formatSince(status!.since)} (by ${status!.enabled_by ?? 'unknown'}).`
                            : 'Cuts off the whole protected network in both directions. Independent of the whitelist and blacklist.'}
                    </div>
                </div>
            </div>
            <button
                onClick={toggle}
                disabled={busy || status === null}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 ${
                    enabled
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                        : 'bg-red-600 text-white hover:bg-red-700'
                }`}
            >
                <FontAwesomeIcon icon={enabled ? faPlug : faBan} className="mr-1.5 text-xs" />
                {enabled ? 'Restore traffic' : 'Isolate network'}
            </button>
        </div>
    )
}

export default NetworkIsolationCard
