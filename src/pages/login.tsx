import React, { useState, useCallback } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { motion } from 'framer-motion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUser, faLock, faEye, faEyeSlash, faShieldAlt } from '@fortawesome/free-solid-svg-icons'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../providers/ThemeProvider'

const LoginPage: React.FC = () => {
  const { login, isAuthenticated } = useAuth()
  const { actualTheme } = useTheme()
  const router = useRouter()
  const isDark = actualTheme === 'dark'

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  React.useEffect(() => {
    if (isAuthenticated) {
      router.replace('/')
    }
  }, [isAuthenticated, router])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password.trim()) {
      setError('Please enter username and password')
      return
    }

    setError(null)
    setIsLoading(true)
    try {
      await login(username.trim(), password)
      router.replace('/')
    } catch (err: any) {
      setError(err.message || 'Login failed')
    } finally {
      setIsLoading(false)
    }
  }, [username, password, login, router])

  return (
    <>
      <Head>
        <title>Login — Mantis</title>
        <meta name="description" content="Mantis NIDS Login" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div
        className="min-h-screen flex items-center justify-center transition-colors duration-300"
        style={{ background: isDark ? '#0b0f17' : '#f1f5f9' }}
      >
        {/* Background grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(#38bdf8 1px, transparent 1px), linear-gradient(90deg, #38bdf8 1px, transparent 1px)`,
            backgroundSize: '48px 48px',
          }}
        />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="w-full max-w-sm px-4 relative z-10"
        >
          {/* Logo / Brand */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
              style={{ background: 'rgba(56,189,248,0.12)', border: '1px solid rgba(56,189,248,0.2)' }}
            >
              <img src="/mantis-logo.png" alt="Mantis" className="w-9 h-9 object-contain" />
            </div>
            <h1 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Mantis
            </h1>
            <p className={`text-sm mt-1 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
              Network Intrusion Detection System
            </p>
          </div>

          {/* Card */}
          <div
            className="rounded-2xl overflow-hidden shadow-2xl"
            style={{
              background: isDark ? '#131929' : '#ffffff',
              border: isDark ? '1px solid rgba(74,181,204,0.1)' : '1px solid #e2e8f0',
            }}
          >
            <form onSubmit={handleSubmit} className="px-7 py-7 space-y-5">
              {/* Username */}
              <div>
                <label className={`block text-xs font-semibold mb-1.5 tracking-wide uppercase ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}>
                  Username
                </label>
                <div className="relative">
                  <FontAwesomeIcon
                    icon={faUser}
                    className={`absolute left-3 top-1/2 -translate-y-1/2 text-xs ${
                      isDark ? 'text-slate-500' : 'text-slate-400'
                    }`}
                  />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter username"
                    autoComplete="username"
                    className={`w-full pl-9 pr-3 py-2.5 rounded-lg text-sm focus:outline-none transition-colors ${
                      isDark
                        ? 'bg-slate-800/60 border border-slate-700 text-slate-200 placeholder-slate-600 focus:border-[#4ab5cc]/60 focus:bg-slate-800'
                        : 'bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-sky-400 focus:bg-white'
                    }`}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className={`block text-xs font-semibold mb-1.5 tracking-wide uppercase ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}>
                  Password
                </label>
                <div className="relative">
                  <FontAwesomeIcon
                    icon={faLock}
                    className={`absolute left-3 top-1/2 -translate-y-1/2 text-xs ${
                      isDark ? 'text-slate-500' : 'text-slate-400'
                    }`}
                  />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    autoComplete="current-password"
                    className={`w-full pl-9 pr-10 py-2.5 rounded-lg text-sm focus:outline-none transition-colors ${
                      isDark
                        ? 'bg-slate-800/60 border border-slate-700 text-slate-200 placeholder-slate-600 focus:border-[#4ab5cc]/60 focus:bg-slate-800'
                        : 'bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-sky-400 focus:bg-white'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors ${
                      isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} className="text-xs" />
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`px-3.5 py-2.5 rounded-lg text-xs ${
                    isDark
                      ? 'bg-red-900/20 border border-red-700/40 text-red-400'
                      : 'bg-red-50 border border-red-200 text-red-600'
                  }`}
                >
                  {error}
                </motion.div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  isLoading
                    ? 'bg-[#4ab5cc]/40 text-sky-200 cursor-not-allowed'
                    : 'bg-[#4ab5cc] text-white hover:bg-[#4ab5cc] active:bg-sky-600 shadow-lg shadow-[#4ab5cc]/15'
                }`}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" />
                    Signing in…
                  </span>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>
          </div>

          <p className={`text-center mt-5 text-xs ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
            Mantis NIDS — Secure Access Required
          </p>
        </motion.div>
      </div>
    </>
  )
}

export default LoginPage
