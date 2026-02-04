"use client";

import { useState } from "react";
import { toBengaliNumber } from "@/lib/data";

interface QuizConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (config: QuizConfig) => void;
  topicName: string;
}

export interface QuizConfig {
  questionCount: number;
  difficulty?: "easy" | "medium" | "hard";
}

export default function QuizConfigModal({
  isOpen,
  onClose,
  onGenerate,
  topicName,
}: QuizConfigModalProps) {
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");

  if (!isOpen) return null;

  const handleGenerate = () => {
    onGenerate({
      questionCount,
      difficulty,
    });
    onClose();
  };

  const questionOptions = [3, 5, 7, 10];
  const difficultyOptions = [
    { value: "easy" as const, label: "সহজ", color: "emerald" },
    { value: "medium" as const, label: "মাঝারি", color: "blue" },
    { value: "hard" as const, label: "কঠিন", color: "orange" },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-gray-100">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900">কুইজ সেটিংস</h2>
              <p className="text-sm text-gray-500 mt-1">{topicName}</p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="বন্ধ করুন"
            >
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Question Count Selection */}
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-3 block">
              প্রশ্নের সংখ্যা নির্বাচন করুন
            </label>
            <div className="grid grid-cols-4 gap-2">
              {questionOptions.map((count) => (
                <button
                  key={count}
                  onClick={() => setQuestionCount(count)}
                  className={`py-3 rounded-lg text-lg font-bold transition-all ${
                    questionCount === count
                      ? "bg-blue-600 text-white shadow-md ring-2 ring-blue-200"
                      : "bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200"
                  }`}
                >
                  {toBengaliNumber(count)}
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty Selection */}
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-3 block">
              অসুবিধার স্তর
            </label>
            <div className="grid grid-cols-3 gap-2">
              {difficultyOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setDifficulty(option.value)}
                  className={`py-2.5 px-3 rounded-lg font-medium text-sm transition-all ${
                    difficulty === option.value
                      ? option.color === "emerald"
                        ? "bg-emerald-600 text-white shadow-md ring-2 ring-emerald-200"
                        : option.color === "blue"
                        ? "bg-blue-600 text-white shadow-md ring-2 ring-blue-200"
                        : "bg-orange-600 text-white shadow-md ring-2 ring-orange-200"
                      : "bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <p className="text-xs text-gray-600 mb-1.5">প্রশ্ন তৈরি হবে:</p>
                <div className="text-xs text-gray-700 space-y-0.5">
                  <div>• {toBengaliNumber(questionCount)}টি MCQ প্রশ্ন</div>
                  <div>• {difficulty === "easy" ? "সহজ" : difficulty === "medium" ? "মাঝারি" : "কঠিন"} স্তর</div>
                  <div>• পাঠ্যবই ভিত্তিক</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-50 transition-colors"
          >
            বাতিল
          </button>
          <button
            onClick={handleGenerate}
            className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium text-sm hover:from-blue-700 hover:to-indigo-700 transition-all shadow-sm flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            তৈরি করুন
          </button>
        </div>
      </div>
    </div>
  );
}
