import React, { useState, useEffect, useCallback, useRef } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faSliders,
    faNetworkWired,
    faMicrochip,
    faRobot,
    faShieldHalved,
    faExclamationTriangle,
    faCircleCheck,
    faSpinner,
    faRotateRight,
    faPowerOff,
    faCircleInfo,
} from '@fortawesome/free-solid-svg-icons'
import { useTheme } from '../providers/ThemeProvider'
import { useRestart } from '../providers/RestartProvider'
import { fetchData, putData } from '../utils/connectionUtils'
import { urls } from '../config'
import Layout from '../components/Layout'
import { NextPageWithLayout } from '../types/NextPageWithLayout'
import {
    RiskNote,
    GetConfigResponse,
    ConfigSection,
    ConfigUpdate,
    NICConfig,
    CPUAffinityConfig,
    MLConfig,
    SuricataConfig,
    XskBindMode,
} from '../types/ConfigTypes'

const ACCENT = '#4ab5cc'

const RISK_STYLES: Record<string, { bg: string; text: string; border: string }> = {
    high: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' },
    medium: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/30' },
    low: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
}

const SECTION_ICON: Record<ConfigSection, any> = {
    general: faSliders,
    nic: faNetworkWired,
    cpu_affinity: faMicrochip,
    ml: faRobot,
    suricata: faShieldHalved,
}

const SECTION_TITLE: Record<ConfigSection, string> = {
    general: 'General',
    nic: 'NIC / AF_XDP',
    cpu_affinity: 'CPU Affinity',
    ml: 'ML Detection',
    suricata: 'Suricata Rule Engine',
}

const TABS: ConfigSection[] = ['general', 'nic', 'cpu_affinity', 'ml', 'suricata']

// ---- small field primitives -------------------------------------------------

const TOOLTIP_WIDTH = 224 // px, matches w-56

const InfoTooltip: React.FC<{ text: string; isDark: boolean }> = ({ text, isDark }) => {
    const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
    const iconRef = useRef<HTMLSpanElement>(null)

    // Fixed positioning (computed from the icon's own rect) rather than an
    // absolutely-positioned child: SectionCard clips overflow to round its
    // corners, which would otherwise cut the tooltip off.
    const show = () => {
        const rect = iconRef.current?.getBoundingClientRect()
        if (!rect) return
        const centerX = rect.left + rect.width / 2
        const left = Math.min(Math.max(centerX - TOOLTIP_WIDTH / 2, 8), window.innerWidth - TOOLTIP_WIDTH - 8)
        setPos({ top: rect.top - 8, left })
    }

    return (
        <span ref={iconRef} className="relative inline-flex ml-1.5 align-middle" onMouseEnter={show} onMouseLeave={() => setPos(null)}>
            <FontAwesomeIcon
                icon={faCircleInfo}
                className={`text-[11px] cursor-help ${isDark ? 'text-slate-600 hover:text-slate-400' : 'text-slate-400 hover:text-slate-600'}`}
            />
            {pos && (
                <span
                    role="tooltip"
                    className={`pointer-events-none fixed z-50 -translate-y-full rounded-lg border px-2.5 py-1.5 text-[11px] font-normal leading-snug shadow-lg ${
                        isDark ? 'bg-[#0c1a24] border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-600'
                    }`}
                    style={{ top: pos.top, left: pos.left, width: TOOLTIP_WIDTH }}
                >
                    {text}
                </span>
            )}
        </span>
    )
}

interface FieldProps {
    label: string
    isDark: boolean
    children: React.ReactNode
    hint?: string
    description?: string
}

const Field: React.FC<FieldProps> = ({ label, isDark, children, hint, description }) => (
    <label className="flex flex-col gap-1">
        <span className={`flex items-center text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {label}
            {description && <InfoTooltip text={description} isDark={isDark} />}
        </span>
        {children}
        {hint && <span className={`text-[11px] ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>{hint}</span>}
    </label>
)

const inputClass = (isDark: boolean) =>
    `px-3 py-1.5 rounded-md text-sm border outline-none transition-colors ${
        isDark
            ? 'bg-[#0c1a24] border-slate-700 text-slate-200 focus:border-[#4ab5cc]'
            : 'bg-white border-slate-300 text-slate-800 focus:border-[#4ab5cc]'
    }`

