import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Wifi, WifiOff } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onRetry?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  isNetworkError: boolean;
  retryCount: number;
}

export class ApiErrorBoundary extends Component<Props, State> {
  private retryTimeoutId: number | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      isNetworkError: false,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Determine if it's a network-related error
    const isNetworkError = 
      error.message.includes('fetch') ||
      error.message.includes('network') ||
      error.message.includes('NetworkError') ||
      error.message.includes('Failed to fetch') ||
      error.name === 'TypeError' && error.message.includes('fetch');

    return {
      hasError: true,
      error,
      isNetworkError,
      retryCount: 0,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log API errors for debugging
    if (process.env.NODE_ENV === 'development') {
      console.error('API ErrorBoundary caught an error:', error, errorInfo);
    }

    // You could send this to an error reporting service here
    // Example: Sentry.captureException(error, { tags: { component: 'api' } });
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  handleRetry = () => {
    const { retryCount } = this.state;
    
    // Exponential backoff for retries
    const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
    
    this.setState(prevState => ({
      retryCount: prevState.retryCount + 1,
    }));

    this.retryTimeoutId = window.setTimeout(() => {
      this.setState({
        hasError: false,
        error: null,
      });

      // Call custom retry handler if provided
      if (this.props.onRetry) {
        this.props.onRetry();
      }
    }, delay);
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, isNetworkError, retryCount } = this.state;
      const isRetrying = retryTimeoutId !== null;

      return (
        <Card className="w-full max-w-md mx-auto">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              {isNetworkError ? (
                <WifiOff className="h-6 w-6 text-destructive" />
              ) : (
                <AlertTriangle className="h-6 w-6 text-destructive" />
              )}
            </div>
            <CardTitle className="text-lg">
              {isNetworkError ? 'Connection Error' : 'Something went wrong'}
            </CardTitle>
            <CardDescription>
              {isNetworkError 
                ? 'Unable to connect to the server. Please check your internet connection and try again.'
                : 'We encountered an error while processing your request. Please try again.'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {process.env.NODE_ENV === 'development' && error && (
              <div className="rounded-md bg-muted p-3">
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Error Details:</h4>
                <p className="text-sm text-destructive font-mono">
                  {error.message}
                </p>
              </div>
            )}
            
            <div className="flex gap-2">
              <Button 
                onClick={this.handleRetry} 
                disabled={isRetrying}
                className="flex-1"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isRetrying ? 'animate-spin' : ''}`} />
                {isRetrying ? 'Retrying...' : 'Try Again'}
              </Button>
              
              {isNetworkError && (
                <Button 
                  variant="outline" 
                  onClick={() => window.location.reload()} 
                  className="flex-1"
                >
                  <Wifi className="w-4 h-4 mr-2" />
                  Reload Page
                </Button>
              )}
            </div>
            
            {retryCount > 0 && (
              <p className="text-xs text-muted-foreground text-center">
                Retry attempt {retryCount}
              </p>
            )}
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

// Hook for handling API errors in functional components
export function useApiErrorHandler() {
  return (error: Error) => {
    // Log API errors
    if (process.env.NODE_ENV === 'development') {
      console.error('API Error:', error);
    }
    
    // Determine error type
    const isNetworkError = 
      error.message.includes('fetch') ||
      error.message.includes('network') ||
      error.message.includes('NetworkError') ||
      error.message.includes('Failed to fetch');

    // You could trigger different handling based on error type
    // For example, show different toast messages or retry strategies
    
    return {
      isNetworkError,
      shouldRetry: isNetworkError,
      retryDelay: isNetworkError ? 2000 : 1000,
    };
  };
}
