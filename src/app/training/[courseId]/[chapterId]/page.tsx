"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { getCurrentUser, type SessionUser } from "@/lib/auth";
import {
  TRAINING_COURSES,
  isTopicUnlocked,
  isTopicCompleted,
  toBengaliNumber,
  type TrainingCourse,
  type TrainingChapter,
  type TrainingTopic,
} from "@/lib/data";

export default function ChapterDetailPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.courseId as string;
  const chapterId = params.chapterId as string;

  const [user, setUser] = useState<SessionUser | null>(null);
  const [course, setCourse] = useState<TrainingCourse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [chapter, setChapter] = useState<TrainingChapter | null>(null);

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

    // Find chapter
    const foundChapter = foundCourse.chapters.find(ch => ch.id === chapterId);
    if (!foundChapter) {
      router.push(`/training/${courseId}`);
      return;
    }
    setChapter(foundChapter);

    setIsLoading(false);
  }, [router, courseId, chapterId]);

  if (isLoading || !course || !chapter || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#cf278d] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg text-slate-600">লোড হচ্ছে...</p>
        </div>
      </div>
    );
  }

  // Count completed topics
  const completedTopicsCount = chapter.topics.filter(topic =>
    isTopicCompleted(user.id, courseId, chapterId, topic.id)
  ).length;
  const totalTopics = chapter.topics.length;
  const percentage = totalTopics > 0 ? Math.round((completedTopicsCount / totalTopics) * 100) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 pb-20">
      {/* Header */}
      <header className="bg-white shadow-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push(`/training/${courseId}`)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="পিছনে যান"
            >
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex-1">
              {/* Breadcrumb */}
              <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                <button onClick={() => router.push("/training")} className="hover:text-purple-600 transition-colors">
                  প্রশিক্ষণ
                </button>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <button onClick={() => router.push(`/training/${courseId}`)} className="hover:text-purple-600 transition-colors">
                  {course.name}
                </button>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span className="text-gray-700 font-semibold">অধ্যায়</span>
              </div>
              <h1 className="text-lg font-bold text-gray-900">{chapter.name}</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-4">
        {/* Chapter Progress Card */}
        <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl p-4 text-white shadow-lg mb-4">
          <div className="mb-3">
            <p className="text-white/90 text-sm mb-1">অধ্যায়ের অগ্রগতি</p>
            <h2 className="text-2xl font-bold">{toBengaliNumber(percentage)}%</h2>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="bg-white/15 backdrop-blur-sm rounded-lg p-3 text-center border border-white/20">
              <p className="text-xl font-bold mb-0.5">{toBengaliNumber(completedTopicsCount)}</p>
              <p className="text-xs text-white/90">সম্পন্ন টপিক</p>
            </div>
            <div className="bg-white/15 backdrop-blur-sm rounded-lg p-3 text-center border border-white/20">
              <p className="text-xl font-bold mb-0.5">{toBengaliNumber(totalTopics)}</p>
              <p className="text-xs text-white/90">মোট টপিক</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        {/* Topic List */}
        <div>
          <h2 className="text-base font-bold text-gray-900 mb-3">টপিকসমূহ</h2>
          <div className="space-y-3">
            {chapter.topics.map((topic, index) => (
              <TopicCard
                key={topic.id}
                topic={topic}
                courseId={courseId}
                chapterId={chapterId}
                userId={user.id}
                index={index}
                router={router}
              />
            ))}
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-blue-900 mb-1">গুরুত্বপূর্ণ তথ্য</h3>
              <p className="text-xs text-blue-800">
                প্রতিটি টপিক সম্পন্ন করতে হবে ধারাবাহিকভাবে। একটি টপিক শেষ না করে পরেরটি আনলক হবে না। প্রতিটি টপিকে কুইজ পাস করতে হবে।
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function TopicCard({
  topic,
  courseId,
  chapterId,
  userId,
  index,
  router,
}: {
  topic: TrainingTopic;
  courseId: string;
  chapterId: string;
  userId: string;
  index: number;
  router: ReturnType<typeof useRouter>;
}) {
  const isUnlocked = isTopicUnlocked(userId, courseId, chapterId, topic.id);
  const isCompleted = isTopicCompleted(userId, courseId, chapterId, topic.id);

  const handleClick = () => {
    if (isUnlocked) {
      router.push(`/training/${courseId}/${chapterId}/${topic.id}`);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={!isUnlocked}
      className={`w-full bg-white rounded-xl p-4 shadow-lg text-left transition-all ${
        isUnlocked
          ? "hover:shadow-xl cursor-pointer"
          : "opacity-50 cursor-not-allowed"
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Topic Number/Status */}
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold shadow-md ${
          isCompleted
            ? "bg-gradient-to-br from-green-500 to-green-600 text-white"
            : isUnlocked
            ? "bg-gradient-to-br from-purple-500 to-indigo-600 text-white"
            : "bg-gray-300 text-gray-600"
        }`}>
          {isCompleted ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          ) : isUnlocked ? (
            <span className="text-base">{toBengaliNumber(index + 1)}</span>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          )}
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <h3 className="text-sm font-bold text-gray-900">{topic.name}</h3>
            {isCompleted && (
              <span className="px-2 py-0.5 bg-green-100 text-green-700 border border-green-300 rounded-lg text-xs font-semibold">
                সম্পন্ন
              </span>
            )}
            {!isUnlocked && (
              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 border border-gray-300 rounded-lg text-xs font-semibold flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                লক করা
              </span>
            )}
          </div>

          {/* Duration */}
          <div className="flex items-center gap-2 text-gray-700 mb-2">
            <div className="w-6 h-6 bg-blue-50 rounded-lg flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-xs font-semibold">{topic.duration}</span>
          </div>

          {/* Materials Info */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1 text-gray-600">
              <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-xs font-medium">৫টি প্রশ্ন</span>
            </div>
            <div className="flex items-center gap-1 text-gray-600">
              <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span className="text-xs font-medium">ভিডিও</span>
            </div>
            <div className="flex items-center gap-1 text-gray-600">
              <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              <span className="text-xs font-medium">সহায়ক</span>
            </div>
          </div>

          {!isUnlocked && index > 0 && (
            <p className="text-gray-500 mt-2 text-xs">
              আগের টপিক সম্পন্ন করুন এই টপিক আনলক করতে
            </p>
          )}
        </div>

        {/* Arrow */}
        {isUnlocked && (
          <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        )}
      </div>
    </button>
  );
}
