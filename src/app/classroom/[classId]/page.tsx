"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  getCurrentUser,
  getProfileByUserId,
  getStudentsForClass,
  addMultipleStudents,
  type SessionUser,
  type Student,
} from "@/lib/auth";
import {
  CLASS_LABELS,
  CHAPTERS_DATA,
  SUBJECT_NAMES,
  toBengaliNumber,
  getClassProgress,
  advanceToNextTopic,
  saveTodayAttendance,
  getTodayAttendance,
  updateTodayClassStats,
  addQuizMarkToStudent,
  type Topic,
  type Chapter,
  type QuizQuestion,
} from "@/lib/data";
import { getCachedChapters } from "@/lib/content";
import { useChromecast } from "@/hooks/useChromecast";
import { CastButton } from "@/components";
import { generateQuizHTML } from "@/lib/castHelpers";

// Classroom phases - Linear flow
type Phase = "attendance" | "teaching" | "quiz" | "summary";

export default function ClassroomPage() {
  const router = useRouter();
  const params = useParams();
  const classId = params.classId as string;

  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);

  // Current phase
  const [phase, setPhase] = useState<Phase>("attendance");

  // Chapters fetched from Supabase
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [isLoadingChapters, setIsLoadingChapters] = useState(false);
  
  // Current content
  const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null);
  const [currentTopic, setCurrentTopic] = useState<Topic | null>(null);
  const [, setChapterIndex] = useState(0);
  const [, setTopicIndex] = useState(0);

  // Attendance state
  const [presentStudents, setPresentStudents] = useState<Set<string>>(new Set());
  const [, setAttendanceSaved] = useState(false);
  
  // Student add state (when no students)
  const [addStudentMode, setAddStudentMode] = useState<"single" | "photo" | null>(null);
  const [singleName, setSingleName] = useState("");
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [successMessage, setSuccessMessage] = useState("");
  
  // Teaching flow state - now includes subject selection
  const [teachingStep, setTeachingStep] = useState<"subjects" | "chapters" | "topics">("subjects");
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [, setSelectedChapterIndex] = useState<number | null>(null);
  const [teacherSubjects, setTeacherSubjects] = useState<string[]>([]);

  // Chromecast integration
  const { castHTML, isConnected: isCasting } = useChromecast();

  // Quiz state
  const [quizQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<Map<string, { studentId: string; correct: boolean }[]>>(new Map());
  
  // Summary state
  const [sessionSummary, setSessionSummary] = useState<{
    attendance: number;
    totalStudents: number;
    quizParticipants: number;
    correctAnswers: number;
    totalQuestions: number;
  } | null>(null);

  // Initialize classroom
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
    
    // Load teacher's subjects
    const subjects = teacherProfile.subjects || ["math"];
    setTeacherSubjects(subjects);
    
    // Always start with subject selection after attendance
    // Don't auto-select, let user choose
    
    // Load students
    const classStudents = getStudentsForClass(currentUser.id, classId);
    setStudents(classStudents);
    
    // Load today's attendance if already taken
    const todayAttendance = getTodayAttendance(currentUser.id, classId);
    if (todayAttendance.length > 0) {
      setPresentStudents(new Set(todayAttendance));
      setAttendanceSaved(true);
    }
    
    // Load current progress for first subject (will update when subject is selected)
    const firstSubject = subjects[0];
    const progress = getClassProgress(currentUser.id, classId, firstSubject);
    if (progress) {
      setChapterIndex(progress.chapterIndex);
      setTopicIndex(progress.topicIndex);
      
      const chapters = CHAPTERS_DATA[classId]?.[firstSubject] || [];
      if (chapters[progress.chapterIndex]) {
        setCurrentChapter(chapters[progress.chapterIndex]);
        setCurrentTopic(chapters[progress.chapterIndex].topics[progress.topicIndex] || null);
      }
    }

    setIsLoading(false);
  }, [router, classId]);

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
      } catch (error) {
        console.error("Error fetching chapters:", error);
        setChapters([]);
      } finally {
        setIsLoadingChapters(false);
      }
    };

    fetchChapters();
  }, [classId, selectedSubject]);

  // Toggle student attendance
  const toggleAttendance = (studentId: string) => {
    setPresentStudents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(studentId)) {
        newSet.delete(studentId);
      } else {
        newSet.add(studentId);
      }
      return newSet;
    });
  };

  // Mark all present
  const markAllPresent = () => {
    setPresentStudents(new Set(students.map(s => s.id)));
  };

  // Save attendance and continue
  const saveAttendanceAndContinue = () => {
    if (!user) return;
    
    const presentIds = Array.from(presentStudents);
    const allIds = students.map(s => s.id);
    saveTodayAttendance(user.id, classId, presentIds, allIds);
    setAttendanceSaved(true);
    setPhase("teaching");
  };

  // Handle quiz casting to TV
  const handleCastQuiz = async () => {
    try {
      const question = quizQuestions[currentQuestionIndex];
      const html = generateQuizHTML(question, currentQuestionIndex + 1);
      await castHTML(html, `প্রশ্ন ${toBengaliNumber(currentQuestionIndex + 1)}`);
    } catch (err: any) {
      // Only log actual errors, not cancellations
      if (err?.message !== "কাস্ট সেশন তৈরি করতে ব্যর্থ হয়েছে") {
        console.log("Quiz cast error:", err?.message || "Unknown error");
      }
    }
  };

  // Record student quiz answer
  const recordAnswer = (studentId: string, answerIndex: number) => {
    if (!user) return;
    
    const question = quizQuestions[currentQuestionIndex];
    const isCorrect = answerIndex === question.correctAnswer;
    
    // Update quiz answers
    setQuizAnswers(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(question.id) || [];
      existing.push({ studentId, correct: isCorrect });
      newMap.set(question.id, existing);
      return newMap;
    });
    
    // Add mark to student
    addQuizMarkToStudent(studentId, classId, selectedSubject || "math", user.id, isCorrect ? 1 : 0);
  };

  // Move to next question
  const nextQuestion = () => {
    if (currentQuestionIndex < quizQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  // End quiz and show summary
  const endQuiz = () => {
    // Calculate summary
    let totalCorrect = 0;
    const totalParticipants = new Set<string>();
    
    quizAnswers.forEach((answers) => {
      answers.forEach(ans => {
        totalParticipants.add(ans.studentId);
        if (ans.correct) totalCorrect++;
      });
    });
    
    setSessionSummary({
      attendance: presentStudents.size,
      totalStudents: students.length,
      quizParticipants: totalParticipants.size,
      correctAnswers: totalCorrect,
      totalQuestions: quizQuestions.length * totalParticipants.size,
    });
    
    // Update today's stats
    if (user) {
      const avgScore = totalParticipants.size > 0 
        ? Math.round((totalCorrect / (quizQuestions.length * totalParticipants.size)) * 100)
        : 0;
      updateTodayClassStats(user.id, classId, {
        quizParticipation: totalParticipants.size,
        avgScore,
      });
    }
    
    setPhase("summary");
  };

  // Complete topic and advance
  const completeTopic = () => {
    if (!user) return;
    
    advanceToNextTopic(user.id, classId, selectedSubject || "math");
    router.push("/dashboard");
  };

  // Get next roll number
  const getNextRoll = () => {
    const rolls = students
      .map(s => parseInt(s.rollNumber || '0', 10))
      .filter(n => !isNaN(n));
    const maxRoll = rolls.length > 0 ? Math.max(...rolls) : 0;
    return String(maxRoll + 1).padStart(2, "0");
  };

  // Add single student (quick add)
  const handleQuickAdd = () => {
    if (!singleName.trim() || !user) return;

    const nextRoll = getNextRoll();
    addMultipleStudents(user.id, classId, [{
      name: singleName.trim(),
      rollNumber: nextRoll,
    }]);

    // Refresh students list
    const updatedStudents = getStudentsForClass(user.id, classId);
    setStudents(updatedStudents);

    setSingleName("");
    setSuccessMessage(`${singleName.trim()} যোগ হয়েছে`);
    setTimeout(() => setSuccessMessage(""), 2000);
    
    // Keep focus for continuous adding
    nameInputRef.current?.focus();
  };

  // Simulate photo upload (OCR) - directly adds students
  const handlePhotoUpload = () => {
    if (!user) return;
    
    // Simulated OCR result
    const simulatedNames = [
      "রাকিব হাসান",
      "ফাতেমা আক্তার",
      "সাকিব আহমেদ",
      "নুসরাত জাহান",
      "তানভীর রহমান",
    ];
    
    const startRoll = parseInt(getNextRoll());
    const studentsToAdd = simulatedNames.map((name, i) => ({
      name,
      rollNumber: String(startRoll + i).padStart(2, "0"),
    }));

    addMultipleStudents(user.id, classId, studentsToAdd);

    // Refresh students list
    const updatedStudents = getStudentsForClass(user.id, classId);
    setStudents(updatedStudents);

    setAddStudentMode(null);
    setSuccessMessage(`${simulatedNames.length} জন শিক্ষার্থী যোগ হয়েছে!`);
    setTimeout(() => setSuccessMessage(""), 3000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#cf278d] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg text-slate-600">ক্লাসরুম তৈরি হচ্ছে...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* ==================== HEADER ==================== */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push("/dashboard")}
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
                {currentTopic && (
                  <p className="text-sm text-slate-500 mt-0.5">{currentTopic.name}</p>
                )}
              </div>
            </div>
          </div>
          
          {/* Phase Indicator - 4 Steps */}
          <div className="flex items-center gap-2 mt-3">
            {(() => {
              // Calculate current step (1-4)
              let currentStep = 1; // Default: attendance
              if (phase === "attendance") currentStep = 1;
              else if (phase === "teaching") {
                if (teachingStep === "subjects") currentStep = 2;
                else if (teachingStep === "chapters") currentStep = 3;
                else if (teachingStep === "topics") currentStep = 4;
              } else if (phase === "quiz" || phase === "summary") currentStep = 5; // Beyond step 4

              return [1, 2, 3, 4].map((step) => (
                <div key={step} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    currentStep === step
                      ? "bg-[#cf278d] text-white"
                      : currentStep > step
                        ? "bg-green-500 text-white"
                        : "bg-slate-200 text-slate-500"
                  }`}>
                    {currentStep > step ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : toBengaliNumber(step)}
                  </div>
                  {step < 4 && (
                    <div className={`w-8 h-1 ${
                      currentStep > step ? "bg-green-500" : "bg-slate-200"
                    }`}></div>
                  )}
                </div>
              ));
            })()}
          </div>
        </div>
      </header>

      {/* ==================== MAIN CONTENT ==================== */}
      <main className="max-w-4xl mx-auto px-4 py-6 pb-24">
        
        {/* ==================== PHASE 1: ATTENDANCE ==================== */}
        {phase === "attendance" && (
          <div className="space-y-4 animate-fadeIn">
            <div className="bg-white rounded-2xl p-4 shadow-md">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-bold text-slate-800 text-lg">হাজিরা নিন</h2>
                  <p className="text-slate-500 text-sm">
                    উপস্থিত শিক্ষার্থীদের নামে ট্যাপ করুন
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-[#cf278d]">{toBengaliNumber(presentStudents.size)}</p>
                  <p className="text-xs text-slate-500">/ {toBengaliNumber(students.length)} জন</p>
                </div>
              </div>
              
              {/* Quick Actions */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={markAllPresent}
                  className="flex-1 py-2 px-3 bg-green-100 text-green-700 rounded-lg font-medium text-sm hover:bg-green-200 transition-colors"
                >
                  সবাই উপস্থিত
                </button>
                <button
                  onClick={() => setPresentStudents(new Set())}
                  className="flex-1 py-2 px-3 bg-slate-100 text-slate-600 rounded-lg font-medium text-sm hover:bg-slate-200 transition-colors"
                >
                  রিসেট
                </button>
              </div>
              
              {/* Student Grid - Tap to toggle */}
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {students.map((student) => {
                  const isPresent = presentStudents.has(student.id);
                  return (
                    <button
                      key={student.id}
                      onClick={() => toggleAttendance(student.id)}
                      className={`p-3 rounded-xl text-center transition-all ${
                        isPresent
                          ? "bg-green-500 text-white shadow-md scale-[1.02]"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-1 font-bold ${
                        isPresent ? "bg-white/20" : "bg-white"
                      }`}>
                        {isPresent ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : student.name.charAt(0)}
                      </div>
                      <p className="text-xs font-medium truncate">{student.name.split(" ")[0]}</p>
                      <p className="text-[10px] opacity-70">রোল {student.rollNumber}</p>
                    </button>
                  );
                })}
              </div>
              
              {/* Empty State - Add Students */}
              {students.length === 0 && !addStudentMode && (
                <div className="space-y-6">
                  {/* Info Banner */}
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-5">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-slate-800 text-lg mb-1">{CLASS_LABELS[classId]} এ শিক্ষার্থী নেই</h3>
                        <p className="text-slate-600 text-sm">হাজিরা নিতে প্রথমে শিক্ষার্থী যোগ করুন</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Add Student Options */}
                  <div className="space-y-4">
                    <h4 className="text-slate-700 font-semibold text-center">শিক্ষার্থী যোগ করার পদ্ধতি</h4>
                    
                    <div className="grid grid-cols-1 gap-4">
                      {/* Option 1: Type Name */}
                      <button
                        onClick={() => setAddStudentMode("single")}
                        className="group relative bg-white border-2 border-slate-200 hover:border-green-400 rounded-2xl p-5 text-left transition-all hover:shadow-lg active:scale-[0.98]"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <p className="font-bold text-slate-800 text-lg mb-1">নাম টাইপ করুন</p>
                            <p className="text-slate-500 text-sm">একজন করে শিক্ষার্থী যোগ করুন</p>
                          </div>
                          <svg className="w-5 h-5 text-slate-400 group-hover:text-green-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </button>
                      
                      {/* Option 2: Photo Upload */}
                      <button
                        onClick={handlePhotoUpload}
                        className="group relative bg-white border-2 border-slate-200 hover:border-purple-400 rounded-2xl p-5 text-left transition-all hover:shadow-lg active:scale-[0.98]"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <p className="font-bold text-slate-800 text-lg mb-1">ছবি থেকে নাম</p>
                            <p className="text-slate-500 text-sm">হাজিরা খাতার ছবি থেকে স্বয়ংক্রিয়ভাবে নাম নিন</p>
                          </div>
                          <svg className="w-5 h-5 text-slate-400 group-hover:text-purple-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </button>
                      
                      {/* Option 3: Excel Upload */}
                      <button
                        onClick={() => {
                          if (!user) return;
                          // Simulate Excel upload - directly adds students
                          const simulatedNames = [
                            "আব্দুল করিম",
                            "সালমা বেগম",
                            "মোহাম্মদ আলী",
                            "আয়েশা খাতুন",
                            "রফিকুল ইসলাম",
                          ];
                          
                          const startRoll = parseInt(getNextRoll());
                          const studentsToAdd = simulatedNames.map((name, i) => ({
                            name,
                            rollNumber: String(startRoll + i).padStart(2, "0"),
                          }));

                          addMultipleStudents(user.id, classId, studentsToAdd);

                          // Refresh students list
                          const updatedStudents = getStudentsForClass(user.id, classId);
                          setStudents(updatedStudents);

                          setSuccessMessage(`${simulatedNames.length} জন শিক্ষার্থী যোগ হয়েছে!`);
                          setTimeout(() => setSuccessMessage(""), 3000);
                        }}
                        className="group relative bg-white border-2 border-slate-200 hover:border-blue-400 rounded-2xl p-5 text-left transition-all hover:shadow-lg active:scale-[0.98]"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <p className="font-bold text-slate-800 text-lg mb-1">Excel আপলোড</p>
                            <p className="text-slate-500 text-sm">Excel বা CSV ফাইল থেকে শিক্ষার্থী যোগ করুন</p>
                          </div>
                          <svg className="w-5 h-5 text-slate-400 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Single Add Mode */}
              {students.length === 0 && addStudentMode === "single" && (
                <div className="py-4">
                  <p className="text-slate-600 font-medium mb-3 text-center">শিক্ষার্থীর নাম লিখুন</p>
                  <div className="flex gap-2">
                    <input
                      ref={nameInputRef}
                      type="text"
                      value={singleName}
                      onChange={(e) => setSingleName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleQuickAdd()}
                      placeholder="নাম..."
                      autoFocus
                      className="flex-1 p-4 border-2 border-slate-200 rounded-xl focus:border-[#cf278d] outline-none text-lg"
                    />
                    <button
                      onClick={handleQuickAdd}
                      disabled={!singleName.trim()}
                      className="px-5 bg-green-500 text-white rounded-xl font-bold text-xl hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      +
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mt-2 text-center">
                    রোল স্বয়ংক্রিয়ভাবে যোগ হবে • Enter চাপুন
                  </p>
                  <button
                    onClick={() => setAddStudentMode(null)}
                    className="w-full mt-3 py-2 text-slate-500 hover:text-slate-700 text-sm"
                  >
                    বাতিল
                  </button>
                </div>
              )}

              {/* Success Message */}
              {successMessage && (
                <div className="bg-green-100 border border-green-300 text-green-700 px-4 py-3 rounded-xl text-center font-medium mt-4">
                  {successMessage}
                </div>
              )}
            </div>
            
            {/* Continue Button */}
            {students.length > 0 && (
              <button
                onClick={saveAttendanceAndContinue}
                className="w-full gradient-blue-pink text-white py-4 rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
              >
                হাজিরা সংরক্ষণ করুন ও পড়ানো শুরু করুন
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            )}
            
            {/* Info when no students */}
            {students.length === 0 && !addStudentMode && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                <p className="text-amber-700 text-sm">
                  প্রথমে {CLASS_LABELS[classId]} এ শিক্ষার্থী যোগ করুন
                </p>
              </div>
            )}
          </div>
        )}

        {/* ==================== PHASE 2: TEACHING ==================== */}
        {phase === "teaching" && (
          <div className="space-y-4 animate-fadeIn">
            
            {/* STEP 0: Subject Selection - Always show after attendance */}
            {teachingStep === "subjects" && (
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
                        onClick={() => {
                          setSelectedSubject(subjectId);
                          setTeachingStep("chapters");
                          // Load progress for selected subject
                          if (user) {
                            const progress = getClassProgress(user.id, classId, subjectId);
                            if (progress) {
                              setChapterIndex(progress.chapterIndex);
                              setTopicIndex(progress.topicIndex);
                            }
                          }
                        }}
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
                
                <button
                  onClick={() => setPhase("attendance")}
                  className="w-full py-3 bg-slate-100 rounded-xl font-medium text-slate-600"
                >
                  ← হাজিরায় ফিরুন
                </button>
              </>
            )}

            {/* STEP 1: Chapter Selection */}
            {teachingStep === "chapters" && selectedSubject && (
              <>
                <div className="bg-white rounded-2xl p-4 shadow-md">
                  <button 
                    onClick={() => {
                      setTeachingStep("subjects");
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
                        onClick={() => {
                          setSelectedChapterIndex(idx);
                          setCurrentChapter(chapter);
                          setTeachingStep("topics");
                        }}
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

                <button
                  onClick={() => {
                    setTeachingStep("subjects");
                    setSelectedSubject(null);
                  }}
                  className="w-full py-3 bg-slate-100 rounded-xl font-medium text-slate-600"
                >
                  ← বিষয় তালিকায় ফিরুন
                </button>
              </>
            )}

            {/* STEP 2: Topic Selection */}
            {teachingStep === "topics" && currentChapter && selectedSubject && (
              <>
                <div className="bg-white rounded-2xl p-4 shadow-md">
                  <button 
                    onClick={() => setTeachingStep("chapters")}
                    className="text-[#cf278d] text-sm font-medium mb-2 flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    {SUBJECT_NAMES[selectedSubject]} - অধ্যায় তালিকা
                  </button>
                  <h2 className="font-bold text-slate-800 text-lg">{currentChapter.name}</h2>
                  <p className="text-slate-500 text-sm">টপিক নির্বাচন করুন</p>
                </div>
                
                <div className="space-y-3">
                  {currentChapter.topics.map((topic, idx) => {
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
                        onClick={() => {
                          // Navigate directly to content page
                          router.push(`/teach/${classId}/${selectedSubject}/${currentChapter?.id}/${topic.id}`);
                        }}
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

          </div>
        )}

        {/* ==================== PHASE 3: QUIZ ==================== */}
        {phase === "quiz" && quizQuestions.length > 0 && (
          <div className="space-y-4 animate-fadeIn">
            {/* Question Card */}
            <div className="bg-white rounded-2xl shadow-md overflow-hidden">
              <div className="bg-gradient-to-r from-purple-500 to-purple-700 p-4 text-white">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-white/80">প্রশ্ন {toBengaliNumber(currentQuestionIndex + 1)} / {toBengaliNumber(quizQuestions.length)}</span>
                  {isCasting && (
                    <span className="flex items-center gap-1 text-sm bg-white/20 px-2 py-1 rounded-full">
                      <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                      TV তে দেখাচ্ছে
                    </span>
                  )}
                </div>
                <div className="flex justify-center">
                  <CastButton onCastStart={handleCastQuiz} />
                </div>
              </div>
              
              <div className="p-5">
                <h3 className="text-lg font-bold text-slate-800 mb-4">
                  {quizQuestions[currentQuestionIndex].question}
                </h3>
                
                <div className="grid grid-cols-2 gap-2 mb-6">
                  {quizQuestions[currentQuestionIndex].options.map((option, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50 rounded-xl text-center font-medium text-slate-700"
                    >
                      {String.fromCharCode(2453 + idx)}। {option}
                    </div>
                  ))}
                </div>
                
                {/* Student Answer Recording */}
                <div className="border-t border-slate-100 pt-4">
                  <p className="text-sm text-slate-500 mb-3">কে উত্তর দিচ্ছে? (ট্যাপ করুন)</p>
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mb-4">
                    {students.filter(s => presentStudents.has(s.id)).map((student) => {
                      const hasAnswered = quizAnswers.get(quizQuestions[currentQuestionIndex].id)?.some(a => a.studentId === student.id);
                      return (
                        <button
                          key={student.id}
                          disabled={hasAnswered}
                          onClick={() => {/* Show answer selection */}}
                          className={`p-2 rounded-lg text-xs font-medium transition-all ${
                            hasAnswered
                              ? "bg-green-100 text-green-700"
                              : "bg-slate-100 text-slate-600 hover:bg-[#cf278d]/10 hover:text-[#cf278d]"
                          }`}
                        >
                          <span className="flex items-center gap-1">
                            {hasAnswered && (
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                            {student.name.split(" ")[0]}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  
                  {/* Answer Buttons */}
                  <p className="text-sm text-slate-500 mb-2">উত্তর নির্বাচন করুন:</p>
                  <div className="flex gap-2">
                    {quizQuestions[currentQuestionIndex].options.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          const firstUnanswered = students.filter(s => presentStudents.has(s.id))
                            .find(s => !quizAnswers.get(quizQuestions[currentQuestionIndex].id)?.some(a => a.studentId === s.id));
                          if (firstUnanswered) {
                            recordAnswer(firstUnanswered.id, idx);
                          }
                        }}
                        className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                          idx === quizQuestions[currentQuestionIndex].correctAnswer
                            ? "bg-green-100 text-green-700 hover:bg-green-200"
                            : "bg-red-50 text-red-600 hover:bg-red-100"
                        }`}
                      >
                        {String.fromCharCode(2453 + idx)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex gap-3">
              {currentQuestionIndex > 0 && (
                <button
                  onClick={() => setCurrentQuestionIndex(currentQuestionIndex - 1)}
                  className="flex-1 py-4 bg-white rounded-xl font-medium text-slate-600 shadow-md"
                >
                  ← আগের প্রশ্ন
                </button>
              )}
              
              {currentQuestionIndex < quizQuestions.length - 1 ? (
                <button
                  onClick={nextQuestion}
                  className="flex-1 py-4 bg-[#cf278d] text-white rounded-xl font-medium shadow-md flex items-center justify-center gap-2"
                >
                  পরের প্রশ্ন
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>
              ) : (
                <button
                  onClick={endQuiz}
                  className="flex-1 py-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-medium shadow-md flex items-center justify-center gap-2"
                >
                  কুইজ শেষ করুন
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        )}

        {/* ==================== PHASE 4: SUMMARY ==================== */}
        {phase === "summary" && sessionSummary && (
          <div className="space-y-4 animate-fadeIn">
            {/* Success Card */}
            <div className="bg-gradient-to-br from-green-500 to-green-700 rounded-2xl p-6 text-white text-center">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold mb-2">ক্লাস সম্পন্ন!</h2>
              <p className="text-white/80">{currentTopic?.name}</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-2xl p-5 shadow-md text-center">
                <p className="text-3xl font-bold text-[#cf278d]">
                  {toBengaliNumber(sessionSummary.attendance)}/{toBengaliNumber(sessionSummary.totalStudents)}
                </p>
                <p className="text-sm text-slate-500 mt-1">উপস্থিতি</p>
              </div>
              
              <div className="bg-white rounded-2xl p-5 shadow-md text-center">
                <p className="text-3xl font-bold text-purple-600">
                  {toBengaliNumber(sessionSummary.quizParticipants)}
                </p>
                <p className="text-sm text-slate-500 mt-1">কুইজে অংশ</p>
              </div>
              
              <div className="bg-white rounded-2xl p-5 shadow-md text-center col-span-2">
                <p className="text-4xl font-bold text-green-600">
                  {sessionSummary.totalQuestions > 0 
                    ? toBengaliNumber(Math.round((sessionSummary.correctAnswers / sessionSummary.totalQuestions) * 100))
                    : "০"}%
                </p>
                <p className="text-sm text-slate-500 mt-1">গড় সঠিক উত্তর</p>
              </div>
            </div>

            {/* Auto-save Notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="space-y-2 text-blue-700 text-sm">
                <div className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>হাজিরা সংরক্ষিত হয়েছে</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>কুইজের নম্বর যোগ হয়েছে</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>অগ্রগতি আপডেট হয়েছে</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => router.push("/reports")}
                className="flex-1 py-4 bg-white rounded-xl font-medium text-slate-600 shadow-md"
              >
                রিপোর্ট দেখুন
              </button>
              <button
                onClick={completeTopic}
                className="flex-1 py-4 gradient-blue-pink text-white rounded-xl font-medium shadow-md flex items-center justify-center gap-2"
              >
                হোমে যান
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
