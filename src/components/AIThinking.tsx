"use client";

import { useEffect, useState } from "react";

interface AIThinkingProps {
  message?: string;
  type?: "default" | "portal" | "lesson" | "quiz" | "summary" | "extract";
}

const thinkingMessages = {
  default: [
    "AI চিন্তা করছে...",
    "উত্তর প্রস্তুত করছি...",
    "তথ্য বিশ্লেষণ করছি...",
  ],
  portal: [
    "AI সমাধান খুঁজছে...",
    "নির্দেশনা তৈরি করছি...",
    "তথ্য প্রস্তুত করছি...",
  ],
  lesson: [
    "AI পাঠ পরিকল্পনা তৈরি করছে...",
    "পাঠ্যক্রম সাজাচ্ছি...",
    "কার্যক্রম ডিজাইন করছি...",
  ],
  quiz: [
    "AI প্রশ্ন তৈরি করছে...",
    "ব্যাখ্যা লিখছি...",
    "কুইজ প্রস্তুত করছি...",
  ],
  summary: [
    "AI সারাংশ তৈরি করছে...",
    "মূল পয়েন্ট বের করছি...",
    "সহজ ভাষায় লিখছি...",
  ],
  extract: [
    "AI ছবি পড়ছে...",
    "হাতের লেখা বিশ্লেষণ করছি...",
    "তথ্য বের করছি...",
  ],
};

export default function AIThinking({ message, type = "default" }: AIThinkingProps) {
  const [messageIndex, setMessageIndex] = useState(0);
  const [fade, setFade] = useState(true);
  const messages = thinkingMessages[type];

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setMessageIndex((prev) => (prev + 1) % messages.length);
        setFade(true);
      }, 300);
    }, 2500);

    return () => clearInterval(interval);
  }, [messages.length]);

  return (
    <div className="flex items-center justify-center py-4">
      <div className="flex items-center gap-4">
        {/* Modern Animated Icon with Particles */}
        <div className="relative">
          {/* Pulsing Glow Background */}
          <div className="absolute inset-0 bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 rounded-full blur-md opacity-50 animate-pulse"></div>

          {/* AI Brain Icon with Gradient */}
          <div className="relative w-10 h-10 bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 rounded-full flex items-center justify-center shadow-lg">
            <svg
              className="w-6 h-6 text-white animate-pulse"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
          </div>

          {/* Orbiting Particles */}
          <div className="absolute inset-0 animate-spin" style={{ animationDuration: '3s' }}>
            <div className="absolute top-0 left-1/2 w-1.5 h-1.5 bg-purple-500 rounded-full -ml-0.75 shadow-lg shadow-purple-500/50"></div>
          </div>
          <div className="absolute inset-0 animate-spin" style={{ animationDuration: '4s', animationDirection: 'reverse' }}>
            <div className="absolute top-1/2 right-0 w-1.5 h-1.5 bg-pink-500 rounded-full -mt-0.75 shadow-lg shadow-pink-500/50"></div>
          </div>
          <div className="absolute inset-0 animate-spin" style={{ animationDuration: '5s' }}>
            <div className="absolute bottom-0 left-1/2 w-1.5 h-1.5 bg-blue-500 rounded-full -ml-0.75 shadow-lg shadow-blue-500/50"></div>
          </div>
        </div>

        {/* Animated Gradient Text */}
        <div className="flex flex-col gap-1">
          <p
            className={`text-sm font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent transition-opacity duration-300 ${
              fade ? 'opacity-100' : 'opacity-0'
            }`}
            style={{
              backgroundSize: '200% 200%',
              animation: 'gradient-shift 3s ease infinite'
            }}
          >
            {message || messages[messageIndex]}
          </p>

          {/* Animated Dots */}
          <div className="flex gap-1">
            <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
            <span className="w-1.5 h-1.5 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes gradient-shift {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }
      `}</style>
    </div>
  );
}
