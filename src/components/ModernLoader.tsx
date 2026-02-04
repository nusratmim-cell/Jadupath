"use client";

interface ModernLoaderProps {
  type?: "default" | "ai" | "page";
  message?: string;
  size?: "sm" | "md" | "lg";
}

export function ModernLoader({ type = "default", message, size = "md" }: ModernLoaderProps) {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16",
  };

  const containerClasses = {
    sm: "gap-2",
    md: "gap-3",
    lg: "gap-4",
  };

  if (type === "ai") {
    return (
      <div className={`flex flex-col items-center justify-center ${containerClasses[size]}`}>
        {/* Animated thinking indicator */}
        <div className="relative">
          {/* Pulsing circle */}
          <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-tr from-pink-500 to-purple-500 animate-pulse`} />

          {/* Rotating dots */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className={`${sizeClasses[size]} relative`}>
              <div className="absolute top-0 left-1/2 w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <div className="absolute top-1/2 right-0 w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <div className="absolute bottom-0 left-1/2 w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              <div className="absolute top-1/2 left-0 w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: "450ms" }} />
            </div>
          </div>
        </div>

        {/* Message with gradient text */}
        {message && (
          <p className="text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-purple-600 font-medium text-sm animate-pulse">
            {message}
          </p>
        )}
      </div>
    );
  }

  if (type === "page") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        {/* Layered spinning circles */}
        <div className="relative">
          <div className={`${sizeClasses[size]} border-4 border-[#354894]/20 border-t-[#354894] rounded-full animate-spin`} />
          <div className={`${sizeClasses[size]} border-4 border-pink-500/20 border-r-pink-500 rounded-full animate-spin absolute top-0 left-0`} style={{ animationDuration: "1.5s", animationDirection: "reverse" }} />
        </div>

        {message && (
          <p className="text-slate-600 font-medium mt-4 text-center animate-pulse">
            {message}
          </p>
        )}
      </div>
    );
  }

  // Default loader
  return (
    <div className={`flex flex-col items-center justify-center ${containerClasses[size]}`}>
      {/* Modern spinner */}
      <div className="relative">
        <div className={`${sizeClasses[size]} border-4 border-gray-200 rounded-full`} />
        <div className={`${sizeClasses[size]} border-4 border-[#354894] border-t-transparent rounded-full animate-spin absolute top-0 left-0`} />
      </div>

      {message && (
        <p className="text-slate-600 text-sm font-medium">{message}</p>
      )}
    </div>
  );
}

// AI Thinking Animation Component
export function AIThinking({ type = "default" }: { type?: "default" | "summary" | "quiz" | "lesson" }) {
  const messages = {
    default: "AI চিন্তা করছে...",
    summary: "সারাংশ তৈরি হচ্ছে...",
    quiz: "কুইজ প্রশ্ন তৈরি হচ্ছে...",
    lesson: "পাঠ পরিকল্পনা তৈরি হচ্ছে...",
  };

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl border border-pink-100">
      {/* Animated dots */}
      <div className="flex gap-1.5">
        <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
        <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
        <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
      </div>

      {/* Message */}
      <span className="text-pink-700 font-medium text-sm">{messages[type]}</span>

      {/* Sparkle effect */}
      <div className="ml-auto">
        <svg className="w-5 h-5 text-pink-500 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      </div>
    </div>
  );
}

// Skeleton Loader for Content
export function ContentSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-6 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded-lg w-3/4 animate-shimmer" style={{ backgroundSize: "200% 100%" }} />
      <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded-lg w-full animate-shimmer" style={{ backgroundSize: "200% 100%", animationDelay: "0.1s" }} />
      <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded-lg w-5/6 animate-shimmer" style={{ backgroundSize: "200% 100%", animationDelay: "0.2s" }} />
      <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded-lg w-4/5 animate-shimmer" style={{ backgroundSize: "200% 100%", animationDelay: "0.3s" }} />
    </div>
  );
}

// Image Loading Skeleton
export function ImageLoadingSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden animate-pulse">
      <div className="aspect-[3/4] bg-gradient-to-br from-gray-100 via-gray-50 to-gray-100 relative overflow-hidden">
        {/* Shimmer effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent animate-shimmer" style={{ backgroundSize: "200% 100%" }} />

        {/* Book icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <svg className="w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>
      </div>
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
        <div className="h-3 bg-gray-200 rounded w-1/2 mx-auto" />
      </div>
    </div>
  );
}
