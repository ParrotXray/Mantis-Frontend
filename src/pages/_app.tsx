import type { AppProps } from 'next/app'
import { ErrorBoundary } from 'react-error-boundary'
import { ThemeProvider } from '../providers/ThemeProvider'
import { WebSocketProvider } from '../providers/WebSocketProvider'
import { AccessControlProvider } from '../providers/AccessControlProvider'
import { RestartProvider } from '../providers/RestartProvider'
import { IsolationProvider } from '../providers/IsolationProvider'
import { NotificationProvider } from '../providers/NotificationProvider'
import { AuthProvider, RouteGuard } from '../contexts/AuthContext'
import ErrorDialog from '../components/ErrorDialog'
import SessionTimeout from '../components/SessionTimeout'
import { NextPageWithLayout } from '../types/NextPageWithLayout'
import '../styles/globals.css'

type AppPropsWithLayout = AppProps & {
  Component: NextPageWithLayout
}

export default function App({ Component, pageProps }: AppPropsWithLayout) {
  const getLayout = Component.getLayout ?? ((page) => page)

  return (
    <ErrorBoundary FallbackComponent={ErrorDialog}>
      <ThemeProvider>
        <AuthProvider>
          <RouteGuard>
            <WebSocketProvider>
              <AccessControlProvider>
                <RestartProvider>
                  <IsolationProvider>
                    <NotificationProvider>
                      {getLayout(<Component {...pageProps} />)}
                    </NotificationProvider>
                  </IsolationProvider>
                </RestartProvider>
              </AccessControlProvider>
            </WebSocketProvider>
          </RouteGuard>
          <SessionTimeout />
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}
