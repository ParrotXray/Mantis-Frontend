import type { AppProps } from 'next/app'
import { ErrorBoundary } from 'react-error-boundary'
import { ThemeProvider } from '../providers/ThemeProvider'
import { WebSocketProvider } from '../providers/WebSocketProvider'
import { AccessControlProvider } from '../providers/AccessControlProvider'
import { RestartProvider } from '../providers/RestartProvider'
import { AuthProvider, RouteGuard } from '../contexts/AuthContext'
import ErrorDialog from '../components/ErrorDialog'
import { NextPageWithLayout } from '../types/NextPageWithLayout'
import '../styles/globals.css'

type AppPropsWithLayout = AppProps & {
  Component: NextPageWithLayout
}

export default function App({ Component, pageProps }: AppPropsWithLayout) {
  // Pages provide their own getLayout so Sidebar/Layout mount once and
  // persist across route changes instead of remounting on every navigation.
  const getLayout = Component.getLayout ?? ((page) => page)

  return (
    <ErrorBoundary FallbackComponent={ErrorDialog}>
      <ThemeProvider>
        <AuthProvider>
          <RouteGuard>
            <WebSocketProvider>
              <AccessControlProvider>
                <RestartProvider>
                  {getLayout(<Component {...pageProps} />)}
                </RestartProvider>
              </AccessControlProvider>
            </WebSocketProvider>
          </RouteGuard>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}
