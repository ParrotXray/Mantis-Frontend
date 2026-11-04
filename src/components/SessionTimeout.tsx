import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faClock } from '@fortawesome/free-solid-svg-icons'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../providers/ThemeProvider'
import { IDLE_TIMEOUT_MS, IDLE_WARNING_MS, LastActivityKey, LogoutReasonKey } from '../../config'
import { urls } from '../utils/apiManager'

export type LogoutReason = 'idle' | 'expired' | 'revoked'

const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keydown', 'wheel', 'scroll', 'touchstart'] as const
// Shared activity is written at most this often, so mousemove does not hammer localStorage.
const WRITE_THROTTLE_MS = 5_000
const TICK_MS = 1_000
// User input is reported to the backend's idle clock at most this often. The backend allows 60s of
// grace on top of the timeout, so this lag never signs out a user who is still working.
const HEARTBEAT_MS = 30_000
// How often to check that the backend still accepts the session (it may have been ended from there).
const SESSION_CHECK_MS = 60_000

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
 * Signs the user out after the backend's idle timeout (`idle_timeout_secs` from /auth/me, or
 * IDLE_TIMEOUT_MS from an older backend) without input in any tab of this browser, warning
 * beforehand, and when the JWT itself expires. Background traffic (WebSockets, polling) never
 * counts as activity. Input is reported to POST /auth/activity, so the backend ends the session on
 * the same clock, and a session the backend ended (401) signs this browser out too.
 */
const SessionTimeout: React.FC = () => {
    const { token, user, logout } = useAuth()
    const router = useRouter()
    const { actualTheme } = useTheme()
    const isDark = actualTheme === 'dark'

    const lastActivityRef = useRef(0)
    const lastWriteRef = useRef(0)
    const lastBeatRef = useRef(0)
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

    // 401 means the backend no longer accepts the session (ended there, idle, or restarted with
    // its sessions gone); other failures (network, restart in progress) are ignored.
    const checkResponse = useCallback((res: Response) => {
        if (res.status === 401) expire('revoked')
    }, [expire])

    const recordActivity = useCallback((force = false) => {
        const now = Date.now()
        lastActivityRef.current = now
        if (force || now - lastWriteRef.current >= WRITE_THROTTLE_MS) {
            lastWriteRef.current = now
            writeStoredActivity(now)
        }
        if (token && (force || now - lastBeatRef.current >= HEARTBEAT_MS)) {
            lastBeatRef.current = now
            fetch(urls.auth.activity, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
                .then(checkResponse)
                .catch(() => {})
        }
    }, [token, checkResponse])

    useEffect(() => {
        if (!token) {
            warningRef.current = false
            setRemaining(null)
            return
        }

        // A restored session resumes the shared idle clock, so a browser left closed past the
        // timeout signs out on its next load. Login writes the current time before the token is set.
        lastActivityRef.current = readStoredActivity() || Date.now()
        lastBeatRef.current = 0
        const expiresAt = tokenExpiry(token)
        // 0 from the backend turns the idle sign-out off; the token's own expiry still applies.
        const idleMs = user?.idle_timeout_secs !== undefined ? user.idle_timeout_secs * 1000 : IDLE_TIMEOUT_MS
        const warningMs = Math.min(IDLE_WARNING_MS, idleMs / 4)
        let lastCheck = Date.now()

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
            if (now - lastCheck >= SESSION_CHECK_MS) {
                lastCheck = now
                fetch(urls.auth.me, { headers: { Authorization: `Bearer ${token}` } })
                    .then(checkResponse)
                    .catch(() => {})
            }
            if (idleMs <= 0) return
            // Input in another tab moves the shared value forward.
            const last = Math.max(lastActivityRef.current, readStoredActivity())
            lastActivityRef.current = last
            const left = last + idleMs - now
            if (left <= 0) {
                expire('idle')
            } else if (left <= warningMs) {
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
    }, [token, user, expire, recordActivity, checkResponse])

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
