/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true, // 啟用 React 嚴格模式
    output: 'export',
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'cdn.discordapp.com',
                pathname: '/avatars/**',
            },
        ],
    },
    // 國際化配置
    // i18n: {
    //     locales: ['tw', 'cn', 'ja', 'en'], // 支援的語言
    //     defaultLocale: 'tw', // 預設語言
    //     // localeDetection: true, // 自動偵測語言
    // },
    
    // transpilePackages: [
    //     '@fortawesome/react-fontawesome',
    //     '@fortawesome/fontawesome-svg-core',
    //     '@fortawesome/free-solid-svg-icons',
    //     '@fortawesome/free-regular-svg-icons',
    //     '@fortawesome/free-brands-svg-icons',
    // ],

    // webpack: (config, { isServer }) => {
    //     config.resolve.fallback = {
    //         ...config.resolve.fallback,
    //         fs: false,
    //     };

    //     config.module.rules.push({
    //         test: /\.json$/,
    //         type: 'json'
    //     });

    //     return config;
    // },
};

module.exports = nextConfig;