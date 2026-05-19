import { Component, type ReactNode, type ErrorInfo } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from './ui/Button'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  sectionName?: string
  onReset?: () => void
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * SectionErrorBoundary - Granular error boundary for page sections
 * Use this to isolate errors to specific sections (e.g., sidebar, content area)
 * while keeping the rest of the page functional
 */
export class SectionErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error(
        `[SectionErrorBoundary${this.props.sectionName ? ` - ${this.props.sectionName}` : ''}]`,
        error
      )
      console.error('Component stack:', errorInfo.componentStack)
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
    this.props.onReset?.()
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="p-6 rounded-2xl bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-800/30">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-red-100 dark:bg-red-800/30 rounded-xl flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-red-900 dark:text-red-100 mb-1">
                {this.props.sectionName
                  ? `${this.props.sectionName} failed to load`
                  : 'Something went wrong'}
              </h3>
              <p className="text-sm text-red-600 dark:text-red-300 mb-4">
                This section encountered an error. You can try refreshing it or continue using other
                parts of the page.
              </p>
              <Button
                onClick={this.handleReset}
                variant="outline"
                size="sm"
                leftIcon={<RefreshCw className="w-4 h-4" />}
              >
                Retry
              </Button>
            </div>
          </div>
          {import.meta.env.DEV && this.state.error && (
            <div className="mt-4 p-3 bg-red-100/50 dark:bg-red-900/20 rounded-lg">
              <p className="text-xs font-mono text-red-700 dark:text-red-300 break-all">
                {this.state.error.toString()}
              </p>
            </div>
          )}
        </div>
      )
    }

    return this.props.children
  }
}
