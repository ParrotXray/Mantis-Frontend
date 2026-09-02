import React, { createContext, useCallback, useContext, useRef, useState } from 'react'
import { fetchData, postData } from '../utils/connectionUtils'
import { urls } from '../config'

export type RestartStatus = 'idle' | 'waiting' | 'error'

interface RestartContextType {
    status: RestartStatus
    error: string | null
    triggerRestart: () => void
}

export const RestartContext = createContext<RestartContextType>({
    status: 'idle',
    error: null,
    triggerRestart: () => {},
})

export const useRestart = () => useContext(RestartContext)

interface RestartProviderProps {
    children: React.ReactNode
}

// Mantis re-execs itself in place on restart (same PID), so the only
// observable signal is the HTTP server dropping a request and then
// answering again -- hence waiting for at least one failure before a
// success counts as "back".
export const RestartProvider: React.FC<RestartProviderProps> = ({ children }) => {
    const [status, setStatus] = useState<RestartStatus>('idle')
    const [error, setError] = useState<string | null>(null)
    const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const pollUntilBack = useCallback((attemptsLeft: number, sawFailure: boolean) => {
        if (attemptsLeft <= 0) {
            setStatus('error')
            setError('Mantis did not come back within the expected time. Refresh the page once it is back up.')
            return
        }
        fetchData(
            urls.healthStatus,
            () => {
                if (sawFailure) {
                    setStatus('idle')
                } else {
                    pollTimerRef.current = setTimeout(() => pollUntilBack(attemptsLeft - 1, sawFailure), 1000)
                }
            },
            () => {
                pollTimerRef.current = setTimeout(() => pollUntilBack(attemptsLeft - 1, true), 1000)
            }
        )
    }, [])

    const triggerRestart = useCallback(() => {
        if (status === 'waiting') return
        if (!window.confirm('Restart Mantis now? Packet capture and detection will briefly stop.')) return

        setStatus('waiting')
        setError(null)
        postData(
            urls.systemRestart,
            {},
            () => { pollTimerRef.current = setTimeout(() => pollUntilBack(30, false), 1500) },
            (err) => {
                if (err.message.includes('409')) {
                    pollTimerRef.current = setTimeout(() => pollUntilBack(30, false), 1500)
                } else {
                    setStatus('error')
                    setError(err.message)
                }
            }
        )
    }, [status, pollUntilBack])

    return (
        <RestartContext.Provider value={{ status, error, triggerRestart }}>
            {children}
        </RestartContext.Provider>
    )
}