const NumField: React.FC<{
    label: string
    value: number
    isDark: boolean
    hint?: string
    description?: string
    onChange: (v: number) => void
}> = ({ label, value, isDark, hint, description, onChange }) => (
    <Field label={label} isDark={isDark} hint={hint} description={description}>
        <input
            type="number"
            className={inputClass(isDark)}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
        />
    </Field>
)

const TextField: React.FC<{
    label: string
    value: string
    isDark: boolean
    hint?: string
    description?: string
    onChange: (v: string) => void
}> = ({ label, value, isDark, hint, description, onChange }) => (
    <Field label={label} isDark={isDark} hint={hint} description={description}>
        <input type="text" className={inputClass(isDark)} value={value} onChange={(e) => onChange(e.target.value)} />
    </Field>
)

const SelectField: React.FC<{
    label: string
    value: string
    options: string[]
    isDark: boolean
    description?: string
    onChange: (v: string) => void
}> = ({ label, value, options, isDark, description, onChange }) => (
    <Field label={label} isDark={isDark} description={description}>
        <select className={inputClass(isDark)} value={value} onChange={(e) => onChange(e.target.value)}>
            {options.map((o) => (
                <option key={o} value={o}>{o}</option>
            ))}
        </select>
    </Field>
)

const ToggleField: React.FC<{
    label: string
    value: boolean
    isDark: boolean
    description?: string
    onChange: (v: boolean) => void
}> = ({ label, value, isDark, description, onChange }) => (
    <label className="flex items-center gap-2.5 cursor-pointer">
        <button
            type="button"
            onClick={() => onChange(!value)}
            className="relative w-9 h-5 rounded-full transition-colors flex-shrink-0"
            style={{ background: value ? ACCENT : (isDark ? '#334155' : '#cbd5e1') }}
        >
            <span
                className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
                style={{ left: value ? '18px' : '2px' }}
            />
        </button>
        <span className={`flex items-center text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {label}
            {description && <InfoTooltip text={description} isDark={isDark} />}
        </span>
    </label>
)

// ---- section card ------------------------------------------------------------

const SectionCard: React.FC<{
    section: ConfigSection
    isDark: boolean
    risk?: RiskNote
    disabled?: boolean
    disabledNote?: string
    dirty: boolean
    children: React.ReactNode
}> = ({ section, isDark, risk, disabled, disabledNote, dirty, children }) => {
    const riskStyle = risk ? RISK_STYLES[risk.level] : null

    return (
        <div
            className={`rounded-xl border overflow-hidden ${isDark ? 'bg-[#0c1a24] border-slate-800' : 'bg-white border-slate-200'}`}
        >
            <div className={`flex items-center gap-2.5 px-4 py-3 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(74,181,204,0.15)' }}>
                    <FontAwesomeIcon icon={SECTION_ICON[section]} className="text-xs" style={{ color: ACCENT }} />
                </div>
                <h2 className={`text-sm font-semibold flex-1 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                    {SECTION_TITLE[section]}
                </h2>
                {dirty && !disabled && (
                    <span className="text-[10px] font-semibold tracking-wide uppercase" style={{ color: ACCENT }}>Unsaved</span>
                )}
            </div>

            {risk && (
                <div className={`flex items-start gap-2 px-4 py-2 text-xs border-b ${riskStyle!.bg} ${riskStyle!.text} ${riskStyle!.border}`}>
                    <FontAwesomeIcon icon={faExclamationTriangle} className="mt-0.5 flex-shrink-0" />
                    <span>{risk.message}</span>
                </div>
            )}

            <div className="p-4">
                {disabled ? (
                    <p className={`text-sm italic ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{disabledNote}</p>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{children}</div>
                )}
            </div>
        </div>
    )
}

// ---- page --------------------------------------------------------------------

