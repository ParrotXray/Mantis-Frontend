import React, { useState, useCallback } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { motion } from 'framer-motion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUser, faLock, faEye, faEyeSlash, faCheckCircle } from '@fortawesome/free-solid-svg-icons'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../providers/ThemeProvider'

const SetupPage: React.FC = () => {
  const { register, isInitialized } = useAuth()
  const { actualTheme } = useTheme()
  const router = useRouter()
  const isDark = actualTheme === 'dark'

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  React.useEffect(() => {
    if (isInitialized) router.replace('/login')
  }, [isInitialized, router])

  const passwordStrength = (pw: string) => {
    if (pw.length === 0) return null
    if (pw.length < 8) return { label: 'Too short', color: 'bg-red-500', width: '25%' }
    if (pw.length < 12) return { label: 'Fair', color: 'bg-yellow-500', width: '50%' }
    if (/[A-Z]/.test(pw) && /[0-9]/.test(pw)) return { label: 'Strong', color: 'bg-green-500', width: '100%' }
    return { label: 'Good', color: 'bg-[#4ab5cc]', width: '75%' }
  }

  const strength = passwordStrength(password)

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!username.trim()) {
      setError('Username is required')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setIsLoading(true)
    try {
      await register(username.trim(), password)
      router.replace('/')
    } catch (err: any) {
      setError(err.message || 'Setup failed')
    } finally {
      setIsLoading(false)
    }
  }, [username, password, confirmPassword, register, router])

  return (
    <>
      <Head>
        <title>Setup - Mantis</title>
        <meta name="description" content="Mantis NIDS First-time Setup" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div
        className="min-h-screen flex items-center justify-center transition-colors duration-300"
        style={{ background: isDark ? '#0b0f17' : '#f1f5f9' }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md px-4"
        >
          <div
            className="rounded-2xl shadow-2xl overflow-hidden"
            style={{
              background: isDark ? '#131929' : '#ffffff',
              border: isDark ? '1px solid rgba(74,181,204,0.1)' : '1px solid #e2e8f0',
            }}
          >
            <div className="px-8 py-8 text-center" style={{ background: 'linear-gradient(135deg, #0a1c28 0%, #0c2130 100%)' }}>
              <div className="flex justify-center mb-4">
                <img src="/mantis-logo.png" alt="Mantis" className="w-16 h-16 object-contain drop-shadow-lg" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-1">First-time Setup</h1>
              <p className="text-[#4ab5cc]/70 text-sm">Create your administrator account</p>
            </div>

            <div className={`px-6 py-3.5 border-b ${isDark ? 'border-slate-700/50 bg-[#4ab5cc]/5' : 'border-[#4ab5cc]/20 bg-[#4ab5cc]/5'}`}>
              <div className="flex items-start gap-3">
                <FontAwesomeIcon icon={faCheckCircle} className="text-[#4ab5cc] mt-0.5 flex-shrink-0 text-sm" />
                <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-[#3da5bc]'}`}>
                  No accounts exist yet. Create the first administrator account to get started.
                  This setup page will be unavailable after the account is created.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="px-8 py-8 space-y-5">
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Username
                </label>
                <div className="relative">
                  <FontAwesomeIcon
                    icon={faUser}
                    className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-400'}`}
                  />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Choose a username"
                    autoComplete="username"
                    className={`w-full pl-9 pr-3 py-2.5 border rounded-lg focus:outline-none focus:border-[#4ab5cc] focus:ring-1 focus:ring-[#4ab5cc] transition-colors ${
                      isDark
                        ? 'bg-slate-800/60 border-slate-700 text-slate-200 placeholder-slate-600'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Password
                </label>
                <div className="relative">
                  <FontAwesomeIcon
                    icon={faLock}
                    className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-400'}`}
                  />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    autoComplete="new-password"
                    className={`w-full pl-9 pr-10 py-2.5 border rounded-lg focus:outline-none focus:border-[#4ab5cc] focus:ring-1 focus:ring-[#4ab5cc] transition-colors ${
                      isDark
                        ? 'bg-slate-800/60 border-slate-700 text-slate-200 placeholder-slate-600'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors ${
                      isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} className="text-sm" />
                  </button>
                </div>
                {strength && (
                  <div className="mt-2">
                    <div className={`h-1 rounded-full overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${strength.color}`}
                        style={{ width: strength.width }}
                      />
                    </div>
                    <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{strength.label}</p>
                  </div>
                )}
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Confirm Password
                </label>
                <div className="relative">
                  <FontAwesomeIcon
                    icon={faLock}
                    className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-400'}`}
                  />
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    autoComplete="new-password"
                    className={`w-full pl-9 pr-10 py-2.5 border rounded-lg focus:outline-none focus:border-[#4ab5cc] focus:ring-1 focus:ring-[#4ab5cc] transition-colors ${
                      confirmPassword && password !== confirmPassword
                        ? 'border-red-400 focus:border-red-400 focus:ring-red-400'
                        : isDark
                          ? 'bg-slate-800/60 border-slate-700 text-slate-200 placeholder-slate-600'
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                    } ${isDark ? 'bg-gray-700 text-gray-200' : 'bg-white text-gray-900'}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors ${
                      isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    <FontAwesomeIcon icon={showConfirm ? faEyeSlash : faEye} className="text-sm" />
                  </button>
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-xs mt-1 text-red-400">Passwords do not match</p>
                )}
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="px-4 py-3 rounded-lg bg-red-100 border border-red-300 text-red-700 text-sm"
                >
                  {error}
                </motion.div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-2.5 rounded-lg font-semibold transition-colors ${
                  isLoading
                    ? 'bg-[#4ab5cc]/40 text-sky-200 cursor-not-allowed'
                    : 'bg-[#4ab5cc] text-white hover:bg-[#4ab5cc] active:bg-sky-600 shadow-lg shadow-[#4ab5cc]/15'
                }`}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Creating account...
                  </span>
                ) : (
                  'Create Administrator Account'
                )}
              </button>
            </form>
          </div>

          <p className={`text-center mt-4 text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            Mantis NIDS — First-time Setup
          </p>
        </motion.div>
      </div>
    </>
  )
}

export default SetupPage
