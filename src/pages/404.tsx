import React from 'react';
import Link from 'next/link';
import Head from 'next/head';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHome,
  faArrowLeft,
  faExclamationTriangle,
  faShieldAlt,
  faRobot,
  faTachometerAlt,
  faChartBar
} from '@fortawesome/free-solid-svg-icons';

const Custom404: React.FC = () => {
  const navigationCards = [
    {
      href: "/dashboard",
      icon: faTachometerAlt,
      title: "Dashboard",
      description: "System Dashboard Overview",
      color: "blue"
    },
    {
      href: "/statistics",
      icon: faChartBar,
      title: "Statistics",
      description: "Data Statistics and Analysis",
      color: "green"
    },
    {
      href: "/access_control",
      icon: faShieldAlt,
      title: "Access Control",
      description: "Access Control Management",
      color: "red"
    },
    {
      href: "/detection",
      icon: faRobot,
      title: "Detection",
      description: "Threat Detection System",
      color: "purple"
    }
  ];

  const getColorClasses = (color: string) => {
    const colorMap = {
      blue: {
        bg: "bg-[#4ab5cc]",
        hover: "hover:bg-[#3da5bc]",
        border: "border-sky-200",
        hoverBorder: "hover:border-sky-300",
        hoverBg: "hover:bg-sky-50",
        text: "text-sky-600"
      },
      purple: {
        bg: "bg-indigo-500",
        hover: "hover:bg-indigo-600",
        border: "border-indigo-200",
        hoverBorder: "hover:border-indigo-300",
        hoverBg: "hover:bg-indigo-50",
        text: "text-indigo-600"
      },
      green: {
        bg: "bg-emerald-500",
        hover: "hover:bg-emerald-600",
        border: "border-emerald-200",
        hoverBorder: "hover:border-emerald-300",
        hoverBg: "hover:bg-emerald-50",
        text: "text-emerald-600"
      },
      red: {
        bg: "bg-slate-500",
        hover: "hover:bg-slate-600",
        border: "border-slate-200",
        hoverBorder: "hover:border-slate-300",
        hoverBg: "hover:bg-slate-50",
        text: "text-slate-600"
      }
    };
    return colorMap[color as keyof typeof colorMap];
  };

  return (
    <>
      <Head>
        <title>404 - Page Not Found | Mantis</title>
        <meta name="description" content="The page you are looking for does not exist." />
      </Head>

      <div className="min-h-screen bg-slate-50">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto">
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center mb-12"
            >
              <h1 className="text-7xl font-bold bg-gradient-to-r from-gray-700 to-gray-900 bg-clip-text text-transparent mb-4">
                404
              </h1>
              
              <h2 className="text-3xl font-semibold text-gray-800 mb-4">
                Page Not Found
              </h2>
              
              <p className="text-lg text-gray-600 max-w-lg mx-auto leading-relaxed">
                Sorry, the page you are looking for does not exist or has been moved.<br />
                Please choose from the options below to continue using the Mantis system.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mb-12"
            >
              <h3 className="text-xl font-semibold text-gray-800 mb-6 text-center">
                Quick Navigation to Main Features
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {navigationCards.map((card, index) => {
                  const colors = getColorClasses(card.color);
                  return (
                    <motion.div
                      key={card.href}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 0.3 + index * 0.1 }}
                      whileHover={{ y: -4 }}
                    >
                      <Link href={card.href} className="block">
                        <div className={`bg-white rounded-xl p-6 shadow-md border-2 ${colors.border} ${colors.hoverBorder} ${colors.hoverBg} transition-all duration-300 hover:shadow-lg group h-full`}>
                          <div className="flex items-start space-x-4">
                            <div className={`w-14 h-14 ${colors.bg} ${colors.hover} rounded-xl flex items-center justify-center transition-colors shadow-sm`}>
                              <FontAwesomeIcon icon={card.icon} className="text-white text-xl" />
                            </div>
                            <div className="flex-1">
                              <h4 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-gray-700 transition-colors">
                                {card.title}
                              </h4>
                              <p className="text-gray-600 leading-relaxed">
                                {card.description}
                              </p>
                            </div>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.7 }}
              className="flex flex-col sm:flex-row gap-4 justify-center mb-12"
            >
              <Link href="/">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full sm:w-auto bg-[#4ab5cc] text-white px-8 py-4 rounded-lg font-semibold hover:bg-[#4ab5cc] transition-all duration-300 flex items-center justify-center gap-3 shadow-lg shadow-[#4ab5cc]/15"
                >
                  <FontAwesomeIcon icon={faHome} />
                  Back to Home
                </motion.button>
              </Link>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => window.history.back()}
                className="w-full sm:w-auto bg-slate-700 text-white px-8 py-4 rounded-lg font-semibold hover:bg-slate-600 transition-all duration-300 flex items-center justify-center gap-3 shadow-lg"
              >
                <FontAwesomeIcon icon={faArrowLeft} />
                Back to Previous Page
              </motion.button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.9 }}
              className="text-center"
            >
              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                <p className="text-gray-600 mb-2">
                  <strong>Need Help?</strong>
                </p>
                <p className="text-sm text-gray-500">
                  If you believe this is a system error, please contact the technical support team or system administrator.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Custom404;