export const UI = {
    accent: '#4ab5cc',
    accentDim: 'rgba(74,181,204,0.15)',
    sidebarBg: '#0c2130',
    sidebarCard: '#0a1c28',
    updateIntervals: [
        { label: 'immediate', value: 0 },
        { label: '1s', value: 1000 },
        { label: '3s', value: 3000 },
        { label: '5s', value: 5000 },
        { label: '10s', value: 10000 },
    ],
    fineUpdateIntervals: [
        { label: 'immediate', value: 0 },
        { label: '0.5s', value: 500 },
        { label: '1s', value: 1000 },
        { label: '2s', value: 2000 },
        { label: '3s', value: 3000 },
        { label: '5s', value: 5000 },
        { label: '10s', value: 10000 },
    ],
} as const
