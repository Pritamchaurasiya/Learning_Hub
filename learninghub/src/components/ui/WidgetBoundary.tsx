import { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { reportError } from '../ErrorBoundary'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  widgetName?: string
}

interface State {
  hasError: boolean
  error: Error | null
}

export class WidgetBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[WidgetBoundary: ${this.props.widgetName ?? 'Unknown'}] Error caught:`, error)
    reportError(error, errorInfo, { context: `widget_${this.props.widgetName ?? 'unknown'}` })
  }

  public resetBoundary = () => {
    this.setState({ hasError: false, error: null })
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="card p-6 flex flex-col items-center justify-center text-center min-h-[200px] h-full bg-red-50/50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30">
          <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <h3 className="text-sm font-bold text-red-800 dark:text-red-300 mb-2">
            Failed to load widget
          </h3>
          <p className="text-xs text-red-600/70 dark:text-red-400/70 mb-4 max-w-[250px]">
            {this.state.error?.message ??
              'An unexpected error occurred while rendering this component.'}
          </p>
          <button
            onClick={this.resetBoundary}
            className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-2 hover:bg-red-100 dark:hover:bg-red-900/50 hover:text-red-700 dark:hover:text-red-300 border-red-200 dark:border-red-800"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Try Again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

export default WidgetBoundary
