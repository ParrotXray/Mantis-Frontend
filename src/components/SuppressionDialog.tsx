import React, { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faExclamationTriangle, faInfoCircle, faTimes } from '@fortawesome/free-solid-svg-icons'
import { useTheme } from '../providers/ThemeProvider'
import { postData } from '../utils/connectionUtils'
import { urls } from '../utils/apiManager'
import { cidrContains, isIPv6 } from '../utils/ipMatch'
import { CreateSuppression, SuppressibleAlert, SuppressionRule } from '../types/SuppressionTypes'

interface SuppressionDialogProps {
    alert: SuppressibleAlert
    // Alerts currently in view, used to preview how many the rule would cover.
    alerts: SuppressibleAlert[]
    defaultScoreCap: number
    onClose: () => void
    onCreated: (rule: SuppressionRule) => void
    onError: (message: string) => void
}

const IPV4_PREFIXES = [32, 24, 16]
const IPV6_PREFIXES = [128, 64, 48]

// null = permanent
const EXPIRY_OPTIONS: { label: string; days: number | null }[] = [
    { label: '7 days', days: 7 },
    { label: '30 days', days: 30 },
    { label: '90 days', days: 90 },
    { label: 'Permanent', days: null },
]

const PROTOCOL_NAMES: Record<number, string> = { 1: 'ICMP', 6: 'TCP', 17: 'UDP', 58: 'ICMPv6' }

interface MatchRowProps {
    label: string
    checked: boolean
    onChange: (v: boolean) => void
    value: string
    isDark: boolean
    prefixes?: number[]
    prefix?: number
    onPrefixChange?: (p: number) => void
    hint?: string
}

