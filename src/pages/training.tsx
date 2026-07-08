import React, { useState, useEffect, useRef, useCallback } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faServer,
    faPlus,
    faTrash,
    faCircle,
    faPlay,
    faDatabase,
    faSpinner,
} from '@fortawesome/free-solid-svg-icons'
import { useTheme } from '../providers/ThemeProvider'
import { urls, trainerNodeUrls, trainerNodeWsUrl } from '../config'
import { fetchData, postData, deleteData } from '../utils/connectionUtils'
import Layout from '../components/Layout'
import {
    TrainerNode,
    TrainerNodeListResponse,
    Dataset,
    DatasetListResponse,
    TrainingJob,
    JobListResponse,
    JobSocketMessage,
} from '../types/TrainingTypes'

const STATUS_STYLES: Record<string, string> = {
    pending: 'text-slate-400',
    running: 'text-blue-400',
    succeeded: 'text-green-400',
    failed: 'text-red-400',
}

// Trainer nodes are arbitrary user-registered addresses with no auth of their
// own, so all calls here go straight to the node's host:port with a plain
// fetch -- never with the main backend's Authorization header.
function useTrainerNodeSocket(
    node: TrainerNode | null,
    jobId: string | null,
    onMessage: (msg: JobSocketMessage) => void
) {
    const onMessageRef = useRef(onMessage)
    useEffect(() => { onMessageRef.current = onMessage }, [onMessage])

    const [connected, setConnected] = useState(false)

    useEffect(() => {
        if (!node || !jobId) {
            setConnected(false)
            return
        }
        const ws = new WebSocket(trainerNodeWsUrl(node.host, node.port, jobId))
        ws.onopen = () => setConnected(true)
        ws.onclose = () => setConnected(false)
        ws.onerror = () => ws.close()
        ws.onmessage = (e) => {
            try {
                onMessageRef.current(JSON.parse(e.data))
            } catch {}
        }
        return () => ws.close()
    }, [node?.host, node?.port, jobId])

    return connected
}

