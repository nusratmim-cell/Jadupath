"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getCurrentUser,
  getProfileByUserId,
  logoutUser,
  getTotalStudentCount,
  type TeacherProfile,
  type SessionUser,
} from "@/lib/auth";
import {
  toBengaliNumber,
  getOverallTrainingStats,
  getTotalCompletedTopics,
  getTotalCompletedChapters,
  getVideosWatchedCount,
  getAllQuizSessions,
  getActivityStreakDays,
  getAIToolUsageCount,
  CLASS_LABELS,
  SUBJECT_NAMES,
} from "@/lib/data";
import { BottomNav, Toast, useToast, AvatarDisplay } from "@/components";

// Tab type
type ProfileTab = "summary" | "teaching" | "learning" | "edit" | "settings";

// Academic terms interface
interface AcademicTerm {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [, setUser] = useState<SessionUser | null>(null);
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ProfileTab>("summary");

  // Academic terms state
  const [academicTerms, setAcademicTerms] = useState<AcademicTerm[]>([
    { id: "term1", name: "প্রথম সাময়িক", startDate: "", endDate: "" },
    { id: "term2", name: "দ্বিতীয় সাময়িক", startDate: "", endDate: "" },
    { id: "term3", name: "বার্ষিক পরীক্ষা", startDate: "", endDate: "" },
  ]);

  // Quiz display configuration state
  const [quizDisplayMax, setQuizDisplayMax] = useState<5 | 10 | 20>(10);

  // Notice state
  const [noticeText, setNoticeText] = useState("");
  const [isSendingNotice, setIsSendingNotice] = useState(false);

  // Stats
  const [teachingStats, setTeachingStats] = useState({
    totalStudents: 0,
    totalClasses: 0,
    chaptersTeached: 0,
    topicsCovered: 0,
    quizzesConducted: 0,
    classesTaken: 0,
  });

  const [learningStats, setLearningStats] = useState({
    chaptersCompleted: 0,
    topicsCompleted: 0,
    videosWatched: 0,
    quizzesAttempted: 0,
    quizzesPassed: 0,
    trainingProgress: 0,
    streakDays: 0,
  });

  // AI Tool Usage Stats
  const [aiToolUsage, setAiToolUsage] = useState({
    lessonPlanner: 0,
    summaryGenerator: 0,
    qaAssistant: 0,
    quizGenerator: 0,
  });

