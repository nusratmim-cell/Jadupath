"use client";

import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
          <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            <h2 className="text-xl font-bold text-slate-800 mb-2">কিছু সমস্যা হয়েছে</h2>
            <p className="text-slate-500 mb-6">
              দুঃখিত, একটি ত্রুটি ঘটেছে। অনুগ্রহ করে আবার চেষ্টা করুন।
            </p>

            {this.state.error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-6 text-left">
                <p className="text-xs text-red-600 font-mono break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <button
              onClick={() => window.location.reload()}
              className="w-full bg-[#354894] text-white py-3 rounded-xl font-medium hover:bg-[#2d3a7c] transition-colors"
            >
              পেজ রিফ্রেশ করুন
            </button>

            <button
              onClick={() => window.location.href = "/dashboard"}
              className="w-full mt-3 py-3 text-slate-600 hover:text-slate-800 font-medium"
            >
              হোম পেজে যান
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
