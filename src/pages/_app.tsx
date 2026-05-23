import type { AppProps } from 'next/app'
import { ErrorBoundary } from 'react-error-boundary'
import { ThemeProvider } from '../providers/ThemeProvider'
import { WebSocketProvider } from '../providers/WebSocketProvider'
import { AccessControlProvider } from '../providers/AccessControlProvider'
import ErrorDialog from '../components/ErrorDialog'
import '../styles/globals.css'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ErrorBoundary FallbackComponent={ErrorDialog}>
      <ThemeProvider>
        <WebSocketProvider>
          <AccessControlProvider>
            <Component {...pageProps} />
          </AccessControlProvider>
        </WebSocketProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}