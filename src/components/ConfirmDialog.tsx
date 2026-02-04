"use client";

import { useState, useCallback } from "react";

interface ConfirmDialogProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  type?: "danger" | "warning" | "info";
}

export default function ConfirmDialog({
  message,
  onConfirm,
  onCancel,
  confirmText = "নিশ্চিত করুন",
  cancelText = "বাতিল করুন",
  type = "warning",
}: ConfirmDialogProps) {
  const confirmColor = {
    danger: "bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700",
    warning: "bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700",
    info: "bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700",
  }[type];

  const icon = {
    danger: (
      <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    warning: (
      <svg className="w-12 h-12 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    info: (
      <svg className="w-12 h-12 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  }[type];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4">{icon}</div>
          <p className="text-lg font-medium text-slate-800 leading-relaxed mb-6">{message}</p>
          <div className="flex gap-3 w-full">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className={`flex-1 px-4 py-3 ${confirmColor} text-white rounded-xl font-medium transition-all shadow-lg`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Hook for managing confirm dialogs
export interface ConfirmOptions {
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: "danger" | "warning" | "info";
}

export function useConfirm() {
  const [confirmState, setConfirmState] = useState<ConfirmOptions | null>(null);
  const [onConfirmCallback, setOnConfirmCallback] = useState<(() => void) | null>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState(options);
      setOnConfirmCallback(() => () => {
        resolve(true);
        setConfirmState(null);
      });
    });
  }, []);

  const handleCancel = useCallback(() => {
    setConfirmState(null);
    setOnConfirmCallback(null);
  }, []);

  const handleConfirm = useCallback(() => {
    if (onConfirmCallback) {
      onConfirmCallback();
    }
  }, [onConfirmCallback]);

  const ConfirmDialogComponent = confirmState ? (
    <ConfirmDialog
      message={confirmState.message}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
      confirmText={confirmState.confirmText}
      cancelText={confirmState.cancelText}
      type={confirmState.type}
    />
  ) : null;

  return { confirm, ConfirmDialog: ConfirmDialogComponent };
}
