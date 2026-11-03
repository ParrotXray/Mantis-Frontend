import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faClock } from '@fortawesome/free-solid-svg-icons'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../providers/ThemeProvider'
import { IDLE_TIMEOUT_MS, IDLE_WARNING_MS, LastActivityKey, LogoutReasonKey } from '../../config'

export type LogoutReason = 'idle' | 'expired'

const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keydown', 'wheel', 'scroll', 'touchstart'] as const
// Shared activity is written at most this often, so mousemove does not hammer localStorage.
const WRITE_THROTTLE_MS = 5_000
const TICK_MS = 1_000

const readStoredActivity = (): number => {
    try {
        const v = Number(localStorage.getItem(LastActivityKey))
        return Number.isFinite(v) && v > 0 ? v : 0
    } catch {
        return 0
    }
}

const writeStoredActivity = (t: number) => {
    try {
        localStorage.setItem(LastActivityKey, String(t))
    } catch {
        // Storage unavailable: the idle clock then only covers this tab.
    }
}

// The JWT `exp` claim in milliseconds, or null if the token cannot be decoded.
const tokenExpiry = (token: string): number | null => {
    try {
        const payload = token.split('.')[1]
        const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
        const exp = JSON.parse(json).exp
        return typeof exp === 'number' ? exp * 1000 : null
    } catch {
        return null
    }
}

const formatCountdown = (ms: number) => {
    const s = Math.max(0, Math.ceil(ms / 1000))
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/**
 * Signs the user out after IDLE_TIMEOUT_MS without input in any tab of this browser, warning
 * IDLE_WARNING_MS beforehand, and when the JWT itself expires. Background traffic (WebSockets,
 * polling) never counts as activity.
 */
const SessionTimeout: React.FC = () => {
    const { token, logout } = useAuth()
    const router = useRouter()
    const { actualTheme } = useTheme()
    const isDark = actualTheme === 'dark'

    const lastActivityRef = useRef(0)
    const lastWriteRef = useRef(0)
    const warningRef = useRef(false)
    const [remaining, setRemaining] = useState<number | null>(null)

    const expire = useCallback((reason: LogoutReason) => {
        try {
            sessionStorage.setItem(LogoutReasonKey, reason)
        } catch {
            // The login page then shows no reason.
        }
        warningRef.current = false
        setRemaining(null)
        logout()
        router.replace('/login')
    }, [logout, router])

    const recordActivity = useCallback((force = false) => {
        const now = Date.now()
        lastActivityRef.current = now
        if (force || now - lastWriteRef.current >= WRITE_THROTTLE_MS) {
            lastWriteRef.current = now
            writeStoredActivity(now)
        }
    }, [])

    useEffect(() => {
        if (!token) {
            warningRef.current = false
            setRemaining(null)
            return
        }

        // A restored session resumes the shared idle clock, so a browser left closed past the
        // timeout signs out on its next load. Login writes the current time before the token is set.
        lastActivityRef.current = readStoredActivity() || Date.now()
        const expiresAt = tokenExpiry(token)

        const onActivity = () => {
            // While the warning is up, only its button keeps the session, so a stray mouse
            // movement does not dismiss it unseen.
            if (!warningRef.current) recordActivity()
        }
        ACTIVITY_EVENTS.forEach(ev => window.addEventListener(ev, onActivity, { passive: true }))

        const tick = () => {
            const now = Date.now()
            if (expiresAt !== null && now >= expiresAt) {
                expire('expired')
                return
            }
            // Input in another tab moves the shared value forward.
            const last = Math.max(lastActivityRef.current, readStoredActivity())
            lastActivityRef.current = last
            const left = last + IDLE_TIMEOUT_MS - now
            if (left <= 0) {
                expire('idle')
            } else if (left <= IDLE_WARNING_MS) {
                warningRef.current = true
                setRemaining(left)
            } else if (warningRef.current) {
                warningRef.current = false
                setRemaining(null)
            }
        }
        tick()
        const id = setInterval(tick, TICK_MS)

        return () => {
            clearInterval(id)
            ACTIVITY_EVENTS.forEach(ev => window.removeEventListener(ev, onActivity))
        }
    }, [token, expire, recordActivity])

    const stay = useCallback(() => {
        warningRef.current = false
        setRemaining(null)
        recordActivity(true)
    }, [recordActivity])

    const signOutNow = useCallback(() => {
        warningRef.current = false
        setRemaining(null)
        logout()
        router.replace('/login')
    }, [logout, router])

    if (remaining === null || !token) return null

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4">
            <div
                role="alertdialog"
                aria-labelledby="session-timeout-title"
                className={`w-full max-w-sm rounded-xl border p-6 shadow-2xl ${
                    isDark ? 'bg-gray-900 border-gray-700 text-gray-100' : 'bg-white border-gray-200 text-gray-900'
                }`}
            >
                <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                        isDark ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-100 text-amber-600'
                    }`}>
                        <FontAwesomeIcon icon={faClock} />
                    </div>
                    <h2 id="session-timeout-title" className="text-base font-semibold">Still there?</h2>
                </div>
                <p className={`mt-3 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    You will be signed out for inactivity in{' '}
                    <span className={`font-mono font-semibold ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                        {formatCountdown(remaining)}
                    </span>.
                </p>
                <div className="mt-5 flex justify-end gap-2">
                    <button
                        onClick={signOutNow}
                        className={`rounded-lg px-3.5 py-2 text-sm font-medium ${
                            isDark ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-100'
                        }`}
                    >
                        Sign out
                    </button>
                    <button
                        onClick={stay}
                        autoFocus
                        className="rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-blue-500"
                    >
                        Stay signed in
                    </button>
                </div>
            </div>
        </div>
    )
}

export default SessionTimeout
