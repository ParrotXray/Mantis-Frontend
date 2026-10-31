import React, { useCallback, useEffect, useMemo, useState } from 'react'
import ReactEcharts from 'echarts-for-react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSlidersH, faSyncAlt } from '@fortawesome/free-solid-svg-icons'
import { useTheme } from '../providers/ThemeProvider'
import { fetchData } from '../utils/connectionUtils'
import { urls } from '../utils/apiManager'
import { LoosenHold, ThresholdEvaluation, ThresholdRung, ThresholdStatus } from '../types/ThresholdTypes'

// Evaluations happen every adaptive_recalibrate_secs (300s by default), so a
// slower poll would lag and a faster one would only refetch the same data.
const POLL_MS = 30_000
const TABLE_ROWS = 20

// Single-series mark color, validated (dataviz validator) against both the
// light (#ffffff) and dark (#0e1e2c) card surfaces.
const MARK_COLOR = '#2a9bb5'

const HOLD_TEXT: Record<LoosenHold, string> = {
    none: '',
    confirmed_attack: 'a Suricata-corroborated alert in the window',
    structural_attack: 'a FLOOD / SCAN / TARGETED verdict in the window',
    not_marginal: 'most alerts score far above the next rung',
    awaiting_streak: 'waiting for consecutive over-target windows',
    daily_budget: 'daily loosening budget used',
    at_ceiling: 'already at the most lenient rung',
}

type Decision = 'Loosened' | 'Tightened' | 'Held'

const nearestRung = (value: number, ladder: ThresholdRung[]): ThresholdRung | null =>
    ladder.reduce<ThresholdRung | null>(
        (best, r) => (best === null || Math.abs(r.value - value) < Math.abs(best.value - value) ? r : best),
        null,
    )

// The controller always eases toward its target rung, so a small move onto
// the rung it already sits on is settling, not a step. Only a target rung
// different from the starting one counts as loosening or tightening.
const decisionOf = (e: ThresholdEvaluation, ladder: ThresholdRung[]): Decision => {
    const from = nearestRung(e.before, ladder)
    if (!e.moved || from === null || from.method === e.target_method) return 'Held'
    return e.target_value > from.value ? 'Loosened' : 'Tightened'
}

const decisionText = (e: ThresholdEvaluation, ladder: ThresholdRung[]): string => {
    const decision = decisionOf(e, ladder)
    if (decision !== 'Held') return `${decision} toward ${e.target_method}`
    return e.loosen_hold === 'none' ? 'Held, within target' : `Held: ${HOLD_TEXT[e.loosen_hold]}`
}

const mlOnly = (e: ThresholdEvaluation) => Math.max(0, e.alert_count - e.corroborated)

const formatValue = (v: number) => v.toFixed(4)

const formatTime = (secs: number) =>
    new Date(secs * 1000).toLocaleString(undefined, { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })

interface StatTileProps {
    label: string
    value: string
    detail?: string
    isDark: boolean
}

const StatTile: React.FC<StatTileProps> = ({ label, value, detail, isDark }) => (
    <div className={`rounded-xl border p-3 ${isDark ? 'bg-[#0e1e2c] border-slate-700/40' : 'bg-white border-slate-200'}`}>
        <p className={`text-xs mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{label}</p>
        <p className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{value}</p>
        {detail && <p className={`text-[11px] mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{detail}</p>}
    </div>
)

