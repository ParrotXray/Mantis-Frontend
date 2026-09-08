import React, { useCallback, useEffect, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faFileShield,
    faFileCircleXmark,
    faPlus,
    faTrash,
    faSpinner,
    faCircleCheck,
    faExclamationTriangle,
    faPowerOff,
    faCode,
    faListCheck,
} from '@fortawesome/free-solid-svg-icons'
import { useTheme } from '../providers/ThemeProvider'
import { useRestart } from '../providers/RestartProvider'
import { getAuthHeaders } from '../utils/authStore'
import { urls } from '../config'
import Layout from '../components/Layout'
import { NextPageWithLayout } from '../types/NextPageWithLayout'
import { RuleFileSummary, RuleFileDetail, RuleLine } from '../types/RuleTypes'

const ACCENT = '#4ab5cc'

async function api<T = void>(url: string, init?: RequestInit): Promise<T> {
    const response = await fetch(url, {
        ...init,
        headers: { ...getAuthHeaders(), ...(init?.headers ?? {}) },
    })
    if (!response.ok) {
        const text = await response.text().catch(() => '')
        throw new Error(text || `HTTP ${response.status}`)
    }
    if (response.headers.get('content-type')?.includes('application/json')) {
        return response.json() as Promise<T>
    }
    return undefined as T
}

const jsonInit = (method: string, body?: unknown): RequestInit => ({
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
})

const ToggleSwitch: React.FC<{ value: boolean; disabled?: boolean; isDark: boolean; onChange: (v: boolean) => void }> = ({
    value,
    disabled,
    isDark,
    onChange,
}) => (
    <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(!value)}
        className="relative w-9 h-5 rounded-full transition-colors flex-shrink-0 disabled:opacity-30"
        style={{ background: value ? ACCENT : isDark ? '#334155' : '#cbd5e1' }}
    >
        <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all" style={{ left: value ? '18px' : '2px' }} />
    </button>
)

