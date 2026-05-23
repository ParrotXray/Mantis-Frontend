import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { motion } from 'framer-motion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faTachometerAlt,
    faChartBar,
    faShieldAlt,
    faRobot,
    faBars,
    faHome,
    faMapMarkedAlt
} from '@fortawesome/free-solid-svg-icons'
import { useTheme } from '../providers/ThemeProvider'
import ThemeToggle from './ThemeToggle'

interface MenuItem {
  href: string
  icon: any
  label: string
}

const menuItems: MenuItem[] = [
  {
    href: '/',
    icon: faHome,
    label: 'Home'
  },
  { 
    href: '/dashboard', 
    icon: faTachometerAlt, 
    label: 'Dashboard'
  },
  { 
    href: '/statistics', 
    icon: faChartBar, 
    label: 'Statistics'
  },
  {
    href: '/traffic-map',
    icon: faMapMarkedAlt,
    label: 'Traffic Map'
  },
  { 
    href: '/access-control', 
    icon: faShieldAlt, 
    label: 'Access Control'
  },
  {
    href: '/detection',
    icon: faRobot,
    label: 'Detection'
  }
]

interface SidebarProps {
  children: React.ReactNode
}

export const Sidebar: React.FC<SidebarProps> = ({ children }) => {
  const router = useRouter()
  const { actualTheme } = useTheme()
  const [isCollapsed, setIsCollapsed] = useState(false)

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed)
  }

  const isActive = (href: string) => {
    if (href === '/') {
      return router.pathname === '/'
    }
    return router.pathname.startsWith(href)
  }

  const sidebarVariants = {
    expanded: { width: "240px" },
    collapsed: { width: "80px" }
  }

  const menuItemVariants = {
    expanded: { x: 0, opacity: 1 },
    collapsed: { x: -10, opacity: 0 }
  }

  const isDark = actualTheme === 'dark'

  return (
    <div className={`flex min-h-screen transition-colors duration-300 ${
      isDark ? 'bg-gray-900' : 'bg-gray-100'
    }`}>
      <motion.aside
        className={`fixed top-0 left-0 h-screen flex flex-col shadow-xl z-50 overflow-hidden transition-colors duration-300 ${
          isDark 
            ? 'bg-gray-600 text-gray-100' 
            : 'bg-slate-800 text-white'
        }`}
        initial="expanded"
        animate={isCollapsed ? "collapsed" : "expanded"}
        variants={sidebarVariants}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        <div className={`flex items-center justify-between p-4 min-h-[70px] border-b transition-colors duration-300 ${
          isDark ? 'border-gray-700' : 'border-white/10'
        }`}>
          {!isCollapsed && (
            <Link href="/" className="no-underline text-inherit">
              <motion.h1
                className="text-2xl font-bold text-blue-400 m-0 whitespace-nowrap"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                Mantis
              </motion.h1>
            </Link>
          )}
          <button 
            onClick={toggleSidebar} 
            className={`bg-transparent border-none cursor-pointer p-2 rounded-md flex items-center justify-center w-10 h-10 transition-colors duration-200 ${
              isDark 
                ? 'text-gray-300 hover:bg-gray-700' 
                : 'text-white hover:bg-white/10'
            }`}
          >
            <FontAwesomeIcon icon={faBars} />
          </button>
        </div>
        
        <nav className="flex-1 py-4 flex flex-col gap-2">
          {menuItems.map((item) => (
            <Link 
              key={item.href} 
              href={item.href} 
              className={`
                flex items-center no-underline transition-all duration-200 relative mx-2 rounded-lg
                ${isCollapsed 
                  ? 'px-2 py-2 justify-center h-12 w-12' 
                  : 'px-4 py-3'
                }
                ${isActive(item.href) 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' 
                  : (isDark 
                      ? 'text-gray-400 hover:bg-gray-700 hover:text-gray-200' 
                      : 'text-slate-300 hover:bg-white/10 hover:text-white'
                    )
                }
              `}
            >
              <div className="flex items-center justify-center flex-shrink-0 w-6 h-6">
                <FontAwesomeIcon icon={item.icon} className="text-lg" />
              </div>
              {!isCollapsed && (
                <motion.span
                  className="font-medium whitespace-nowrap overflow-hidden ml-3"
                  variants={menuItemVariants}
                  initial="expanded"
                  animate={isCollapsed ? "collapsed" : "expanded"}
                  transition={{ duration: 0.2 }}
                >
                  {item.label}
                </motion.span>
              )}
            </Link>
          ))}
        </nav>

        <div className={`mt-auto border-t transition-colors duration-300 ${
          isDark ? 'border-gray-700' : 'border-white/10'
        }`}>
          <ThemeToggle isCollapsed={isCollapsed} />
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