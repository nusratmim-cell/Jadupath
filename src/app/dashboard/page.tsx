"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  getCurrentUser,
  getProfileByUserId,
  getStudentsForClass,
  getTotalStudentCount,
  type SessionUser,
  type TeacherProfile,
} from "@/lib/auth";
import { CLASS_LABELS, toBengaliNumber, getNextTopicToLearn, getCourseCompletionStats, getTotalCompletedChapters, getTotalCompletedTopics, getTotalChapters, getTotalTopics, getVideosWatchedCount } from "@/lib/data";
import { BottomNav, AvatarDisplay } from "@/components";

const BENGALI_DAYS = ["রবিবার", "সোমবার", "মঙ্গলবার", "বুধবার", "বৃহস্পতিবার", "শুক্রবার", "শনিবার"];
const BENGALI_MONTHS = ["জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"];

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  // Optimized timer - updates every minute and respects page visibility
  useEffect(() => {
    setCurrentTime(new Date());

    // Update every minute instead of every second
    const timer = setInterval(() => {
      // Only update if page is visible (performance optimization)
      if (!document.hidden) {
        setCurrentTime(new Date());
      }
    }, 60000); // 60 seconds

    // Also update when page becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        setCurrentTime(new Date());
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Get next topic to learn (memoized to prevent recalculation) - MUST be before early returns
  const nextTopic = useMemo(() => user ? getNextTopicToLearn(user.id) : null, [user]);
  const courseProgress = useMemo(
    () => user && nextTopic ? getCourseCompletionStats(user.id, nextTopic.course.id) : null,
    [user, nextTopic]
  );

  // Get training analytics (memoized for performance)
  const completedChapters = useMemo(() => user ? getTotalCompletedChapters(user.id) : 0, [user]);
  const totalChapters = useMemo(() => getTotalChapters(), []);
  const completedTopics = useMemo(() => user ? getTotalCompletedTopics(user.id) : 0, [user]);
  const totalTopics = useMemo(() => getTotalTopics(), []);
  const videosWatched = useMemo(() => user ? getVideosWatchedCount(user.id) : 0, [user]);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) { router.push("/"); return; }
    if (!currentUser.onboardingCompleted) { router.push("/onboarding"); return; }

    const teacherProfile = getProfileByUserId(currentUser.id);
    // Only redirect to student setup if user hasn't explicitly skipped it
    const skippedSetup = localStorage.getItem("shikho_student_setup_skipped");
    if (teacherProfile && getTotalStudentCount(currentUser.id) === 0 && !skippedSetup) {
      router.push("/students/setup");
      return;
    }

    // Batch state updates together
    setUser(currentUser);
    setProfile(teacherProfile);
    setIsLoading(false);
  }, [router]);

  if (isLoading || !currentTime) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-3 border-[#cf278d] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const formatDate = () => {
    return `${BENGALI_DAYS[currentTime.getDay()]}, ${toBengaliNumber(currentTime.getDate())} ${BENGALI_MONTHS[currentTime.getMonth()]}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      {/* Facebook-Style Profile Header */}
      <div className="bg-white">
        <div className="relative">
          {/* Header with Clean Gradient - Full Width */}
          <div className="w-full h-20 bg-gradient-to-r from-[#2F299D] via-[#3338D7] to-[#4D51DE]">
            {/* Clean gradient banner - no logo */}
          </div>

          {/* Profile Picture - Overlapping Cover */}
          <div className="absolute -bottom-8 md:-bottom-10 left-6 md:left-8">
            <button
              onClick={() => router.push("/profile")}
              className="block w-16 h-16 md:w-20 md:h-20 rounded-full border-3 border-white shadow-2xl bg-white overflow-hidden hover:scale-105 transition-all focus:outline-none focus:ring-4 focus:ring-[#cf278d]/20"
            >
              <AvatarDisplay
                profile={profile}
                size="large"
                className="w-full h-full"
              />
            </button>
          </div>
        </div>

        {/* Profile Info Section */}
        <div className="px-6 pt-12 md:pt-4 pb-4 border-b border-gray-100">
          <div className="md:ml-28">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">
              {profile?.name}
            </h1>
            <p className="text-sm md:text-base text-gray-600 mb-3">
              {formatDate()}
            </p>

            {/* Quick Info with Icons */}
            <div className="flex flex-wrap items-center gap-3 md:gap-4 text-xs md:text-sm text-gray-600">
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <span>{profile?.schoolName}</span>
              </span>
              {profile?.phone && (
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span>{profile.phone}</span>
                </span>
              )}
              {profile?.teachingExperience && (
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span>{profile.teachingExperience} অভিজ্ঞতা</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Subtle Notice Bar */}
      <div className="bg-amber-50 border-l-4 border-amber-400 px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <svg className="w-4 h-4 text-amber-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
          </svg>
          <p className="text-amber-900 text-xs font-medium flex-1">
            জাতীয় নির্বাচন উপলক্ষে আগামী ১১ ও ১২ ফেব্রুয়ারি বিদ্যালয় বন্ধ থাকবে
          </p>
        </div>
      </div>

      {/* Main Content */}
      <main className="px-4 mt-5 relative z-10">

        {/* Class Selection - Enhanced Cards */}
        <section className="bg-white rounded-2xl shadow-md p-5 mb-6 border border-gray-100">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-md">
              <svg className="w-5 h-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900">কোন ক্লাসে পড়াবেন?</h2>
          </div>
          
          <div className="space-y-3">
            {profile?.classes.map((classId, index) => {
              const studentCount = user ? getStudentsForClass(user.id, classId).length : 0;
              const colors = [
                { bg: "#cf278d", name: "নীল" },
                { bg: "#E91E63", name: "গোলাপি" },
                { bg: "#FF9800", name: "কমলা" },
                { bg: "#4CAF50", name: "সবুজ" },
                { bg: "#9C27B0", name: "বেগুনি" },
              ];
              const color = colors[index % colors.length];

              return (
                <button
                  key={classId}
                  onClick={() => router.push(`/classroom/${classId}`)}
                  className="w-full flex items-center justify-between p-4 rounded-xl text-white active:scale-[0.98] transition-all shadow-md hover:shadow-lg group relative overflow-hidden"
                  style={{
                    background: `linear-gradient(135deg, ${color.bg} 0%, ${color.bg}dd 100%)`,
                  }}
                >
                  {/* Decorative pattern */}
                  <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -translate-y-12 translate-x-12"></div>

                  <div className="flex items-center gap-3 relative z-10">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                      <span className="text-2xl font-bold drop-shadow">{CLASS_LABELS[classId]?.replace("ক্লাস ", "")}</span>
                    </div>
                    <div className="text-left">
                      <p className="text-lg font-bold mb-0.5">{CLASS_LABELS[classId]}</p>
                      <div className="flex items-center gap-1.5 text-white/90">
                        <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                        </svg>
                        <span className="text-sm">{toBengaliNumber(studentCount)} জন শিক্ষার্থী</span>
                      </div>
                    </div>
                  </div>
                  <div className="w-9 h-9 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center relative z-10 group-hover:bg-white/30 transition-colors">
                    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Today's Learning */}
        <section className="mt-6">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-9 h-9 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center shadow-md">
              <svg className="w-5 h-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900">আজ কি শিখবেন?</h2>
          </div>

          {nextTopic ? (
            <button
              onClick={() => router.push('/training')}
              className="w-full bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl p-4 text-left active:scale-[0.98] transition-all hover:shadow-md hover:border-gray-300 group"
            >
              <div className="flex items-start gap-3">
                {/* Simple Icon */}
                <div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center flex-shrink-0 group-active:bg-gray-100 transition-colors">
                  <svg className="w-6 h-6 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                  </svg>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="mb-1">
                    <span className="text-xs text-gray-500 font-medium">{nextTopic.course.name}</span>
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 mb-1">{nextTopic.topic.name}</h3>
                  <p className="text-sm text-gray-600 mb-3">{nextTopic.chapter.name}</p>

                  {/* Simple Progress */}
                  {courseProgress && courseProgress.percentage > 0 && (
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#cf278d] rounded-full transition-all"
                          style={{ width: `${courseProgress.percentage}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-500 font-medium">{toBengaliNumber(courseProgress.percentage)}%</span>
                    </div>
                  )}
                </div>

                {/* Arrow */}
                <div className="flex-shrink-0 text-gray-400">
                  <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </button>
          ) : (
            <button
              onClick={() => router.push("/training")}
              className="w-full bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl p-4 text-left active:scale-[0.98] transition-all hover:shadow-md hover:border-gray-300 group"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center flex-shrink-0 group-active:bg-gray-100 transition-colors">
                  <svg className="w-6 h-6 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-gray-900 mb-1">শিক্ষক প্রশিক্ষণ</h3>
                  <p className="text-sm text-gray-600">কোর্স দেখুন</p>
                </div>
                <svg className="w-5 h-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            </button>
          )}
        </section>

        {/* Training Analytics */}
        <section className="mt-6">
          <div className="bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 rounded-2xl p-4 border border-purple-100 shadow-sm relative overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-200/20 to-transparent rounded-full -translate-y-16 translate-x-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-blue-200/20 to-transparent rounded-full translate-y-12 -translate-x-12"></div>

            <div className="flex items-center gap-2.5 mb-4 relative z-10">
              <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-md">
                <svg className="w-5 h-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-gray-900">আপনার প্রশিক্ষণ পরিসংখ্যান</h2>
            </div>

            <div className="grid grid-cols-3 gap-3 relative z-10">
              {/* Chapters Completed */}
              <div className="bg-white rounded-xl p-3 text-center border border-blue-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mx-auto mb-2 shadow-sm">
                  <svg className="w-4 h-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                  </svg>
                </div>
                <p className="text-lg font-bold text-gray-900 mb-0.5">
                  {toBengaliNumber(completedChapters)}/{toBengaliNumber(totalChapters)}
                </p>
                <p className="text-xs text-gray-600 font-medium">অধ্যায় সম্পন্ন</p>
              </div>

              {/* Topics Completed */}
              <div className="bg-white rounded-xl p-3 text-center border border-green-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center mx-auto mb-2 shadow-sm">
                  <svg className="w-4 h-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="text-lg font-bold text-gray-900 mb-0.5">
                  {toBengaliNumber(completedTopics)}/{toBengaliNumber(totalTopics)}
                </p>
                <p className="text-xs text-gray-600 font-medium">টপিক সম্পন্ন</p>
              </div>

              {/* Videos Watched */}
              <div className="bg-white rounded-xl p-3 text-center border border-red-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-pink-600 rounded-lg flex items-center justify-center mx-auto mb-2 shadow-sm">
                  <svg className="w-4 h-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                  </svg>
                </div>
                <p className="text-lg font-bold text-gray-900 mb-0.5">
                  {toBengaliNumber(videosWatched)}
                </p>
                <p className="text-xs text-gray-600 font-medium">ভিডিও দেখেছেন</p>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Actions */}
        <section className="mt-6">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-9 h-9 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg flex items-center justify-center shadow-md">
              <svg className="w-5 h-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900">দ্রুত অ্যাক্সেস</h2>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Students */}
            <button
              onClick={() => router.push("/students")}
              className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl text-left active:scale-[0.98] transition-all hover:shadow-md border border-blue-100 group"
            >
              <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center mb-3 shadow-md group-hover:scale-105 transition-transform">
                <svg className="w-6 h-6 text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                </svg>
              </div>
              <p className="font-bold text-gray-900 text-base mb-0.5">শিক্ষার্থী</p>
              <p className="text-xs text-gray-600">তালিকা দেখুন</p>
            </button>

            {/* Reports */}
            <button
              onClick={() => router.push("/reports")}
              className="bg-gradient-to-br from-pink-50 to-rose-50 p-4 rounded-xl text-left active:scale-[0.98] transition-all hover:shadow-md border border-pink-100 group"
            >
              <div className="w-11 h-11 bg-gradient-to-br from-pink-500 to-rose-600 rounded-lg flex items-center justify-center mb-3 shadow-md group-hover:scale-105 transition-transform">
                <svg className="w-6 h-6 text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm2 10a1 1 0 10-2 0v3a1 1 0 102 0v-3zm2-3a1 1 0 011 1v5a1 1 0 11-2 0v-5a1 1 0 011-1zm4-1a1 1 0 10-2 0v7a1 1 0 102 0V8z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="font-bold text-gray-900 text-base mb-0.5">রিপোর্ট</p>
              <p className="text-xs text-gray-600">ফলাফল দেখুন</p>
            </button>

            {/* Community */}
            <button
              onClick={() => router.push("/community")}
              className="bg-gradient-to-br from-purple-50 to-violet-50 p-4 rounded-xl text-left active:scale-[0.98] transition-all hover:shadow-md border border-purple-100 group"
            >
              <div className="w-11 h-11 bg-gradient-to-br from-purple-500 to-violet-600 rounded-lg flex items-center justify-center mb-3 shadow-md group-hover:scale-105 transition-transform">
                <svg className="w-6 h-6 text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                </svg>
              </div>
              <p className="font-bold text-gray-900 text-base mb-0.5">কমিউনিটি</p>
              <p className="text-xs text-gray-600">সবার সাথে যুক্ত হন</p>
            </button>

            {/* Lesson Plans */}
            <button
              onClick={() => router.push("/lesson-plans")}
              className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl text-left active:scale-[0.98] transition-all hover:shadow-md border border-green-100 group"
            >
              <div className="w-11 h-11 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center mb-3 shadow-md group-hover:scale-105 transition-transform">
                <svg className="w-6 h-6 text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                  <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="font-bold text-gray-900 text-base mb-0.5">লেসন প্ল্যান</p>
              <p className="text-xs text-gray-600">পাঠ পরিকল্পনা</p>
            </button>
          </div>

        </section>
      </main>

      <BottomNav active="home" />
    </div>
  );
}
