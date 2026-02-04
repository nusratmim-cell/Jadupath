"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import {
  getCurrentUser,
  getProfileByUserId,
  type TeacherProfile,
} from "@/lib/auth";
import {
  CLASS_LABELS,
  SUBJECT_NAMES,
  toBengaliNumber,
  type Chapter,
  type Topic,
} from "@/lib/data";
import { getCachedChapters } from "@/lib/content";

// Step type
type Step = "subject" | "chapter" | "topic";

export default function TeachPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const classId = params.classId as string;

  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState<Step>("subject");
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [teacherSubjects, setTeacherSubjects] = useState<string[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [isLoadingChapters, setIsLoadingChapters] = useState(false);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.push("/");
      return;
    }

    const teacherProfile = getProfileByUserId(currentUser.id);
    if (!teacherProfile?.classes.includes(classId)) {
      router.push("/dashboard");
      return;
    }

    setProfile(teacherProfile);
    // Load teacher's subjects
    const subjects = teacherProfile.subjects || ["math"];
    setTeacherSubjects(subjects);
    
    // Restore state from URL params if coming back from content page
    const subjectParam = searchParams.get("subject");
    const chapterParam = searchParams.get("chapter");
    if (subjectParam && chapterParam) {
      setSelectedSubject(subjectParam);
      // Will fetch chapters in separate effect
    }

    setIsLoading(false);
  }, [router, classId, searchParams]);

  // Fetch chapters when subject is selected
  useEffect(() => {
    if (!selectedSubject) {
      setChapters([]);
      return;
    }

    const fetchChapters = async () => {
      setIsLoadingChapters(true);
      try {
        const data = await getCachedChapters(classId, selectedSubject);
        setChapters(data);

        // Restore chapter selection from URL if present
        const chapterParam = searchParams.get("chapter");
        if (chapterParam) {
          const chapter = data.find(ch => ch.id === chapterParam);
          if (chapter) {
            setSelectedChapter(chapter);
            setCurrentStep("topic");
          }
        }
      } catch (error) {
        console.error("Error fetching chapters:", error);
        setChapters([]);
      } finally {
        setIsLoadingChapters(false);
      }
    };

    fetchChapters();
  }, [classId, selectedSubject, searchParams]);

  // Scroll to top when chapter step is shown
  useEffect(() => {
    if (currentStep === "chapter") {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [currentStep]);

  const handleSubjectSelect = (subjectId: string) => {
    setSelectedSubject(subjectId);
    setCurrentStep("chapter");
  };

  const handleChapterSelect = (chapter: Chapter) => {
    setSelectedChapter(chapter);
    setCurrentStep("topic");
    // Scroll to top when chapter is selected
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const handleTopicSelect = (topic: Topic) => {
    // Navigate to content page with subject and chapter in URL for back navigation
    router.push(`/teach/${classId}/${selectedSubject}/${selectedChapter?.id}/${topic.id}?subject=${selectedSubject}&chapter=${selectedChapter?.id}`);
  };

  const handleBack = () => {
    if (currentStep === "topic") {
      setCurrentStep("chapter");
      setSelectedChapter(null);
    } else if (currentStep === "chapter") {
      setCurrentStep("subject");
      setSelectedSubject(null);
    } else {
      // Go back to classroom/attendance page
      router.push(`/classroom/${classId}`);
    }
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

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header - Matching Classroom Page */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center">
            <div className="flex items-center gap-3">
              <button
                onClick={handleBack}
                className="w-14 h-14 flex items-center justify-center bg-gray-100 rounded-2xl active:scale-95 transition-transform"
                aria-label="পিছনে যান"
              >
                <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="font-bold text-slate-800 text-lg">
                  {selectedSubject ? (
                    <>
                      {CLASS_LABELS[classId]} - {SUBJECT_NAMES[selectedSubject] || selectedSubject}
                    </>
                  ) : (
                    CLASS_LABELS[classId]
                  )}
                </h1>
                {currentStep === "topic" && selectedChapter && (
                  <p className="text-sm text-slate-500 mt-0.5">{selectedChapter.name}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Matching Classroom Page */}
      <main className="max-w-4xl mx-auto px-4 py-6 pb-24">
        
        {/* ==================== STEP 1: Subject Selection ==================== */}
        {currentStep === "subject" && (
          <>
            <div className="bg-white rounded-2xl p-4 shadow-md">
              <h2 className="font-bold text-slate-800 text-lg mb-1">বিষয় নির্বাচন করুন</h2>
              <p className="text-slate-500 text-sm">আজ কোন বিষয় পড়াবেন?</p>
            </div>
            
            <div className={teacherSubjects.length === 1 ? 'flex justify-center w-full' : 'grid grid-cols-2 gap-3'}>
              {teacherSubjects.map((subjectId, idx) => {
                const subjectColors = [
                  { bg: "from-[#cf278d] to-[#cf278d]", icon: "M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" }, // গণিত - Calculator
                  { bg: "from-[#E91E63] to-[#F06292]", icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" }, // বাংলা - Book
                  { bg: "from-[#4CAF50] to-[#81C784]", icon: "M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" }, // ইংরেজি - Globe
                  { bg: "from-[#FF9800] to-[#FFB74D]", icon: "M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" }, // বিজ্ঞান - Beaker
                  { bg: "from-[#9C27B0] to-[#BA68C8]", icon: "M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" }, // বাংলাদেশ ও বিশ্বপরিচয় - Fire/History
                  { bg: "from-[#795548] to-[#A1887F]", icon: "M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" }, // ইতিহাস/Geography
                ];
                const colorConfig = subjectColors[idx % subjectColors.length];
                
                return (
                  <button
                    key={subjectId}
                    onClick={() => handleSubjectSelect(subjectId)}
                    className={`bg-gradient-to-br ${colorConfig.bg} rounded-2xl p-5 text-white text-left active:scale-[0.98] transition-all shadow-md ${teacherSubjects.length === 1 ? 'w-full max-w-md mx-auto block' : ''}`}
                  >
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-3">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={colorConfig.icon} />
                      </svg>
                    </div>
                    <p className="text-xl font-bold">{SUBJECT_NAMES[subjectId] || subjectId}</p>
                    <p className="text-white/70 text-sm mt-1">
                      পড়ানো শুরু করুন
                    </p>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* ==================== STEP 2: Chapter Selection ==================== */}
        {currentStep === "chapter" && selectedSubject && (
          <>
            <div className="bg-white rounded-2xl p-4 shadow-md">
              <button
                onClick={() => {
                  setCurrentStep("subject");
                  setSelectedSubject(null);
                }}
                className="text-[#cf278d] text-sm font-medium mb-2 flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                {teacherSubjects.length > 1 ? "বিষয় পরিবর্তন" : "বিষয় তালিকা"}
              </button>
              <h2 className="font-bold text-slate-800 text-lg mb-1">
                {SUBJECT_NAMES[selectedSubject] || selectedSubject} - অধ্যায় নির্বাচন করুন
              </h2>
              <p className="text-slate-500 text-sm">আজ কোন অধ্যায় পড়াবেন?</p>
            </div>

            {isLoadingChapters ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 border-4 border-[#cf278d] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-slate-600">অধ্যায় লোড হচ্ছে...</p>
              </div>
            ) : chapters.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl">
                <p className="text-slate-500">এই বিষয়ের জন্য কোনো অধ্যায় পাওয়া যায়নি।</p>
              </div>
            ) : (
              <div className="space-y-3">
                {chapters.map((chapter, idx) => {
                const chapterColors = [
                  "from-[#cf278d] to-[#cf278d]",
                  "from-[#E91E63] to-[#F06292]",
                  "from-[#FF9800] to-[#FFB74D]",
                  "from-[#4CAF50] to-[#81C784]",
                  "from-[#9C27B0] to-[#BA68C8]",
                ];
                return (
                  <button
                    key={chapter.id}
                    onClick={() => handleChapterSelect(chapter)}
                    className={`w-full bg-gradient-to-r ${chapterColors[idx % chapterColors.length]} rounded-2xl p-5 text-white text-left active:scale-[0.98] transition-all`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white/70 text-sm">অধ্যায় {toBengaliNumber(idx + 1)}</p>
                        <p className="text-xl font-bold mt-1">{chapter.name}</p>
                        <p className="text-white/80 text-sm mt-1">{toBengaliNumber(chapter.topics.length)} টি টপিক</p>
                      </div>
                      <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </button>
                );
              })}
              </div>
            )}
          </>
        )}

        {/* ==================== STEP 3: Topic Selection ==================== */}
        {currentStep === "topic" && selectedChapter && selectedSubject && (
          <>
            <div className="bg-white rounded-2xl p-4 shadow-md">
              <button 
                onClick={() => setCurrentStep("chapter")}
                className="text-[#cf278d] text-sm font-medium mb-2 flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                {SUBJECT_NAMES[selectedSubject]} - অধ্যায় তালিকা
              </button>
              <h2 className="font-bold text-slate-800 text-lg">{selectedChapter.name}</h2>
              <p className="text-slate-500 text-sm">টপিক নির্বাচন করুন</p>
            </div>
            
            <div className="space-y-3">
              {selectedChapter.topics.map((topic, idx) => {
                const topicColors = [
                  "bg-[#FFF8E1] border-[#FFB74D]",
                  "bg-[#E8F5E9] border-[#81C784]",
                  "bg-[#E3F2FD] border-[#64B5F6]",
                  "bg-[#FCE4EC] border-[#F06292]",
                  "bg-[#F3E5F5] border-[#BA68C8]",
                ];
                return (
                  <button
                    key={topic.id}
                    onClick={() => handleTopicSelect(topic)}
                    className={`w-full ${topicColors[idx % topicColors.length]} border-2 rounded-2xl p-4 text-left active:scale-[0.98] transition-all`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-slate-500 text-sm">টপিক {toBengaliNumber(idx + 1)}</p>
                        <p className="text-lg font-bold text-slate-800 mt-1">{topic.name}</p>
                        {topic.description && (
                          <p className="text-slate-600 text-sm mt-1">{topic.description}</p>
                        )}
                      </div>
                      <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}

      </main>

    </div>
  );
}
