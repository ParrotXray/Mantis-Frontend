/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    trailingSlash: false,
    output: 'export',
    images: {
        remotePatterns: [
            // {
            //     protocol: 'https',
            //     hostname: 'cdn.discordapp.com',
            //     pathname: '/avatars/**',
            // },
        ],
    },

    // i18n: {
    //     locales: ['tw', 'cn', 'ja', 'en'],
    //     defaultLocale: 'tw',
    //     localeDetection: true,
    // },
    //
    // allowedDevOrigins: [
    //     '192.168.1.118',
    //     'localhost',
    //     '127.0.0.1',
    // ],
};

export default nextConfig;