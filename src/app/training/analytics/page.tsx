"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import {
  TRAINING_COURSES,
  getOverallTrainingStats,
  getCourseCompletionStats,
  toBengaliNumber,
  type TrainingCourse,
} from "@/lib/data";
import { BottomNav } from "@/components";

interface CourseStats {
  course: TrainingCourse;
  completedTopics: number;
  totalTopics: number;
  progress: number;
  lastActivity?: string;
}

interface WeeklyActivity {
  day: string;
  topics: number;
  minutes: number;
}

export default function TrainingAnalyticsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [overallStats, setOverallStats] = useState<{
    totalCourses: number;
    completedCourses: number;
    inProgressCourses: number;
    remainingCourses: number;
    overallPercentage: number;
  } | null>(null);
  const [courseStats, setCourseStats] = useState<CourseStats[]>([]);
  const [weeklyActivity, setWeeklyActivity] = useState<WeeklyActivity[]>([]);
  const [selectedView, setSelectedView] = useState<"overview" | "courses" | "achievements">("overview");

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.push("/");
      return;
    }

    // Load overall stats
    const stats = getOverallTrainingStats(currentUser.id);
    setOverallStats(stats);

    // Load course-wise stats
    const allCourseStats: CourseStats[] = TRAINING_COURSES.map((course) => {
      const courseCompletion = getCourseCompletionStats(currentUser.id, course.id);
      return {
        course,
        completedTopics: courseCompletion.completedTopics,
        totalTopics: courseCompletion.totalTopics,
        progress: courseCompletion.percentage,
        lastActivity: new Date().toLocaleDateString("bn-BD"),
      };
    });
    setCourseStats(allCourseStats);

    // Mock weekly activity data
    const days = ["শনি", "রবি", "সোম", "মঙ্গল", "বুধ", "বৃহ", "শুক্র"];
    const mockWeeklyActivity: WeeklyActivity[] = days.map((day) => ({
      day,
      topics: Math.floor(Math.random() * 5),
      minutes: Math.floor(Math.random() * 45) + 5,
    }));
    setWeeklyActivity(mockWeeklyActivity);

    setIsLoading(false);
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#cf278d] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg text-slate-600">বিশ্লেষণ লোড হচ্ছে...</p>
        </div>
      </div>
    );
  }

  // Compute total completed topics from courseStats
  const totalCompletedTopics = courseStats.reduce((sum, cs) => sum + cs.completedTopics, 0);
  const totalTopicsCount = courseStats.reduce((sum, cs) => sum + cs.totalTopics, 0);

  // Achievement badges
  const achievements = [
    {
      id: "first-topic",
      name: "প্রথম পদক্ষেপ",
      description: "প্রথম টপিক সম্পন্ন",
      earned: totalCompletedTopics >= 1,
      color: "bg-green-100 text-green-700",
    },
    {
      id: "five-topics",
      name: "অগ্রগতি",
      description: "৫টি টপিক সম্পন্ন",
      earned: totalCompletedTopics >= 5,
      color: "bg-blue-100 text-blue-700",
    },
    {
      id: "first-course",
      name: "কোর্স মাস্টার",
      description: "প্রথম কোর্স সম্পন্ন",
      earned: (overallStats?.completedCourses || 0) >= 1,
      color: "bg-yellow-100 text-yellow-700",
    },
    {
      id: "ten-topics",
      name: "শিক্ষানবিশ",
      description: "১০টি টপিক সম্পন্ন",
      earned: totalCompletedTopics >= 10,
      color: "bg-purple-100 text-purple-700",
    },
    {
      id: "all-courses",
      name: "সম্পূর্ণ মাস্টার",
      description: "সব কোর্স সম্পন্ন",
      earned: overallStats?.completedCourses === overallStats?.totalCourses,
      color: "bg-orange-100 text-orange-700",
    },
    {
      id: "fifty-percent",
      name: "অর্ধেক পথ",
      description: "৫০% অগ্রগতি",
      earned: (overallStats?.overallPercentage || 0) >= 50,
      color: "bg-pink-100 text-pink-700",
    },
  ];

  const maxActivityMinutes = Math.max(...weeklyActivity.map((a) => a.minutes), 1);

  return (
    <div className="min-h-screen bg-slate-100 pb-24">
      {/* Header */}
      <header className="gradient-blue-pink text-white">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center justify-between py-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-lg font-semibold">প্রশিক্ষণ বিশ্লেষণ</h1>
            <div className="w-10"></div>
          </div>

          {/* Overall Progress Card */}
          <div className="pb-6">
            <div className="bg-white/10 rounded-2xl p-5 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-white/80 text-sm">সার্বিক অগ্রগতি</p>
                  <p className="text-4xl font-bold">{toBengaliNumber(Math.round(overallStats?.overallPercentage || 0))}%</p>
                </div>
                <div className="w-20 h-20 relative">
                  <svg className="w-20 h-20 transform -rotate-90">
                    <circle
                      cx="40"
                      cy="40"
                      r="36"
                      stroke="rgba(255,255,255,0.2)"
                      strokeWidth="8"
                      fill="none"
                    />
                    <circle
                      cx="40"
                      cy="40"
                      r="36"
                      stroke="white"
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 36}`}
                      strokeDashoffset={`${2 * Math.PI * 36 * (1 - (overallStats?.overallPercentage || 0) / 100)}`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/10 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold">{toBengaliNumber(totalCompletedTopics)}/{toBengaliNumber(totalTopicsCount)}</p>
                  <p className="text-white/70 text-xs">টপিক সম্পন্ন</p>
                </div>
                <div className="bg-white/10 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold">{toBengaliNumber(overallStats?.completedCourses || 0)}/{toBengaliNumber(overallStats?.totalCourses || 0)}</p>
                  <p className="text-white/70 text-xs">কোর্স সম্পন্ন</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="sticky top-0 z-10 bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex gap-1">
            {[
              { key: "overview", label: "সারসংক্ষেপ" },
              { key: "courses", label: "কোর্স" },
              { key: "achievements", label: "অর্জন" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setSelectedView(tab.key as "overview" | "courses" | "achievements")}
                className={`flex-1 py-3 text-sm font-medium transition-all border-b-2 ${
                  selectedView === tab.key
                    ? "text-[#cf278d] border-[#cf278d]"
                    : "text-slate-500 border-transparent hover:text-slate-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {selectedView === "overview" && (
          <>
            {/* Weekly Activity Chart */}
            <div className="bg-white rounded-2xl shadow-md overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="font-bold text-slate-800">সাপ্তাহিক কার্যক্রম</h3>
              </div>
              <div className="p-5">
                <div className="flex items-end justify-between h-32 gap-2">
                  {weeklyActivity.map((day, index) => (
                    <div key={index} className="flex-1 flex flex-col items-center gap-2">
                      <div className="relative w-full flex justify-center">
                        <div
                          className="w-6 bg-gradient-to-t from-[#cf278d] to-[#cf278d] rounded-t-lg transition-all"
                          style={{
                            height: `${(day.minutes / maxActivityMinutes) * 80}px`,
                            minHeight: day.minutes > 0 ? "8px" : "0",
                          }}
                        ></div>
                      </div>
                      <span className="text-xs text-slate-500">{day.day}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex justify-center gap-6 text-sm text-slate-600">
                  <span>মোট: {toBengaliNumber(weeklyActivity.reduce((a, b) => a + b.minutes, 0))} মিনিট</span>
                  <span>গড়: {toBengaliNumber(Math.round(weeklyActivity.reduce((a, b) => a + b.minutes, 0) / 7))} মিনিট/দিন</span>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-xl p-4 shadow-md">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-700">{toBengaliNumber(achievements.filter((a) => a.earned).length)}</p>
                    <p className="text-sm text-slate-500">অর্জন অর্জিত</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-4 shadow-md">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-700">{toBengaliNumber(Math.floor(Math.random() * 10) + 5)}</p>
                    <p className="text-sm text-slate-500">ঘণ্টা শেখা</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-2xl shadow-md overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="font-bold text-slate-800">সাম্প্রতিক কার্যক্রম</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {courseStats.slice(0, 3).map((stat, index) => (
                  <div key={index} className="px-5 py-4 flex items-center gap-4">
                    <div className="w-10 h-10 bg-[#cf278d]/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-[#cf278d]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-800 truncate">{stat.course.name}</p>
                      <p className="text-sm text-slate-500">{stat.lastActivity}</p>
                    </div>
                    <span className="text-sm font-medium text-[#cf278d]">{toBengaliNumber(stat.progress)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {selectedView === "courses" && (
          <>
            {/* Course Progress Cards */}
            {courseStats.map((stat, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl shadow-md overflow-hidden"
              >
                <div className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-[#cf278d]/10 to-[#cf278d]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <svg className="w-7 h-7 text-[#cf278d]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-slate-800">{stat.course.name}</h4>
                      <p className="text-sm text-slate-500 mt-1">{stat.course.description}</p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-slate-500">অগ্রগতি</span>
                      <span className="font-medium text-[#cf278d]">{toBengaliNumber(stat.completedTopics)}/{toBengaliNumber(stat.totalTopics)} টপিক</span>
                    </div>
                    <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          stat.progress === 100
                            ? "bg-gradient-to-r from-green-500 to-green-400"
                            : stat.progress > 0
                            ? "gradient-blue-pink"
                            : "bg-slate-300"
                        }`}
                        style={{ width: `${stat.progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {stat.progress === 100 ? (
                        <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          সম্পন্ন
                        </span>
                      ) : stat.progress > 0 ? (
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                          চলমান
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded-full">
                          শুরু করুন
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => router.push(`/training/${stat.course.id}`)}
                      className="text-sm text-[#cf278d] font-medium hover:underline inline-flex items-center gap-1"
                    >
                      {stat.progress === 100 ? "পুনরায় দেখুন" : "শিখতে যান"}
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Chapter breakdown */}
                <div className="bg-slate-50 px-5 py-3 border-t border-slate-100">
                  <p className="text-xs text-slate-500 mb-2">অধ্যায়সমূহ:</p>
                  <div className="flex flex-wrap gap-2">
                    {stat.course.chapters.map((chapter, chIndex) => (
                      <span
                        key={chIndex}
                        className="text-xs px-2 py-1 bg-white rounded-full text-slate-600 border border-slate-200"
                      >
                        {chapter.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </>
        )}

        {selectedView === "achievements" && (
          <>
            {/* Achievement Stats */}
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-5 text-white shadow-lg">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-white/80 text-sm">অর্জিত ব্যাজ</p>
                  <p className="text-4xl font-bold">{toBengaliNumber(achievements.filter((a) => a.earned).length)}/{toBengaliNumber(achievements.length)}</p>
                </div>
              </div>
            </div>

            {/* Achievement Grid */}
            <div className="grid grid-cols-2 gap-4">
              {achievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className={`rounded-2xl p-4 ${
                    achievement.earned
                      ? "bg-white shadow-md"
                      : "bg-slate-100 opacity-60"
                  }`}
                >
                  <div className={`w-14 h-14 ${achievement.earned ? achievement.color : "bg-slate-200"} rounded-full flex items-center justify-center mx-auto mb-3`}>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h4 className={`font-bold text-center ${achievement.earned ? "text-slate-800" : "text-slate-500"}`}>
                    {achievement.name}
                  </h4>
                  <p className={`text-xs text-center mt-1 ${achievement.earned ? "text-slate-500" : "text-slate-400"}`}>
                    {achievement.description}
                  </p>
                  {achievement.earned && (
                    <div className="mt-2 flex justify-center">
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                        সম্পন্ন
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Tips to earn more */}
            <div className="bg-white rounded-2xl shadow-md overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="font-bold text-slate-800">আরও অর্জন করুন</h3>
              </div>
              <div className="p-5 space-y-3">
                {achievements.filter((a) => !a.earned).slice(0, 3).map((achievement) => (
                  <div key={achievement.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                    <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-slate-800">{achievement.name}</p>
                      <p className="text-xs text-slate-500">{achievement.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Continue Learning CTA */}
        <button
          onClick={() => router.push("/training")}
          className="w-full gradient-blue-pink text-white rounded-2xl p-5 shadow-lg flex items-center justify-between"
        >
          <div className="text-left">
            <p className="font-bold text-lg">শেখা চালিয়ে যান</p>
            <p className="text-white/80 text-sm">পরবর্তী টপিক শুরু করুন</p>
          </div>
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </div>
        </button>
      </main>

      <BottomNav />
    </div>
  );
}
