"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getCurrentUser,
  getProfileByUserId,
  type SessionUser,
} from "@/lib/auth";
import {
  TRAINING_COURSES,
  getCourseCompletionStats,
  getNextTopicToLearn,
  toBengaliNumber,
} from "@/lib/data";
import { ShikhoHeader, NoticeBar } from "@/components";

export default function TrainingPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.push("/");
      return;
    }
    setUser(currentUser);
    setIsLoading(false);
  }, [router]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#cf278d] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg text-slate-600">লোড হচ্ছে...</p>
        </div>
      </div>
    );
  }

  const nextTopic = getNextTopicToLearn(user.id);

  // Calculate overall stats across all courses
  const allCourseStats = TRAINING_COURSES.map(course => ({
    course,
    stats: getCourseCompletionStats(user.id, course.id)
  }));

  const totalTopics = allCourseStats.reduce((sum, c) => sum + c.stats.totalTopics, 0);
  const completedTopics = allCourseStats.reduce((sum, c) => sum + c.stats.completedTopics, 0);
  const progressPercentage = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30 pb-24">
      {/* Header */}
      <ShikhoHeader
        variant="light"
        showBackButton={true}
        onBack={() => router.push("/dashboard")}
        rightContent={
          <div className="text-right">
            <h1 className="text-base font-bold text-slate-800">আজ কি শিখবেন?</h1>
            <p className="text-xs text-slate-500">শিক্ষক প্রশিক্ষণ</p>
          </div>
        }
      />

      {/* Notice Ticker Bar */}
      <NoticeBar />

      <main className="max-w-4xl mx-auto px-4 py-4 space-y-4">
        {/* Overall Progress Card */}
        <div className="bg-gradient-to-br from-[#cf278d] to-[#2d3a7c] rounded-xl p-4 text-white shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-base font-bold opacity-90">সামগ্রিক অগ্রগতি</h2>
              <p className="text-white/70 text-xs">শিক্ষক প্রশিক্ষণ কোর্স</p>
            </div>
            <div className="w-16 h-16 relative">
              <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 64 64">
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke="rgba(255,255,255,0.2)"
                  strokeWidth="5"
                  fill="none"
                />
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke="#22c55e"
                  strokeWidth="5"
                  fill="none"
                  strokeDasharray={`${progressPercentage * 1.76} 176`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-base font-bold">{toBengaliNumber(progressPercentage)}%</span>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white/10 rounded-lg p-2.5 text-center">
              <p className="text-xl font-bold">{toBengaliNumber(TRAINING_COURSES.length)}</p>
              <p className="text-xs text-white/70">মডিউল</p>
            </div>
            <div className="bg-white/10 rounded-lg p-2.5 text-center">
              <p className="text-xl font-bold">{toBengaliNumber(totalTopics)}</p>
              <p className="text-xs text-white/70">টপিক</p>
            </div>
            <div className="bg-white/10 rounded-lg p-2.5 text-center">
              <p className="text-xl font-bold">{toBengaliNumber(completedTopics)}</p>
              <p className="text-xs text-white/70">সম্পন্ন</p>
            </div>
          </div>
        </div>

        {/* Continue Learning Section */}
        {nextTopic && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-amber-800 text-sm mb-1">পরবর্তী টপিক</h3>
                <p className="text-amber-700 text-xs mb-2">
                  {nextTopic.topic.name}
                </p>
                <button
                  onClick={() => router.push(`/training/${nextTopic.course.id}/${nextTopic.chapter.id}/${nextTopic.topic.id}`)}
                  className="px-3 py-1.5 bg-amber-500 text-white text-xs font-medium rounded-lg hover:bg-amber-600 transition-colors inline-flex items-center gap-1"
                >
                  এখনই শুরু করুন
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Module Selection */}
        <div>
          <h2 className="text-base font-bold text-slate-800 mb-3">প্রশিক্ষণ মডিউল নির্বাচন করুন</h2>
          <div className="space-y-3">
            {allCourseStats.map(({ course, stats }) => (
              <button
                key={course.id}
                onClick={() => router.push(`/training/${course.id}`)}
                className="w-full bg-white rounded-xl p-4 shadow-md hover:shadow-lg transition-all text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 bg-gradient-to-br ${course.color} rounded-lg flex items-center justify-center text-white text-xl shadow-md`}>
                    {course.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-800 text-sm group-hover:text-[#cf278d] transition-colors truncate">
                      {course.name}
                    </h3>
                    <p className="text-slate-500 text-xs">
                      {toBengaliNumber(stats.completedTopics)}/{toBengaliNumber(stats.totalTopics)} টপিক সম্পন্ন
                    </p>
                  </div>
                  <svg className="w-5 h-5 text-slate-400 group-hover:text-[#cf278d] transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>

                {/* Progress Bar */}
                <div className="mt-3">
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full transition-all"
                      style={{ width: `${stats.percentage}%` }}
                    />
                  </div>
                  <p className="text-right text-xs text-slate-400 mt-1">{toBengaliNumber(stats.percentage)}%</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-blue-900 mb-1">প্রশিক্ষণ কেন গুরুত্বপূর্ণ?</h3>
              <p className="text-xs text-blue-800">
                প্রতিটি টপিক শেষে কুইজে পাস করতে হবে। পাস না করলে পরের টপিকে যাওয়া যাবে না।
                এতে আপনি ভালোভাবে শিখতে পারবেন।
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

