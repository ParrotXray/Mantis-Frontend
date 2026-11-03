export const httpProtocol = "http";
export const websocketProtocol = "ws";
export const hostname = "192.168.1.3";
export const port = 8080;

export const TokenKey = 'mantis_auth_token'

// export const REFRESH_INTERVAL = 50000;
// Sign out after this long without keyboard, mouse or touch input in any tab.
export const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
// Show the "still there?" warning this long before the idle sign-out.
export const IDLE_WARNING_MS = 60 * 1000;
// Last user input, shared by every tab of this browser.
export const LastActivityKey = 'mantis_last_activity';
// Why the session ended, read once by the login page.
export const LogoutReasonKey = 'mantis_logout_reason';
