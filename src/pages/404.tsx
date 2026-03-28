// pages/404.tsx
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
      description: "系統儀表板總覽",
      color: "blue"
    },
    {
      href: "/statistics",
      icon: faChartBar,
      title: "Statistics",
      description: "數據統計與分析",
      color: "green"
    },
    {
      href: "/access_control",
      icon: faShieldAlt,
      title: "Access Control",
      description: "存取控制管理",
      color: "red"
    },
    {
      href: "/detection",
      icon: faRobot,
      title: "Detection",
      description: "威脅檢測系統",
      color: "purple"
    }
  ];

  const getColorClasses = (color: string) => {
    const colorMap = {
      blue: {
        bg: "bg-blue-500",
        hover: "hover:bg-blue-600",
        border: "border-blue-200",
        hoverBorder: "hover:border-blue-300",
        hoverBg: "hover:bg-blue-50",
        text: "text-blue-600"
      },
      purple: {
        bg: "bg-purple-500",
        hover: "hover:bg-purple-600",
        border: "border-purple-200",
        hoverBorder: "hover:border-purple-300",
        hoverBg: "hover:bg-purple-50",
        text: "text-purple-600"
      },
      green: {
        bg: "bg-green-500",
        hover: "hover:bg-green-600",
        border: "border-green-200",
        hoverBorder: "hover:border-green-300",
        hoverBg: "hover:bg-green-50",
        text: "text-green-600"
      },
      red: {
        bg: "bg-red-500",
        hover: "hover:bg-red-600",
        border: "border-red-200",
        hoverBorder: "hover:border-red-300",
        hoverBg: "hover:bg-red-50",
        text: "text-red-600"
      }
    };
    return colorMap[color as keyof typeof colorMap];
  };

  return (
    <>
      <Head>
        <title>404 - 頁面未找到 | NetGuardia</title>
        <meta name="description" content="您要找的頁面不存在。" />
      </Head>

      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto">
            
            {/* 主要錯誤區域 */}
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
                頁面未找到
              </h2>
              
              <p className="text-lg text-gray-600 max-w-lg mx-auto leading-relaxed">
                抱歉，您要訪問的頁面不存在或已被移動。<br />
                請選擇以下選項繼續使用 NetGuardia 系統。
              </p>
            </motion.div>

            {/* 導航卡片區域 */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mb-12"
            >
              <h3 className="text-xl font-semibold text-gray-800 mb-6 text-center">
                快速導航到主要功能
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

            {/* 操作按鈕 */}
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
                  className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-4 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-300 flex items-center justify-center gap-3 shadow-lg"
                >
                  <FontAwesomeIcon icon={faHome} />
                  返回首頁
                </motion.button>
              </Link>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => window.history.back()}
                className="w-full sm:w-auto bg-gray-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-gray-700 transition-all duration-300 flex items-center justify-center gap-3 shadow-lg"
              >
                <FontAwesomeIcon icon={faArrowLeft} />
                返回上一頁
              </motion.button>
            </motion.div>

            {/* 底部信息 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.9 }}
              className="text-center"
            >
              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                <p className="text-gray-600 mb-2">
                  <strong>需要幫助？</strong>
                </p>
                <p className="text-sm text-gray-500">
                  如果您認為這是一個系統錯誤，請聯繫技術支援團隊或系統管理員。
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