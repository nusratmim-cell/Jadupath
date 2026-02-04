"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  getCurrentUser,
  getProfileByUserId,
  getStudentsForClass,
  type Student,
} from "@/lib/auth";

// Class labels
const CLASS_LABELS: { [key: string]: string } = {
  "1": "ক্লাস ১",
  "2": "ক্লাস ২",
  "3": "ক্লাস ৩",
  "4": "ক্লাস ৪",
  "5": "ক্লাস ৫",
};

// Subject labels
const SUBJECT_LABELS: { [key: string]: string } = {
  math: "গণিত",
};

// Chapter data
const CHAPTERS: { [classId: string]: { [subjectId: string]: Array<{ id: string; name: string; lessons: Array<{ id: string; title: string; duration: string; type: string }> }> } } = {
  "1": {
    math: [
      { 
        id: "ch1", 
        name: "সংখ্যা চেনা (১-১০)", 
        lessons: [
          { id: "l1", title: "১ থেকে ৫ পর্যন্ত সংখ্যা", duration: "১০ মিনিট", type: "video" },
          { id: "l2", title: "৬ থেকে ১০ পর্যন্ত সংখ্যা", duration: "১০ মিনিট", type: "video" },
          { id: "l3", title: "সংখ্যা লেখার অভ্যাস", duration: "১৫ মিনিট", type: "activity" },
          { id: "l4", title: "সংখ্যা মেলাও", duration: "১০ মিনিট", type: "quiz" },
          { id: "l5", title: "মূল্যায়ন", duration: "১০ মিনিট", type: "assessment" },
        ]
      },
      { 
        id: "ch2", 
        name: "যোগ করি", 
        lessons: [
          { id: "l1", title: "যোগ কী?", duration: "১০ মিনিট", type: "video" },
          { id: "l2", title: "ছোট সংখ্যার যোগ", duration: "১৫ মিনিট", type: "video" },
          { id: "l3", title: "যোগ অভ্যাস", duration: "১৫ মিনিট", type: "activity" },
          { id: "l4", title: "মূল্যায়ন", duration: "১০ মিনিট", type: "assessment" },
        ]
      },
    ]
  },
  "2": {
    math: [
      { 
        id: "ch1", 
        name: "সংখ্যা (১-১০০)", 
        lessons: [
          { id: "l1", title: "১ থেকে ৫০ পর্যন্ত", duration: "১৫ মিনিট", type: "video" },
          { id: "l2", title: "৫১ থেকে ১০০ পর্যন্ত", duration: "১৫ মিনিট", type: "video" },
          { id: "l3", title: "দশক ও একক", duration: "২০ মিনিট", type: "video" },
          { id: "l4", title: "সংখ্যা লেখা", duration: "১৫ মিনিট", type: "activity" },
          { id: "l5", title: "অনুশীলন", duration: "১৫ মিনিট", type: "quiz" },
          { id: "l6", title: "মূল্যায়ন", duration: "১৫ মিনিট", type: "assessment" },
        ]
      },
      { 
        id: "ch2", 
        name: "যোগ ও বিয়োগ", 
        lessons: [
          { id: "l1", title: "হাতে করে যোগ", duration: "২০ মিনিট", type: "video" },
          { id: "l2", title: "হাতে করে বিয়োগ", duration: "২০ মিনিট", type: "video" },
          { id: "l3", title: "শব্দ সমস্যা", duration: "১৫ মিনিট", type: "activity" },
          { id: "l4", title: "অনুশীলন", duration: "১৫ মিনিট", type: "quiz" },
          { id: "l5", title: "মূল্যায়ন", duration: "১৫ মিনিট", type: "assessment" },
        ]
      },
    ]
  },
  // Add more classes as needed
};

// Default chapters for classes not defined above
const DEFAULT_LESSONS = [
  { id: "l1", title: "পরিচিতি", duration: "১৫ মিনিট", type: "video" },
  { id: "l2", title: "মূল ধারণা", duration: "২০ মিনিট", type: "video" },
  { id: "l3", title: "উদাহরণ", duration: "১৫ মিনিট", type: "activity" },
  { id: "l4", title: "অনুশীলন", duration: "১৫ মিনিট", type: "quiz" },
  { id: "l5", title: "মূল্যায়ন", duration: "১০ মিনিট", type: "assessment" },
];

type ViewMode = "lessons" | "teaching";

