
import React, { Component, ReactNode } from 'react';
import { ErrorFallback, ErrorInfo } from '@/components/error-boundaries/ErrorFallback';
import { errorLogger } from '@/services/error/ErrorLogger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode | ((error: ErrorInfo, retry: () => void) => ReactNode);
  context?: {
    component?: string;
    level?: 'low' | 'medium' | 'high' | 'critical';
    metadata?: Record<string, any>;
  };
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorId: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorId: ''
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: `err-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const errorId = errorLogger.logError(error, errorInfo, this.props.context);
    
    this.setState({ errorId });
    
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorId: ''
    });
  };

  public render() {
    if (this.state.hasError && this.state.error) {
      const errorInfo: ErrorInfo = {
        message: this.state.error.message,
        stack: this.state.error.stack,
        errorId: this.state.errorId,
        timestamp: new Date().toISOString()
      };

      // Custom fallback function
      if (typeof this.props.fallback === 'function') {
        return this.props.fallback(errorInfo, this.handleRetry);
      }

      // Custom fallback component
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback
      return (
        <ErrorFallback
          error={errorInfo}
          onRetry={this.handleRetry}
          context={this.props.context}
        />
      );
    }

    return this.props.children;
  }
}

// Higher-order component for wrapping components with error boundary
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};