const SettingsPage: NextPageWithLayout = () => {
    const { actualTheme } = useTheme()
    const isDark = actualTheme === 'dark'

    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState<string | null>(null)
    const [risks, setRisks] = useState<RiskNote[]>([])
    const [numCpus, setNumCpus] = useState(1)

    const [general, setGeneral] = useState({ http_server_bind_port: 8080, refresh_interval: 5 })
    const [nic, setNic] = useState<NICConfig | null>(null)
    const [cpuAffinity, setCpuAffinity] = useState<CPUAffinityConfig | null>(null)
    const [ml, setMl] = useState<MLConfig | null>(null)
    const [suricata, setSuricata] = useState<SuricataConfig | null>(null)

    const [dirty, setDirty] = useState<Set<ConfigSection>>(new Set())
    const [saving, setSaving] = useState(false)
    const [saveError, setSaveError] = useState<string | null>(null)
    const [savedNotice, setSavedNotice] = useState(false)
    const [activeTab, setActiveTab] = useState<ConfigSection>('general')

    const { status: restartStatus, error: restartError, triggerRestart } = useRestart()
    const prevRestartStatusRef = useRef(restartStatus)

    const markDirty = useCallback((section: ConfigSection) => {
        setDirty((prev) => new Set(prev).add(section))
        setSavedNotice(false)
    }, [])

    const load = useCallback(() => {
        setLoading(true)
        setLoadError(null)
        fetchData(
            urls.config,
            (raw) => {
                const parsed: GetConfigResponse = JSON.parse(raw)
                setGeneral({
                    http_server_bind_port: parsed.config.http_server_bind_port,
                    refresh_interval: parsed.config.refresh_interval,
                })
                setNic(parsed.config.nic)
                setCpuAffinity(parsed.config.cpu_affinity)
                setMl(parsed.config.ml)
                setSuricata(parsed.config.suricata)
                setRisks(parsed.risks)
                setNumCpus(parsed.num_cpus)
                setDirty(new Set())
                setLoading(false)
            },
            () => {
                setLoadError('Failed to load configuration from the backend.')
                setLoading(false)
            }
        )
    }, [])

    useEffect(() => { load() }, [load])

    // Once the shared restart flow (triggered from here or the topbar button)
    // reports Mantis is back, refresh this page's data and drop the stale
    // "saved" banner.
    useEffect(() => {
        if (prevRestartStatusRef.current === 'waiting' && restartStatus === 'idle') {
            setSavedNotice(false)
            load()
        }
        prevRestartStatusRef.current = restartStatus
    }, [restartStatus, load])

    const riskFor = (section: ConfigSection) => risks.find((r) => r.section === section)

    const handleSave = () => {
        if (dirty.size === 0 || !nic || !cpuAffinity || !ml) return

        const body: ConfigUpdate = {}
        if (dirty.has('general')) {
            body.http_server_bind_port = general.http_server_bind_port
            body.refresh_interval = general.refresh_interval
        }
        if (dirty.has('nic')) body.nic = nic
        if (dirty.has('cpu_affinity')) body.cpu_affinity = cpuAffinity
        if (dirty.has('ml')) body.ml = ml
        if (dirty.has('suricata') && suricata) body.suricata = suricata

        setSaving(true)
        setSaveError(null)
        putData(
            urls.config,
            body,
            () => {
                setSaving(false)
                setSavedNotice(true)
                setDirty(new Set())
            },
            (err) => {
                setSaving(false)
                setSaveError(err.message)
            }
        )
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <FontAwesomeIcon icon={faSpinner} spin className="text-2xl" style={{ color: ACCENT }} />
            </div>
        )
    }

    if (loadError || !nic || !cpuAffinity || !ml) {
        return (
            <div className={`rounded-xl border p-4 text-sm ${isDark ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-red-50 border-red-200 text-red-600'}`}>
                {loadError ?? 'Configuration unavailable.'}
            </div>
        )
    }

    return (
            <div className="max-w-5xl mx-auto flex flex-col gap-4">
                {restartStatus === 'waiting' && (
                    <div className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${isDark ? 'bg-sky-500/10 border-sky-500/30 text-sky-400' : 'bg-sky-50 border-sky-200 text-sky-600'}`}>
                        <FontAwesomeIcon icon={faSpinner} spin />
                        Restarting Mantis... this may take a few seconds.
                    </div>
                )}
                {restartStatus === 'error' && (
                    <div className={`flex items-center justify-between gap-2 rounded-xl border px-4 py-3 text-sm ${isDark ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-red-50 border-red-200 text-red-600'}`}>
                        <span className="flex items-center gap-2">
                            <FontAwesomeIcon icon={faExclamationTriangle} />
                            {restartError}
                        </span>
                        <button onClick={triggerRestart} className="underline flex-shrink-0">Try again</button>
                    </div>
                )}
                {savedNotice && restartStatus === 'idle' && (
                    <div className={`flex items-center justify-between gap-2 rounded-xl border px-4 py-3 text-sm ${isDark ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-600'}`}>
                        <span className="flex items-center gap-2">
                            <FontAwesomeIcon icon={faCircleCheck} />
                            Configuration saved to config.toml. Restart Mantis for these changes to take effect.
                        </span>
                        <button
                            onClick={triggerRestart}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-medium flex-shrink-0"
                            style={{ background: ACCENT }}
                        >
                            <FontAwesomeIcon icon={faPowerOff} />
                            Restart now
                        </button>
                    </div>
                )}
                {saveError && (
                    <div className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${isDark ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-red-50 border-red-200 text-red-600'}`}>
                        <FontAwesomeIcon icon={faExclamationTriangle} />
                        {saveError}
                    </div>
                )}

                <div className="flex flex-wrap gap-2">
                    {TABS.map((tab) => {
                        const active = activeTab === tab
                        return (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium border transition-colors ${
                                    active
                                        ? 'text-white border-transparent'
                                        : isDark
                                            ? 'text-slate-400 border-slate-800 bg-[#0c1a24] hover:text-slate-200'
                                            : 'text-slate-600 border-slate-200 bg-white hover:text-slate-800'
                                }`}
                                style={active ? { background: ACCENT } : {}}
                            >
                                <FontAwesomeIcon icon={SECTION_ICON[tab]} className="text-xs" />
                                {SECTION_TITLE[tab]}
                                {dirty.has(tab) && (
                                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: active ? 'white' : ACCENT }} />
                                )}
                            </button>
                        )
                    })}
                </div>

                {activeTab === 'general' && (
                <SectionCard section="general" isDark={isDark} risk={riskFor('general')} dirty={dirty.has('general')}>
                    <NumField
                        label="HTTP server port"
                        value={general.http_server_bind_port}
                        isDark={isDark}
                        description="HTTP server listen port"
                        onChange={(v) => { setGeneral((g) => ({ ...g, http_server_bind_port: v })); markDirty('general') }}
                    />
                    <NumField
                        label="Statistics refresh interval (s)"
                        value={general.refresh_interval}
                        isDark={isDark}
                        description="Statistics refresh interval, in seconds"
                        onChange={(v) => { setGeneral((g) => ({ ...g, refresh_interval: v })); markDirty('general') }}
                    />
                </SectionCard>
                )}

                {activeTab === 'nic' && (
                <SectionCard section="nic" isDark={isDark} risk={riskFor('nic')} dirty={dirty.has('nic')}>
                    <TextField label="Ingress interface" value={nic.ingress_ifname} isDark={isDark}
                        description="Ingress NIC name"
                        onChange={(v) => { setNic({ ...nic, ingress_ifname: v }); markDirty('nic') }} />
                    <TextField label="Egress interface" value={nic.egress_ifname} isDark={isDark}
                        description="Egress NIC name"
                        onChange={(v) => { setNic({ ...nic, egress_ifname: v }); markDirty('nic') }} />
                    <NumField label="Combined queue count" value={nic.combined_queue_count} isDark={isDark}
                        hint="Must match: ethtool -L <nic> combined <N>"
                        description="NIC combined queue count; must match ethtool -L <NIC> combined <N>"
                        onChange={(v) => { setNic({ ...nic, combined_queue_count: v }); markDirty('nic') }} />
                    <NumField label="Channel size" value={nic.channel_size} isDark={isDark}
                        description="Channel size for the eBPF ingress/egress transmission ring"
                        onChange={(v) => { setNic({ ...nic, channel_size: v }); markDirty('nic') }} />
                    <NumField label="Fill queue size" value={nic.fill_queue_size} isDark={isDark} hint="Power of 2"
                        description="XSK fill ring size (power of 2); larger = more burst headroom"
                        onChange={(v) => { setNic({ ...nic, fill_queue_size: v }); markDirty('nic') }} />
                    <NumField label="Completion queue size" value={nic.comp_queue_size} isDark={isDark} hint="Power of 2"
                        description="UMEM completion ring size; should not modify"
                        onChange={(v) => { setNic({ ...nic, comp_queue_size: v }); markDirty('nic') }} />
                    <NumField label="TX queue size" value={nic.tx_queue_size} isDark={isDark} hint="Power of 2"
                        description="UMEM TX ring size; should not modify"
                        onChange={(v) => { setNic({ ...nic, tx_queue_size: v }); markDirty('nic') }} />
                    <NumField label="RX queue size" value={nic.rx_queue_size} isDark={isDark} hint="Power of 2"
                        description="UMEM RX ring size; should not modify"
                        onChange={(v) => { setNic({ ...nic, rx_queue_size: v }); markDirty('nic') }} />
                    <NumField label="Frame size" value={nic.frame_size} isDark={isDark} hint="Power of 2"
                        description="UMEM frame size; should not modify"
                        onChange={(v) => { setNic({ ...nic, frame_size: v }); markDirty('nic') }} />
                    <NumField label="Frame count" value={nic.frame_count} isDark={isDark} hint="Power of 2"
                        description="Total UMEM frames per XskPair"
                        onChange={(v) => { setNic({ ...nic, frame_count: v }); markDirty('nic') }} />
                    <SelectField label="AF_XDP bind mode" value={nic.xsk_bind_mode} options={['copy', 'zero']} isDark={isDark}
                        description={'"copy" (SKB path, works on any NIC) or "zero" (NIC DMA direct to UMEM, lower CPU but needs driver zero-copy support)'}
                        onChange={(v) => { setNic({ ...nic, xsk_bind_mode: v as XskBindMode }); markDirty('nic') }} />
                </SectionCard>
                )}

                {activeTab === 'cpu_affinity' && (
                <SectionCard section="cpu_affinity" isDark={isDark} risk={riskFor('cpu_affinity')} dirty={dirty.has('cpu_affinity')}>
                    <Field label={`XSK core range (0-${numCpus - 1})`} isDark={isDark}
                        description="XSK packet threads, round-robin across core range [start, end]">
                        <div className="flex items-center gap-2">
                            <input type="number" className={inputClass(isDark) + ' w-20'}
                                value={cpuAffinity.xsk_cpu_set?.[0] ?? 0}
                                onChange={(e) => {
                                    const start = Number(e.target.value)
                                    const end = cpuAffinity.xsk_cpu_set?.[1] ?? start
                                    setCpuAffinity({ ...cpuAffinity, xsk_cpu_set: [start, end] })
                                    markDirty('cpu_affinity')
                                }} />
                            <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>to</span>
                            <input type="number" className={inputClass(isDark) + ' w-20'}
                                value={cpuAffinity.xsk_cpu_set?.[1] ?? 0}
                                onChange={(e) => {
                                    const end = Number(e.target.value)
                                    const start = cpuAffinity.xsk_cpu_set?.[0] ?? end
                                    setCpuAffinity({ ...cpuAffinity, xsk_cpu_set: [start, end] })
                                    markDirty('cpu_affinity')
                                }} />
                        </div>
                    </Field>
                    <NumField label={`ML inference core (0-${numCpus - 1})`} value={cpuAffinity.ml_cpu ?? 0} isDark={isDark}
                        description="ML inference core (ONNX spawn_blocking)"
                        onChange={(v) => { setCpuAffinity({ ...cpuAffinity, ml_cpu: v }); markDirty('cpu_affinity') }} />
                </SectionCard>
                )}

                {activeTab === 'ml' && (
                <SectionCard section="ml" isDark={isDark} risk={riskFor('ml')} dirty={dirty.has('ml')}>
                    <NumField label="Max concurrent flows" value={ml.max_concurrent_flows} isDark={isDark}
                        description="Track up to N concurrent flows"
                        onChange={(v) => { setMl({ ...ml, max_concurrent_flows: v }); markDirty('ml') }} />
                    <NumField label="Inference interval (s)" value={ml.inference_interval_secs} isDark={isDark}
                        description="Run ML inference every N seconds"
                        onChange={(v) => { setMl({ ...ml, inference_interval_secs: v }); markDirty('ml') }} />
                    <NumField label="Aggregator window (s)" value={ml.aggregator_window_secs} isDark={isDark}
                        description="Alert aggregator sliding window"
                        onChange={(v) => { setMl({ ...ml, aggregator_window_secs: v }); markDirty('ml') }} />
                    <NumField label="Inference batch size" value={ml.inference_batch_size} isDark={isDark}
                        description="Number of flows processed per inference batch"
                        onChange={(v) => { setMl({ ...ml, inference_batch_size: v }); markDirty('ml') }} />
                    <TextField label="Threshold method" value={ml.ae_threshold_method} isDark={isDark}
                        hint="Must match a key in inference_config.json"
                        description="Autoencoder anomaly threshold percentile"
                        onChange={(v) => { setMl({ ...ml, ae_threshold_method: v }); markDirty('ml') }} />
                    <SelectField label="Aggregator alert mode" value={ml.aggregator_alert_mode} options={['threshold', 'limit', 'both']} isDark={isDark}
                        description={'"threshold" = periodic ping every Nth match, "limit" = first N then silent, "both" = both'}
                        onChange={(v) => { setMl({ ...ml, aggregator_alert_mode: v }); markDirty('ml') }} />
                    <NumField label="Aggregator alert limit" value={ml.aggregator_alert_limit} isDark={isDark}
                        description="The alert limit N, applied per tier independently (by_flow, by_both, by_src, by_dst)"
                        onChange={(v) => { setMl({ ...ml, aggregator_alert_limit: v }); markDirty('ml') }} />
                    <ToggleField label="Traffic logging mode" value={ml.traffic_logging_mode} isDark={isDark}
                        description="true = disable ML inference, log packets to CSV instead"
                        onChange={(v) => { setMl({ ...ml, traffic_logging_mode: v }); markDirty('ml') }} />
                    <ToggleField label="Adaptive threshold" value={ml.adaptive_threshold_enabled} isDark={isDark}
                        description="Periodically nudges the live threshold between ae_thresholds candidates based on recent alert volume"
                        onChange={(v) => { setMl({ ...ml, adaptive_threshold_enabled: v }); markDirty('ml') }} />
                    <NumField label="Adaptive alpha (0-1)" value={ml.adaptive_alpha} isDark={isDark}
                        description="Blend weight kept on current threshold each step"
                        onChange={(v) => { setMl({ ...ml, adaptive_alpha: v }); markDirty('ml') }} />
                    <NumField label="Adaptive recalibrate (s)" value={ml.adaptive_recalibrate_secs} isDark={isDark}
                        description="Re-evaluation interval for the adaptive threshold"
                        onChange={(v) => { setMl({ ...ml, adaptive_recalibrate_secs: v }); markDirty('ml') }} />
                    <NumField label="Adaptive target alerts min" value={ml.adaptive_target_alerts_min} isDark={isDark}
                        description="Below this per window, step stricter"
                        onChange={(v) => { setMl({ ...ml, adaptive_target_alerts_min: v }); markDirty('ml') }} />
                    <NumField label="Adaptive target alerts max" value={ml.adaptive_target_alerts_max} isDark={isDark}
                        description="Above this per window, step more lenient"
                        onChange={(v) => { setMl({ ...ml, adaptive_target_alerts_max: v }); markDirty('ml') }} />
                    <TextField label="Adaptive max lenient method" value={ml.adaptive_max_lenient_method} isDark={isDark}
                        description="Most lenient rung allowed; empty disables loosening"
                        onChange={(v) => { setMl({ ...ml, adaptive_max_lenient_method: v }); markDirty('ml') }} />
                </SectionCard>
                )}

                {activeTab === 'suricata' && (
                <SectionCard
                    section="suricata"
                    isDark={isDark}
                    risk={riskFor('suricata')}
                    dirty={dirty.has('suricata')}
                    disabled={!suricata}
                    disabledNote="Suricata is disabled (no [Config.suricata] section in config.toml). Add the section manually to enable editing here."
                >
                    {suricata && (
                        <>
                            <Field label="Home net (comma-separated CIDRs)" isDark={isDark}
                                description="Suricata's HOME_NET address group, as CIDR ranges">
                                <input type="text" className={inputClass(isDark)}
                                    value={suricata.home_net.join(', ')}
                                    onChange={(e) => {
                                        const home_net = e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                                        setSuricata({ ...suricata, home_net })
                                        markDirty('suricata')
                                    }} />
                            </Field>
                            <Field label={`Worker core range (0-${numCpus - 1})`} isDark={isDark}
                                description="Suricata worker threads, core range [start, end]">
                                <div className="flex items-center gap-2">
                                    <input type="number" className={inputClass(isDark) + ' w-20'}
                                        value={suricata.worker_cpu_set?.[0] ?? 0}
                                        onChange={(e) => {
                                            const start = Number(e.target.value)
                                            const end = suricata.worker_cpu_set?.[1] ?? start
                                            setSuricata({ ...suricata, worker_cpu_set: [start, end] })
                                            markDirty('suricata')
                                        }} />
                                    <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>to</span>
                                    <input type="number" className={inputClass(isDark) + ' w-20'}
                                        value={suricata.worker_cpu_set?.[1] ?? 0}
                                        onChange={(e) => {
                                            const end = Number(e.target.value)
                                            const start = suricata.worker_cpu_set?.[0] ?? end
                                            setSuricata({ ...suricata, worker_cpu_set: [start, end] })
                                            markDirty('suricata')
                                        }} />
                                </div>
                            </Field>
                            <NumField label={`Management core (0-${numCpus - 1})`} value={suricata.management_cpu ?? 0} isDark={isDark}
                                description="Suricata management thread core"
                                onChange={(v) => { setSuricata({ ...suricata, management_cpu: v }); markDirty('suricata') }} />
                            <TextField label="AF_PACKET threads" value={suricata.af_packet_threads} isDark={isDark}
                                hint={'A number, or "auto"'}
                                description="AF_PACKET capture thread count, or auto"
                                onChange={(v) => { setSuricata({ ...suricata, af_packet_threads: v }); markDirty('suricata') }} />
                            <NumField label="AF_PACKET ring size" value={suricata.af_packet_ring_size} isDark={isDark}
                                description="AF_PACKET ring buffer size"
                                onChange={(v) => { setSuricata({ ...suricata, af_packet_ring_size: v }); markDirty('suricata') }} />
                            <NumField label="AF_PACKET block size" value={suricata.af_packet_block_size} isDark={isDark}
                                description="AF_PACKET ring block size"
                                onChange={(v) => { setSuricata({ ...suricata, af_packet_block_size: v }); markDirty('suricata') }} />
                        </>
                    )}
                </SectionCard>
                )}

                <div className="flex items-center justify-end gap-3 pb-6">
                    <button
                        onClick={load}
                        disabled={saving}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${isDark ? 'text-slate-300 bg-slate-800 hover:bg-slate-700' : 'text-slate-700 bg-slate-100 hover:bg-slate-200'}`}
                    >
                        <FontAwesomeIcon icon={faRotateRight} />
                        Reload
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={dirty.size === 0 || saving}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors ${
                            dirty.size === 0 || saving ? 'bg-slate-600 cursor-not-allowed' : ''
                        }`}
                        style={dirty.size === 0 || saving ? {} : { background: ACCENT }}
                    >
                        {saving && <FontAwesomeIcon icon={faSpinner} spin />}
                        Save changes
                    </button>
                </div>
            </div>
    )
}

SettingsPage.getLayout = (page: React.ReactElement) => <Layout title="Settings">{page}</Layout>

export default SettingsPage
