"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { getCurrentUser, type SessionUser } from "@/lib/auth";
import {
  TRAINING_COURSES,
  isTopicCompleted,
  toBengaliNumber,
  type TrainingCourse,
  type TrainingChapter,
} from "@/lib/data";

export default function CourseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.courseId as string;

  const [user, setUser] = useState<SessionUser | null>(null);
  const [course, setCourse] = useState<TrainingCourse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.push("/");
      return;
    }
    setUser(currentUser);

    // Find the course by ID
    const foundCourse = TRAINING_COURSES.find(c => c.id === courseId);
    if (!foundCourse) {
      router.push("/training");
      return;
    }
    setCourse(foundCourse);

    setIsLoading(false);
  }, [router, courseId]);

  if (isLoading || !user || !course) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#cf278d] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg text-slate-600">লোড হচ্ছে...</p>
        </div>
      </div>
    );
  }

  // Calculate overall progress
  let totalTopics = 0;
  let completedTopics = 0;
  course.chapters.forEach(chapter => {
    chapter.topics.forEach(topic => {
      totalTopics++;
      if (isTopicCompleted(user.id, course.id, chapter.id, topic.id)) {
        completedTopics++;
      }
    });
  });
  const progressPercentage = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30 pb-24">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/training")}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-lg font-bold text-slate-800">{course.name}</h1>
              <p className="text-xs text-slate-500">সেশন নির্বাচন করুন</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-4 space-y-4">
        {/* Overall Progress Card */}
        <div className="bg-gradient-to-br from-[#cf278d] to-[#2d3a7c] rounded-xl p-4 text-white shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-base font-bold opacity-90">সামগ্রিক অগ্রগতি</h2>
              <p className="text-white/70 text-xs">প্রশিক্ষণ কোর্স</p>
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
              <p className="text-xl font-bold">{toBengaliNumber(course.chapters.length)}</p>
              <p className="text-xs text-white/70">সেশন</p>
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

        {/* Session List */}
        <div>
          <h2 className="text-base font-bold text-slate-800 mb-3">অধ্যায় সমূহ</h2>
          <div className="grid grid-cols-1 gap-3">
            {course.chapters.map((chapter, index) => (
              <SessionCard
                key={chapter.id}
                chapter={chapter}
                courseId={course.id}
                userId={user.id}
                index={index}
                router={router}
              />
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
              <h3 className="text-sm font-bold text-blue-900 mb-1">গুরুত্বপূর্ণ তথ্য</h3>
              <p className="text-xs text-blue-800">
                প্রতিটি সেশনে টপিক রয়েছে। টপিকগুলো ধারাবাহিকভাবে শিখতে হবে এবং প্রতিটি টপিকে কুইজ পাস করতে হবে।
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function SessionCard({
  chapter,
  courseId,
  userId,
  index,
  router,
}: {
  chapter: TrainingChapter;
  courseId: string;
  userId: string;
  index: number;
  router: ReturnType<typeof useRouter>;
}) {
  // Calculate session progress
  const totalTopics = chapter.topics.length;
  let completedTopics = 0;
  chapter.topics.forEach(topic => {
    if (isTopicCompleted(userId, courseId, chapter.id, topic.id)) {
      completedTopics++;
    }
  });
  const progress = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;
  const isCompleted = progress === 100;

  return (
    <button
      onClick={() => router.push(`/training/${courseId}/${chapter.id}`)}
      className="w-full bg-white rounded-xl p-4 shadow-md hover:shadow-lg transition-all text-left group"
    >
      <div className="flex items-center gap-3">
        <div className={`w-11 h-11 rounded-lg flex items-center justify-center text-white font-bold shadow-md ${
          isCompleted
            ? "bg-gradient-to-br from-green-500 to-green-600"
            : "bg-gradient-to-br from-[#cf278d] to-[#cf278d]"
        }`}>
          {isCompleted ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <span className="text-base">{toBengaliNumber(index + 1)}</span>
          )}
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-slate-800 text-sm group-hover:text-[#cf278d] transition-colors">
            {chapter.name}
          </h3>
          <p className="text-slate-500 text-xs">
            {toBengaliNumber(completedTopics)}/{toBengaliNumber(totalTopics)} টপিক সম্পন্ন
          </p>
        </div>
        <svg className="w-5 h-5 text-slate-400 group-hover:text-[#cf278d] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>

      {/* Progress Bar */}
      <div className="mt-3">
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              isCompleted ? "bg-gradient-to-r from-green-400 to-green-500" : "bg-gradient-to-r from-blue-400 to-blue-500"
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-right text-xs text-slate-400 mt-1">{toBengaliNumber(progress)}%</p>
      </div>
    </button>
  );
}
