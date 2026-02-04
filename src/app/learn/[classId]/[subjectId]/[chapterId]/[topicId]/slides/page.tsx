"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { getCurrentUser, getProfileByUserId } from "@/lib/auth";
import { SUBJECTS, CLASS_LABELS, CHAPTERS_DATA, toBengaliNumber } from "@/lib/data";
import { useChromecast } from "@/hooks/useChromecast";
import { CastButton } from "@/components";
import { generateSlideHTML } from "@/lib/castHelpers";

interface Slide {
  id: string;
  title: string;
  content: string;
  visual: string;
  narration: string;
  activity?: {
    type: "fill-blank" | "tap-correct";
    question: string;
    answer: string;
    options?: string[];
  };
}

export default function SlidesPage() {
  const router = useRouter();
  const params = useParams();
  const classId = params.classId as string;
  const subjectId = params.subjectId as string;
  const chapterId = params.chapterId as string;
  const topicId = params.topicId as string;

  const [isLoading, setIsLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showNarration, setShowNarration] = useState(true);

  // Chromecast integration
  const { castHTML, isConnected } = useChromecast();

  const chapter = CHAPTERS_DATA[classId]?.[subjectId]?.find(ch => ch.id === chapterId);
  const topic = chapter?.topics.find(t => t.id === topicId);

  // Generate slides based on topic
  const slides: Slide[] = [
    {
      id: "1",
      title: "তুলনা করি",
      content: "আজ আমরা শিখব কোনটি বেশি আর কোনটি কম",
      visual: "● ● ● vs ● ● ● ● ●",
      narration: "আজ আমরা একটি মজার বিষয় শিখব। দুটি জিনিসের মধ্যে কোনটি বেশি আর কোনটি কম সেটা বুঝতে পারা খুবই গুরুত্বপূর্ণ।",
    },
    {
      id: "2",
      title: "কম মানে কী?",
      content: "যখন সংখ্যা ছোট হয়, তখন সেটা কম",
      visual: "● ● ●",
      narration: "কম মানে হলো যখন কোনো জিনিসের সংখ্যা ছোট। যেমন এখানে মাত্র ৩টি বল আছে।",
      activity: {
        type: "tap-correct",
        question: "কোনটি কম?",
        answer: "৩টি",
        options: ["৩টি", "৭টি"]
      }
    },
    {
      id: "3",
      title: "বেশি মানে কী?",
      content: "যখন সংখ্যা বড় হয়, তখন সেটা বেশি",
      visual: "● ● ● ● ● ● ●",
      narration: "বেশি মানে হলো যখন কোনো জিনিসের সংখ্যা বড়। এখানে ৭টি বল আছে, যা ৩ এর চেয়ে বেশি।",
    },
    {
      id: "4",
      title: "তুলনা করি",
      content: "৩ < ৭ (তিন ছোট সাতের চেয়ে)",
      visual: "● ● ● < ● ● ● ● ● ● ●",
      narration: "যখন আমরা ৩ আর ৭ তুলনা করি, তখন দেখি ৩ ছোট। তাই বলি ৩ কম, ৭ বেশি।",
      activity: {
        type: "fill-blank",
        question: "৫ ___ ৮ (কম/বেশি)",
        answer: "কম"
      }
    },
    {
      id: "5",
      title: "অনুশীলন করি",
      content: "এখন তুমি চেষ্টা করো!",
      visual: "",
      narration: "চমৎকার! এখন তুমি নিজে চেষ্টা করো। মনে রাখো, বড় সংখ্যা মানে বেশি, ছোট সংখ্যা মানে কম।",
    },
  ];

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

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide(prev => prev - 1);
    }
  };

  const handleBack = () => {
    router.push(`/learn/${classId}/${subjectId}/${chapterId}/${topicId}`);
  };

  // Cast current slide to TV
  const handleCastSlide = async () => {
    try {
      const slide = slides[currentSlide];
      const html = generateSlideHTML(slide, currentSlide + 1, slides.length);
      await castHTML(html, slide.title);
    } catch (err: any) {
      // Only log actual errors, not cancellations
      if (err?.message !== "কাস্ট সেশন তৈরি করতে ব্যর্থ হয়েছে") {
        console.log("Slide cast error:", err?.message || "Unknown error");
      }
    }
  };

  // Auto-cast when slide changes if already connected
  useEffect(() => {
    if (isConnected) {
      handleCastSlide();
    }
  }, [currentSlide, isConnected]);

  if (isLoading || !topic) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="w-12 h-12 border-4 border-[#E07B4C] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const slide = slides[currentSlide];

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-4 py-3">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <button onClick={handleBack} className="p-2 hover:bg-slate-700 rounded-full">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-white font-bold">স্লাইড + বর্ণনা</h1>
                <p className="text-slate-400 text-sm">{topic.name}</p>
              </div>
            </div>
            <div className="text-slate-400 text-sm">
              {toBengaliNumber(currentSlide + 1)} / {toBengaliNumber(slides.length)}
            </div>
          </div>
          <div className="flex justify-center">
            <CastButton onCastStart={handleCastSlide} />
          </div>
        </div>
      </header>

      {/* Slide Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-3xl">
          {/* Slide Card */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-8 shadow-2xl border border-slate-700">
            {/* Slide Title */}
            <h2 className="text-3xl font-bold text-white text-center mb-4">{slide.title}</h2>

            {/* Visual */}
            <div className="text-center py-12 text-6xl">
              {slide.visual}
            </div>

            {/* Content */}
            <p className="text-xl text-slate-300 text-center mb-6">{slide.content}</p>

            {/* Activity (if exists) */}
            {slide.activity && (
              <div className="bg-slate-700/50 rounded-xl p-4 mt-4">
                <p className="text-[#E07B4C] font-medium mb-2">কার্যক্রম:</p>
                <p className="text-white">{slide.activity.question}</p>
                {slide.activity.options && (
                  <div className="flex gap-3 mt-3">
                    {slide.activity.options.map((opt, idx) => (
                      <button
                        key={idx}
                        className="px-4 py-2 bg-slate-600 hover:bg-[#E07B4C] text-white rounded-lg transition-colors"
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Narration Box */}
          {showNarration && (
            <div className="mt-6 bg-slate-800 rounded-xl p-4 border border-slate-700">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-[#E07B4C] rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                </div>
                <span className="text-slate-400 text-sm">বর্ণনা</span>
              </div>
              <p className="text-white leading-relaxed">{slide.narration}</p>
            </div>
          )}
        </div>
      </main>

      {/* Navigation */}
      <footer className="bg-slate-800 border-t border-slate-700 px-4 py-4">
        <div className="max-w-4xl mx-auto">
          {/* Progress Bar */}
          <div className="flex gap-1 mb-4">
            {slides.map((_, idx) => (
              <div
                key={idx}
                className={`flex-1 h-1 rounded-full ${
                  idx <= currentSlide ? "bg-[#E07B4C]" : "bg-slate-600"
                }`}
              />
            ))}
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between">
            <button
              onClick={handlePrev}
              disabled={currentSlide === 0}
              className="flex items-center gap-2 px-4 py-2 text-white hover:bg-slate-700 rounded-lg disabled:opacity-30"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              আগে
            </button>

            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-14 h-14 bg-[#E07B4C] hover:bg-[#d06a3c] rounded-full flex items-center justify-center text-white"
            >
              {isPlaying ? (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            <button
              onClick={handleNext}
              disabled={currentSlide === slides.length - 1}
              className="flex items-center gap-2 px-4 py-2 text-white hover:bg-slate-700 rounded-lg disabled:opacity-30"
            >
              পরে
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
