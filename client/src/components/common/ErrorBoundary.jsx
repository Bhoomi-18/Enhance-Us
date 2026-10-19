import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('[ErrorBoundary caught an error]', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl shadow-card border border-slate-200/80 dark:border-slate-800 p-8 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">Something went wrong</h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-6">
              An unexpected application error occurred. We have captured the event.
            </p>
            {this.state.error && (
              <div className="mb-6 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg text-left overflow-auto max-h-32 text-xs font-mono text-slate-700 dark:text-slate-300">
                {this.state.error.toString()}
              </div>
            )}
            <button
              onClick={this.handleReset}
              className="inline-flex items-center justify-center px-5 py-2.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-medium rounded-xl hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors gap-2 text-sm shadow-sm"
            >
              <RefreshCw className="w-4 h-4" /> Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
