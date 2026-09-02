import React, { useCallback, useState } from 'react'
import Head from 'next/head'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faFileCsv,
    faShieldHalved,
    faBrain,
    faGlobe,
    faSpinner,
    faDownload,
} from '@fortawesome/free-solid-svg-icons'
import { useTheme } from '../providers/ThemeProvider'
import { fetchBlob } from '../utils/connectionUtils'
import { downloadBlob } from '../utils/download'
import { urls } from '../config'
import Layout from '../components/Layout'
import { NextPageWithLayout } from '../types/NextPageWithLayout'

const ACCENT = '#4ab5cc'

const ResourceCard: React.FC<{
    icon: any
    title: string
    description: string
    isDark: boolean
    disabledNote?: string
    children?: React.ReactNode
}> = ({ icon, title, description, isDark, disabledNote, children }) => (
    <div className={`rounded-xl border overflow-hidden ${isDark ? 'bg-[#0c1a24] border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className={`flex items-center gap-2.5 px-4 py-3 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(74,181,204,0.15)' }}>
                <FontAwesomeIcon icon={icon} className="text-xs" style={{ color: ACCENT }} />
            </div>
            <div>
                <h2 className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{title}</h2>
                <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{description}</p>
            </div>
        </div>
        <div className="p-4">
            {disabledNote ? (
                <p className={`text-sm italic ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{disabledNote}</p>
            ) : (
                children
            )}
        </div>
    </div>
)

const ResourcesPage: NextPageWithLayout = () => {
    const { actualTheme } = useTheme()
    const isDark = actualTheme === 'dark'

    const [downloadingCsv, setDownloadingCsv] = useState(false)
    const [csvDownloadError, setCsvDownloadError] = useState<string | null>(null)

    // Bundles every CSV file recorded under CSV_RECORD_PATH into a zip
    // (only written to when traffic logging mode is on).
    const handleDownloadCsv = useCallback(() => {
        setDownloadingCsv(true)
        setCsvDownloadError(null)
        fetchBlob(
            urls.csvRecordsDownload,
            (blob, filename) => {
                downloadBlob(blob, filename || 'csv_records.zip')
                setDownloadingCsv(false)
            },
            (error) => {
                setCsvDownloadError(error?.message || 'No CSV records available')
                setDownloadingCsv(false)
            }
        )
    }, [])

    const [downloadingReport, setDownloadingReport] = useState(false)
    const [reportDownloadError, setReportDownloadError] = useState<string | null>(null)

    // The backend keeps a bounded in-memory history of ML/rule/fusion/TCP
    // anomaly alerts (independent of the live WebSocket), exported here as a
    // CSV threat report.
    const handleDownloadReport = useCallback(() => {
        setDownloadingReport(true)
        setReportDownloadError(null)
        fetchBlob(
            urls.threatReportExport,
            (blob, filename) => {
                downloadBlob(blob, filename || 'threat_report.csv')
                setDownloadingReport(false)
            },
            (error) => {
                setReportDownloadError(error?.message || 'Failed to export threat report')
                setDownloadingReport(false)
            }
        )
    }, [])

    return (
        <>
            <Head>
                <title>Resources - Mantis</title>
                <meta name="description" content="Mantis Resource Management - CSV records, threat reports, ML models, GeoIP database" />
            </Head>

            <div className="max-w-5xl mx-auto flex flex-col gap-4">
                <ResourceCard
                    icon={faFileCsv}
                    title="Traffic CSV Records"
                    description="Packets logged to CSV while traffic logging mode is enabled"
                    isDark={isDark}
                >
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleDownloadCsv}
                            disabled={downloadingCsv}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors text-white ${
                                downloadingCsv ? 'opacity-60 cursor-not-allowed' : ''
                            }`}
                            style={{ background: ACCENT }}
                        >
                            <FontAwesomeIcon icon={downloadingCsv ? faSpinner : faDownload} spin={downloadingCsv} className="text-xs" />
                            Download CSV bundle
                        </button>
                        {csvDownloadError && (
                            <span className={`text-xs ${isDark ? 'text-red-400' : 'text-red-600'}`}>{csvDownloadError}</span>
                        )}
                    </div>
                </ResourceCard>

                <ResourceCard
                    icon={faShieldHalved}
                    title="Threat Report"
                    description="Detected ML / rule / fusion / TCP anomaly alerts, most recent 500"
                    isDark={isDark}
                >
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleDownloadReport}
                            disabled={downloadingReport}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors text-white ${
                                downloadingReport ? 'opacity-60 cursor-not-allowed' : ''
                            }`}
                            style={{ background: ACCENT }}
                        >
                            <FontAwesomeIcon icon={downloadingReport ? faSpinner : faDownload} spin={downloadingReport} className="text-xs" />
                            Export threat report
                        </button>
                        {reportDownloadError && (
                            <span className={`text-xs ${isDark ? 'text-red-400' : 'text-red-600'}`}>{reportDownloadError}</span>
                        )}
                    </div>
                </ResourceCard>

                <ResourceCard
                    icon={faBrain}
                    title="ML Model"
                    description="Autoencoder model used for anomaly detection"
                    isDark={isDark}
                    disabledNote="Model management (upload/swap the ONNX model, inspect inference_config.json) is not implemented yet."
                />

                <ResourceCard
                    icon={faGlobe}
                    title="GeoIP Database"
                    description="MaxMind database used to geolocate flow source/destination IPs"
                    isDark={isDark}
                    disabledNote="GeoIP database management (upload/refresh the .mmdb file) is not implemented yet."
                />
            </div>
        </>
    )
}

ResourcesPage.getLayout = (page: React.ReactElement) => <Layout>{page}</Layout>

export default ResourcesPage
