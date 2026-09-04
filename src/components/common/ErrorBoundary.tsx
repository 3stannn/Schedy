import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from './MovingIcon';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught component error:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetLocal = () => {
    localStorage.clear();
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#fafafa] dark:bg-[#0d0d0f] text-[#1c1917] dark:text-[#f4f4f5] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white/90 dark:bg-[#161619]/90 backdrop-blur-xl rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 p-6 shadow-xl text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            
            <div>
              <h2 className="text-base font-bold text-[#1c1917] dark:text-white">
                Something went wrong
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 font-mono">
                {this.state.error?.message || 'An unexpected rendering error occurred.'}
              </p>
              {this.state.error?.stack && (
                <details className="mt-2 text-left">
                  <summary className="text-[10px] text-neutral-400 cursor-pointer hover:underline text-center">
                    View error details
                  </summary>
                  <pre className="mt-1 p-2 rounded bg-black/[0.04] dark:bg-white/[0.04] text-[10px] text-rose-600 dark:text-rose-400 overflow-x-auto max-h-48 font-mono leading-tight whitespace-pre-wrap">
                    {this.state.error.stack}
                  </pre>
                </details>
              )}
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={this.handleReload}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#2383e2] hover:bg-[#1a73e8] text-white shadow-xs transition-all active:scale-95"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reload Application</span>
              </button>

              <button
                onClick={this.handleResetLocal}
                className="px-4 py-2 rounded-xl text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                Clear Data & Reset
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
