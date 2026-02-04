"use client";

import { useChromecast } from "@/hooks/useChromecast";

interface CastButtonProps {
  onCastStart?: () => void;
  onCastEnd?: () => void;
  className?: string;
}

export default function CastButton({ onCastStart, onCastEnd, className = "" }: CastButtonProps) {
  const { isAvailable, isConnected, isConnecting, currentDevice, requestSession, disconnect, error } = useChromecast();

  const handleClick = async () => {
    if (isConnected) {
      // Already connected, disconnect
      await disconnect();
      onCastEnd?.();
    } else {
      // Not connected, request session
      try {
        await requestSession();
        onCastStart?.();
      } catch (err: any) {
        // Only log non-cancel errors
        if (err?.code !== "cancel") {
          console.log("Cast connection error:", err?.code || "unknown");
        }
      }
    }
  };

  if (!isAvailable) {
    return (
      <button
        disabled
        className={`flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-500 rounded-xl font-medium cursor-not-allowed ${className}`}
        title="কোনো কাস্ট ডিভাইস পাওয়া যায়নি"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z" />
        </svg>
        <span>TV তে কাস্ট করুন</span>
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleClick}
        disabled={isConnecting}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all active:scale-95 ${
          isConnected
            ? "bg-green-500 text-white hover:bg-green-600"
            : "bg-[#354894] text-white hover:bg-[#4a5faa]"
        } ${isConnecting ? "opacity-60 cursor-wait" : ""} ${className}`}
      >
        {isConnecting ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span>সংযোগ করা হচ্ছে...</span>
          </>
        ) : isConnected ? (
          <>
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M1 18v3h3c0-1.66-1.34-3-3-3zm0-4v2c2.76 0 5 2.24 5 5h2c0-3.87-3.13-7-7-7zm18-7H5v1.63c3.96 1.28 7.09 4.41 8.37 8.37H19V7zM1 10v2a9 9 0 019 9h2c0-6.08-4.93-11-11-11zm20-7H3c-1.1 0-2 .9-2 2v3h2V5h18v14h-7v2h7c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" />
            </svg>
            <span>কাস্ট বন্ধ করুন</span>
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M1 18v3h3c0-1.66-1.34-3-3-3zm0-4v2c2.76 0 5 2.24 5 5h2c0-3.87-3.13-7-7-7zm18-7H5v1.63c3.96 1.28 7.09 4.41 8.37 8.37H19V7zM1 10v2a9 9 0 019 9h2c0-6.08-4.93-11-11-11zm20-7H3c-1.1 0-2 .9-2 2v3h2V5h18v14h-7v2h7c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" />
            </svg>
            <span>TV তে কাস্ট করুন</span>
          </>
        )}
      </button>

      {isConnected && currentDevice && (
        <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          <span>{currentDevice} এ কাস্ট হচ্ছে</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
