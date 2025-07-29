import React, { Component, ErrorInfo, ReactNode } from 'react';
import { errorHandlingService } from '@/services/ErrorHandlingService';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  context?: {
    component: string;
    level: 'low' | 'medium' | 'high' | 'critical';
    metadata?: Record<string, any>;
  };
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

/**
 * Enhanced Error Boundary Component
 * Provides comprehensive error catching with context-aware handling
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { context, onError } = this.props;

    // Log error with context
    errorHandlingService.processError(error, {
      component: context?.component || 'ErrorBoundary',
      action: 'componentDidCatch',
      metadata: {
        ...context?.metadata,
        level: context?.level || 'medium',
        componentStack: errorInfo.componentStack,
        errorBoundary: true
      }
    }, {
      showToast: context?.level !== 'critical', // Don't show toast for critical errors
      logToServer: true
    });

    // Store error info in state
    this.setState({ errorInfo });

    // Call custom error handler if provided
    onError?.(error, errorInfo);

    // Log to console for development
    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 Error Boundary Caught Error');
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.error('Context:', context);
      console.groupEnd();
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback, context } = this.props;

    if (hasError) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback;
      }

      // Default fallback based on error level
      return (
        <DefaultErrorFallback
          error={error}
          errorInfo={errorInfo}
          context={context}
          onRetry={this.handleRetry}
          onReload={this.handleReload}
        />
      );
    }

    return children;
  }
}

/**
 * Default Error Fallback Component
 */
interface DefaultErrorFallbackProps {
  error?: Error;
  errorInfo?: ErrorInfo;
  context?: ErrorBoundaryProps['context'];
  onRetry: () => void;
  onReload: () => void;
}

const DefaultErrorFallback: React.FC<DefaultErrorFallbackProps> = ({
  error,
  errorInfo,
  context,
  onRetry,
  onReload
}) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const level = context?.level || 'medium';

  // Different styling based on error level
  const levelStyles = {
    low: {
      bgColor: 'bg-gray-50',
      textColor: 'text-gray-800',
      accentColor: 'text-gray-600',
      buttonColor: 'bg-gray-600 hover:bg-gray-700'
    },
    medium: {
      bgColor: 'bg-yellow-50',
      textColor: 'text-yellow-800',
      accentColor: 'text-yellow-600',
      buttonColor: 'bg-yellow-600 hover:bg-yellow-700'
    },
    high: {
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-800',
      accentColor: 'text-orange-600',
      buttonColor: 'bg-orange-600 hover:bg-orange-700'
    },
    critical: {
      bgColor: 'bg-red-50',
      textColor: 'text-red-800',
      accentColor: 'text-red-600',
      buttonColor: 'bg-red-600 hover:bg-red-700'
    }
  };

  const styles = levelStyles[level];

  return (
    <div className={`min-h-[200px] flex items-center justify-center p-8 ${styles.bgColor}`}>
      <div className="text-center max-w-md">
        <div className={`text-4xl mb-4 ${styles.accentColor}`}>
          {level === 'critical' ? '💥' : level === 'high' ? '⚠️' : level === 'medium' ? '🔧' : 'ℹ️'}
        </div>
        
        <h2 className={`text-xl font-semibold mb-4 ${styles.textColor}`}>
          {level === 'critical' && 'Critical Error'}
          {level === 'high' && 'Application Error'}
          {level === 'medium' && 'Component Error'}
          {level === 'low' && 'Minor Issue'}
        </h2>

        <p className={`mb-6 ${styles.accentColor}`}>
          {level === 'critical' && 'A critical error occurred that prevents the application from continuing.'}
          {level === 'high' && 'An error occurred that may affect application functionality.'}
          {level === 'medium' && 'A component error occurred. Some features may be temporarily unavailable.'}
          {level === 'low' && 'A minor issue occurred but the application should continue to work normally.'}
        </p>

        {/* Show error details in development */}
        {!isProduction && error && (
          <details className={`mb-6 text-left text-sm ${styles.accentColor}`}>
            <summary className="cursor-pointer font-medium mb-2">
              Error Details (Development Only)
            </summary>
            <div className="bg-white p-3 rounded border text-xs font-mono">
              <div className="font-semibold">Error:</div>
              <div className="mb-2">{error.message}</div>
              {error.stack && (
                <>
                  <div className="font-semibold">Stack:</div>
                  <pre className="whitespace-pre-wrap">{error.stack}</pre>
                </>
              )}
              {errorInfo?.componentStack && (
                <>
                  <div className="font-semibold mt-2">Component Stack:</div>
                  <pre className="whitespace-pre-wrap">{errorInfo.componentStack}</pre>
                </>
              )}
            </div>
          </details>
        )}

        {/* Action buttons */}
        <div className="space-y-2">
          {level !== 'critical' && (
            <button
              onClick={onRetry}
              className={`block w-full text-white px-6 py-2 rounded transition-colors ${styles.buttonColor}`}
            >
              Try Again
            </button>
          )}
          
          <button
            onClick={onReload}
            className="block w-full bg-gray-300 text-gray-700 px-6 py-2 rounded hover:bg-gray-400 transition-colors"
          >
            {level === 'critical' ? 'Reload Application' : 'Refresh Page'}
          </button>
        </div>

        {/* Context info for debugging */}
        {!isProduction && context && (
          <div className={`mt-4 text-xs ${styles.accentColor}`}>
            Component: {context.component} | Level: {context.level}
          </div>
        )}
      </div>
    </div>
  );
};

export default ErrorBoundary;