const MatchRow: React.FC<MatchRowProps> = ({ label, checked, onChange, value, isDark, prefixes, prefix, onPrefixChange, hint }) => (
    <div className="flex items-center gap-2 py-1">
        <label className={`flex items-center gap-2 w-28 flex-shrink-0 cursor-pointer text-xs font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            <input
                type="checkbox"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
                className="h-3.5 w-3.5 text-[#4ab5cc] focus:ring-[#4ab5cc] border-gray-300 rounded"
            />
            {label}
        </label>
        <span className={`text-xs font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'} ${checked ? '' : 'line-through opacity-50'}`}>{value}</span>
        {prefixes && prefix !== undefined && onPrefixChange && checked && (
            <select
                value={prefix}
                onChange={(e) => onPrefixChange(Number(e.target.value))}
                className={`px-2 py-1 rounded-md border text-xs ${isDark ? 'bg-[#131929] border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-800'}`}
            >
                {prefixes.map(p => <option key={p} value={p}>/{p}</option>)}
            </select>
        )}
        {!checked && <span className={`text-xs italic ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{hint ?? 'any'}</span>}
    </div>
)

const SuppressionDialog: React.FC<SuppressionDialogProps> = ({
    alert, alerts, defaultScoreCap, onClose, onCreated, onError,
}) => {
    const { actualTheme } = useTheme()
    const isDark = actualTheme === 'dark'

    const prefixes = isIPv6(alert.src_ip) ? IPV6_PREFIXES : IPV4_PREFIXES

    // Defaults are the narrowest useful rule: everything but the ephemeral
    // source port, which would otherwise match only this one connection.
    const [useSrcIp, setUseSrcIp] = useState(true)
    const [srcPrefix, setSrcPrefix] = useState(prefixes[0])
    const [useSrcPort, setUseSrcPort] = useState(false)
    const [useDstIp, setUseDstIp] = useState(true)
    const [dstPrefix, setDstPrefix] = useState(prefixes[0])
    const [useDstPort, setUseDstPort] = useState(true)
    const [useProtocol, setUseProtocol] = useState(true)
    const [scoreCap, setScoreCap] = useState(defaultScoreCap)
    const [expiryIndex, setExpiryIndex] = useState(1)
    const [confirmPermanent, setConfirmPermanent] = useState(false)
    const [reason, setReason] = useState('')
    const [submitting, setSubmitting] = useState(false)

    const expiryDays = EXPIRY_OPTIONS[expiryIndex].days
    const srcCidr = useSrcIp ? `${alert.src_ip}/${srcPrefix}` : null
    const dstCidr = useDstIp ? `${alert.dst_ip}/${dstPrefix}` : null

    const matches = useMemo(() => (a: SuppressibleAlert) =>
        a.source === 'ml'
        && a.ae_score < scoreCap
        && (alert.direction === null || a.direction === alert.direction)
        && (srcCidr === null || cidrContains(srcCidr, a.src_ip))
        && (dstCidr === null || cidrContains(dstCidr, a.dst_ip))
        && (!useSrcPort || a.src_port === alert.src_port)
        && (!useDstPort || a.dst_port === alert.dst_port)
        && (!useProtocol || a.protocol === alert.protocol),
    [alert, scoreCap, srcCidr, dstCidr, useSrcPort, useDstPort, useProtocol])

    const previewCount = useMemo(() => alerts.filter(matches).length, [alerts, matches])
    const mlAlertCount = useMemo(() => alerts.filter(a => a.source === 'ml').length, [alerts])

    const fullPrefix = prefixes[0]
    const narrowingFields = [useSrcIp, useSrcPort, useDstIp, useDstPort, useProtocol].filter(Boolean).length
    const hasWidePrefix = (useSrcIp && srcPrefix < fullPrefix) || (useDstIp && dstPrefix < fullPrefix)
    const isBroad = narrowingFields <= 2 || hasWidePrefix
    const capBelowAlert = alert.ae_score >= scoreCap

    const reasonTrimmed = reason.trim()
    const capValid = Number.isFinite(scoreCap) && scoreCap > 0
    const canSubmit = !submitting
        && (useSrcIp || useDstIp)
        && reasonTrimmed.length > 0
        && capValid
        && (expiryDays !== null || confirmPermanent)

    const handleSubmit = () => {
        if (!canSubmit) return
        const payload: CreateSuppression = {
            src_ip: srcCidr,
            src_port: useSrcPort ? alert.src_port : null,
            dst_ip: dstCidr,
            dst_port: useDstPort ? alert.dst_port : null,
            protocol: useProtocol ? alert.protocol : null,
            direction: alert.direction,
            score_cap: scoreCap,
            expires_in_days: expiryDays,
            reason: reasonTrimmed,
            anchor: {
                src_ip: alert.src_ip,
                src_port: alert.src_port,
                dst_ip: alert.dst_ip,
                dst_port: alert.dst_port,
                protocol: alert.protocol,
                timestamp: alert.timestamp,
            },
        }
        setSubmitting(true)
        postData(
            urls.suppressions.list,
            payload,
            (rule) => {
                setSubmitting(false)
                onCreated(rule as SuppressionRule)
            },
            (error) => {
                setSubmitting(false)
                onError(`Failed to create suppression rule: ${error.message}`)
            },
        )
    }

    const labelCls = `text-xs font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`
    const valueCls = `text-xs font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`
    const inputCls = `px-2 py-1 rounded-md border text-xs ${isDark ? 'bg-[#131929] border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-800'}`
    const checkboxCls = 'h-3.5 w-3.5 text-[#4ab5cc] focus:ring-[#4ab5cc] border-gray-300 rounded'

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/30 p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className={`rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto ${isDark ? 'bg-[#1a2236]' : 'bg-white'}`}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className={`px-6 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                        <div className="flex items-center justify-between">
                            <h2 className={`text-lg font-semibold ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>Mark as false positive</h2>
                            <button onClick={onClose} className={`transition-colors ${isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'}`}>
                                <FontAwesomeIcon icon={faTimes} />
                            </button>
                        </div>
                        <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            Stops ML alerts for matching traffic. Blocking, TCP anomaly checks and Suricata are not affected.
                        </p>
                    </div>

                    <div className="px-6 py-4 space-y-4">
                        <div>
                            <div className={`text-xs font-semibold uppercase tracking-wider mb-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Match</div>
                            <MatchRow label="Source IP" isDark={isDark} checked={useSrcIp} onChange={setUseSrcIp} value={alert.src_ip}
                                prefixes={prefixes} prefix={srcPrefix} onPrefixChange={setSrcPrefix} />
                            <MatchRow label="Source port" isDark={isDark} checked={useSrcPort} onChange={setUseSrcPort} value={String(alert.src_port)}
                                hint="any (ephemeral)" />
                            <MatchRow label="Dest IP" isDark={isDark} checked={useDstIp} onChange={setUseDstIp} value={alert.dst_ip}
                                prefixes={prefixes} prefix={dstPrefix} onPrefixChange={setDstPrefix} />
                            <MatchRow label="Dest port" isDark={isDark} checked={useDstPort} onChange={setUseDstPort} value={String(alert.dst_port)} />
                            <MatchRow label="Protocol" isDark={isDark} checked={useProtocol} onChange={setUseProtocol}
                                value={PROTOCOL_NAMES[alert.protocol] ?? String(alert.protocol)} />
                            <div className="flex items-center gap-2 py-1">
                                <span className={`w-28 flex-shrink-0 pl-5 ${labelCls}`}>Direction</span>
                                <span className={valueCls}>{alert.direction ?? 'any'} (from alert)</span>
                            </div>
                            {!useSrcIp && !useDstIp && (
                                <p className="text-xs text-red-400 mt-1">At least one of Source IP or Dest IP is required.</p>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <label className="block">
                                <span className={labelCls}>Still alert if AE score at or above</span>
                                <input
                                    type="number"
                                    step="any"
                                    min={0}
                                    value={Number.isFinite(scoreCap) ? scoreCap : ''}
                                    onChange={(e) => setScoreCap(parseFloat(e.target.value))}
                                    className={`mt-1 w-full ${inputCls}`}
                                />
                                <span className={`block mt-0.5 text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                    Default {defaultScoreCap.toFixed(4)} (p99.9)
                                </span>
                            </label>
                            <label className="block">
                                <span className={labelCls}>Expires in</span>
                                <select
                                    value={expiryIndex}
                                    onChange={(e) => { setExpiryIndex(Number(e.target.value)); setConfirmPermanent(false) }}
                                    className={`mt-1 w-full ${inputCls}`}
                                >
                                    {EXPIRY_OPTIONS.map((o, i) => <option key={o.label} value={i}>{o.label}</option>)}
                                </select>
                            </label>
                        </div>

                        {expiryDays === null && (
                            <label className={`flex items-start gap-2 text-xs cursor-pointer ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
                                <input type="checkbox" checked={confirmPermanent} onChange={(e) => setConfirmPermanent(e.target.checked)} className={`mt-0.5 ${checkboxCls}`} />
                                I understand this rule never expires and must be removed by hand.
                            </label>
                        )}

                        <label className="block">
                            <span className={labelCls}>Reason <span className="text-red-400">*</span></span>
                            <input
                                type="text"
                                value={reason}
                                maxLength={500}
                                placeholder="e.g. nightly rsync backup job"
                                onChange={(e) => setReason(e.target.value)}
                                className={`mt-1 w-full ${inputCls}`}
                            />
                        </label>

                        {capBelowAlert && (
                            <div className={`flex items-start gap-2 rounded-md border px-3 py-2 text-xs ${isDark ? 'border-amber-500/30 bg-amber-500/10 text-amber-300' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
                                <FontAwesomeIcon icon={faExclamationTriangle} className="mt-0.5" />
                                <span>
                                    This alert scored {alert.ae_score.toFixed(4)}, at or above the cap, so it would still alert.
                                    Raise the cap only if you are sure this traffic is benign.
                                </span>
                            </div>
                        )}

                        {isBroad && (useSrcIp || useDstIp) && (
                            <div className={`flex items-start gap-2 rounded-md border px-3 py-2 text-xs ${isDark ? 'border-amber-500/30 bg-amber-500/10 text-amber-300' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
                                <FontAwesomeIcon icon={faExclamationTriangle} className="mt-0.5" />
                                <span>This rule is broad and may hide real attacks from the matching hosts.</span>
                            </div>
                        )}

                        <div className={`flex items-center gap-2 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            <FontAwesomeIcon icon={faInfoCircle} />
                            Would have suppressed {previewCount} of {mlAlertCount} ML alerts in view.
                        </div>
                    </div>

                    <div className={`px-6 py-4 border-t flex justify-end space-x-3 ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                        <button
                            onClick={onClose}
                            className={`px-4 py-2 rounded-lg text-sm transition-colors ${isDark ? 'text-gray-300 bg-gray-700 hover:bg-gray-600' : 'text-gray-700 bg-gray-100 hover:bg-gray-200'}`}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={!canSubmit}
                            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                                canSubmit ? 'bg-[#4ab5cc] text-white hover:bg-[#3ea3b9]' : 'bg-slate-600 text-slate-400 cursor-not-allowed'
                            }`}
                        >
                            {submitting ? 'Creating...' : 'Create rule'}
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    )
}

export default SuppressionDialog
