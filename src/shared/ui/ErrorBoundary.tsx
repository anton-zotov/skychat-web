import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Shield } from 'lucide-react';

export class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[100dvh] flex flex-col items-center justify-center p-6 bg-slate-50 text-center">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
            <Shield size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Что-то пошло не так</h1>
          <p className="text-slate-500 mb-6 max-w-md">
            Произошла непредвиденная ошибка. Мы уже работаем над её исправлением.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-sky-600 text-white rounded-full font-medium hover:bg-sky-700 transition-colors"
          >
            Обновить страницу
          </button>
          {this.state.error && (
            <pre className="mt-8 p-4 bg-slate-200 rounded-lg text-xs text-slate-600 max-w-full overflow-auto text-left">
              {this.state.error.message}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
