export const Config = {
    httpProtocol: 'http',
    websocketProtocol: 'ws',
    hostname: '192.168.1.3',
    port: 8080,
    tokenKey: 'mantis_auth_token',
    refreshInterval: 50000,
    idleTimeoutMs: 30 * 60 * 1000,
    idleWarningMs: 60 * 1000,
    lastActivityKey: 'mantis_last_activity',
    logoutReasonKey: 'mantis_logout_reason',
} as const
