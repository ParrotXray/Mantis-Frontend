Research the Mantis frontend codebase to answer the following question or locate the relevant code for the given topic:

$ARGUMENTS

Follow this approach:
1. Start from `src/config.ts` if the question involves an API endpoint or WebSocket URL.
2. Start from `src/providers/WebSocketProvider.tsx` if the question involves real-time data flow or stream subscriptions.
3. Start from `src/providers/AccessControlProvider.tsx` if the question involves IP access control data or caching.
4. Start from the relevant page in `src/pages/` if the question is about a specific UI feature.
5. Check `src/types/` for the shape of data structures used by that page.

After locating the relevant code, provide:
- The file(s) and line numbers that are most relevant.
- A concise explanation of how the code works, including any non-obvious patterns (e.g., the `isPausedRef` pattern that prevents WS re-subscription on pause toggle, the eagerly-opened WS pool in WebSocketProvider, or the bootTime-based timestamp calculation).
- Any other files that interact with the code you found.
