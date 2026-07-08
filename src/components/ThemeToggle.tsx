'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
  faSun, 
  faMoon, 
  faDesktop,
  faChevronDown
} from '@fortawesome/free-solid-svg-icons'
import { useTheme } from '../providers/ThemeProvider'

interface ThemeToggleProps {
  isCollapsed?: boolean
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ isCollapsed = false }) => {
  const { theme, actualTheme, setTheme, toggleTheme } = useTheme()
  const [showOptions, setShowOptions] = React.useState(false)

  const themeOptions = [
    {
      value: 'light' as const,
      label: 'Light Mode',
      icon: faSun,
    },
    {
      value: 'dark' as const,
      label: 'Dark Mode',
      icon: faMoon,
    },
    {
      value: 'system' as const,
      label: 'System Default',
      icon: faDesktop,
    }
  ]

  const currentThemeOption = themeOptions.find(option => option.value === theme) || themeOptions[0]

  if (isCollapsed) {
    return (
      <div className="p-2">
        <button
          onClick={toggleTheme}
          className={`
            w-full h-12 rounded-lg flex items-center justify-center
            transition-all duration-300 relative group
          `}
          title={`當前: ${currentThemeOption.label}`}
        >
          <FontAwesomeIcon 
            icon={currentThemeOption.icon} 
            className="text-lg text-gray-500"
          />
          
          <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
            {currentThemeOption.label}
          </div>
        </button>
      </div>
    )
  }

  return (
    <div className="p-4 relative">
      <button
        onClick={() => setShowOptions(!showOptions)}
        className={`
          w-full rounded-lg p-3 flex items-center justify-between
          transition-all duration-300 text-left

        `}
      >
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg">
            <FontAwesomeIcon 
              icon={currentThemeOption.icon} 
              className="text-gray-500"
            />
          </div>
          <div>
            <div className="font-medium text-sm">Theme Mode</div>
            <div className="text-xs text-gray-400">
              {currentThemeOption.label}
            </div>
          </div>
        </div>
        
        <motion.div
          animate={{ rotate: showOptions ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className={actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}
        >
          <FontAwesomeIcon icon={faChevronDown} className="text-sm" />
        </motion.div>
      </button>

      <AnimatePresence>
        {showOptions && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`
              absolute bottom-full left-4 right-4 mb-2 rounded-lg shadow-xl border
              ${actualTheme === 'dark' 
                ? 'bg-gray-800 border-gray-700' 
                : 'bg-gray-300 border-gray-200'
              }
            `}
            style={{ zIndex: 1000 }}
          >
            {themeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  setTheme(option.value)
                  setShowOptions(false)
                }}
                className={`
                  w-full p-3 flex items-center space-x-3 transition-colors duration-200
                  first:rounded-t-lg last:rounded-b-lg
                  ${theme === option.value 
                    ? (actualTheme === 'dark' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-blue-500 text-white'
                      )
                    : (actualTheme === 'dark' 
                        ? 'text-gray-300 hover:bg-gray-700' 
                        : 'text-gray-700 hover:bg-gray-50'
                      )
                  }
                `}
              >
                <div className="p-2 rounded-lg">
                  <FontAwesomeIcon 
                    icon={option.icon} 
                    className={theme === option.value ? 'text-white' : 'text-gray-500'}
                  />
                </div>
                <div className="flex-1 text-left">
                  <div className="font-medium text-sm">{option.label}</div>
                </div>
                
                {theme === option.value && (
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {showOptions && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowOptions(false)}
        />
      )}
    </div>
  )
}

export default ThemeToggle