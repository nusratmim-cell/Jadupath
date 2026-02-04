"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { getCurrentUser, getProfileByUserId } from "@/lib/auth";
import { CHAPTERS_DATA, toBengaliNumber } from "@/lib/data";

interface DialogueLine {
  id: string;
  speaker: "teacher" | "student";
  text: string;
  timestamp: number;
}

export default function AudioLessonPage() {
  const router = useRouter();
  const params = useParams();
  const classId = params.classId as string;
  const subjectId = params.subjectId as string;
  const chapterId = params.chapterId as string;
  const topicId = params.topicId as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [activeLineIndex, setActiveLineIndex] = useState(0);
  const [waveformHeights] = useState(() =>
    Array.from({ length: 20 }, () => Math.random() * 60 + 20)
  );
  const dialogueRef = useRef<HTMLDivElement>(null);

  const chapter = CHAPTERS_DATA[classId]?.[subjectId]?.find(ch => ch.id === chapterId);
  const topic = chapter?.topics.find(t => t.id === topicId);

  // Dialogue content
  const dialogue: DialogueLine[] = [
    { id: "1", speaker: "teacher", text: "আজ আমরা একটি মজার বিষয় শিখব - কম আর বেশি!", timestamp: 0 },
    { id: "2", speaker: "student", text: "আপা, কম আর বেশি মানে কী?", timestamp: 5 },
    { id: "3", speaker: "teacher", text: "খুব ভালো প্রশ্ন! ধরো, তোমার কাছে ৫টি চকলেট আছে, আর তোমার বন্ধুর কাছে ৩টি। কার বেশি?", timestamp: 10 },
    { id: "4", speaker: "student", text: "আমার! কারণ ৫টি তো ৩টির চেয়ে বেশি!", timestamp: 20 },
    { id: "5", speaker: "teacher", text: "একদম ঠিক! ৫ বড় সংখ্যা, তাই ৫টি বেশি। আর ৩ ছোট সংখ্যা, তাই ৩টি কম।", timestamp: 25 },
    { id: "6", speaker: "student", text: "তাহলে বড় সংখ্যা মানে বেশি, ছোট সংখ্যা মানে কম?", timestamp: 35 },
    { id: "7", speaker: "teacher", text: "হ্যাঁ! তুমি খুব দ্রুত বুঝে ফেলেছ! আরেকটা উদাহরণ দিই।", timestamp: 40 },
    { id: "8", speaker: "teacher", text: "মাঠে ৭ জন খেলছে, আর বেঞ্চে ২ জন বসে আছে। কোথায় বেশি মানুষ?", timestamp: 45 },
    { id: "9", speaker: "student", text: "মাঠে! কারণ ৭ বড় ২ এর চেয়ে।", timestamp: 55 },
    { id: "10", speaker: "teacher", text: "অসাধারণ! তুমি তুলনা করা শিখে গেছ!", timestamp: 60 },
    { id: "11", speaker: "student", text: "ধন্যবাদ আপা! এটা তো অনেক সহজ!", timestamp: 65 },
    { id: "12", speaker: "teacher", text: "এবার তুমি বাড়িতে অনুশীলন করো। দেখো কোন জিনিস বেশি আর কোনটি কম।", timestamp: 70 },
  ];

  const totalDuration = 75; // seconds

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.push("/");
      return;
    }
    const teacherProfile = getProfileByUserId(currentUser.id);
    if (!teacherProfile) {
      router.push("/onboarding");
      return;
    }
    setIsLoading(false);
  }, [router]);

  // Simulate audio playback
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTime(prev => {
          if (prev >= totalDuration) {
            setIsPlaying(false);
            return totalDuration;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Update active line based on current time
  useEffect(() => {
    const activeIndex = dialogue.findIndex((line, idx) => {
      const nextLine = dialogue[idx + 1];
      return currentTime >= line.timestamp && (!nextLine || currentTime < nextLine.timestamp);
    });
    if (activeIndex !== -1) {
      setActiveLineIndex(activeIndex);
    }
  }, [currentTime, dialogue]);

  const handleBack = () => {
    router.push(`/learn/${classId}/${subjectId}/${chapterId}/${topicId}`);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${toBengaliNumber(mins)}:${secs < 10 ? '০' : ''}${toBengaliNumber(secs)}`;
  };

  const handleSeek = (timestamp: number) => {
    setCurrentTime(timestamp);
  };

  if (isLoading || !topic) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-12 h-12 border-4 border-[#E07B4C] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex flex-col">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-sm px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={handleBack} className="p-2 hover:bg-white/10 rounded-full">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-white font-bold">🎧 অডিও পাঠ</h1>
              <p className="text-purple-200 text-sm">{topic.name}</p>
            </div>
          </div>
          <button className="p-2 hover:bg-white/10 rounded-full">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>
        </div>
      </header>

      {/* Audio Visualization */}
      <div className="flex-shrink-0 px-4 py-8">
        <div className="max-w-2xl mx-auto text-center">
          {/* Animated Waveform */}
          <div className="flex items-center justify-center gap-1 h-20 mb-6">
            {waveformHeights.map((height, i) => (
              <div
                key={i}
                className={`w-1.5 bg-purple-300 rounded-full transition-all duration-150 ${
                  isPlaying ? "animate-pulse" : ""
                }`}
                style={{
                  height: isPlaying ? `${height}px` : "20px",
                  animationDelay: `${i * 50}ms`,
                }}
              />
            ))}
          </div>

          {/* Time Display */}
          <p className="text-4xl font-bold text-white mb-2">
            {formatTime(currentTime)}
          </p>
          <p className="text-purple-300 text-sm">/ {formatTime(totalDuration)}</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="px-4 mb-4">
        <div className="max-w-2xl mx-auto">
          <div
            className="h-2 bg-white/20 rounded-full overflow-hidden cursor-pointer"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const percent = (e.clientX - rect.left) / rect.width;
              setCurrentTime(Math.floor(percent * totalDuration));
            }}
          >
            <div
              className="h-full bg-[#E07B4C] rounded-full transition-all"
              style={{ width: `${(currentTime / totalDuration) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Dialogue Transcript */}
      <div className="flex-1 overflow-y-auto px-4 pb-32" ref={dialogueRef}>
        <div className="max-w-2xl mx-auto space-y-4">
          <h3 className="text-white/60 text-sm font-medium mb-4">💬 কথোপকথন</h3>

          {dialogue.map((line, idx) => (
            <button
              key={line.id}
              onClick={() => handleSeek(line.timestamp)}
              className={`w-full text-left transition-all duration-300 ${
                idx === activeLineIndex
                  ? "scale-[1.02]"
                  : idx < activeLineIndex
                  ? "opacity-60"
                  : "opacity-40"
              }`}
            >
              <div className={`flex gap-3 ${line.speaker === "student" ? "flex-row-reverse" : ""}`}>
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    line.speaker === "teacher"
                      ? "bg-[#E07B4C]"
                      : "bg-purple-500"
                  }`}
                >
                  <span className="text-xs font-semibold text-white">
                    {line.speaker === "teacher" ? "T" : "S"}
                  </span>
                </div>
                <div
                  className={`flex-1 p-4 rounded-2xl ${
                    line.speaker === "teacher"
                      ? "bg-white/10 rounded-tl-sm"
                      : "bg-purple-500/30 rounded-tr-sm"
                  } ${idx === activeLineIndex ? "ring-2 ring-[#E07B4C]" : ""}`}
                >
                  <p className="text-white">{line.text}</p>
                  <p className="text-white/40 text-xs mt-1">{formatTime(line.timestamp)}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Playback Controls */}
      <div className="fixed bottom-0 left-0 right-0 bg-black/40 backdrop-blur-lg border-t border-white/10 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-center gap-6">
          {/* Rewind 10s */}
          <button
            onClick={() => setCurrentTime(Math.max(0, currentTime - 10))}
            className="p-3 hover:bg-white/10 rounded-full text-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
            </svg>
          </button>

          {/* Play/Pause */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-16 h-16 bg-[#E07B4C] hover:bg-[#d06a3c] rounded-full flex items-center justify-center text-white shadow-lg"
          >
            {isPlaying ? (
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            ) : (
              <svg className="w-8 h-8 ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          {/* Forward 10s */}
          <button
            onClick={() => setCurrentTime(Math.min(totalDuration, currentTime + 10))}
            className="p-3 hover:bg-white/10 rounded-full text-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
