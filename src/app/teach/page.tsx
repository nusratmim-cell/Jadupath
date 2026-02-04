"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getCurrentUser,
  getProfileByUserId,
  type SessionUser,
  type TeacherProfile,
} from "@/lib/auth";
import {
  SUBJECTS,
  CLASS_LABELS,
  CHAPTERS_DATA,
  toBengaliNumber,
  getTeacherProgress,
} from "@/lib/data";

export default function TeachingDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [completedTopicsMap, setCompletedTopicsMap] = useState<{ [classId: string]: string[] }>({});

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

    setUser(currentUser);
    setProfile(teacherProfile);

    // Load progress for each class
    const progressMap: { [classId: string]: string[] } = {};
    const allProgress = getTeacherProgress(currentUser.id);
    teacherProfile.classes.forEach(classId => {
      const classProgress = allProgress.filter(p => p.classId === classId && p.completed);
      // Build array of completed topic IDs from progress
      progressMap[classId] = classProgress.map(p => `${p.subjectId}_${p.chapterIndex}_${p.topicIndex}`);
    });
    setCompletedTopicsMap(progressMap);

    setIsLoading(false);
  }, [router]);

  const calculateOverallProgress = () => {
    if (!profile) return 0;
    let totalTopics = 0;
    let completedTopics = 0;

    profile.classes.forEach(classId => {
      profile.subjects.forEach(subjectId => {
        const chapters = CHAPTERS_DATA[classId]?.[subjectId] || [];
        chapters.forEach(chapter => {
          totalTopics += chapter.topics.length;
          chapter.topics.forEach(topic => {
            if (completedTopicsMap[classId]?.includes(topic.id)) {
              completedTopics++;
            }
          });
        });
      });
    });

    return totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;
  };

  const getClassTopicCount = (classId: string) => {
    let total = 0;
    let completed = 0;

    (profile?.subjects || []).forEach(subjectId => {
      const chapters = CHAPTERS_DATA[classId]?.[subjectId] || [];
      chapters.forEach(chapter => {
        total += chapter.topics.length;
        chapter.topics.forEach(topic => {
          if (completedTopicsMap[classId]?.includes(topic.id)) {
            completed++;
          }
        });
      });
    });

    return { total, completed };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#cf278d] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg text-slate-600">লোড হচ্ছে...</p>
        </div>
      </div>
    );
  }

  const overallProgress = calculateOverallProgress();
  const totalCompleted = Object.values(completedTopicsMap).reduce((acc, topics) => acc + topics.length, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30 pb-24">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/dashboard")}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-800">আজ কি শিখাবেন?</h1>
              <p className="text-sm text-slate-500">আপনার শিক্ষাদান অগ্রগতি</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Overall Progress Card */}
        <div className="bg-gradient-to-br from-[#cf278d] to-[#2d3a7c] rounded-2xl p-6 text-white shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold opacity-90">সামগ্রিক অগ্রগতি</h2>
              <p className="text-white/70 text-sm">এই সপ্তাহের লক্ষ্য</p>
            </div>
            <div className="w-20 h-20 relative">
              <svg className="w-20 h-20 transform -rotate-90">
                <circle
                  cx="40"
                  cy="40"
                  r="35"
                  stroke="rgba(255,255,255,0.2)"
                  strokeWidth="6"
                  fill="none"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="35"
                  stroke="#22c55e"
                  strokeWidth="6"
                  fill="none"
                  strokeDasharray={`${overallProgress * 2.2} 220`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-bold">{toBengaliNumber(overallProgress)}%</span>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold">{toBengaliNumber(profile?.classes.length || 0)}</p>
              <p className="text-xs text-white/70">ক্লাস</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold">{toBengaliNumber(profile?.subjects.length || 0)}</p>
              <p className="text-xs text-white/70">বিষয়</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold">{toBengaliNumber(totalCompleted)}</p>
              <p className="text-xs text-white/70">সম্পন্ন টপিক</p>
            </div>
          </div>
        </div>

        {/* Today's Recommendation */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-amber-800 mb-1">আজকের সুপারিশ</h3>
              <p className="text-amber-700 text-sm mb-3">
                ক্লাস ১ এর &quot;তুলনা করি&quot; টপিকটি এখনো শেষ হয়নি। আজ এটি সম্পন্ন করুন!
              </p>
              <button
                onClick={() => router.push("/teach/1/gonit/ch3/topic1")}
                className="px-4 py-2 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 transition-colors inline-flex items-center gap-2"
              >
                এখনই শুরু করুন
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Class Selection */}
        <div>
          <h2 className="text-lg font-bold text-slate-800 mb-4">ক্লাস নির্বাচন করুন</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {profile?.classes.map((classId) => {
              const { total, completed } = getClassTopicCount(classId);
              const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

              return (
                <button
                  key={classId}
                  onClick={() => router.push(`/teach/${classId}`)}
                  className="bg-white rounded-2xl p-5 shadow-md hover:shadow-lg transition-all text-left group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-[#cf278d] to-[#cf278d] rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-md">
                      {toBengaliNumber(parseInt(classId))}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-slate-800 text-lg group-hover:text-[#cf278d] transition-colors">
                        {CLASS_LABELS[classId]}
                      </h3>
                      <p className="text-slate-500 text-sm">
                        {toBengaliNumber(completed)}/{toBengaliNumber(total)} টপিক সম্পন্ন
                      </p>
                    </div>
                    <svg className="w-6 h-6 text-slate-400 group-hover:text-[#cf278d] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-4">
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="text-right text-xs text-slate-400 mt-1">{toBengaliNumber(progress)}%</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <h2 className="text-lg font-bold text-slate-800 mb-4">সাম্প্রতিক কার্যক্রম</h2>
          <div className="bg-white rounded-2xl shadow-md overflow-hidden">
            {[
              { topic: "সংখ্যা চেনা (১-১০)", className: "ক্লাস ১", time: "গতকাল", status: "completed" },
              { topic: "যোগ করি", className: "ক্লাস ১", time: "২ দিন আগে", status: "completed" },
              { topic: "তুলনা করি", className: "ক্লাস ১", time: "চলমান", status: "in_progress" },
            ].map((activity, idx) => (
              <div
                key={idx}
                className={`flex items-center gap-4 p-4 ${idx !== 2 ? "border-b border-slate-100" : ""}`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  activity.status === "completed" ? "bg-green-100" : "bg-amber-100"
                }`}>
                  {activity.status === "completed" ? (
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-slate-800">{activity.topic}</p>
                  <p className="text-sm text-slate-500">{activity.className}</p>
                </div>
                <span className={`text-sm ${
                  activity.status === "completed" ? "text-green-600" : "text-amber-600"
                }`}>
                  {activity.time}
                </span>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-2 z-50">
        <div className="max-w-4xl mx-auto flex items-center justify-around">
          <button onClick={() => router.push("/dashboard")} className="flex flex-col items-center gap-1 py-2 px-4 text-slate-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-xs">হোম</span>
          </button>
          <button className="flex flex-col items-center gap-1 py-2 px-4 text-[#cf278d]">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <span className="text-xs font-medium">শিখান</span>
          </button>
          <button onClick={() => router.push("/students")} className="flex flex-col items-center gap-1 py-2 px-4 text-slate-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <span className="text-xs">শিক্ষার্থী</span>
          </button>
          <button onClick={() => router.push("/profile")} className="flex flex-col items-center gap-1 py-2 px-4 text-slate-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-xs">প্রোফাইল</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