export default function ClassTeachingPage() {
  const router = useRouter();
  const params = useParams();
  const classId = params.classId as string;
  const subjectId = params.subjectId as string;
  const chapterId = params.chapterId as string;

  const [isLoading, setIsLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("lessons");
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [showAttendance, setShowAttendance] = useState(false);
  const [attendanceMarked, setAttendanceMarked] = useState<{ [studentId: string]: boolean }>({});

  // Get chapter data
  const chapterData = CHAPTERS[classId]?.[subjectId]?.find(ch => ch.id === chapterId);
  const lessons = chapterData?.lessons || DEFAULT_LESSONS;
  const chapterName = chapterData?.name || "অধ্যায়";

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

    // Get students for this class
    const classStudents = getStudentsForClass(currentUser.id, classId);
    setStudents(classStudents);

    setIsLoading(false);
  }, [router, classId]);

  const handleBack = () => {
    if (viewMode === "teaching") {
      setViewMode("lessons");
    } else {
      router.push(`/teach/${classId}`);
    }
  };

  const handleStartLesson = (lessonIndex: number) => {
    setCurrentLessonIndex(lessonIndex);
    setViewMode("teaching");
  };

  const handleNextLesson = () => {
    if (currentLessonIndex < lessons.length - 1) {
      setCurrentLessonIndex(currentLessonIndex + 1);
    }
  };

  const handlePrevLesson = () => {
    if (currentLessonIndex > 0) {
      setCurrentLessonIndex(currentLessonIndex - 1);
    }
  };

  const toggleAttendance = (studentId: string) => {
    setAttendanceMarked(prev => ({
      ...prev,
      [studentId]: !prev[studentId]
    }));
  };

  const markAllPresent = () => {
    const allPresent: { [studentId: string]: boolean } = {};
    students.forEach(s => {
      allPresent[s.id] = true;
    });
    setAttendanceMarked(allPresent);
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

  const currentLesson = lessons[currentLessonIndex];
  const presentCount = Object.values(attendanceMarked).filter(Boolean).length;

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-4">
          <button
            onClick={handleBack}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold text-slate-800 truncate">
              {CLASS_LABELS[classId]} - {SUBJECT_LABELS[subjectId] || subjectId}
            </h1>
            <p className="text-sm text-slate-500 truncate">{chapterName}</p>
          </div>
          
          {/* Attendance Button */}
          <button
            onClick={() => setShowAttendance(true)}
            className="relative p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {presentCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 text-white text-xs rounded-full flex items-center justify-center">
                {presentCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* ==================== LESSONS LIST VIEW ==================== */}
      {viewMode === "lessons" && (
        <main className="max-w-4xl mx-auto px-4 py-6">
          {/* Chapter Info Card */}
          <div className="bg-gradient-to-br from-[#cf278d] to-[#2d3a7c] rounded-2xl p-5 text-white shadow-xl mb-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold">{chapterName}</h2>
                <p className="text-white/80 mt-1">{lessons.length}টি পাঠ</p>
              </div>
            </div>
          </div>

          {/* Student Count */}
          {students.length > 0 && (
            <div className="bg-white rounded-xl p-4 shadow-md mb-6 flex items-center gap-3">
              <div className="w-10 h-10 bg-[#22c55e]/10 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-[#22c55e]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-800">{students.length} জন শিক্ষার্থী</p>
                <p className="text-sm text-slate-500">
                  {presentCount > 0 ? `${presentCount} জন উপস্থিত` : "হাজিরা নেওয়া হয়নি"}
                </p>
              </div>
              <button
                onClick={() => setShowAttendance(true)}
                className="text-[#cf278d] font-medium text-sm hover:underline"
              >
                হাজিরা নিন
              </button>
            </div>
          )}

          {/* Lessons List */}
          <h3 className="text-lg font-bold text-slate-800 mb-4">পাঠ সমূহ</h3>
          <div className="space-y-3">
            {lessons.map((lesson, index) => (
              <button
                key={lesson.id}
                onClick={() => handleStartLesson(index)}
                className="w-full bg-white rounded-2xl p-4 shadow-md hover:shadow-lg transition-all text-left hover:scale-[1.01] active:scale-[0.99] border-2 border-transparent hover:border-[#cf278d]/20"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${getLessonTypeStyle(lesson.type).bg}`}>
                    <LessonTypeIcon type={lesson.type} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-400">পাঠ {toBengaliNumber(index + 1)}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getLessonTypeStyle(lesson.type).badge}`}>
                        {getLessonTypeLabel(lesson.type)}
                      </span>
                    </div>
                    <p className="font-bold text-slate-800 mt-1">{lesson.title}</p>
                    <p className="text-sm text-slate-500">{lesson.duration}</p>
                  </div>
                  <svg className="w-6 h-6 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        </main>
      )}

      {/* ==================== TEACHING VIEW ==================== */}
      {viewMode === "teaching" && (
        <main className="max-w-4xl mx-auto px-4 py-6">
          {/* Current Lesson Header */}
          <div className="bg-white rounded-2xl shadow-md mb-6 overflow-hidden">
            <div className={`p-4 ${getLessonTypeStyle(currentLesson.type).headerBg}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <LessonTypeIcon type={currentLesson.type} className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-white/80 text-sm">পাঠ {toBengaliNumber(currentLessonIndex + 1)} / {toBengaliNumber(lessons.length)}</p>
                  <h2 className="text-xl font-bold text-white">{currentLesson.title}</h2>
                </div>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="px-4 py-2 bg-slate-50">
              <div className="flex items-center gap-2">
                {lessons.map((_, i) => (
                  <div
                    key={i}
                    className={`flex-1 h-2 rounded-full ${
                      i < currentLessonIndex
                        ? "bg-green-500"
                        : i === currentLessonIndex
                        ? "bg-[#cf278d]"
                        : "bg-slate-200"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Lesson Content Placeholder */}
          <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
            <div className="aspect-video bg-slate-900 rounded-xl flex items-center justify-center mb-4">
              <div className="text-center text-white">
                <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-lg font-medium">পাঠ শুরু করতে প্লে বাটনে ক্লিক করুন</p>
                <p className="text-white/60 mt-1">{currentLesson.duration}</p>
              </div>
            </div>

            {/* Lesson Description */}
            <div className="border-t border-slate-100 pt-4">
              <h3 className="font-bold text-slate-800 mb-2">পাঠের বিবরণ</h3>
              <p className="text-slate-600">
                {getLessonDescription(currentLesson.type)}
              </p>
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center gap-4">
            <button
              onClick={handlePrevLesson}
              disabled={currentLessonIndex === 0}
              className={`flex-1 py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${
                currentLessonIndex === 0
                  ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                  : "bg-white text-slate-700 shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
              }`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              আগের পাঠ
            </button>
            
            <button
              onClick={handleNextLesson}
              disabled={currentLessonIndex === lessons.length - 1}
              className={`flex-1 py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${
                currentLessonIndex === lessons.length - 1
                  ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                  : "gradient-blue-pink text-white shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
              }`}
            >
              পরের পাঠ
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* End Class Button */}
          {currentLessonIndex === lessons.length - 1 && (
            <button
              onClick={() => router.push("/dashboard")}
              className="w-full mt-4 py-4 rounded-2xl font-bold text-lg bg-gradient-to-r from-[#22c55e] to-[#16a34a] text-white shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              ক্লাস শেষ করুন
            </button>
          )}
        </main>
      )}

      {/* ==================== ATTENDANCE MODAL ==================== */}
      {showAttendance && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden animate-slideUp">
            {/* Modal Header */}
            <div className="gradient-blue-pink p-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold">হাজিরা</h3>
                  <p className="text-white/80 text-sm">
                    {presentCount} / {students.length} জন উপস্থিত
                  </p>
                </div>
                <button
                  onClick={() => setShowAttendance(false)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="p-3 border-b border-slate-100 flex gap-2">
              <button
                onClick={markAllPresent}
                className="flex-1 py-2 px-3 bg-green-100 text-green-700 rounded-lg font-medium text-sm hover:bg-green-200 transition-colors"
              >
                সবাই উপস্থিত
              </button>
              <button
                onClick={() => setAttendanceMarked({})}
                className="flex-1 py-2 px-3 bg-slate-100 text-slate-600 rounded-lg font-medium text-sm hover:bg-slate-200 transition-colors"
              >
                রিসেট করুন
              </button>
            </div>

            {/* Student List */}
            <div className="overflow-y-auto max-h-[50vh]">
              {students.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-slate-500">কোনো শিক্ষার্থী নেই</p>
                  <button
                    onClick={() => {
                      setShowAttendance(false);
                      router.push("/students");
                    }}
                    className="mt-3 text-[#cf278d] font-medium hover:underline"
                  >
                    শিক্ষার্থী যোগ করুন
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {students.map((student) => (
                    <button
                      key={student.id}
                      onClick={() => toggleAttendance(student.id)}
                      className="w-full p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors text-left"
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                        attendanceMarked[student.id]
                          ? "bg-green-500 text-white"
                          : "bg-slate-200 text-slate-600"
                      }`}>
                        {attendanceMarked[student.id] ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          student.name.charAt(0)
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-slate-800">{student.name}</p>
                        <p className="text-sm text-slate-500">রোল: {student.rollNumber}</p>
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        attendanceMarked[student.id]
                          ? "border-green-500 bg-green-500"
                          : "border-slate-300"
                      }`}>
                        {attendanceMarked[student.id] && (
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Save Button */}
            <div className="p-4 border-t border-slate-200">
              <button
                onClick={() => setShowAttendance(false)}
                className="w-full py-3 bg-[#cf278d] text-white rounded-xl font-bold hover:bg-[#2d3a7c] transition-colors"
              >
                সংরক্ষণ করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper functions
function toBengaliNumber(num: number): string {
  const bengaliDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
  return num.toString().split("").map((d) => bengaliDigits[parseInt(d)]).join("");
}

function getLessonTypeStyle(type: string) {
  switch (type) {
    case "video":
      return {
        bg: "bg-[#cf278d]/10",
        badge: "bg-[#cf278d]/10 text-[#cf278d]",
        headerBg: "gradient-blue-pink",
      };
    case "activity":
      return {
        bg: "bg-[#efad1e]/10",
        badge: "bg-[#efad1e]/10 text-[#c99317]",
        headerBg: "bg-gradient-to-r from-[#efad1e] to-[#f5c95c]",
      };
    case "quiz":
      return {
        bg: "bg-[#cf278d]/10",
        badge: "bg-[#cf278d]/10 text-[#cf278d]",
        headerBg: "bg-gradient-to-r from-[#cf278d] to-[#e85aac]",
      };
    case "assessment":
      return {
        bg: "bg-[#22c55e]/10",
        badge: "bg-[#22c55e]/10 text-[#16a34a]",
        headerBg: "bg-gradient-to-r from-[#22c55e] to-[#4ade80]",
      };
    default:
      return {
        bg: "bg-slate-100",
        badge: "bg-slate-100 text-slate-600",
        headerBg: "bg-gradient-to-r from-slate-600 to-slate-500",
      };
  }
}

function getLessonTypeLabel(type: string): string {
  switch (type) {
    case "video":
      return "ভিডিও";
    case "activity":
      return "কার্যক্রম";
    case "quiz":
      return "কুইজ";
    case "assessment":
      return "মূল্যায়ন";
    default:
      return "পাঠ";
  }
}

function getLessonDescription(type: string): string {
  switch (type) {
    case "video":
      return "এই ভিডিও পাঠে শিক্ষার্থীদের মূল ধারণাগুলো ব্যাখ্যা করা হয়েছে। ভিডিও চালানোর পর শিক্ষার্থীদের সাথে আলোচনা করুন।";
    case "activity":
      return "এই কার্যক্রমে শিক্ষার্থীরা হাতে-কলমে শিখবে। তাদের সাথে মিলে কাজ করুন এবং সহায়তা করুন।";
    case "quiz":
      return "এই কুইজে শিক্ষার্থীদের জ্ঞান যাচাই করা হবে। প্রশ্নগুলো একসাথে সমাধান করুন।";
    case "assessment":
      return "এই মূল্যায়নে শিক্ষার্থীদের সামগ্রিক অগ্রগতি পরিমাপ করা হবে। প্রয়োজনে অতিরিক্ত সহায়তা দিন।";
    default:
      return "এই পাঠের বিষয়বস্তু শিক্ষার্থীদের সাথে শেয়ার করুন।";
  }
}

function LessonTypeIcon({ type, className = "w-6 h-6 text-[#cf278d]" }: { type: string; className?: string }) {
  switch (type) {
    case "video":
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      );
    case "activity":
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
        </svg>
      );
    case "quiz":
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case "assessment":
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      );
    default:
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      );
  }
}
