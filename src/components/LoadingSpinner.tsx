"use client";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  message?: string;
  fullScreen?: boolean;
}

const sizeClasses = {
  sm: "w-8 h-8 border-2",
  md: "w-12 h-12 border-3",
  lg: "w-16 h-16 border-4",
};

export default function LoadingSpinner({
  size = "md",
  message = "লোড হচ্ছে...",
  fullScreen = false
}: LoadingSpinnerProps) {
  const spinner = (
    <div className="text-center">
      <div
        className={`${sizeClasses[size]} border-[#354894] border-t-transparent rounded-full animate-spin mx-auto mb-4`}
      />
      {message && <p className="text-lg text-slate-600">{message}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
        {spinner}
      </div>
    );
  }

  return spinner;
}
