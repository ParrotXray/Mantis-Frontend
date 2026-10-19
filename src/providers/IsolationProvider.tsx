import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { fetchData, postData } from '../utils/connectionUtils'
import { urls } from '../utils/apiManager'
import { useAuth } from '../contexts/AuthContext'
import { IsolationStatus } from '../types/IsolationTypes'

const POLL_MS = 15_000

interface IsolationContextType {
    status: IsolationStatus | null
    busy: boolean
    refresh: () => void
    setEnabled: (on: boolean) => Promise<string | null>
}

export const IsolationContext = createContext<IsolationContextType>({
    status: null,
    busy: false,
    refresh: () => {},
    setEnabled: async () => null,
})

export const useIsolation = () => useContext(IsolationContext)

export const IsolationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { token } = useAuth()
    const [status, setStatus] = useState<IsolationStatus | null>(null)
    const [busy, setBusy] = useState(false)

    const refresh = useCallback(() => {
        fetchData(
            urls.isolation.status,
            (text) => {
                try {
                    setStatus(JSON.parse(text) as IsolationStatus)
                } catch {
                }
            },
            () => {},
        )
    }, [])

    useEffect(() => {
        if (!token) {
            setStatus(null)
            return
        }
        refresh()
        const timer = setInterval(refresh, POLL_MS)
        return () => clearInterval(timer)
    }, [token, refresh])

    const setEnabled = useCallback((on: boolean) => new Promise<string | null>(resolve => {
        setBusy(true)
        postData(
            on ? urls.isolation.enable : urls.isolation.disable,
            {},
            (data) => {
                if (data) setStatus(data as IsolationStatus)
                setBusy(false)
                resolve(null)
            },
            (error) => {
                setBusy(false)
                refresh()
                resolve(error.message)
            },
        )
    }), [refresh])

    return (
        <IsolationContext.Provider value={{ status, busy, refresh, setEnabled }}>
            {children}
        </IsolationContext.Provider>
    )
}