const ThresholdPanel: React.FC = () => {
    const { actualTheme } = useTheme()
    const isDark = actualTheme === 'dark'

    const [status, setStatus] = useState<ThresholdStatus | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)

    const load = useCallback(() => {
        setIsLoading(true)
        fetchData(
            urls.detectionThreshold,
            (text) => {
                try {
                    setStatus(JSON.parse(text) as ThresholdStatus)
                    setError(null)
                } catch {
                    setError('Unexpected response from the backend')
                }
                setIsLoading(false)
            },
            (e) => {
                setError(`Failed to load threshold status: ${e?.message ?? 'unknown error'}`)
                setIsLoading(false)
            },
        )
    }, [])

    useEffect(() => {
        load()
        const timer = setInterval(load, POLL_MS)
        return () => clearInterval(timer)
    }, [load])

    const ink = {
        primary: isDark ? '#e2e8f0' : '#0f172a',
        muted: isDark ? '#94a3b8' : '#64748b',
        grid: isDark ? 'rgba(148,163,184,0.15)' : '#e2e8f0',
        surface: isDark ? '#0e1e2c' : '#ffffff',
    }

    const adaptive = status?.adaptive ?? null
    const history = adaptive?.history ?? []
    const ladder = adaptive?.ladder ?? []
    const evalByMs = useMemo(() => new Map(history.map(e => [e.timestamp * 1000, e])), [history])

    const tooltipFor = useCallback((ms: number): string => {
        const e = evalByMs.get(ms)
        if (!e) return ''
        return [
            `<b>${formatTime(e.timestamp)}</b>`,
            `Threshold ${formatValue(e.before)} → ${formatValue(e.after)}`,
            `ML-only alerts ${mlOnly(e)} (marginal ${e.marginal}, structural ${e.structural}, corroborated ${e.corroborated})`,
            decisionText(e, ladder),
        ].join('<br/>')
    }, [evalByMs, ladder])

    const baseTooltip = useMemo(() => ({
        trigger: 'axis' as const,
        axisPointer: { type: 'line' as const, lineStyle: { color: ink.muted, width: 1 } },
        backgroundColor: isDark ? '#1a2236' : '#ffffff',
        borderColor: ink.grid,
        textStyle: { color: ink.primary, fontSize: 12 },
        formatter: (params: any) => {
            const list = Array.isArray(params) ? params : [params]
            const p = list.find((x: any) => x.seriesIndex === 0)
            return p ? tooltipFor(p.value?.[0]) : ''
        },
    }), [isDark, ink.muted, ink.grid, ink.primary, tooltipFor])

    const timeAxis = useMemo(() => ({
        type: 'time' as const,
        axisLabel: { color: ink.muted, fontSize: 11, hideOverlap: true },
        axisLine: { lineStyle: { color: ink.grid } },
        axisTick: { show: false },
        splitLine: { show: false },
    }), [ink.muted, ink.grid])

    const thresholdOption = useMemo(() => {
        if (!adaptive || history.length === 0) return null
        const data = history.flatMap(e => [e.before, e.after])
        const dataMax = Math.max(...data)
        const refs = [
            { name: `baseline ${status!.baseline.method}`, value: status!.baseline.value },
            { name: `floor ${adaptive.min_strict.method}`, value: adaptive.min_strict.value },
        ]
        // The ceiling is often an order of magnitude above everything else;
        // drawing it unconditionally flattens the range the threshold moves in.
        if (dataMax >= adaptive.max_lenient.value * 0.5) {
            refs.push({ name: `ceiling ${adaptive.max_lenient.method}`, value: adaptive.max_lenient.value })
        }
        const values = [...refs.map(r => r.value), ...data]
        const firstMs = history[0].timestamp * 1000
        const lastMs = history[history.length - 1].timestamp * 1000
        const lo = Math.min(...values)
        const hi = Math.max(...values)
        const pad = (hi - lo) * 0.15 || hi * 0.05
        return {
            animation: false,
            grid: { left: 8, right: 120, top: 16, bottom: 8, containLabel: true },
            tooltip: baseTooltip,
            xAxis: timeAxis,
            yAxis: {
                type: 'value' as const,
                min: Math.max(0, lo - pad),
                max: hi + pad,
                // The padded min/max are not round numbers; their labels would
                // repeat the nearest tick's at this precision.
                axisLabel: {
                    color: ink.muted,
                    fontSize: 11,
                    showMinLabel: false,
                    showMaxLabel: false,
                    formatter: (v: number) => v.toFixed(3),
                },
                splitLine: { lineStyle: { color: ink.grid, width: 1, type: 'solid' as const } },
            },
            series: [{
                type: 'line' as const,
                step: 'end' as const,
                z: 3,
                data: history.map(e => [e.timestamp * 1000, e.after]),
                symbol: 'circle',
                symbolSize: 8,
                showSymbol: history.length <= 60,
                itemStyle: { color: MARK_COLOR, borderColor: ink.surface, borderWidth: 2 },
                lineStyle: { color: MARK_COLOR, width: 2, cap: 'round' as const, join: 'round' as const },
            },
            // Reference lines as their own series rather than markLine: in
            // ECharts 6 a markLine is not rendered once the y-axis has an
            // explicit min/max, which this chart needs.
            ...refs.map(r => ({
                type: 'line' as const,
                name: r.name,
                silent: true,
                symbol: 'none',
                z: 1,
                data: [[firstMs, r.value], [lastMs, r.value]],
                lineStyle: { color: ink.muted, width: 1, type: 'dashed' as const },
                endLabel: { show: true, formatter: r.name, color: ink.muted, fontSize: 11 },
                tooltip: { show: false },
            }))],
        }
    }, [adaptive, history, status, baseTooltip, timeAxis, ink.muted, ink.grid, ink.surface])

    const alertsOption = useMemo(() => {
        if (!adaptive || history.length === 0) return null
        return {
            animation: false,
            grid: { left: 8, right: 120, top: 16, bottom: 8, containLabel: true },
            tooltip: baseTooltip,
            xAxis: timeAxis,
            yAxis: {
                type: 'value' as const,
                minInterval: 1,
                axisLabel: { color: ink.muted, fontSize: 11 },
                splitLine: { lineStyle: { color: ink.grid, width: 1, type: 'solid' as const } },
            },
            series: [{
                type: 'bar' as const,
                data: history.map(e => [e.timestamp * 1000, mlOnly(e)]),
                barMaxWidth: 24,
                itemStyle: { color: MARK_COLOR, borderRadius: [4, 4, 0, 0] },
                markArea: {
                    silent: true,
                    itemStyle: { color: isDark ? 'rgba(148,163,184,0.10)' : 'rgba(100,116,139,0.10)' },
                    label: { position: 'right' as const, color: ink.muted, fontSize: 11 },
                    data: [[
                        { name: `target ${adaptive.target_alerts_min}-${adaptive.target_alerts_max}`, yAxis: adaptive.target_alerts_min },
                        { yAxis: adaptive.target_alerts_max },
                    ]],
                },
            }],
        }
    }, [adaptive, history, isDark, baseTooltip, timeAxis, ink.muted, ink.grid])

    const card = `rounded-xl border overflow-hidden ${isDark ? 'bg-[#0e1e2c] border-slate-700/40' : 'bg-white border-slate-200'}`
    const sectionTitle = `text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`
    const mutedCls = isDark ? 'text-slate-500' : 'text-slate-400'

    const header = (
        <div className={`px-5 py-3 border-b flex items-center justify-between ${isDark ? 'border-slate-700/40' : 'border-slate-200'}`}>
            <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-[#4ab5cc]/15 flex items-center justify-center">
                    <FontAwesomeIcon icon={faSlidersH} className="text-[#4ab5cc] text-xs" />
                </div>
                <span className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>ML Threshold</span>
                <span className={`text-xs ${mutedCls}`}>
                    History since the last restart. Values are reconstruction error (AE score); higher is more lenient.
                </span>
            </div>
            <button
                onClick={load}
                className={`px-2 py-1 rounded-md text-xs transition-colors ${isDark ? 'text-slate-300 hover:bg-slate-700/50' : 'text-slate-600 hover:bg-slate-100'}`}
            >
                <FontAwesomeIcon icon={faSyncAlt} className={`mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
            </button>
        </div>
    )

    if (error && !status) {
        return <div className={card}>{header}<div className="p-6 text-sm text-red-400">{error}</div></div>
    }
    if (!status) {
        return <div className={card}>{header}<div className={`p-6 text-sm ${mutedCls}`}>Loading...</div></div>
    }

    const current = status.current
    const currentRung = current !== null && adaptive ? nearestRung(current, ladder) : null
    const last = history.length > 0 ? history[history.length - 1] : null
    const recent = history.slice(-TABLE_ROWS).reverse()

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                <StatTile
                    isDark={isDark}
                    label="Live threshold"
                    value={current !== null ? formatValue(current) : 'ML off'}
                    detail={currentRung ? `nearest rung ${currentRung.method}` : undefined}
                />
                <StatTile
                    isDark={isDark}
                    label="Baseline"
                    value={formatValue(status.baseline.value)}
                    detail={`${status.baseline.method}; severity reference`}
                />
                <StatTile
                    isDark={isDark}
                    label="Allowed range"
                    value={adaptive ? `${adaptive.min_strict.method} – ${adaptive.max_lenient.method}` : 'fixed'}
                    detail={adaptive ? `${formatValue(adaptive.min_strict.value)} – ${formatValue(adaptive.max_lenient.value)}` : 'adaptive threshold disabled'}
                />
                <StatTile
                    isDark={isDark}
                    label="Loosening, last 24h"
                    value={!adaptive ? '—' : adaptive.max_loosen_steps_per_day === 0
                        ? 'off'
                        : `${adaptive.loosen_steps_last_24h} / ${adaptive.max_loosen_steps_per_day} steps`}
                    detail={adaptive && adaptive.max_loosen_steps_per_day > 0
                        ? `streak ${adaptive.over_target_streak} / ${adaptive.loosen_consecutive} windows`
                        : 'only tightening can happen'}
                />
                <StatTile
                    isDark={isDark}
                    label="Last decision"
                    value={last ? decisionOf(last, ladder) : '—'}
                    detail={last ? `${formatTime(last.timestamp)}: ${decisionText(last, ladder)}` : undefined}
                />
            </div>

            {!adaptive ? (
                <div className={`${card} p-6 text-sm ${mutedCls}`}>
                    Adaptive threshold is disabled (<code>adaptive_threshold_enabled = false</code>), so the threshold stays at the baseline.
                </div>
            ) : history.length === 0 ? (
                <div className={`${card} p-6 text-sm ${mutedCls}`}>
                    No evaluation yet since the last restart. The first one runs about {Math.round(adaptive.recalibrate_secs / 60)} minutes after startup.
                </div>
            ) : (
                <>
                    <div className={card}>
                        {header}
                        <div className="px-4 pt-3">
                            <span className={sectionTitle}>Live threshold</span>
                            <ReactEcharts option={thresholdOption!} notMerge style={{ width: '100%', height: '240px' }} />
                        </div>
                        <div className="px-4 pt-1 pb-3">
                            <span className={sectionTitle}>ML-only alerts per evaluation</span>
                            <ReactEcharts option={alertsOption!} notMerge style={{ width: '100%', height: '180px' }} />
                        </div>
                    </div>

                    <div className={card}>
                        <div className={`px-5 py-3 border-b ${isDark ? 'border-slate-700/40' : 'border-slate-200'}`}>
                            <span className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>Recent evaluations</span>
                            <span className={`ml-2 text-xs ${mutedCls}`}>newest first, last {Math.min(TABLE_ROWS, history.length)} of {history.length}</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead className={isDark ? 'bg-[#131929]' : 'bg-slate-50'}>
                                    <tr>
                                        {['Time', 'Threshold', 'Target rung', 'ML-only alerts', 'Marginal', 'Structural', 'Corroborated', 'Decision'].map(h => (
                                            <th key={h} className={`px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider ${mutedCls}`}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className={`divide-y ${isDark ? 'divide-slate-700/40 text-slate-300' : 'divide-slate-100 text-slate-700'}`}>
                                    {recent.map(e => (
                                        <tr key={e.timestamp}>
                                            <td className="px-3 py-2 whitespace-nowrap">{formatTime(e.timestamp)}</td>
                                            <td className="px-3 py-2 font-mono tabular-nums whitespace-nowrap">
                                                {decisionOf(e, ladder) !== 'Held'
                                                    ? `${formatValue(e.before)} → ${formatValue(e.after)}`
                                                    : formatValue(e.after)}
                                            </td>
                                            <td className="px-3 py-2 font-mono">{e.target_method}</td>
                                            <td className="px-3 py-2 font-mono tabular-nums">{mlOnly(e)} <span className={mutedCls}>/ {e.alert_count}</span></td>
                                            <td className="px-3 py-2 font-mono tabular-nums">{e.marginal}</td>
                                            <td className="px-3 py-2 font-mono tabular-nums">{e.structural}</td>
                                            <td className="px-3 py-2 font-mono tabular-nums">{e.corroborated}</td>
                                            <td className="px-3 py-2">{decisionText(e, ladder)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}

export default ThresholdPanel
