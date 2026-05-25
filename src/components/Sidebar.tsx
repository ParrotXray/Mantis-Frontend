import React, { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { motion, AnimatePresence } from 'framer-motion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faTachometerAlt,
    faChartBar,
    faShieldAlt,
    faRobot,
    faBars,
    faHome,
    faMapMarkedAlt,
    faSignOutAlt,
    faUser,
    faSun,
    faMoon,
    faDesktop,
    faChevronUp,
    faScroll,
    faClock,
} from '@fortawesome/free-solid-svg-icons'
import { useTheme } from '../providers/ThemeProvider'
import { useAuth } from '../contexts/AuthContext'
import { useContext } from 'react'
import { WebsocketContext } from '../providers/WebSocketProvider'

type ThemeValue = 'light' | 'dark' | 'system'

const THEME_OPTIONS: { value: ThemeValue; icon: any; label: string }[] = [
    { value: 'light',  icon: faSun,     label: 'Light' },
    { value: 'dark',   icon: faMoon,    label: 'Dark' },
    { value: 'system', icon: faDesktop, label: 'System' },
]

const NAV_GROUPS = [
    {
        label: 'OVERVIEW',
        items: [
            { href: '/',            icon: faHome,          label: 'Home' },
            { href: '/dashboard',   icon: faTachometerAlt, label: 'Dashboard' },
            { href: '/statistics',  icon: faChartBar,      label: 'Statistics' },
            { href: '/traffic-map', icon: faMapMarkedAlt,  label: 'Traffic Map' },
        ],
    },
    {
        label: 'SECURITY',
        items: [
            { href: '/access-control', icon: faShieldAlt, label: 'Access Control' },
            { href: '/detection',      icon: faRobot,     label: 'Detection' },
            { href: '/logs',           icon: faScroll,    label: 'Logs' },
        ],
    },
]

const PAGE_META: Record<string, { title: string; icon: any }> = {
    '/':               { title: 'System Overview',    icon: faHome },
    '/dashboard':      { title: 'Network Dashboard',  icon: faTachometerAlt },
    '/statistics':     { title: 'Traffic Statistics', icon: faChartBar },
    '/traffic-map':    { title: 'Traffic Map',        icon: faMapMarkedAlt },
    '/access-control': { title: 'Access Control',     icon: faShieldAlt },
    '/detection':      { title: 'Threat Detection',   icon: faRobot },
    '/logs':           { title: 'System Logs',        icon: faScroll },
}

// Logo palette
// Sidebar bg:   #0c2130  (dark teal-navy, matches logo circle bg)
// Accent:       #4ab5cc  (steel teal-blue, matches logo shield)
// Accent hover: rgba(74,181,204,0.15)
// Separator:    rgba(74,181,204,0.12)

const ACCENT       = '#4ab5cc'
const ACCENT_DIM   = 'rgba(74,181,204,0.15)'
const SIDEBAR_BG   = '#0c2130'
const SIDEBAR_CARD = '#0a1c28'

interface SidebarProps {
    children: React.ReactNode
}

function useClock() {
    const [time, setTime] = useState(() => new Date())
    useEffect(() => {
        const id = setInterval(() => setTime(new Date()), 1000)
        return () => clearInterval(id)
    }, [])
    return time
}

