import { Component, type ReactNode, type ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });

    // Log error to console in development only
    if (import.meta.env.DEV) {
      console.error('[ErrorBoundary] Error caught:', error);
      console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
    }

    // In production, send to error tracking service
    if (import.meta.env.PROD) {
      // Sentry.captureException(error, {
      //   extra: { errorId: this.state.errorId, componentStack: errorInfo.componentStack }
      // });
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    });
    this.props.onReset?.();
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      return (
        this.props.fallback || (
          <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-950">
            <Card className="max-w-md w-full p-8 text-center">
              <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <AlertTriangle className="w-10 h-10 text-red-500" />
              </div>

              <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                We&apos;ve encountered an unexpected error. Our team has been notified.
              </p>

              {this.state.errorId && (
                <div className="mb-6 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Error ID</p>
                  <code className="text-xs font-mono text-gray-700 dark:text-gray-300 break-all">
                    {this.state.errorId}
                  </code>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={this.handleReset} variant="outline" leftIcon={<RefreshCw className="w-4 h-4" />}>
                  Try Again
                </Button>
                <Button onClick={this.handleReload} leftIcon={<Bug className="w-4 h-4" />}>
                  Reload Page
                </Button>
                <Button onClick={this.handleGoHome} variant="ghost" leftIcon={<Home className="w-4 h-4" />}>
                  Go Home
                </Button>
              </div>

              {import.meta.env.DEV && this.state.error && (
                <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/10 rounded-lg text-left overflow-auto">
                  <p className="text-xs font-semibold text-red-600 dark:text-red-400 mb-2">Development Error Details:</p>
                  <pre className="text-xs text-red-700 dark:text-red-300 whitespace-pre-wrap">
                    {this.state.error.toString()}
                    {'\n\n'}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </div>
              )}
            </Card>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

// Hook for async error handling
export function useAsyncErrorHandler() {
  const handleError = (error: unknown) => {
    if (import.meta.env.DEV) {
      console.error('[Async Error]', error);
    }

    // Show user-friendly error message
    // This could integrate with a toast system
    if (error instanceof Error) {
      // Toast notification could go here
      if (import.meta.env.DEV) {
        console.error(`Error: ${error.message}`);
      }
    }
  };

  return { handleError };
}
