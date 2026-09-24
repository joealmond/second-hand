import { Component, ErrorInfo, ReactNode } from 'react'
import { logger } from '@/lib/logger'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * Error Boundary component that catches JavaScript errors in child component tree.
 *
 * Usage:
 * ```tsx
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 *
 * // With custom fallback:
 * <ErrorBoundary fallback={<div>Hiba történt</div>}>
 *   <YourComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log via centralized logger (dispatches to Sentry in production)
    logger.error('ErrorBoundary caught an error', error, {
      componentStack: errorInfo.componentStack ?? undefined,
    })
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <main className="status-page">
          <div className="status-page-body card">
            <h1 className="status-title">Valami elromlott</h1>
            <p>Váratlan hiba történt. A mentett adataid megvannak, próbáld újra.</p>

            {import.meta.env.DEV && this.state.error && (
              <details className="error-details">
                <summary>Hiba részletei</summary>
                <pre>
                  {this.state.error.message}
                  {'\n\n'}
                  {this.state.error.stack}
                </pre>
              </details>
            )}

            <div className="status-actions">
              <button type="button" onClick={this.handleRetry} className="btn btn-primary">
                Újrapróbálás
              </button>
            </div>
          </div>
        </main>
      )
    }

    return this.props.children
  }
}
