import React, { useState, useCallback } from 'react'
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
} from '@fortawesome/free-solid-svg-icons'
import { useTheme } from '../providers/ThemeProvider'
import { useAuth } from '../contexts/AuthContext'

type ThemeValue = 'light' | 'dark' | 'system'

const THEME_OPTIONS: { value: ThemeValue; icon: any; label: string }[] = [
    { value: 'light',  icon: faSun,     label: 'Light' },
    { value: 'dark',   icon: faMoon,    label: 'Dark' },
    { value: 'system', icon: faDesktop, label: 'System' },
]

const menuItems = [
    { href: '/',               icon: faHome,          label: 'Home' },
    { href: '/dashboard',      icon: faTachometerAlt, label: 'Dashboard' },
    { href: '/statistics',     icon: faChartBar,      label: 'Statistics' },
    { href: '/traffic-map',    icon: faMapMarkedAlt,  label: 'Traffic Map' },
    { href: '/access-control', icon: faShieldAlt,     label: 'Access Control' },
    { href: '/detection',      icon: faRobot,         label: 'Detection' },
    { href: '/logs',           icon: faScroll,        label: 'Logs' },
]

interface SidebarProps {
    children: React.ReactNode
}

export const Sidebar: React.FC<SidebarProps> = ({ children }) => {
    const router = useRouter()
    const { actualTheme, theme, setTheme } = useTheme()
    const { user, logout } = useAuth()
    const [isCollapsed, setIsCollapsed] = useState(false)
    const [showThemePicker, setShowThemePicker] = useState(false)

    const isDark = actualTheme === 'dark'

    const isActive = (href: string) =>
        href === '/' ? router.pathname === '/' : router.pathname.startsWith(href)

    const handleLogout = useCallback(() => {
        logout()
        router.replace('/login')
    }, [logout, router])

    const currentTheme = THEME_OPTIONS.find(o => o.value === theme) ?? THEME_OPTIONS[1]

    const sidebarVariants = {
        expanded: { width: '240px' },
        collapsed: { width: '80px' },
    }

    const labelVariants = {
        expanded: { x: 0, opacity: 1 },
        collapsed: { x: -10, opacity: 0 },
    }

    return (
        <div className={`flex min-h-screen transition-colors duration-300 ${isDark ? 'bg-gray-900' : 'bg-gray-100'}`}>
            <motion.aside
                className="fixed top-0 left-0 h-screen flex flex-col shadow-xl z-50 overflow-hidden bg-[#0a2330] text-white"
                initial="expanded"
                animate={isCollapsed ? 'collapsed' : 'expanded'}
                variants={sidebarVariants}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 min-h-[70px] border-b border-white/8">
                    {!isCollapsed && (
                        <Link href="/" className="no-underline text-inherit">
                            <motion.h1
                                className="text-2xl font-bold text-teal-300 m-0 whitespace-nowrap"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.3 }}
                            >
                                Mantis
                            </motion.h1>
                        </Link>
                    )}
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="bg-transparent border-none cursor-pointer p-2 rounded-md flex items-center justify-center w-10 h-10 transition-colors duration-200 text-teal-200/70 hover:bg-white/10 hover:text-white"
                    >
                        <FontAwesomeIcon icon={faBars} />
                    </button>
                </div>

                {/* Nav */}
                <nav className="flex-1 py-4 flex flex-col gap-1 overflow-y-auto">
                    {menuItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`
                                flex items-center no-underline transition-all duration-200 mx-2 rounded-lg
                                ${isCollapsed ? 'px-2 py-2 justify-center h-12 w-12' : 'px-4 py-3'}
                                ${isActive(item.href)
                                    ? 'bg-teal-600 text-white shadow-lg shadow-teal-900/50'
                                    : 'text-teal-100/60 hover:bg-white/8 hover:text-teal-100'
                                }
                            `}
                        >
                            <div className="flex items-center justify-center flex-shrink-0 w-6 h-6">
                                <FontAwesomeIcon icon={item.icon} className="text-lg" />
                            </div>
                            {!isCollapsed && (
                                <motion.span
                                    className="font-medium whitespace-nowrap overflow-hidden ml-3"
                                    variants={labelVariants}
                                    initial="expanded"
                                    animate={isCollapsed ? 'collapsed' : 'expanded'}
                                    transition={{ duration: 0.2 }}
                                >
                                    {item.label}
                                </motion.span>
                            )}
                        </Link>
                    ))}
                </nav>

                {/* Bottom section */}
                <div className="border-t border-white/8">
                    {isCollapsed ? (
                        <div className="flex flex-col items-center py-2 gap-1">
                            <button
                                onClick={handleLogout}
                                title="Logout"
                                className="w-12 h-10 flex items-center justify-center rounded-lg transition-colors duration-200 text-teal-100/60 hover:bg-red-900/40 hover:text-red-300"
                            >
                                <FontAwesomeIcon icon={faSignOutAlt} />
                            </button>
                            <button
                                onClick={() => {
                                    const idx = THEME_OPTIONS.findIndex(o => o.value === theme)
                                    setTheme(THEME_OPTIONS[(idx + 1) % THEME_OPTIONS.length].value)
                                }}
                                title={`Theme: ${currentTheme.label}`}
                                className="w-12 h-10 flex items-center justify-center rounded-lg transition-colors duration-200 text-teal-100/60 hover:bg-white/10 hover:text-white"
                            >
                                <FontAwesomeIcon icon={currentTheme.icon} />
                            </button>
                        </div>
                    ) : (
                        <div className="relative">
                            {/* Theme picker popup */}
                            <AnimatePresence>
                                {showThemePicker && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 6, scale: 0.97 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 6, scale: 0.97 }}
                                        transition={{ duration: 0.15 }}
                                        className="absolute bottom-full left-3 right-3 mb-2 rounded-xl shadow-2xl border border-white/10 overflow-hidden z-50 bg-[#0d2d3a]"
                                    >
                                        {THEME_OPTIONS.map((option) => (
                                            <button
                                                key={option.value}
                                                onClick={() => { setTheme(option.value); setShowThemePicker(false) }}
                                                className={`w-full px-4 py-2.5 flex items-center gap-3 text-sm transition-colors duration-150 ${
                                                    theme === option.value
                                                        ? 'bg-teal-600 text-white'
                                                        : 'text-teal-100/70 hover:bg-white/8 hover:text-white'
                                                }`}
                                            >
                                                <FontAwesomeIcon icon={option.icon} className="w-4 text-center" />
                                                <span>{option.label}</span>
                                                {theme === option.value && (
                                                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white" />
                                                )}
                                            </button>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {showThemePicker && (
                                <div className="fixed inset-0 z-40" onClick={() => setShowThemePicker(false)} />
                            )}

                            {/* User info + logout */}
                            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/8">
                                <div className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center flex-shrink-0">
                                    <FontAwesomeIcon icon={faUser} className="text-xs text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-white truncate leading-tight">
                                        {user?.username ?? '—'}
                                    </p>
                                    <p className="text-xs truncate leading-tight capitalize text-teal-300/60">
                                        {user?.role ?? ''}
                                    </p>
                                </div>
                                <button
                                    onClick={handleLogout}
                                    title="Logout"
                                    className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg transition-colors duration-200 text-teal-100/50 hover:bg-red-900/40 hover:text-red-300"
                                >
                                    <FontAwesomeIcon icon={faSignOutAlt} className="text-sm" />
                                </button>
                            </div>

                            {/* Theme row */}
                            <button
                                onClick={() => setShowThemePicker(!showThemePicker)}
                                className="w-full flex items-center gap-3 px-4 py-3 transition-colors duration-200 text-teal-100/60 hover:bg-white/8 hover:text-teal-100"
                            >
                                <FontAwesomeIcon icon={currentTheme.icon} className="w-4 text-center flex-shrink-0" />
                                <span className="flex-1 text-sm text-left">{currentTheme.label} Mode</span>
                                <motion.span
                                    animate={{ rotate: showThemePicker ? 180 : 0 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <FontAwesomeIcon icon={faChevronUp} className="text-xs" />
                                </motion.span>
                            </button>
                        </div>
                    )}
                </div>
            </motion.aside>

            <div className={`flex-1 flex flex-col transition-all duration-300 ${isCollapsed ? 'ml-20' : 'ml-60'}`}>
                <section className="flex-1 p-8">
                    <div className="max-w-full mx-auto">
                        {children}
                    </div>
                </section>
            </div>
        </div>
    )
}

export default Sidebar