  // Toast notifications
  const { toasts, removeToast, success, error } = useToast();

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.push("/");
      return;
    }

    const teacherProfile = getProfileByUserId(currentUser.id);
    setUser(currentUser);
    setProfile(teacherProfile);

    // Load teaching stats
    const totalStudents = getTotalStudentCount(currentUser.id);
    const quizSessions = getAllQuizSessions();
    const conductedQuizzes = quizSessions.filter(q => q.teacherId === currentUser.id);

    // Calculate real teaching statistics from completed topics
    const allCompletedTopics: { chapterId: string; topicId: string }[] = [];
    teacherProfile?.classes.forEach(classId => {
      const data = localStorage.getItem("completed_teaching_topics");
      const completed = data ? JSON.parse(data) : [];
      const classCompleted = completed.filter((t: any) =>
        t.teacherId === currentUser.id && t.classId === classId
      );
      classCompleted.forEach((t: any) => {
        allCompletedTopics.push({ chapterId: t.chapterId, topicId: t.topicId });
      });
    });

    const uniqueChapters = new Set(allCompletedTopics.map(t => t.chapterId));
    const uniqueTopics = new Set(allCompletedTopics.map(t => t.topicId));

    // Count classes taken from attendance records
    const attendanceData = localStorage.getItem("attendance_records");
    const allAttendance = attendanceData ? JSON.parse(attendanceData) : [];
    const teacherAttendance = allAttendance.filter((a: any) => a.teacherId === currentUser.id);
    const uniqueDates = new Set(teacherAttendance.map((a: any) => a.date));

    setTeachingStats({
      totalStudents,
      totalClasses: teacherProfile?.classes.length || 0,
      chaptersTeached: uniqueChapters.size,
      topicsCovered: uniqueTopics.size,
      quizzesConducted: conductedQuizzes.length,
      classesTaken: uniqueDates.size,
    });

    // Load learning stats
    const completedTopics = getTotalCompletedTopics(currentUser.id);
    const completedChapters = getTotalCompletedChapters(currentUser.id);
    const videosWatched = getVideosWatchedCount(currentUser.id);
    const trainingStats = getOverallTrainingStats(currentUser.id);
    const userQuizzes = quizSessions.filter(q =>
      q.responses.some(r => r.studentId === currentUser.id)
    );

    // Calculate actual quiz pass rate (80% or higher)
    const passedQuizzes = userQuizzes.filter(q => {
      const correctAnswers = q.responses.filter(r => r.isCorrect).length;
      const score = q.totalQuestions > 0 ? (correctAnswers / q.totalQuestions) * 100 : 0;
      return score >= 80;
    });

    setLearningStats({
      chaptersCompleted: completedChapters,
      topicsCompleted: completedTopics,
      videosWatched,
      quizzesAttempted: userQuizzes.length,
      quizzesPassed: passedQuizzes.length,
      trainingProgress: trainingStats.overallPercentage,
      streakDays: getActivityStreakDays(currentUser.id),
    });

    // Load AI tool usage stats
    setAiToolUsage({
      lessonPlanner: getAIToolUsageCount(currentUser.id, "lesson-planner"),
      summaryGenerator: getAIToolUsageCount(currentUser.id, "summary-generator"),
      qaAssistant: getAIToolUsageCount(currentUser.id, "qa-assistant"),
      quizGenerator: getAIToolUsageCount(currentUser.id, "quiz-generator"),
    });

    // Load academic terms from localStorage
    const savedTerms = localStorage.getItem("academic_terms");
    if (savedTerms) {
      setAcademicTerms(JSON.parse(savedTerms));
    }

    // Load quiz display configuration from profile
    if (teacherProfile?.quizDisplayMax) {
      setQuizDisplayMax(teacherProfile.quizDisplayMax);
    }

    setIsLoading(false);
  }, [router]);

  const handleSaveAcademicTerms = () => {
    localStorage.setItem("academic_terms", JSON.stringify(academicTerms));
    success("সাময়িক পরীক্ষার সময়সূচী সংরক্ষিত হয়েছে!");
  };

  const handleSaveQuizConfig = () => {
    if (!profile) return;

    // Update profile with new quiz display configuration
    const updatedProfile: TeacherProfile = {
      ...profile,
      quizDisplayMax: quizDisplayMax,
      updatedAt: new Date().toISOString(),
    };

    // Save to localStorage
    const profilesData = localStorage.getItem("teacher_profiles");
    const allProfiles: TeacherProfile[] = profilesData ? JSON.parse(profilesData) : [];
    const profileIndex = allProfiles.findIndex(p => p.userId === profile.userId);

    if (profileIndex !== -1) {
      allProfiles[profileIndex] = updatedProfile;
    } else {
      allProfiles.push(updatedProfile);
    }

    localStorage.setItem("teacher_profiles", JSON.stringify(allProfiles));
    setProfile(updatedProfile);
    success("কুইজ সেটিংস সংরক্ষিত হয়েছে!");
  };

  const handleSendNotice = async () => {
    if (!noticeText.trim()) {
      error("নোটিশ লিখুন!");
      return;
    }

    setIsSendingNotice(true);
    await new Promise(resolve => setTimeout(resolve, 1500));

    success(`নোটিশ ${teachingStats.totalStudents} জন অভিভাবকের কাছে পাঠানো হয়েছে!`);
    setNoticeText("");
    setIsSendingNotice(false);
  };

  const handleLogout = () => {
    logoutUser();
    router.push("/");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#cf278d] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg text-slate-600">লোড হচ্ছে...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Facebook-Style Profile Layout */}
      <div className="max-w-5xl mx-auto bg-white">
        {/* Cover Photo Area with Integrated Navigation */}
        <div className="relative">
          {/* Gradient Header Banner */}
          <div className="w-full h-20 bg-gradient-to-r from-[#2F299D] via-[#3338D7] to-[#4D51DE]">
            {/* Clean gradient banner - no logo */}
          </div>

          {/* Profile Picture - Overlapping Cover */}
          <div className="absolute -bottom-10 left-8">
            <div className="relative">
              {/* Reduced size avatar to match cover photo proportions */}
              <div className="w-20 h-20 rounded-full border-4 border-white shadow-2xl bg-white overflow-hidden">
                <AvatarDisplay
                  profile={profile}
                  size="large"
                  className="w-full h-full"
                />
              </div>

              {/* Edit button overlay */}
              <button
                onClick={() => setActiveTab("edit")}
                className="absolute bottom-0 right-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-all shadow-md border-2 border-white"
              >
                <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Profile Info Section - Facebook style */}
        <div className="px-6 pt-14 pb-3 border-b border-gray-200">
          {/* Name and Basic Info */}
          <div className="ml-0 md:ml-28">
            <h1 className="text-3xl font-bold text-gray-900 mb-1">{profile?.name}</h1>
            <p className="text-base text-gray-600 mb-2">{profile?.email}</p>

            {/* Quick Stats */}
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                {profile?.schoolName}
              </span>
              {profile?.teachingExperience && (
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {profile.teachingExperience} অভিজ্ঞতা
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Tab Navigation - Facebook style */}
        <div className="border-b border-gray-200">
          <div className="flex overflow-x-auto hide-scrollbar px-6">
            {[
              { id: "summary", label: "সারসংক্ষেপ", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
              { id: "teaching", label: "শিক্ষণ", icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" },
              { id: "learning", label: "প্রশিক্ষণ", icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" },
              { id: "edit", label: "সম্পাদনা", icon: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" },
              { id: "settings", label: "সেটিংস", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as ProfileTab)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? "text-[#cf278d] border-b-3 border-[#cf278d]"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                </svg>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* Tab Content Area - Below the white card */}
      <main className="max-w-5xl mx-auto px-6 py-4 space-y-4 bg-slate-50">

        {/* ==================== SUMMARY TAB ==================== */}
        {activeTab === "summary" && (
          <>
            {/* Classes & Subjects - Compact */}
            <div className="bg-white rounded-2xl shadow-sm p-5 mb-4 border border-gray-100">
              <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-[#cf278d]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                শিক্ষাদান বিবরণ
              </h3>

              {/* Classes - Compact pill badges */}
              <div className="mb-4">
                <p className="text-sm font-semibold text-gray-700 mb-2">যে ক্লাসে পড়ান</p>
                <div className="flex flex-wrap gap-2">
                  {profile?.classes.map((c) => (
                    <span
                      key={c}
                      className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-full font-semibold text-sm shadow-sm hover:shadow-md hover:scale-105 transition-all"
                    >
                      {CLASS_LABELS[c] || `ক্লাস ${c}`}
                    </span>
                  ))}
                </div>
              </div>

              {/* Subjects - Compact pill badges */}
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">যে বিষয় পড়ান</p>
                <div className="flex flex-wrap gap-2">
                  {profile?.subjects.map((s) => (
                    <span
                      key={s}
                      className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full font-semibold text-sm shadow-sm hover:shadow-md hover:scale-105 transition-all"
                    >
                      {SUBJECT_NAMES[s] || s}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Stats Grid - Compact */}
            <div className="grid grid-cols-4 gap-3 mb-4">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 text-center hover:shadow-md transition-all">
                <p className="text-2xl font-bold text-[#cf278d] mb-0.5">{toBengaliNumber(teachingStats.totalClasses)}</p>
                <p className="text-xs text-gray-600 font-medium">ক্লাস</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 text-center hover:shadow-md transition-all">
                <p className="text-2xl font-bold text-green-600 mb-0.5">{toBengaliNumber(teachingStats.totalStudents)}</p>
                <p className="text-xs text-gray-600 font-medium">শিক্ষার্থী</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 text-center hover:shadow-md transition-all">
                <p className="text-2xl font-bold text-purple-600 mb-0.5">{toBengaliNumber(learningStats.topicsCompleted)}</p>
                <p className="text-xs text-gray-600 font-medium">প্রশিক্ষণ</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 text-center hover:shadow-md transition-all">
                <p className="text-2xl font-bold text-orange-600 mb-0.5">{toBengaliNumber(learningStats.streakDays)}</p>
                <p className="text-xs text-gray-600 font-medium">দিন</p>
              </div>
            </div>

            {/* Teaching & Learning Progress Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Teaching Progress Summary */}
              <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-4 text-white">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">শিক্ষণ অগ্রগতি</h3>
                      <p className="text-white/80 text-xs">আপনার শিক্ষকতার কার্যক্রম</p>
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-2 gap-3">
                    <StatBox label="ক্লাস নেওয়া" value={teachingStats.classesTaken} color="green" />
                    <StatBox label="কুইজ পরিচালনা" value={teachingStats.quizzesConducted} color="green" />
                    <StatBox label="অধ্যায় পড়ানো" value={teachingStats.chaptersTeached} color="green" />
                    <StatBox label="টপিক সম্পন্ন" value={teachingStats.topicsCovered} color="green" />
                  </div>
                </div>
              </div>

              {/* Learning Progress Summary */}
              <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-purple-500 to-indigo-600 p-4 text-white">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">শিক্ষা অগ্রগতি</h3>
                      <p className="text-white/80 text-xs">আপনার প্রশিক্ষণ অগ্রগতি</p>
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">সামগ্রিক অগ্রগতি</span>
                      <span className="text-lg font-bold text-purple-600">{toBengaliNumber(Math.round(learningStats.trainingProgress))}%</span>
                    </div>
                    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all rounded-full"
                        style={{ width: `${learningStats.trainingProgress}%` }}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <StatBox label="অধ্যায় সম্পন্ন" value={learningStats.chaptersCompleted} color="purple" />
                    <StatBox label="টপিক সম্পন্ন" value={learningStats.topicsCompleted} color="purple" />
                  </div>
                </div>
              </div>
            </div>

            {/* Most Used AI Tools */}
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <h3 className="font-bold text-gray-900">সবচেয়ে ব্যবহৃত AI টুলস</h3>
                </div>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => router.push("/ai")}
                    className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-100 hover:shadow-md transition-all group"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center group-hover:bg-amber-200 transition-colors">
                        <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-semibold text-gray-900 text-sm">লেসন প্ল্যানার</p>
                        <p className="text-xs text-amber-600">{toBengaliNumber(aiToolUsage.lessonPlanner)} বার ব্যবহৃত</p>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => router.push("/ai")}
                    className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border border-blue-100 hover:shadow-md transition-all group"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                        </svg>
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-semibold text-gray-900 text-sm">সারাংশ তৈরি</p>
                        <p className="text-xs text-blue-600">{toBengaliNumber(aiToolUsage.summaryGenerator)} বার ব্যবহৃত</p>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => router.push("/ai")}
                    className="p-4 bg-gradient-to-br from-pink-50 to-rose-50 rounded-xl border border-pink-100 hover:shadow-md transition-all group"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center group-hover:bg-pink-200 transition-colors">
                        <svg className="w-5 h-5 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-semibold text-gray-900 text-sm">প্রশ্নোত্তর সহায়ক</p>
                        <p className="text-xs text-pink-600">{toBengaliNumber(aiToolUsage.qaAssistant)} বার ব্যবহৃত</p>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => router.push("/ai")}
                    className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-100 hover:shadow-md transition-all group"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-semibold text-gray-900 text-sm">কুইজ তৈরি</p>
                        <p className="text-xs text-green-600">{toBengaliNumber(aiToolUsage.quizGenerator)} বার ব্যবহৃত</p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Access Actions */}
            <div className="grid grid-cols-2 gap-4">
              <ActionCard
                icon="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                title="শিক্ষার্থী তালিকা"
                subtitle={`${toBengaliNumber(teachingStats.totalStudents)} জন শিক্ষার্থী`}
                color="blue"
                onClick={() => router.push("/students")}
              />
              <ActionCard
                icon="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                title="রিপোর্ট দেখুন"
                subtitle="বিশদ পারফরম্যান্স"
                color="green"
                onClick={() => router.push("/reports")}
              />
              <ActionCard
                icon="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                title="প্রশিক্ষণ কোর্স"
                subtitle="শেখা চালিয়ে যান"
                color="purple"
                onClick={() => router.push("/training")}
              />
              <ActionCard
                icon="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                title="AI টুলস"
                subtitle="সহায়ক সরঞ্জাম"
                color="amber"
                onClick={() => router.push("/ai")}
              />
            </div>
          </>
        )}

        {/* ==================== TEACHING PROGRESS TAB ==================== */}
        {activeTab === "teaching" && (
          <>
            {/* Teaching Overview */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl shadow-md border border-green-100 p-5">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center">
                  <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">শিক্ষণ কার্যক্রম সংক্ষিপ্ত</h3>
                  <p className="text-sm text-gray-600">আপনার শিক্ষাদান পরিসংখ্যান</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-green-100">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-green-600">{toBengaliNumber(teachingStats.totalStudents)}</p>
                      <p className="text-sm text-gray-600">মোট শিক্ষার্থী</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-4 shadow-sm border border-green-100">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-green-600">{toBengaliNumber(teachingStats.classesTaken)}</p>
                      <p className="text-sm text-gray-600">ক্লাস নেওয়া হয়েছে</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <MetricCard
                icon="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                label="অধ্যায় পড়ানো"
                value={teachingStats.chaptersTeached}
                color="blue"
              />
              <MetricCard
                icon="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                label="টপিক সম্পন্ন"
                value={teachingStats.topicsCovered}
                color="purple"
              />
              <MetricCard
                icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                label="কুইজ পরিচালনা"
                value={teachingStats.quizzesConducted}
                color="pink"
              />
              <MetricCard
                icon="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                label="ক্লাস পড়ান"
                value={teachingStats.totalClasses}
                color="orange"
              />
            </div>

            {/* Classes Breakdown */}
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-slate-50">
                <h3 className="font-bold text-gray-900">ক্লাস অনুযায়ী বিস্তারিত</h3>
              </div>
              <div className="p-4">
                <div className="space-y-3">
                  {profile?.classes.map((classId) => (
                    <button
                      key={classId}
                      onClick={() => router.push(`/class-details/${classId}`)}
                      className="w-full flex items-center gap-4 p-4 bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl hover:shadow-md transition-all border border-gray-100 group"
                    >
                      <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md">
                        <span className="text-2xl font-bold text-white">{classId}</span>
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-bold text-gray-900">{CLASS_LABELS[classId] || `ক্লাস ${classId}`}</p>
                        <p className="text-sm text-gray-500">শিক্ষার্থী ও হাজিরা দেখুন</p>
                      </div>
                      <svg className="w-6 h-6 text-gray-400 group-hover:text-gray-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* View Full Report Button */}
            <button
              onClick={() => router.push("/reports")}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-2xl px-6 py-4 font-bold hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              সম্পূর্ণ রিপোর্ট দেখুন
            </button>
          </>
        )}

        {/* ==================== LEARNING PROGRESS TAB ==================== */}
        {activeTab === "learning" && (
          <>
            {/* Training Progress Card */}
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl shadow-md border border-purple-100 p-5">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center">
                  <svg className="w-7 h-7 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900">প্রশিক্ষণ অগ্রগতি</h3>
                  <p className="text-sm text-gray-600">পেশাগত উন্নয়ন কোর্স</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-purple-600">{toBengaliNumber(Math.round(learningStats.trainingProgress))}%</p>
                  <p className="text-xs text-gray-500">সম্পন্ন</p>
                </div>
              </div>

              <div className="h-4 bg-white rounded-full overflow-hidden mb-4 shadow-inner">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all rounded-full"
                  style={{ width: `${learningStats.trainingProgress}%` }}
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white rounded-xl p-3 text-center shadow-sm">
                  <p className="text-2xl font-bold text-purple-600">{toBengaliNumber(learningStats.chaptersCompleted)}</p>
                  <p className="text-xs text-gray-600 mt-1">অধ্যায় সম্পন্ন</p>
                </div>
                <div className="bg-white rounded-xl p-3 text-center shadow-sm">
                  <p className="text-2xl font-bold text-purple-600">{toBengaliNumber(learningStats.topicsCompleted)}</p>
                  <p className="text-xs text-gray-600 mt-1">টপিক সম্পন্ন</p>
                </div>
                <div className="bg-white rounded-xl p-3 text-center shadow-sm">
                  <p className="text-2xl font-bold text-purple-600">{toBengaliNumber(learningStats.videosWatched)}</p>
                  <p className="text-xs text-gray-600 mt-1">ভিডিও দেখা</p>
                </div>
              </div>
            </div>

            {/* Quiz Performance */}
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-pink-50 to-rose-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">কুইজ পারফরম্যান্স</h3>
                    <p className="text-xs text-gray-600">আপনার মূল্যায়ন ফলাফল</p>
                  </div>
                </div>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-100">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-blue-600">{toBengaliNumber(learningStats.quizzesAttempted)}</p>
                        <p className="text-sm text-gray-600">কুইজ অংশগ্রহণ</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-green-600">{toBengaliNumber(learningStats.quizzesPassed)}</p>
                        <p className="text-sm text-gray-600">সফল হয়েছেন</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pass Ratio */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">সফলতার হার</span>
                    <span className="text-lg font-bold text-green-600">
                      {toBengaliNumber(Math.round((learningStats.quizzesPassed / learningStats.quizzesAttempted) * 100) || 0)}%
                    </span>
                  </div>
                  <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"
                      style={{ width: `${(learningStats.quizzesPassed / learningStats.quizzesAttempted) * 100 || 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Activity Streak */}
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl shadow-md border border-orange-100 p-5">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-amber-500 rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                  </svg>
                </div>
                <div>
                  <p className="text-4xl font-bold text-orange-600">{toBengaliNumber(learningStats.streakDays)} দিন</p>
                  <p className="text-sm text-gray-600">একটানা সক্রিয় স্ট্রিক</p>
                  <p className="text-xs text-orange-600 mt-1">চালিয়ে যান! 🎯</p>
                </div>
              </div>
            </div>

            {/* Continue Training Button */}
            <button
              onClick={() => router.push("/training")}
              className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-2xl px-6 py-4 font-bold hover:from-purple-600 hover:to-indigo-700 transition-all shadow-lg flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              প্রশিক্ষণে ফিরে যান
            </button>
          </>
        )}

        {/* ==================== PROFILE EDIT TAB ==================== */}
        {activeTab === "edit" && (
          <>
            {/* Personal Information */}
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-cyan-50">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <h3 className="font-bold text-gray-900">ব্যক্তিগত তথ্য</h3>
                </div>
              </div>
              <div className="divide-y divide-gray-100">
                <InfoRow icon="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" label="নাম" value={profile?.name || ""} />
                <InfoRow icon="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" label="ইমেইল" value={profile?.email || ""} />
                {profile?.phone && <InfoRow icon="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" label="মোবাইল নম্বর" value={profile.phone} />}
                <InfoRow icon="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" label="বিদ্যালয়ের নাম" value={profile?.schoolName || ""} />
                {profile?.district && <InfoRow icon="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" label="জেলা" value={profile.district} />}
              </div>
            </div>

            {/* Teaching Subjects */}
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-5">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                শিক্ষাদান তথ্য
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">যে ক্লাসে পড়ান</p>
                  <div className="flex flex-wrap gap-2">
                    {profile?.classes.map((c) => (
                      <span key={c} className="px-4 py-2 bg-gradient-to-r from-blue-50 to-cyan-50 text-blue-700 rounded-xl font-medium text-sm border border-blue-100">
                        {CLASS_LABELS[c] || `ক্লাস ${c}`}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">যে বিষয় পড়ান</p>
                  <div className="flex flex-wrap gap-2">
                    {profile?.subjects.map((s) => (
                      <span key={s} className="px-4 py-2 bg-gradient-to-r from-purple-50 to-pink-50 text-purple-700 rounded-xl font-medium text-sm border border-purple-100">
                        {SUBJECT_NAMES[s] || s}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Edit Profile Button */}
            <button
              onClick={() => router.push("/onboarding")}
              className="w-full gradient-blue-pink text-white rounded-2xl px-6 py-4 font-bold hover:from-[#2d3a7c] hover:to-[#3d4d8a] transition-all shadow-lg flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              প্রোফাইল সম্পাদনা করুন
            </button>
          </>
        )}

        {/* ==================== GENERAL SETTINGS TAB ==================== */}
        {activeTab === "settings" && (
          <>
            {/* Academic Term Settings */}
            <div className="bg-amber-50 rounded-2xl p-5 border border-amber-200 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-amber-900">সাময়িক পরীক্ষার সময়সূচী</h3>
                  <p className="text-sm text-amber-700">পরীক্ষার তারিখ নির্ধারণ করুন</p>
                </div>
              </div>
              <div className="bg-amber-100/50 rounded-xl p-3 border border-amber-200">
                <p className="text-xs text-amber-800">
                  <strong>বিঃদ্রঃ</strong> এই সেটিংস রিপোর্ট কার্ড, উপস্থিতি এবং সমস্ত পোর্টালে প্রভাব ফেলবে।
                </p>
              </div>
            </div>

            {/* Term Date Settings */}
            {academicTerms.map((term, index) => (
              <div key={term.id} className="bg-white rounded-2xl shadow-md border border-gray-100 p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                    <span className="text-xl font-bold text-blue-600">{toBengaliNumber(index + 1)}</span>
                  </div>
                  <h4 className="font-bold text-gray-900">{term.name}</h4>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      শুরুর তারিখ
                    </label>
                    <input
                      type="date"
                      value={term.startDate}
                      onChange={(e) => {
                        const newTerms = [...academicTerms];
                        newTerms[index].startDate = e.target.value;
                        setAcademicTerms(newTerms);
                      }}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#cf278d] focus:border-transparent transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      শেষের তারিখ
                    </label>
                    <input
                      type="date"
                      value={term.endDate}
                      onChange={(e) => {
                        const newTerms = [...academicTerms];
                        newTerms[index].endDate = e.target.value;
                        setAcademicTerms(newTerms);
                      }}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#cf278d] focus:border-transparent transition-all"
                    />
                  </div>
                </div>
              </div>
            ))}

            {/* Save Terms Button */}
            <button
              onClick={handleSaveAcademicTerms}
              className="w-full bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-2xl px-6 py-4 font-bold hover:from-blue-600 hover:to-cyan-700 transition-all shadow-lg flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              সময়সূচী সংরক্ষণ করুন
            </button>

            {/* Quiz Display Configuration */}
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">কুইজ নম্বর প্রদর্শন সেটিংস</h3>
                  <p className="text-sm text-gray-600">রিপোর্ট কার্ডে কুইজের নম্বর কত এর মধ্যে দেখাবে?</p>
                </div>
              </div>

              <div className="bg-pink-50 rounded-xl p-4 border border-pink-200 mb-5">
                <p className="text-sm text-pink-800">
                  <strong>বিঃদ্রঃ</strong> এই সেটিংস রিপোর্ট কার্ডে কুইজের নম্বর প্রদর্শন নিয়ন্ত্রণ করবে। সব কুইজের নম্বর স্বয়ংক্রিয়ভাবে আনুপাতিক হারে পরিবর্তিত হবে।
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-5">
                {/* Option: Out of 5 */}
                <button
                  onClick={() => setQuizDisplayMax(5)}
                  className={`p-5 rounded-xl border-2 transition-all ${
                    quizDisplayMax === 5
                      ? "border-pink-600 bg-pink-50"
                      : "border-gray-200 bg-white hover:border-pink-300"
                  }`}
                >
                  <div className="text-center">
                    <div className={`text-4xl font-bold mb-2 ${
                      quizDisplayMax === 5 ? "text-pink-600" : "text-gray-700"
                    }`}>
                      {toBengaliNumber(5)}
                    </div>
                    <div className={`text-sm font-medium ${
                      quizDisplayMax === 5 ? "text-pink-700" : "text-gray-600"
                    }`}>
                      ৫ এর মধ্যে
                    </div>
                  </div>
                  {quizDisplayMax === 5 && (
                    <div className="mt-3 flex justify-center">
                      <svg className="w-5 h-5 text-pink-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </button>

                {/* Option: Out of 10 */}
                <button
                  onClick={() => setQuizDisplayMax(10)}
                  className={`p-5 rounded-xl border-2 transition-all ${
                    quizDisplayMax === 10
                      ? "border-pink-600 bg-pink-50"
                      : "border-gray-200 bg-white hover:border-pink-300"
                  }`}
                >
                  <div className="text-center">
                    <div className={`text-4xl font-bold mb-2 ${
                      quizDisplayMax === 10 ? "text-pink-600" : "text-gray-700"
                    }`}>
                      {toBengaliNumber(10)}
                    </div>
                    <div className={`text-sm font-medium ${
                      quizDisplayMax === 10 ? "text-pink-700" : "text-gray-600"
                    }`}>
                      ১০ এর মধ্যে
                    </div>
                  </div>
                  {quizDisplayMax === 10 && (
                    <div className="mt-3 flex justify-center">
                      <svg className="w-5 h-5 text-pink-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </button>

                {/* Option: Out of 20 */}
                <button
                  onClick={() => setQuizDisplayMax(20)}
                  className={`p-5 rounded-xl border-2 transition-all ${
                    quizDisplayMax === 20
                      ? "border-pink-600 bg-pink-50"
                      : "border-gray-200 bg-white hover:border-pink-300"
                  }`}
                >
                  <div className="text-center">
                    <div className={`text-4xl font-bold mb-2 ${
                      quizDisplayMax === 20 ? "text-pink-600" : "text-gray-700"
                    }`}>
                      {toBengaliNumber(20)}
                    </div>
                    <div className={`text-sm font-medium ${
                      quizDisplayMax === 20 ? "text-pink-700" : "text-gray-600"
                    }`}>
                      ২০ এর মধ্যে
                    </div>
                  </div>
                  {quizDisplayMax === 20 && (
                    <div className="mt-3 flex justify-center">
                      <svg className="w-5 h-5 text-pink-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </button>
              </div>

              {/* Save Quiz Config Button */}
              <button
                onClick={handleSaveQuizConfig}
                className="w-full bg-gradient-to-r from-pink-600 to-rose-600 text-white rounded-xl px-6 py-4 font-bold hover:from-pink-700 hover:to-rose-700 transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                কুইজ সেটিংস সংরক্ষণ করুন
              </button>
            </div>

            {/* Notice to Guardians */}
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-green-50 to-emerald-50">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">অভিভাবকদের নোটিশ পাঠান</h3>
                    <p className="text-sm text-gray-600">{toBengaliNumber(teachingStats.totalStudents)} জন অভিভাবকের কাছে SMS</p>
                  </div>
                </div>
              </div>
              <div className="p-5">
                <label className="block text-sm font-medium text-gray-700 mb-3">নোটিশের বিষয়বস্তু লিখুন</label>
                <textarea
                  value={noticeText}
                  onChange={(e) => setNoticeText(e.target.value)}
                  placeholder="উদাহরণ: আগামী ৫ই জানুয়ারি অভিভাবক সভা অনুষ্ঠিত হবে। সকাল ১০টায় উপস্থিত থাকার জন্য অনুরোধ করা হলো।"
                  rows={5}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#cf278d] focus:border-transparent resize-none transition-all"
                />
                <div className="flex items-center justify-between mt-3 text-sm">
                  <span className="text-gray-500">{noticeText.length} / ১৬০ অক্ষর</span>
                  <span className="text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                    {toBengaliNumber(Math.ceil(noticeText.length / 160))} SMS
                  </span>
                </div>

                <button
                  onClick={handleSendNotice}
                  disabled={isSendingNotice || !noticeText.trim()}
                  className="w-full mt-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-2xl px-6 py-4 font-bold hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSendingNotice ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      পাঠানো হচ্ছে...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                      নোটিশ পাঠান
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Recent Notices */}
            <div className="bg-gray-50 rounded-2xl p-5 border border-gray-200">
              <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                সাম্প্রতিক নোটিশ
              </h4>
              <div className="space-y-3">
                <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                  <p className="text-sm text-gray-800 font-medium mb-1">আগামীকাল অভিভাবক সভা অনুষ্ঠিত হবে</p>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500">২ দিন আগে</p>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                      {toBengaliNumber(teachingStats.totalStudents)} জন
                    </span>
                  </div>
                </div>
                <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                  <p className="text-sm text-gray-800 font-medium mb-1">পরীক্ষার ফলাফল প্রকাশিত হয়েছে</p>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500">৫ দিন আগে</p>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                      {toBengaliNumber(teachingStats.totalStudents)} জন
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="w-full bg-white rounded-2xl shadow-md border border-red-100 px-5 py-4 flex items-center gap-4 hover:bg-red-50 transition-all group"
        >
          <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center group-hover:bg-red-100 transition-colors">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </div>
          <span className="font-bold text-red-600">লগ আউট করুন</span>
        </button>
      </main>

      <BottomNav active="profile" />

      {/* Toast Notifications */}
      <Toast toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

// ==================== Helper Components ====================

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="px-5 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors">
      <div className="w-10 h-10 bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl flex items-center justify-center flex-shrink-0 border border-gray-100">
        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 mb-0.5">{label}</p>
        <p className="font-medium text-gray-900 truncate">{value}</p>
      </div>
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: number; color: string }) {
  const colorClasses = {
    green: "bg-green-50 border-green-100 text-green-600",
    purple: "bg-purple-50 border-purple-100 text-purple-600",
  };

  return (
    <div className={`rounded-xl p-3 text-center border ${colorClasses[color as keyof typeof colorClasses]}`}>
      <p className="text-2xl font-bold">{toBengaliNumber(value)}</p>
      <p className="text-xs mt-1 opacity-80">{label}</p>
    </div>
  );
}

function MetricCard({ icon, label, value, color }: { icon: string; label: string; value: number; color: string }) {
  const colorClasses = {
    blue: "from-blue-50 to-cyan-50 border-blue-100",
    purple: "from-purple-50 to-pink-50 border-purple-100",
    pink: "from-pink-50 to-rose-50 border-pink-100",
    orange: "from-orange-50 to-amber-50 border-orange-100",
  };

  const iconColors = {
    blue: "bg-blue-100 text-blue-600",
    purple: "bg-purple-100 text-purple-600",
    pink: "bg-pink-100 text-pink-600",
    orange: "bg-orange-100 text-orange-600",
  };

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color as keyof typeof colorClasses]} rounded-2xl shadow-md p-4 border`}>
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-12 h-12 ${iconColors[color as keyof typeof iconColors]} rounded-xl flex items-center justify-center`}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
          </svg>
        </div>
        <div>
          <p className="text-3xl font-bold text-gray-900">{toBengaliNumber(value)}</p>
        </div>
      </div>
      <p className="text-sm text-gray-600 font-medium">{label}</p>
    </div>
  );
}

function ActionCard({ icon, title, subtitle, color, onClick }: { icon: string; title: string; subtitle: string; color: string; onClick: () => void }) {
  const colorClasses = {
    blue: "from-blue-50 to-cyan-50 border-blue-100 hover:border-blue-200",
    green: "from-green-50 to-emerald-50 border-green-100 hover:border-green-200",
    purple: "from-purple-50 to-pink-50 border-purple-100 hover:border-purple-200",
    amber: "from-amber-50 to-orange-50 border-amber-100 hover:border-amber-200",
  };

  const iconColors = {
    blue: "bg-blue-100 text-blue-600 group-hover:bg-blue-200",
    green: "bg-green-100 text-green-600 group-hover:bg-green-200",
    purple: "bg-purple-100 text-purple-600 group-hover:bg-purple-200",
    amber: "bg-amber-100 text-amber-600 group-hover:bg-amber-200",
  };

  return (
    <button
      onClick={onClick}
      className={`bg-gradient-to-br ${colorClasses[color as keyof typeof colorClasses]} rounded-2xl p-5 shadow-md border transition-all hover:shadow-lg group text-left`}
    >
      <div className={`w-12 h-12 ${iconColors[color as keyof typeof iconColors]} rounded-xl flex items-center justify-center mb-3 transition-colors`}>
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
        </svg>
      </div>
      <p className="font-bold text-gray-900 mb-1">{title}</p>
      <p className="text-sm text-gray-600">{subtitle}</p>
    </button>
  );
}
