"use client";

import React, { Component, type ReactNode } from "react";
import { AlertTriangle, Home, RotateCcw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackKey?: string;
  onNavigateHome?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ScreenErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ScreenErrorBoundary caught an error:", error, errorInfo);
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.fallbackKey !== this.props.fallbackKey && this.state.hasError) {
      this.setState({ hasError: false, error: null });
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[60vh] w-full flex-col items-center justify-center p-6 text-center">
          <div className="mx-auto max-w-md rounded-3xl border border-bone bg-white p-8 shadow-sm">
            <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 mb-4">
              <AlertTriangle className="size-7" />
            </span>
            <h2 className="font-head text-lg font-black text-ink">تعذر تحميل الشاشة</h2>
            <p className="mt-2 text-sm text-ash">
              حدث خطأ غير متوقع أثناء معالجة بيانات هذه الشاشة. يمكنك إعادة المحاولة أو العودة للصفحة الرئيسية.
            </p>
            {process.env.NODE_ENV !== "production" && this.state.error?.message && (
              <pre className="mt-3 overflow-x-auto rounded-lg bg-mist p-2 text-start font-mono text-[11px] text-red-600">
                {this.state.error.message}
              </pre>
            )}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={this.handleRetry}
                className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-brand/90"
              >
                <RotateCcw className="size-3.5" />
                إعادة المحاولة
              </button>
              <button
                type="button"
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  if (this.props.onNavigateHome) {
                    this.props.onNavigateHome();
                  } else {
                    window.location.href = "/";
                  }
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-bone bg-white px-4 py-2.5 text-xs font-bold text-carbon transition hover:bg-mist"
              >
                <Home className="size-3.5" />
                الصفحة الرئيسية
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