const TrainingPage: React.FC = () => {
    const { actualTheme } = useTheme()
    const isDark = actualTheme === 'dark'

    const [nodes, setNodes] = useState<TrainerNode[]>([])
    const [nodesLoading, setNodesLoading] = useState(true)
    const [newNode, setNewNode] = useState({ name: '', host: '', port: '8000' })

    const [selectedNode, setSelectedNode] = useState<TrainerNode | null>(null)
    const [datasets, setDatasets] = useState<Dataset[]>([])
    const [jobs, setJobs] = useState<TrainingJob[]>([])
    const [kaggleId, setKaggleId] = useState('')

    const [activeJobId, setActiveJobId] = useState<string | null>(null)
    const [jobLogs, setJobLogs] = useState<string[]>([])
    const [jobLive, setJobLive] = useState<{ status: string; current_stage: string | null } | null>(null)

    const logsBottomRef = useRef<HTMLDivElement>(null)

    const loadNodes = useCallback(() => {
        setNodesLoading(true)
        fetchData(
            urls.training.nodes,
            (raw) => {
                const parsed: TrainerNodeListResponse = JSON.parse(raw)
                setNodes(parsed.items)
                setNodesLoading(false)
            },
            () => setNodesLoading(false)
        )
    }, [])

    useEffect(() => { loadNodes() }, [loadNodes])

    const addNode = useCallback(() => {
        const port = parseInt(newNode.port, 10)
        if (!newNode.name.trim() || !newNode.host.trim() || !port) return
        postData(
            urls.training.nodes,
            { name: newNode.name.trim(), host: newNode.host.trim(), port },
            () => {
                setNewNode({ name: '', host: '', port: '8000' })
                loadNodes()
            }
        )
    }, [newNode, loadNodes])

    const removeNode = useCallback((id: string) => {
        deleteData(urls.training.node(id), {}, () => {
            if (selectedNode?.id === id) setSelectedNode(null)
            loadNodes()
        })
    }, [selectedNode, loadNodes])

    const loadNodeState = useCallback((node: TrainerNode) => {
        const nodeUrls = trainerNodeUrls(node.host, node.port)
        fetch(nodeUrls.datasets)
            .then(r => r.json())
            .then((parsed: DatasetListResponse) => setDatasets(parsed.items))
            .catch(() => setDatasets([]))
        fetch(nodeUrls.jobs)
            .then(r => r.json())
            .then((parsed: JobListResponse) => setJobs(parsed.items))
            .catch(() => setJobs([]))
    }, [])

    const selectNode = useCallback((node: TrainerNode) => {
        setSelectedNode(node)
        setActiveJobId(null)
        setJobLogs([])
        setJobLive(null)
        loadNodeState(node)
    }, [loadNodeState])

    const createDataset = useCallback(() => {
        if (!selectedNode || !kaggleId.trim()) return
        const form = new FormData()
        form.append('name', kaggleId.trim().split('/').pop() || kaggleId.trim())
        form.append('kaggle_dataset_id', kaggleId.trim())
        fetch(trainerNodeUrls(selectedNode.host, selectedNode.port).datasets, {
            method: 'POST',
            body: form,
        })
            .then(() => {
                setKaggleId('')
                loadNodeState(selectedNode)
            })
            .catch(() => {})
    }, [selectedNode, kaggleId, loadNodeState])

    const startTraining = useCallback((datasetId: string) => {
        if (!selectedNode) return
        fetch(trainerNodeUrls(selectedNode.host, selectedNode.port).train(datasetId), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
        })
            .then(r => r.json())
            .then((job: TrainingJob) => {
                setActiveJobId(job.id)
                setJobLogs([])
                setJobLive({ status: job.status, current_stage: job.current_stage })
                loadNodeState(selectedNode)
            })
            .catch(() => {})
    }, [selectedNode, loadNodeState])

    const handleSocketMessage = useCallback((msg: JobSocketMessage) => {
        if (msg.type === 'status') {
            setJobLive({ status: msg.status, current_stage: msg.current_stage })
            if (msg.status === 'succeeded' || msg.status === 'failed') {
                if (selectedNode) loadNodeState(selectedNode)
            }
        } else if (msg.type === 'log') {
            setJobLogs(prev => [...prev, msg.log_line])
        }
    }, [selectedNode, loadNodeState])

    const wsConnected = useTrainerNodeSocket(selectedNode, activeJobId, handleSocketMessage)

    useEffect(() => {
        logsBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [jobLogs])

    const panelClass = `rounded-xl border ${isDark ? 'bg-[#0e1e2c] border-slate-700/40' : 'bg-white border-slate-200'}`

    return (
        <Layout title="Training - Mantis" description="Manage Mantis-Trainer nodes">
            <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
                {/* Node registry */}
                <div className={`${panelClass} p-4 flex flex-col gap-3`}>
                    <div className="flex items-center gap-2">
                        <FontAwesomeIcon icon={faServer} className="text-[#4ab5cc]" />
                        <h2 className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                            Trainer Nodes
                        </h2>
                    </div>

                    <div className="flex flex-col gap-1.5 max-h-80 overflow-y-auto">
                        {nodesLoading && (
                            <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Loading...</p>
                        )}
                        {!nodesLoading && nodes.length === 0 && (
                            <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>No nodes registered yet.</p>
                        )}
                        {nodes.map(node => (
                            <div
                                key={node.id}
                                onClick={() => selectNode(node)}
                                className={`flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer text-xs transition-colors ${
                                    selectedNode?.id === node.id
                                        ? 'bg-[#4ab5cc]/15 text-[#4ab5cc]'
                                        : isDark ? 'text-slate-300 hover:bg-slate-800/60' : 'text-slate-600 hover:bg-slate-100'
                                }`}
                            >
                                <div className="min-w-0">
                                    <p className="font-medium truncate">{node.name}</p>
                                    <p className={`truncate ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{node.host}:{node.port}</p>
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); removeNode(node.id) }}
                                    className="flex-shrink-0 ml-2 opacity-60 hover:opacity-100 hover:text-red-400"
                                >
                                    <FontAwesomeIcon icon={faTrash} className="text-xs" />
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className={`pt-3 border-t flex flex-col gap-2 ${isDark ? 'border-slate-700/40' : 'border-slate-200'}`}>
                        <input
                            placeholder="Name"
                            value={newNode.name}
                            onChange={e => setNewNode(n => ({ ...n, name: e.target.value }))}
                            className={`px-2.5 py-1.5 rounded-lg text-xs border outline-none ${
                                isDark ? 'bg-[#131929] border-slate-700/50 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700'
                            }`}
                        />
                        <div className="flex gap-2">
                            <input
                                placeholder="Host"
                                value={newNode.host}
                                onChange={e => setNewNode(n => ({ ...n, host: e.target.value }))}
                                className={`flex-1 min-w-0 px-2.5 py-1.5 rounded-lg text-xs border outline-none ${
                                    isDark ? 'bg-[#131929] border-slate-700/50 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700'
                                }`}
                            />
                            <input
                                placeholder="Port"
                                value={newNode.port}
                                onChange={e => setNewNode(n => ({ ...n, port: e.target.value }))}
                                className={`w-16 px-2.5 py-1.5 rounded-lg text-xs border outline-none ${
                                    isDark ? 'bg-[#131929] border-slate-700/50 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700'
                                }`}
                            />
                        </div>
                        <button
                            onClick={addNode}
                            className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#4ab5cc]/15 text-[#4ab5cc] hover:bg-[#4ab5cc]/25 transition-colors"
                        >
                            <FontAwesomeIcon icon={faPlus} className="text-xs" />
                            Register Node
                        </button>
                    </div>
                </div>

                {/* Node detail */}
                {!selectedNode ? (
                    <div className={`${panelClass} flex items-center justify-center h-64`}>
                        <p className={`text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                            Select a trainer node to view its datasets and jobs.
                        </p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4">
                        <div className={`${panelClass} p-4 flex flex-col gap-3`}>
                            <div className="flex items-center gap-2">
                                <FontAwesomeIcon icon={faDatabase} className="text-[#4ab5cc]" />
                                <h2 className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                                    Datasets on {selectedNode.name}
                                </h2>
                            </div>

                            <div className="flex gap-2">
                                <input
                                    placeholder="Kaggle dataset id (e.g. owner/dataset-name)"
                                    value={kaggleId}
                                    onChange={e => setKaggleId(e.target.value)}
                                    className={`flex-1 min-w-0 px-2.5 py-1.5 rounded-lg text-xs border outline-none ${
                                        isDark ? 'bg-[#131929] border-slate-700/50 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700'
                                    }`}
                                />
                                <button
                                    onClick={createDataset}
                                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#4ab5cc]/15 text-[#4ab5cc] hover:bg-[#4ab5cc]/25 transition-colors"
                                >
                                    Add
                                </button>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                {datasets.length === 0 && (
                                    <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>No datasets yet.</p>
                                )}
                                {datasets.map(ds => (
                                    <div
                                        key={ds.id}
                                        className={`flex items-center justify-between px-2.5 py-2 rounded-lg text-xs ${
                                            isDark ? 'bg-[#131929]' : 'bg-slate-50'
                                        }`}
                                    >
                                        <div className="min-w-0">
                                            <p className={`font-medium truncate ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{ds.name}</p>
                                            <p className={isDark ? 'text-slate-500' : 'text-slate-400'}>{ds.row_count} rows · {ds.source}</p>
                                        </div>
                                        <button
                                            onClick={() => startTraining(ds.id)}
                                            className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-green-500/15 text-green-400 hover:bg-green-500/25 transition-colors"
                                        >
                                            <FontAwesomeIcon icon={faPlay} className="text-[10px]" />
                                            Train
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className={`${panelClass} p-4 flex flex-col gap-3`}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <FontAwesomeIcon icon={faSpinner} className={`text-[#4ab5cc] ${jobLive?.status === 'running' ? 'animate-spin' : ''}`} />
                                    <h2 className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                                        Live Job
                                    </h2>
                                </div>
                                {activeJobId && (
                                    <div className="flex items-center gap-1.5 text-xs">
                                        <FontAwesomeIcon icon={faCircle} className={`text-[8px] ${wsConnected ? 'text-green-400' : 'text-red-400'}`} />
                                        <span className={STATUS_STYLES[jobLive?.status ?? ''] ?? (isDark ? 'text-slate-400' : 'text-slate-500')}>
                                            {jobLive?.status ?? 'connecting'}{jobLive?.current_stage ? ` (${jobLive.current_stage})` : ''}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {!activeJobId ? (
                                <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                    Start training on a dataset above to see live logs here.
                                </p>
                            ) : (
                                <div className={`h-64 overflow-y-auto rounded-lg font-mono text-[11px] p-3 ${isDark ? 'bg-[#0b0f17]' : 'bg-slate-50'}`}>
                                    {jobLogs.map((line, i) => (
                                        <div key={i} className={isDark ? 'text-slate-300' : 'text-slate-700'}>{line}</div>
                                    ))}
                                    <div ref={logsBottomRef} />
                                </div>
                            )}
                        </div>

                        {jobs.length > 0 && (
                            <div className={`${panelClass} p-4 flex flex-col gap-2`}>
                                <h2 className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>Past Jobs</h2>
                                {jobs.map(job => (
                                    <div
                                        key={job.id}
                                        onClick={() => { setActiveJobId(job.id); setJobLogs([]); setJobLive({ status: job.status, current_stage: job.current_stage }) }}
                                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer ${
                                            isDark ? 'hover:bg-slate-800/60' : 'hover:bg-slate-100'
                                        }`}
                                    >
                                        <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>{job.id.slice(0, 8)}</span>
                                        <span className={STATUS_STYLES[job.status] ?? ''}>{job.status}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </Layout>
    )
}

export default TrainingPage