const RulesPage: NextPageWithLayout = () => {
    const { actualTheme } = useTheme()
    const isDark = actualTheme === 'dark'
    const { status: restartStatus, error: restartError, triggerRestart } = useRestart()

    const [files, setFiles] = useState<RuleFileSummary[]>([])
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState<string | null>(null)

    const [selected, setSelected] = useState<string | null>(null)
    const [detail, setDetail] = useState<RuleFileDetail | null>(null)
    const [detailLoading, setDetailLoading] = useState(false)

    const [viewMode, setViewMode] = useState<'rules' | 'raw'>('rules')
    const [draftContent, setDraftContent] = useState('')
    const [dirty, setDirty] = useState(false)
    const [saving, setSaving] = useState(false)
    const [actionError, setActionError] = useState<string | null>(null)
    const [savedNotice, setSavedNotice] = useState(false)

    const [newFileName, setNewFileName] = useState('')
    const [creating, setCreating] = useState(false)
    const [confirmDelete, setConfirmDelete] = useState(false)

    const loadFiles = useCallback(() => {
        setLoading(true)
        setLoadError(null)
        api<RuleFileSummary[]>(urls.rules.list)
            .then(setFiles)
            .catch((e: Error) => setLoadError(e.message))
            .finally(() => setLoading(false))
    }, [])

    useEffect(() => { loadFiles() }, [loadFiles])

    const loadDetail = useCallback((filename: string) => {
        setDetailLoading(true)
        setActionError(null)
        api<RuleFileDetail>(urls.rules.file(filename))
            .then((d) => {
                setDetail(d)
                setDraftContent(d.content)
                setDirty(false)
                setViewMode(d.rules.some((r) => r.sid !== null) ? 'rules' : 'raw')
            })
            .catch((e: Error) => setActionError(e.message))
            .finally(() => setDetailLoading(false))
    }, [])

    const handleSelect = (filename: string) => {
        setSelected(filename)
        setConfirmDelete(false)
        loadDetail(filename)
    }

    const handleCreate = () => {
        const name = newFileName.trim()
        if (!name) return
        const filename = name.endsWith('.rules') ? name : `${name}.rules`
        setCreating(true)
        setActionError(null)
        api<RuleFileDetail>(urls.rules.file(filename), jsonInit('PUT', { content: '' }))
            .then(() => {
                setNewFileName('')
                loadFiles()
                handleSelect(filename)
            })
            .catch((e: Error) => setActionError(e.message))
            .finally(() => setCreating(false))
    }

    const handleSaveRaw = () => {
        if (!detail) return
        setSaving(true)
        setActionError(null)
        api<RuleFileDetail>(urls.rules.file(detail.filename), jsonInit('PUT', { content: draftContent }))
            .then((d) => {
                setDetail(d)
                setDirty(false)
                setSavedNotice(true)
                loadFiles()
            })
            .catch((e: Error) => setActionError(e.message))
            .finally(() => setSaving(false))
    }

    const handleDeleteFile = () => {
        if (!detail) return
        setSaving(true)
        setActionError(null)
        api(urls.rules.file(detail.filename), { method: 'DELETE' })
            .then(() => {
                setSelected(null)
                setDetail(null)
                setConfirmDelete(false)
                loadFiles()
            })
            .catch((e: Error) => setActionError(e.message))
            .finally(() => setSaving(false))
    }

    const handleToggleFileEnabled = () => {
        if (!detail) return
        const url = detail.enabled ? urls.rules.disable(detail.filename) : urls.rules.enable(detail.filename)
        setSaving(true)
        setActionError(null)
        api(url, { method: 'POST' })
            .then(() => {
                setDetail({ ...detail, enabled: !detail.enabled })
                setSavedNotice(true)
                loadFiles()
            })
            .catch((e: Error) => setActionError(e.message))
            .finally(() => setSaving(false))
    }

    const handleToggleRule = (line: RuleLine, enabled: boolean) => {
        if (!detail || line.sid === null) return
        setActionError(null)
        api<RuleLine>(urls.rules.sid(detail.filename, line.sid), jsonInit('PATCH', { enabled }))
            .then((updated) => {
                setDetail({
                    ...detail,
                    rules: detail.rules.map((r) => (r.line_number === line.line_number ? updated : r)),
                })
                setSavedNotice(true)
                loadFiles()
            })
            .catch((e: Error) => setActionError(e.message))
    }

    return (
        <div className="flex flex-col gap-4 h-full">
            {restartStatus === 'waiting' && (
                <div className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${isDark ? 'bg-sky-500/10 border-sky-500/30 text-sky-400' : 'bg-sky-50 border-sky-200 text-sky-600'}`}>
                    <FontAwesomeIcon icon={faSpinner} spin />
                    Restarting Mantis... this may take a few seconds.
                </div>
            )}
            {restartStatus === 'error' && (
                <div className={`flex items-center justify-between gap-2 rounded-xl border px-4 py-3 text-sm ${isDark ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-red-50 border-red-200 text-red-600'}`}>
                    <span className="flex items-center gap-2"><FontAwesomeIcon icon={faExclamationTriangle} />{restartError}</span>
                    <button onClick={triggerRestart} className="underline flex-shrink-0">Try again</button>
                </div>
            )}
            {savedNotice && restartStatus === 'idle' && (
                <div className={`flex items-center justify-between gap-2 rounded-xl border px-4 py-3 text-sm ${isDark ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-600'}`}>
                    <span className="flex items-center gap-2"><FontAwesomeIcon icon={faCircleCheck} />Rule changes saved. Restart Mantis for Suricata to pick them up.</span>
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

            <div className="flex gap-4 flex-1 min-h-0">
                <div className={`w-72 flex-shrink-0 flex flex-col rounded-xl border overflow-hidden ${isDark ? 'bg-[#0c1a24] border-slate-800' : 'bg-white border-slate-200'}`}>
                    <div className={`p-3 border-b flex gap-2 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                        <input
                            type="text"
                            placeholder="new-file.rules"
                            value={newFileName}
                            onChange={(e) => setNewFileName(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleCreate() }}
                            className={`flex-1 min-w-0 px-2.5 py-1.5 rounded-md text-sm border outline-none ${isDark ? 'bg-[#0a1620] border-slate-700 text-slate-200 focus:border-[#4ab5cc]' : 'bg-white border-slate-300 text-slate-800 focus:border-[#4ab5cc]'}`}
                        />
                        <button
                            onClick={handleCreate}
                            disabled={creating || !newFileName.trim()}
                            className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-md text-white disabled:opacity-40"
                            style={{ background: ACCENT }}
                        >
                            <FontAwesomeIcon icon={creating ? faSpinner : faPlus} spin={creating} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {loading ? (
                            <div className="flex items-center justify-center py-8"><FontAwesomeIcon icon={faSpinner} spin style={{ color: ACCENT }} /></div>
                        ) : loadError ? (
                            <p className={`p-3 text-xs ${isDark ? 'text-red-400' : 'text-red-600'}`}>{loadError}</p>
                        ) : files.length === 0 ? (
                            <p className={`p-3 text-xs italic ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>No rule files yet.</p>
                        ) : (
                            files.map((f) => (
                                <button
                                    key={f.filename}
                                    onClick={() => handleSelect(f.filename)}
                                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left border-b transition-colors ${isDark ? 'border-slate-800/60' : 'border-slate-100'} ${
                                        selected === f.filename ? (isDark ? 'bg-slate-800/60' : 'bg-slate-100') : (isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50')
                                    }`}
                                >
                                    <FontAwesomeIcon
                                        icon={f.enabled ? faFileShield : faFileCircleXmark}
                                        className="flex-shrink-0"
                                        style={{ color: f.enabled ? ACCENT : isDark ? '#475569' : '#94a3b8' }}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm truncate ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{f.filename}</p>
                                        <p className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                            {f.enabled_count}/{f.rule_count} rules enabled
                                        </p>
                                    </div>
                                    {!f.enabled && (
                                        <span className={`text-[10px] font-semibold uppercase flex-shrink-0 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>off</span>
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                </div>

                <div className={`flex-1 min-w-0 flex flex-col rounded-xl border overflow-hidden ${isDark ? 'bg-[#0c1a24] border-slate-800' : 'bg-white border-slate-200'}`}>
                    {!selected ? (
                        <div className={`flex-1 flex items-center justify-center text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                            Select a rule file, or create a new one.
                        </div>
                    ) : detailLoading || !detail ? (
                        <div className="flex-1 flex items-center justify-center"><FontAwesomeIcon icon={faSpinner} spin style={{ color: ACCENT }} /></div>
                    ) : (
                        <>
                            <div className={`flex items-center gap-2 px-4 py-3 border-b flex-wrap ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                                <h2 className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{detail.filename}</h2>
                                <span
                                    className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full"
                                    style={{ background: detail.enabled ? 'rgba(74,181,204,0.15)' : isDark ? '#1e293b' : '#f1f5f9', color: detail.enabled ? ACCENT : isDark ? '#64748b' : '#94a3b8' }}
                                >
                                    {detail.enabled ? 'Enabled' : 'Disabled'}
                                </span>

                                <div className="flex-1" />

                                <div className={`flex rounded-lg overflow-hidden border ${isDark ? 'border-slate-700' : 'border-slate-300'}`}>
                                    <button
                                        onClick={() => setViewMode('rules')}
                                        className="px-3 py-1.5 text-xs font-medium flex items-center gap-1.5"
                                        style={viewMode === 'rules' ? { background: ACCENT, color: 'white' } : { color: isDark ? '#94a3b8' : '#64748b' }}
                                    >
                                        <FontAwesomeIcon icon={faListCheck} /> Rules
                                    </button>
                                    <button
                                        onClick={() => setViewMode('raw')}
                                        className="px-3 py-1.5 text-xs font-medium flex items-center gap-1.5"
                                        style={viewMode === 'raw' ? { background: ACCENT, color: 'white' } : { color: isDark ? '#94a3b8' : '#64748b' }}
                                    >
                                        <FontAwesomeIcon icon={faCode} /> Raw
                                    </button>
                                </div>

                                <button
                                    onClick={handleToggleFileEnabled}
                                    disabled={saving}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium ${isDark ? 'text-slate-300 bg-slate-800 hover:bg-slate-700' : 'text-slate-700 bg-slate-100 hover:bg-slate-200'}`}
                                >
                                    {detail.enabled ? 'Disable file' : 'Enable file'}
                                </button>

                                {confirmDelete ? (
                                    <button
                                        onClick={handleDeleteFile}
                                        disabled={saving}
                                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-red-500 hover:bg-red-600"
                                    >
                                        Confirm delete?
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => setConfirmDelete(true)}
                                        className={`w-8 h-8 flex items-center justify-center rounded-lg ${isDark ? 'text-red-400 hover:bg-red-500/10' : 'text-red-500 hover:bg-red-50'}`}
                                    >
                                        <FontAwesomeIcon icon={faTrash} />
                                    </button>
                                )}
                            </div>

                            {actionError && (
                                <pre className={`mx-4 mt-3 p-3 rounded-lg text-xs whitespace-pre-wrap break-words ${isDark ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-600'}`}>
                                    {actionError}
                                </pre>
                            )}

                            <div className="flex-1 overflow-y-auto min-h-0">
                                {viewMode === 'rules' ? (
                                    <table className="w-full text-sm">
                                        <thead className={`sticky top-0 ${isDark ? 'bg-[#0c1a24]' : 'bg-white'}`}>
                                            <tr className={`text-left text-[11px] uppercase tracking-wide ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                                <th className="px-4 py-2 w-12"></th>
                                                <th className="px-2 py-2 w-24">SID</th>
                                                <th className="px-2 py-2">Message</th>
                                                <th className="px-2 py-2 w-20">Action</th>
                                                <th className="px-2 py-2 w-20">Proto</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {detail.rules.map((r) => (
                                                <tr key={r.line_number} className={`border-t ${isDark ? 'border-slate-800/60' : 'border-slate-100'} ${!r.enabled ? 'opacity-50' : ''}`}>
                                                    <td className="px-4 py-2">
                                                        <ToggleSwitch
                                                            value={r.enabled}
                                                            disabled={r.sid === null}
                                                            isDark={isDark}
                                                            onChange={(v) => handleToggleRule(r, v)}
                                                        />
                                                    </td>
                                                    <td className={`px-2 py-2 font-mono text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{r.sid ?? '—'}</td>
                                                    <td className={`px-2 py-2 truncate max-w-0 ${isDark ? 'text-slate-200' : 'text-slate-800'}`} title={r.raw}>
                                                        {r.msg ?? r.raw}
                                                    </td>
                                                    <td className={`px-2 py-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{r.action ?? ''}</td>
                                                    <td className={`px-2 py-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{r.proto ?? ''}</td>
                                                </tr>
                                            ))}
                                            {detail.rules.length === 0 && (
                                                <tr><td colSpan={5} className={`px-4 py-8 text-center text-xs italic ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Empty file.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                ) : (
                                    <textarea
                                        value={draftContent}
                                        onChange={(e) => { setDraftContent(e.target.value); setDirty(true) }}
                                        spellCheck={false}
                                        className={`w-full h-full min-h-[300px] p-4 font-mono text-xs resize-none outline-none ${isDark ? 'bg-[#0a1620] text-slate-200' : 'bg-white text-slate-800'}`}
                                    />
                                )}
                            </div>

                            {viewMode === 'raw' && (
                                <div className={`flex items-center justify-end gap-2 px-4 py-3 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                                    <button
                                        onClick={() => { setDraftContent(detail.content); setDirty(false) }}
                                        disabled={!dirty || saving}
                                        className={`px-4 py-2 rounded-lg text-sm disabled:opacity-40 ${isDark ? 'text-slate-300 bg-slate-800 hover:bg-slate-700' : 'text-slate-700 bg-slate-100 hover:bg-slate-200'}`}
                                    >
                                        Discard
                                    </button>
                                    <button
                                        onClick={handleSaveRaw}
                                        disabled={!dirty || saving}
                                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-40"
                                        style={{ background: ACCENT }}
                                    >
                                        {saving && <FontAwesomeIcon icon={faSpinner} spin />}
                                        Save
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

RulesPage.getLayout = (page: React.ReactElement) => <Layout title="Rules">{page}</Layout>

export default RulesPage