export const Sidebar: React.FC<SidebarProps> = ({ children }) => {
    const router = useRouter()
    const { actualTheme, theme, setTheme } = useTheme()
    const { user, logout } = useAuth()
    const { wsConnectedCount } = useContext(WebsocketContext)
    const [isCollapsed, setIsCollapsed] = useState(false)
    const [showThemePicker, setShowThemePicker] = useState(false)
    const [isMobile, setIsMobile] = useState(false)
    const [isMobileOpen, setIsMobileOpen] = useState(false)
    const now = useClock()

    const isDark = actualTheme === 'dark'

    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 1024)
        check()
        window.addEventListener('resize', check)
        return () => window.removeEventListener('resize', check)
    }, [])

    // Close drawer when navigating on mobile
    useEffect(() => {
        if (isMobile) setIsMobileOpen(false)
    }, [router.pathname, isMobile])

    const isActive = (href: string) =>
        href === '/' ? router.pathname === '/' : router.pathname.startsWith(href)

    const handleLogout = useCallback(() => {
        logout()
        router.replace('/login')
    }, [logout, router])

    const currentTheme = THEME_OPTIONS.find(o => o.value === theme) ?? THEME_OPTIONS[1]
    const pageMeta = PAGE_META[router.pathname] ?? { title: 'Mantis', icon: faHome }

    const pageBg   = isDark ? '#080f18' : '#f0f4f7'
    const topbarBg = isDark ? '#0c1a24' : '#ffffff'
    const topbarBorder = isDark ? 'rgba(74,181,204,0.12)' : '#e2e8f0'

    const sidebarAnimate = isMobile
        ? { x: isMobileOpen ? 0 : -300, width: '240px' }
        : { x: 0, width: isCollapsed ? '72px' : '240px' }

    return (
        <div className="flex min-h-screen" style={{ background: pageBg }}>

            {/* ── Mobile backdrop ── */}
            <AnimatePresence>
                {isMobile && isMobileOpen && (
                    <motion.div
                        key="backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 bg-black/50 z-40"
                        onClick={() => setIsMobileOpen(false)}
                    />
                )}
            </AnimatePresence>

            {/* ── Sidebar ── */}
            <motion.aside
                className="fixed top-0 left-0 h-screen flex flex-col z-50 overflow-hidden"
                style={{ background: SIDEBAR_BG }}
                animate={sidebarAnimate}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
            >
                {/* Logo */}
                <div
                    className="flex items-center justify-between px-3 h-[52px] flex-shrink-0"
                    style={{ borderBottom: `1px solid rgba(74,181,204,0.14)` }}
                >
                    {!isCollapsed && (
                        <Link href="/" className="no-underline flex items-center gap-2.5 ml-1">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex items-center gap-2.5"
                            >
                                <img src="/mantis-logo.png" alt="Mantis" className="h-7 w-auto flex-shrink-0" />
                                <span className="text-base font-bold tracking-wide text-white">Mantis</span>
                            </motion.div>
                        </Link>
                    )}
                    {!isMobile && (
                        <button
                            onClick={() => setIsCollapsed(!isCollapsed)}
                            className={`w-8 h-8 flex items-center justify-center rounded-md transition-colors ${
                                isCollapsed ? 'mx-auto' : ''
                            }`}
                            style={{ color: 'rgba(74,181,204,0.6)' }}
                            onMouseEnter={e => (e.currentTarget.style.color = ACCENT)}
                            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(74,181,204,0.6)')}
                        >
                            <FontAwesomeIcon icon={faBars} className="text-sm" />
                        </button>
                    )}
                    {isMobile && (
                        <button
                            onClick={() => setIsMobileOpen(false)}
                            className="w-8 h-8 flex items-center justify-center rounded-md transition-colors ml-auto"
                            style={{ color: 'rgba(74,181,204,0.6)' }}
                            onMouseEnter={e => (e.currentTarget.style.color = ACCENT)}
                            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(74,181,204,0.6)')}
                        >
                            <FontAwesomeIcon icon={faBars} className="text-sm" />
                        </button>
                    )}
                </div>

                {/* Nav groups */}
                <nav className="flex-1 py-2 overflow-y-auto overflow-x-hidden">
                    {NAV_GROUPS.map((group, gi) => (
                        <div key={group.label} className={gi > 0 ? 'mt-1' : ''}>
                            {(!isCollapsed || isMobile) ? (
                                <div className="px-4 pt-3 pb-1">
                                    <span className="text-[10px] font-semibold tracking-widest select-none"
                                        style={{ color: 'rgba(74,181,204,0.4)' }}>
                                        {group.label}
                                    </span>
                                </div>
                            ) : (
                                gi > 0 && (
                                    <div className="my-2 mx-3 h-px" style={{ background: 'rgba(74,181,204,0.1)' }} />
                                )
                            )}
                            <div className={`flex flex-col gap-0.5 ${(isCollapsed && !isMobile) ? 'px-2 items-center' : 'px-2'}`}>
                                {group.items.map((item) => {
                                    const active = isActive(item.href)
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            title={(isCollapsed && !isMobile) ? item.label : undefined}
                                            onClick={() => { if (isMobile) setIsMobileOpen(false) }}
                                            className={`flex items-center no-underline transition-all duration-150 rounded-lg relative ${
                                                (isCollapsed && !isMobile) ? 'w-10 h-10 justify-center' : 'px-3 py-2.5'
                                            }`}
                                            style={{
                                                background: active ? ACCENT_DIM : 'transparent',
                                                color: active ? ACCENT : 'rgba(148,163,184,0.7)',
                                            }}
                                            onMouseEnter={e => {
                                                if (!active) {
                                                    e.currentTarget.style.background = 'rgba(74,181,204,0.07)'
                                                    e.currentTarget.style.color = '#cbd5e1'
                                                }
                                            }}
                                            onMouseLeave={e => {
                                                if (!active) {
                                                    e.currentTarget.style.background = 'transparent'
                                                    e.currentTarget.style.color = 'rgba(148,163,184,0.7)'
                                                }
                                            }}
                                        >
                                            {active && (!isCollapsed || isMobile) && (
                                                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full"
                                                    style={{ background: ACCENT }} />
                                            )}
                                            <span className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                                                <FontAwesomeIcon icon={item.icon} className="text-sm" />
                                            </span>
                                            {(!isCollapsed || isMobile) && (
                                                <motion.span
                                                    initial={{ opacity: 1 }}
                                                    animate={{ opacity: isCollapsed ? 0 : 1 }}
                                                    transition={{ duration: 0.15 }}
                                                    className="ml-2.5 text-sm font-medium whitespace-nowrap"
                                                >
                                                    {item.label}
                                                </motion.span>
                                            )}
                                        </Link>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </nav>

                {/* Bottom: user + theme */}
                <div className="flex-shrink-0" style={{ borderTop: `1px solid rgba(74,181,204,0.12)` }}>
                    {(isCollapsed && !isMobile) ? (
                        <div className="flex flex-col items-center py-2 gap-1">
                            <button
                                onClick={handleLogout}
                                title="Logout"
                                className="w-10 h-9 flex items-center justify-center rounded-md transition-colors"
                                style={{ color: 'rgba(148,163,184,0.5)' }}
                                onMouseEnter={e => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)' }}
                                onMouseLeave={e => { e.currentTarget.style.color = 'rgba(148,163,184,0.5)'; e.currentTarget.style.background = 'transparent' }}
                            >
                                <FontAwesomeIcon icon={faSignOutAlt} className="text-sm" />
                            </button>
                            <button
                                onClick={() => {
                                    const idx = THEME_OPTIONS.findIndex(o => o.value === theme)
                                    setTheme(THEME_OPTIONS[(idx + 1) % THEME_OPTIONS.length].value)
                                }}
                                title={`Theme: ${currentTheme.label}`}
                                className="w-10 h-9 flex items-center justify-center rounded-md transition-colors"
                                style={{ color: 'rgba(148,163,184,0.5)' }}
                                onMouseEnter={e => { e.currentTarget.style.color = '#cbd5e1'; e.currentTarget.style.background = 'rgba(74,181,204,0.1)' }}
                                onMouseLeave={e => { e.currentTarget.style.color = 'rgba(148,163,184,0.5)'; e.currentTarget.style.background = 'transparent' }}
                            >
                                <FontAwesomeIcon icon={currentTheme.icon} className="text-sm" />
                            </button>
                        </div>
                    ) : (
                        <div className="relative">
                            <AnimatePresence>
                                {showThemePicker && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 6 }}
                                        transition={{ duration: 0.12 }}
                                        className="absolute bottom-full left-2 right-2 mb-1.5 rounded-xl shadow-2xl overflow-hidden z-50"
                                        style={{ background: SIDEBAR_CARD, border: `1px solid rgba(74,181,204,0.15)` }}
                                    >
                                        {THEME_OPTIONS.map((option) => (
                                            <button
                                                key={option.value}
                                                onClick={() => { setTheme(option.value); setShowThemePicker(false) }}
                                                className="w-full px-4 py-2.5 flex items-center gap-3 text-sm transition-colors"
                                                style={{
                                                    background: theme === option.value ? ACCENT_DIM : 'transparent',
                                                    color: theme === option.value ? ACCENT : 'rgba(148,163,184,0.7)',
                                                }}
                                                onMouseEnter={e => { if (theme !== option.value) { e.currentTarget.style.background = 'rgba(74,181,204,0.07)'; e.currentTarget.style.color = '#cbd5e1' } }}
                                                onMouseLeave={e => { if (theme !== option.value) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(148,163,184,0.7)' } }}
                                            >
                                                <FontAwesomeIcon icon={option.icon} className="w-3.5" />
                                                <span>{option.label}</span>
                                                {theme === option.value && (
                                                    <span className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: ACCENT }} />
                                                )}
                                            </button>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {showThemePicker && (
                                <div className="fixed inset-0 z-40" onClick={() => setShowThemePicker(false)} />
                            )}

                            {/* User */}
                            <div className="flex items-center gap-2.5 px-3 py-2.5"
                                style={{ borderBottom: `1px solid rgba(74,181,204,0.1)` }}>
                                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                                    style={{ background: ACCENT_DIM }}>
                                    <FontAwesomeIcon icon={faUser} className="text-xs" style={{ color: ACCENT }} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-slate-200 truncate leading-none mb-0.5">
                                        {user?.username ?? '—'}
                                    </p>
                                    <p className="text-[11px] truncate capitalize" style={{ color: 'rgba(74,181,204,0.45)' }}>
                                        {user?.role ?? ''}
                                    </p>
                                </div>
                                <button
                                    onClick={handleLogout}
                                    title="Logout"
                                    className="w-7 h-7 flex items-center justify-center rounded-md transition-colors"
                                    style={{ color: 'rgba(148,163,184,0.4)' }}
                                    onMouseEnter={e => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)' }}
                                    onMouseLeave={e => { e.currentTarget.style.color = 'rgba(148,163,184,0.4)'; e.currentTarget.style.background = 'transparent' }}
                                >
                                    <FontAwesomeIcon icon={faSignOutAlt} className="text-xs" />
                                </button>
                            </div>

                            {/* Theme */}
                            <button
                                onClick={() => setShowThemePicker(!showThemePicker)}
                                className="w-full flex items-center gap-2.5 px-3 py-2.5 transition-colors"
                                style={{ color: 'rgba(148,163,204,0.45)' }}
                                onMouseEnter={e => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'rgba(74,181,204,0.05)' }}
                                onMouseLeave={e => { e.currentTarget.style.color = 'rgba(148,163,204,0.45)'; e.currentTarget.style.background = 'transparent' }}
                            >
                                <FontAwesomeIcon icon={currentTheme.icon} className="w-4 flex-shrink-0 text-xs" />
                                <span className="flex-1 text-xs text-left">{currentTheme.label} Mode</span>
                                <motion.span
                                    animate={{ rotate: showThemePicker ? 180 : 0 }}
                                    transition={{ duration: 0.18 }}
                                >
                                    <FontAwesomeIcon icon={faChevronUp} className="text-[10px]" />
                                </motion.span>
                            </button>
                        </div>
                    )}
                </div>
            </motion.aside>

            {/* ── Right column ── */}
            <div
                className="flex-1 flex flex-col h-screen overflow-hidden"
                style={{
                    marginLeft: isMobile ? 0 : (isCollapsed ? '72px' : '240px'),
                    transition: 'margin-left 0.25s ease',
                }}
            >
                {/* Top bar */}
                <header
                    className="sticky top-0 z-40 flex items-center justify-between px-4 lg:px-6 h-[52px] flex-shrink-0"
                    style={{
                        background: topbarBg,
                        borderBottom: `1px solid ${topbarBorder}`,
                    }}
                >
                    <div className="flex items-center gap-2.5">
                        {/* Mobile hamburger */}
                        {isMobile && (
                            <button
                                onClick={() => setIsMobileOpen(true)}
                                className="w-8 h-8 flex items-center justify-center rounded-md mr-1"
                                style={{ color: 'rgba(74,181,204,0.7)' }}
                            >
                                <FontAwesomeIcon icon={faBars} className="text-sm" />
                            </button>
                        )}
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ background: ACCENT_DIM }}>
                            <FontAwesomeIcon icon={pageMeta.icon} className="text-xs" style={{ color: ACCENT }} />
                        </div>
                        <h1 className={`text-sm font-semibold tracking-tight ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                            {pageMeta.title}
                        </h1>
                        <span className={`hidden sm:block text-xs ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                            / Mantis NIDS
                        </span>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* WS status */}
                        <div className="flex items-center gap-1.5">
                            <div className={`w-1.5 h-1.5 rounded-full ${
                                wsConnectedCount > 0 ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                            }`} />
                            <span className={`hidden sm:block text-xs tabular-nums ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                {wsConnectedCount > 0 ? `Connected ${wsConnectedCount}` : 'Disconnected'}
                            </span>
                        </div>

                        <div className={`w-px h-3 ${isDark ? 'bg-slate-700' : 'bg-slate-300'}`} />

                        <div className={`flex items-center gap-1.5 text-xs tabular-nums font-mono ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                            <FontAwesomeIcon icon={faClock} style={{ color: ACCENT, opacity: 0.7 }} className="text-[10px]" />
                            {now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </div>
                        <span className={`hidden sm:block text-xs ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                            {now.toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </span>
                    </div>
                </header>

                {/* Content */}
                <section className="flex-1 overflow-y-auto p-6">
                    {children}
                </section>
            </div>
        </div>
    )
}

export default Sidebar
