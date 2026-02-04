"use client";

import { useEffect, useState, useCallback, type ReactElement } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  getCurrentUser,
  getProfileByUserId,
  getStudentsForClass,
  type Student,
  type SessionUser,
} from "@/lib/auth";
import {
  SUBJECTS,
  CLASS_LABELS,
  CHAPTERS_DATA,
  NCTB_PDF_URLS,
  toBengaliNumber,
  getCurrentTerm,
  getCurrentYear,
  getTermName,
  addClassEngagementPoint,
  saveQuiz,
  saveQuizSession,
  trackAIToolUsage,
  type QuizQuestion,
  type StudentQuizResponse,
  type Topic,
} from "@/lib/data";
import { getCachedChapters } from "@/lib/content";
import { ShikhoHeader, CastButton, Toast, useToast, NoticeBar, QuizConfigModal, type QuizConfig } from "@/components";
import AIThinking from "@/components/AIThinking";
import { useChromecast } from "@/hooks/useChromecast";

// Format AI response text - convert markdown to HTML
function formatAIResponse(text: string): ReactElement {
  const lines = text.split('\n');
  const elements: ReactElement[] = [];
  let key = 0;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    if (!line.trim()) {
      elements.push(<br key={key++} />);
      continue;
    }

    if (line.startsWith('##')) {
      const heading = line.substring(2).trim();
      elements.push(
        <h3 key={key++} className="text-base font-bold text-gray-800 mt-3 mb-2">
          {heading}
        </h3>
      );
      continue;
    }

    const numberedMatch = line.trim().match(/^(\d+[\u0966-\u096F]*|[০-৯]+)\.\s+(.+)$/);
    if (numberedMatch) {
      const number = numberedMatch[1];
      const content = numberedMatch[2];
      const formatted = formatInlineStyles(content);
      elements.push(
        <div key={key++} className="flex items-start gap-2 ml-2 mb-1">
          <span className="text-pink-600 font-semibold flex-shrink-0">{number}.</span>
          <span className="text-sm">{formatted}</span>
        </div>
      );
      continue;
    }

    if (line.trim().match(/^[•\-\*]\s+/)) {
      const bulletText = line.trim().replace(/^[•\-\*]\s+/, '');
      const formatted = formatInlineStyles(bulletText);
      elements.push(
        <div key={key++} className="flex items-start gap-2 ml-2 mb-1">
          <span className="text-pink-600 mt-0.5 flex-shrink-0">•</span>
          <span className="text-sm">{formatted}</span>
        </div>
      );
      continue;
    }

    const formatted = formatInlineStyles(line);
    elements.push(
      <p key={key++} className="text-sm mb-2">
        {formatted}
      </p>
    );
  }

  return <div>{elements}</div>;
}

function formatInlineStyles(text: string): (ReactElement | string)[] {
  const parts: (ReactElement | string)[] = [];
  let remaining = text;
  let key = 0;

  let i = 0;
  let currentSegment = '';

  while (i < remaining.length) {
    if (remaining.substring(i, i + 2) === '**') {
      const closeIndex = remaining.indexOf('**', i + 2);
      if (closeIndex !== -1) {
        if (currentSegment) {
          parts.push(currentSegment);
          currentSegment = '';
        }
        const boldText = remaining.substring(i + 2, closeIndex);
        parts.push(
          <strong key={`bold-${key++}`} className="font-bold text-gray-900">
            {boldText}
          </strong>
        );
        i = closeIndex + 2;
        continue;
      }
    }

    if (remaining[i] === '`') {
      const closeIndex = remaining.indexOf('`', i + 1);
      if (closeIndex !== -1) {
        if (currentSegment) {
          parts.push(currentSegment);
          currentSegment = '';
        }
        const codeText = remaining.substring(i + 1, closeIndex);
        parts.push(
          <code key={`code-${key++}`} className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">
            {codeText}
          </code>
        );
        i = closeIndex + 1;
        continue;
      }
    }

    currentSegment += remaining[i];
    i++;
  }

  if (currentSegment) {
    parts.push(currentSegment);
  }

  return parts.length > 0 ? parts : [text];
}

// AI modes
type AIMode = "quiz" | "summary" | "ask" | "lessonPlan";

// Lesson Plan interface
interface LessonPlan {
  title: string;
  classId: string;
  topic: string;
  duration: string;
  objectives: string[];
  materials: string[];
  activities: {
    warmUp: { activity: string; duration: string };
    mainLesson: { steps: string[]; duration: string };
    practice: { activity: string; duration: string };
    closing: { activity: string; duration: string };
  };
  assessment: string;
  homework: string;
  generatedAt: string;
}

export default function TopicContentPage() {
  const router = useRouter();
  const params = useParams();
  const classId = params.classId as string;
  const subjectId = params.subjectId as string;
  const chapterId = params.chapterId as string;
  const topicId = params.topicId as string;

  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [topic, setTopic] = useState<Topic | null>(null);
  const [chapterName, setChapterName] = useState<string>("");
  const [isLoadingTopic, setIsLoadingTopic] = useState(true);
  const [expandedSection, setExpandedSection] = useState<"book" | "video" | "ai" | null>("book");
  const [aiMode, setAIMode] = useState<AIMode>("quiz");

  // Chromecast integration
  const { castVideo, castWebsite, isConnected: isCasting, currentDevice } = useChromecast();

  // Toast notifications
  const { toasts, removeToast, success, info } = useToast();

  // Video player state (YouTube embed handles its own controls)

  // AI Quiz state
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [showQuizSession, setShowQuizSession] = useState(false);
  // Track which students answered correctly for each question
  const [correctStudents, setCorrectStudents] = useState<{[questionId: string]: string[]}>({});
  // Track expanded question for student selection
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);
  // Quiz report card modal
  const [showQuizReportCard, setShowQuizReportCard] = useState(false);
  const [quizIsOptional, setQuizIsOptional] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  // Quiz config modal
  const [showQuizConfigModal, setShowQuizConfigModal] = useState(false);
  const [requestedQuestionCount, setRequestedQuestionCount] = useState<number | null>(null);

  // AI Summary state
  const [summary, setSummary] = useState<string>("");
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  // AI Ask state
  const [askQuestion, setAskQuestion] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const [chatHistory, setChatHistory] = useState<{role: "user" | "assistant"; content: string}[]>([]);

  // AI Lesson Plan state
  const [lessonPlan, setLessonPlan] = useState<LessonPlan | null>(null);
  const [isGeneratingLessonPlan, setIsGeneratingLessonPlan] = useState(false);
  const [lessonDuration, setLessonDuration] = useState("40");

  // Get subject data
  const subject = SUBJECTS.find(s => s.id === subjectId);

  // Fetch topic data from Supabase
  useEffect(() => {
    const fetchTopic = async () => {
      setIsLoadingTopic(true);
      try {
        // Get chapters to find both chapter name and topic
        const chapters = await getCachedChapters(classId, subjectId);
        const chapter = chapters.find(ch => ch.id === chapterId);

        if (chapter) {
          setChapterName(chapter.name);
          const topicData = chapter.topics.find(t => t.id === topicId);
          setTopic(topicData || null);
        } else {
          setTopic(null);
          setChapterName("");
        }
      } catch (error) {
        console.error("Error fetching topic:", error);
        setTopic(null);
        setChapterName("");
      } finally {
        setIsLoadingTopic(false);
      }
    };

    fetchTopic();
  }, [classId, subjectId, chapterId, topicId]);

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
    const classStudents = getStudentsForClass(currentUser.id, classId);
    setStudents(classStudents);
    setIsLoading(false);
  }, [router, classId]);

  // Cast PDF to Chromecast
  const handleCastPDF = useCallback(async () => {
    if (!topic?.nctbBook?.pdfUrl) {
      console.error("No PDF URL available");
      return;
    }

    const baseUrl = NCTB_PDF_URLS[classId]?.[subjectId];
    if (!baseUrl) {
      console.error("No NCTB PDF URL for this class/subject");
      return;
    }

    try {
      await castWebsite(baseUrl, topic.name || "পাঠ্যবই");
    } catch (err: any) {
      // Only log actual errors, not cancellations
      if (err?.message !== "কাস্ট সেশন তৈরি করতে ব্যর্থ হয়েছে") {
        console.log("PDF cast error:", err?.message || "Unknown error");
      }
    }
  }, [topic, classId, subjectId, castWebsite]);

  // Cast video to Chromecast
  const handleCastVideo = useCallback(async () => {
    if (!topic?.video?.url) {
      console.error("No video URL available");
      return;
    }

    try {
      await castVideo(topic.video.url, {
        title: topic.video.title || topic.name || "ভিডিও",
        subtitle: `${CLASS_LABELS[classId]} - ${subject?.name || ""}`,
        thumbnail: topic.video.thumbnail,
      });
    } catch (err: any) {
      // Only log actual errors, not cancellations
      if (err?.message !== "কাস্ট সেশন তৈরি করতে ব্যর্থ হয়েছে") {
        console.log("Video cast error:", err?.message || "Unknown error");
      }
    }
  }, [topic, classId, subject, castVideo]);

  const handleBack = () => {
    router.push(`/teach/${classId}?subject=${subjectId}&chapter=${chapterId}`);
  };

  const toggleSection = (section: "book" | "video" | "ai") => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  // AI Quiz Generation using API
  const generateQuiz = async (config?: QuizConfig) => {
    if (!topic || !user) return;

    // Track AI tool usage
    trackAIToolUsage(user.id, "quiz-generator");

    // Store requested question count for UI display
    setRequestedQuestionCount(config?.questionCount || 5);
    setIsGeneratingQuiz(true);
    setCorrectStudents({});

    try{
      const response = await fetch("/api/generate-quiz", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          topicId: topic.id,
          topicName: topic.name,
          chapterName: chapterName,
          classId,
          subjectId,
          chapterId,
          startPage: topic.pdfStartPage,
          endPage: topic.pdfEndPage,
          questionCount: config?.questionCount,
          difficulty: config?.difficulty,
        }),
      });

      if (!response.ok) {
        throw new Error("API request failed");
      }

      const data = await response.json();

      if (data.success && data.questions) {
        setQuizQuestions(data.questions);

        // Save quiz
        if (user) {
          saveQuiz({
            id: `quiz_${classId}_${subjectId}_${chapterId}_${topicId}_${Date.now()}`,
            topicId,
            chapterId,
            subjectId,
            classId,
            teacherId: user.id,
            questions: data.questions,
            createdAt: new Date().toISOString(),
          });
        }
      }
    } catch (error) {
      console.error("Quiz generation failed:", error);
    }
    setIsGeneratingQuiz(false);
  };

  // Toggle student as correct/incorrect for a question
  const toggleStudentCorrect = (questionId: string, studentId: string) => {
    if (!user) return;

    setCorrectStudents(prev => {
      const currentStudents = prev[questionId] || [];
      const isCurrentlyCorrect = currentStudents.includes(studentId);

      if (isCurrentlyCorrect) {
        // Remove student from correct list (deduct 1 point)
        // Note: We don't deduct points once given, just remove from display
        return {
          ...prev,
          [questionId]: currentStudents.filter(id => id !== studentId),
        };
      } else {
        // Add student as correct and give 1 engagement point
        addClassEngagementPoint(studentId, classId, subjectId, user.id);
        return {
          ...prev,
          [questionId]: [...currentStudents, studentId],
        };
      }
    });
  };

  // Mark all students as correct for a question
  const markAllCorrect = (questionId: string) => {
    if (!user) return;

    const currentlyCorrect = correctStudents[questionId] || [];
    const studentsToMark = students.filter(s => !currentlyCorrect.includes(s.id));

    // Give engagement points to new students
    studentsToMark.forEach(student => {
      addClassEngagementPoint(student.id, classId, subjectId, user.id);
    });

    setCorrectStudents(prev => ({
      ...prev,
      [questionId]: students.map(s => s.id),
    }));
  };

  // AI Summary Generation with streaming
  const generateSummary = async () => {
    if (!topic || !user) return;

    // Track AI tool usage
    trackAIToolUsage(user.id, "summary-generator");

    setIsGeneratingSummary(true);
    setSummary("");

    try {
      const response = await fetch("/api/generate-summary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          topicId: topic.id,
          topicName: topic.name,
          chapterName: chapterName,
          classId,
          subjectId,
          chapterId,
          startPage: topic.pdfStartPage,
          endPage: topic.pdfEndPage,
        }),
      });

      if (!response.ok) {
        throw new Error("API request failed");
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      const decoder = new TextDecoder();
      let accumulatedText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        accumulatedText += chunk;
        setSummary(accumulatedText);
      }

    } catch (error) {
      console.error("Summary generation failed:", error);
      // Fallback to mock summary if API fails
      setSummary(`## ${chapterName || "অধ্যায়"} - ${topic?.name || "টপিক"}

• এই পাঠে আমরা ${topic?.name || "গণিতের"} বিষয়ে শিখব
• সহজ উদাহরণ দিয়ে ধারণা পরিষ্কার করব
• মজার উপায়ে অনুশীলন করব`);
    }
    setIsGeneratingSummary(false);
  };

  // AI Ask Anything
  const handleAsk = async () => {
    if (!askQuestion.trim()) return;

    const userQuestion = askQuestion;
    setAskQuestion("");
    setIsAsking(true);

    // Add user message to chat history
    setChatHistory(prev => [...prev, { role: "user", content: userQuestion }]);

    // Add placeholder for assistant response
    setChatHistory(prev => [...prev, { role: "assistant", content: "" }]);

    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: userQuestion,
          topicName: topic?.name,
          chapterName: chapterName,
          chatHistory: chatHistory,
        }),
      });

      if (!response.ok) {
        throw new Error("API request failed");
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      const decoder = new TextDecoder();
      let accumulatedText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        accumulatedText += chunk;

        // Update the last message in chat history with streamed content
        setChatHistory(prev => {
          const newHistory = [...prev];
          if (newHistory.length > 0) {
            newHistory[newHistory.length - 1] = {
              role: "assistant",
              content: accumulatedText,
            };
          }
          return newHistory;
        });
      }

    } catch (error) {
      console.error("Ask failed:", error);
      // Update with error message
      setChatHistory(prev => {
        const newHistory = [...prev];
        if (newHistory.length > 0) {
          newHistory[newHistory.length - 1] = {
            role: "assistant",
            content: "দুঃখিত, এই মুহূর্তে উত্তর দিতে পারছি না। অনুগ্রহ করে আবার চেষ্টা করুন।",
          };
        }
        return newHistory;
      });
    }

    setIsAsking(false);
  };

  // AI Lesson Plan Generation
  const generateLessonPlan = async () => {
    if (!topic || !chapterName) return;

    setIsGeneratingLessonPlan(true);
    setLessonPlan(null);

    try {
      const response = await fetch("/api/generate-lesson-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          className: `class-${classId}`,
          chapterName: chapterName,
          topicName: topic.name,
          duration: lessonDuration,
        }),
      });

      if (!response.ok) {
        throw new Error("API request failed");
      }

      const data = await response.json();

      if (data.success && data.plan) {
        setLessonPlan(data.plan);
      }
    } catch (error) {
      console.error("Lesson plan generation failed:", error);
    }
    setIsGeneratingLessonPlan(false);
  };

  if (isLoading || isLoadingTopic || !topic) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#cf278d] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg text-slate-600">টপিক লোড হচ্ছে...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header with Logo and Back Button */}
      <ShikhoHeader
        variant="light"
        showBackButton={true}
        onBack={handleBack}
        rightContent={
          <div className="text-right">
            <h1 className="text-base font-bold text-gray-900 truncate max-w-xs">{chapterName || "অধ্যায়"}</h1>
            <p className="text-xs text-gray-600 truncate max-w-xs">{topic?.name || "টপিক"}</p>
          </div>
        }
      />

      {/* Notice Ticker Bar */}
      <NoticeBar />

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6 pb-32 space-y-4">
        
        {/* ==================== CONTENT CARDS (ABOVE) ==================== */}
        <div className="grid grid-cols-3 gap-4">
          {/* Book Card */}
          <button
            onClick={() => toggleSection("book")}
            className={`bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-5 text-left transition-all duration-300 border border-purple-100 ${
              expandedSection === "book"
                ? "ring-2 ring-purple-400 shadow-xl scale-[1.02]"
                : "shadow-md hover:shadow-xl hover:scale-[1.02]"
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-xl flex items-center justify-center shadow-sm">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 text-sm">মূলবই</h3>
                <p className="text-xs text-gray-600 truncate">{topic?.nctbBook?.title || "NCTB পাঠ্যবই"}</p>
              </div>
            </div>
          </button>

          {/* Video Card */}
          <button
            onClick={() => toggleSection("video")}
            className={`bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-5 text-left transition-all duration-300 border border-orange-100 ${
              expandedSection === "video"
                ? "ring-2 ring-orange-400 shadow-xl scale-[1.02]"
                : "shadow-md hover:shadow-xl hover:scale-[1.02]"
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-amber-100 rounded-xl flex items-center justify-center shadow-sm">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 text-sm">ভিডিও</h3>
                <p className="text-xs text-gray-600 truncate">স্লাইড ও বর্ণনা</p>
              </div>
            </div>
          </button>

          {/* AI Shohayon Card */}
          <button
            onClick={() => toggleSection("ai")}
            className={`bg-gradient-to-br from-pink-50 to-rose-50 rounded-xl p-5 text-left transition-all duration-300 border border-pink-100 ${
              expandedSection === "ai"
                ? "ring-2 ring-pink-400 shadow-xl scale-[1.02]"
                : "shadow-md hover:shadow-xl hover:scale-[1.02]"
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-gradient-to-br from-pink-100 to-rose-100 rounded-xl flex items-center justify-center shadow-sm">
                <svg className="w-6 h-6 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 text-sm">AI সহায়ক</h3>
                <p className="text-xs text-gray-600 truncate">কুইজ, সারাংশ ও প্রশ্নোত্তর</p>
              </div>
            </div>
          </button>
        </div>

        {/* ==================== EXPANDED BOOK SECTION ==================== */}
        {expandedSection === "book" && (
          <div className="bg-white rounded-2xl border-2 border-purple-100 shadow-lg overflow-hidden animate-fadeIn">
            {/* Enhanced Header with Page Range and Cast Button */}
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border-b-2 border-purple-100 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">{topic?.nctbBook?.title || "NCTB পাঠ্যবই"}</h3>
                  {topic?.pdfStartPage && topic?.pdfEndPage && (
                    <p className="text-purple-700 font-semibold text-sm mt-0.5 flex items-center gap-1.5">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      পৃষ্ঠা {toBengaliNumber(topic.pdfStartPage)} - {toBengaliNumber(topic.pdfEndPage)}
                    </p>
                  )}
                </div>
              </div>

              {/* Cast Button */}
              <CastButton onCastStart={handleCastPDF} />
            </div>

            {/* Enhanced PDF Viewer */}
            <div className="bg-gradient-to-br from-gray-50 to-slate-50">
              <div className="relative overflow-y-auto" style={{ height: "calc(100vh - 300px)", minHeight: "700px" }}>
                {topic?.pdfStartPage && topic?.pdfEndPage ? (
                  <div className="space-y-4 p-4">
                    {Array.from(
                      { length: topic.pdfEndPage - topic.pdfStartPage + 1 },
                      (_, i) => topic.pdfStartPage! + i
                    ).map((pageNum) => {
                      const pageStr = String(pageNum).padStart(3, '0');
                      // Try JPG first (most common), fallback to PNG
                      const imageUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/textbook-pages/${classId}/${subjectId}/${chapterId}/page-${pageStr}.jpg`;

                      return (
                        <div key={pageNum} className="bg-white rounded-lg shadow-sm overflow-hidden">
                          <img
                            src={imageUrl}
                            alt={`পৃষ্ঠা ${toBengaliNumber(pageNum)}`}
                            className="w-full h-auto"
                            loading="lazy"
                            onError={(e) => {
                              // Fallback to PNG if JPG fails
                              const target = e.target as HTMLImageElement;
                              if (target.src.endsWith('.jpg')) {
                                target.src = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/textbook-pages/${classId}/${subjectId}/${chapterId}/page-${pageStr}.png`;
                              }
                            }}
                          />
                          <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
                            <p className="text-sm text-gray-600 text-center">
                              পৃষ্ঠা {toBengaliNumber(pageNum)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center p-8">
                      <div className="w-20 h-20 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <svg className="w-12 h-12 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <p className="text-gray-700 font-semibold text-lg">{topic?.nctbBook?.title || "NCTB পাঠ্যবই"}</p>
                      <p className="text-gray-500 text-sm mt-2">এই টপিকের জন্য পৃষ্ঠা নম্বর পাওয়া যায়নি</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ==================== EXPANDED VIDEO SECTION ==================== */}
        {expandedSection === "video" && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden animate-fadeIn">
            {/* Video Header with Cast Button */}
            <div className="bg-orange-50 border-b border-orange-100 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-orange-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
                </svg>
                <span className="text-orange-700 font-medium text-sm">
                  {topic?.video?.title || "ভিডিও লেকচার"}
                </span>
              </div>

              {/* Cast Button for Video */}
              <CastButton onCastStart={handleCastVideo} className="text-sm" />
            </div>

            {/* Video Content */}
            {isCasting && (
              <div className="bg-green-50 border-b border-green-200 px-4 py-2 flex items-center justify-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-green-700 text-sm font-medium">
                  {currentDevice} এ কাস্ট হচ্ছে
                </span>
              </div>
            )}

            {/* YouTube Video Player */}
            <div className="p-4">
              {topic?.video?.url ? (
                <div className="bg-black rounded-lg overflow-hidden">
                  <div className="aspect-video">
                    <iframe
                      src={`https://www.youtube.com/embed/${topic.video.url.includes('v=') ? topic.video.url.split('v=')[1].split('&')[0] : topic.video.url.split('/').pop()}?rel=0&modestbranding=1&enablejsapi=1`}
                      className="w-full h-full"
                      title={topic.video.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    />
                  </div>
                </div>
              ) : (
                <div className="bg-gray-100 rounded-lg aspect-video flex items-center justify-center">
                  <div className="text-center p-8">
                    <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-gray-500 font-medium">এই টপিকের জন্য কোনো ভিডিও নেই</p>
                  </div>
                </div>
              )}

              {/* Video Info */}
              {topic?.video && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-bold text-gray-800 mb-2">{topic.video.title}</h4>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {topic.video.duration}
                    </span>
                    <a
                      href={topic.video.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#cf278d] hover:underline flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816z"/>
                      </svg>
                      YouTube এ দেখুন
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== EXPANDED AI SHOHAYON SECTION ==================== */}
        {expandedSection === "ai" && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden animate-fadeIn">

            {/* AI Mode Tabs */}
            <div className="px-4 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-slate-50">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: "lessonPlan", label: "AI পাঠ পরিকল্পনা" },
                  { id: "summary", label: "AI সারাংশ" },
                  { id: "quiz", label: "AI কুইজ তৈরি" },
                  { id: "ask", label: "AI কে প্রশ্ন করুন" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setAIMode(tab.id as AIMode)}
                    className={`py-2.5 px-4 rounded-lg font-semibold text-sm transition-all duration-300 ease-in-out ${
                      aiMode === tab.id
                        ? "bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-md scale-[1.02]"
                        : "bg-white text-gray-700 hover:bg-gray-100 hover:shadow-sm border border-gray-200"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* AI Content */}
            <div className="p-4">
            {/* ==================== QUIZ MODE ==================== */}
            {aiMode === "quiz" && (
              <div className="space-y-4">
                {isGeneratingQuiz ? (
                  /* AI Thinking Loader */
                  <div className="bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 rounded-2xl p-8 text-center border border-purple-100">
                    <div className="relative w-20 h-20 mx-auto mb-6">
                      {/* Outer rotating ring */}
                      <div className="absolute inset-0 rounded-full border-4 border-purple-200 border-t-purple-600 animate-spin"></div>
                      {/* Inner gradient circle */}
                      <div className="absolute inset-3 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center animate-pulse">
                        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-lg font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                        AI চিন্তা করছে...
                      </h3>
                      <p className="text-gray-700 font-medium text-sm">
                        {requestedQuestionCount ? `${toBengaliNumber(requestedQuestionCount)}টি প্রশ্ন তৈরি হচ্ছে` : 'প্রশ্ন তৈরি হচ্ছে'}
                      </p>
                      <p className="text-xs text-gray-500">
                        পাঠ্যবই বিশ্লেষণ করে মানসম্পন্ন প্রশ্ন তৈরি করা হচ্ছে
                      </p>
                    </div>

                    {/* Animated dots */}
                    <div className="flex justify-center gap-1.5 mt-4">
                      <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                ) : quizQuestions.length === 0 ? (
                  <div className="bg-gray-50 rounded-lg p-6 text-center">
                    <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="font-bold text-gray-800 mb-2">AI কুইজ তৈরি করুন</h3>
                    <p className="text-gray-600 text-sm mb-6">
                      এই টপিকের উপর ভিত্তি করে ৩-১০টি প্রশ্ন তৈরি করুন
                    </p>
                    <button
                      onClick={() => setShowQuizConfigModal(true)}
                      disabled={isGeneratingQuiz}
                      className="bg-pink-600 text-white py-2.5 px-6 rounded-lg font-medium hover:bg-pink-700 transition-all disabled:opacity-50"
                    >
                      কুইজ তৈরি করুন
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {!showQuizSession && !quizCompleted ? (
                      <>
                        {/* Success Message */}
                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-5 text-center">
                          <div className="w-14 h-14 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
                            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <h3 className="text-base font-bold text-gray-900 mb-1">
                            {requestedQuestionCount && requestedQuestionCount !== quizQuestions.length
                              ? `${toBengaliNumber(requestedQuestionCount)}টি প্রশ্নের মধ্যে ${toBengaliNumber(quizQuestions.length)}টি তৈরি হয়েছে`
                              : `${toBengaliNumber(quizQuestions.length)}টি প্রশ্ন তৈরি হয়েছে!`
                            }
                          </h3>
                          {requestedQuestionCount && requestedQuestionCount !== quizQuestions.length && (
                            <p className="text-amber-700 text-xs bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 inline-block">
                              পাঠ্যবইয়ে পর্যাপ্ত কনটেন্ট না থাকায় {toBengaliNumber(quizQuestions.length)}টি প্রশ্ন তৈরি করা সম্ভব হয়েছে
                            </p>
                          )}
                        </div>

                        {/* Questions Preview */}
                        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                          <div className="max-h-80 overflow-y-auto divide-y divide-gray-200">
                            {quizQuestions.map((q, idx) => (
                              <div key={q.id} className="p-4 hover:bg-gray-50 transition-colors">
                                <p className="text-sm font-medium text-gray-900 mb-2.5 leading-snug">
                                  <span className="text-blue-600 font-bold mr-1.5">{idx + 1}.</span>
                                  {q.question}
                                </p>
                                <div className="space-y-1.5">
                                  {q.options.map((opt, optIdx) => (
                                    <div
                                      key={optIdx}
                                      className={`text-xs px-2.5 py-1.5 rounded-md transition-all ${
                                        optIdx === q.correctAnswer
                                          ? 'bg-green-100 text-green-900 font-semibold border border-green-400'
                                          : 'bg-gray-50 text-gray-700 border border-gray-200'
                                      }`}
                                    >
                                      {['A', 'B', 'C', 'D'][optIdx]}. {opt}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="grid grid-cols-2 gap-4">
                          <button
                            onClick={() => {
                              setQuizQuestions([]);
                              setCorrectStudents({});
                              setRequestedQuestionCount(null);
                            }}
                            className="bg-white border-2 border-gray-300 text-gray-700 py-3.5 px-6 rounded-xl font-semibold hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            নতুন কুইজ তৈরি করুন
                          </button>
                          <button
                            onClick={() => {
                              setQuizQuestions([]);
                              setCorrectStudents({});
                              setRequestedQuestionCount(null);
                              setQuizCompleted(false);
                              success('কুইজ সম্পন্ন হয়েছে!');
                            }}
                            className="bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3.5 px-6 rounded-xl font-semibold hover:from-green-700 hover:to-emerald-700 transition-all flex items-center justify-center gap-2 shadow-lg"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            সম্পন্ন
                          </button>
                        </div>
                      </>
                    ) : !showQuizSession && quizCompleted ? (
                      <>
                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6 text-center">
                          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <p className="text-green-800 font-bold text-lg mb-2">কুইজ সেশন সম্পন্ন হয়েছে!</p>
                          <p className="text-green-600 text-sm mb-4">
                            {toBengaliNumber(quizQuestions.length)}টি প্রশ্নের কুইজ সফলভাবে সম্পন্ন এবং সংরক্ষিত হয়েছে
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setQuizQuestions([]);
                            setCorrectStudents({});
                            setQuizCompleted(false);
                            setAIMode("quiz");
                          }}
                          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-xl font-medium hover:from-purple-700 hover:to-pink-700 transition-all flex items-center justify-center gap-2 shadow-lg"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          আরেকটি কুইজ জেনারেট করুন
                        </button>
                      </>
                    ) : showQuizSession ? (
                      <div className="space-y-4">
                        {/* Header with term info */}
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold text-gray-800">কুইজ প্রশ্নমালা</h3>
                          <span className="px-2 py-1 bg-pink-100 text-pink-700 rounded text-xs font-medium">
                            {getTermName(getCurrentTerm())} • {getCurrentYear()}
                          </span>
                        </div>

                        {/* All Questions List */}
                        <div className="space-y-3">
                          {quizQuestions.map((question, qIndex) => {
                            const isExpanded = expandedQuestionId === question.id;
                            const studentsCorrect = correctStudents[question.id] || [];

                            return (
                              <div key={question.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                {/* Question Header */}
                                <div className="p-4 border-b border-gray-100">
                                  <div className="flex items-start gap-3">
                                    <span className="w-7 h-7 rounded-full bg-pink-100 text-pink-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
                                      {toBengaliNumber(qIndex + 1)}
                                    </span>
                                    <div className="flex-1">
                                      <h4 className="font-medium text-gray-800 text-sm leading-relaxed">
                                        {question.question}
                                      </h4>
                                    </div>
                                  </div>
                                </div>

                                {/* Options with Correct Answer Highlighted */}
                                <div className="p-4 bg-gray-50 space-y-2">
                                  {question.options.map((option, idx) => {
                                    const isCorrect = idx === question.correctAnswer;
                                    return (
                                      <div
                                        key={idx}
                                        className={`flex items-center gap-2 p-2.5 rounded-lg text-sm ${
                                          isCorrect
                                            ? "bg-green-100 border-2 border-green-400"
                                            : "bg-white border border-gray-200"
                                        }`}
                                      >
                                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium ${
                                          isCorrect ? "bg-green-500 text-white" : "bg-gray-200 text-gray-600"
                                        }`}>
                                          {String.fromCharCode(2453 + idx)}
                                        </span>
                                        <span className={isCorrect ? "text-green-800 font-medium" : "text-gray-700"}>
                                          {option}
                                        </span>
                                        {isCorrect && (
                                          <svg className="w-4 h-4 text-green-600 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                          </svg>
                                        )}
                                      </div>
                                    );
                                  })}

                                  {/* Explanation */}
                                  {question.explanation && (
                                    <div className="mt-2 p-2 bg-blue-50 rounded-lg">
                                      <p className="text-xs text-blue-700">
                                        <strong>ব্যাখ্যা:</strong> {question.explanation}
                                      </p>
                                    </div>
                                  )}
                                </div>

                                {/* Student Marking Section */}
                                <div className="border-t border-gray-100">
                                  <button
                                    onClick={() => setExpandedQuestionId(isExpanded ? null : question.id)}
                                    className="w-full p-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                                  >
                                    <div className="flex items-center gap-2">
                                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                      </svg>
                                      <span className="text-sm text-gray-600">
                                        সঠিক উত্তরদাতা: <strong className="text-green-600">{toBengaliNumber(studentsCorrect.length)}</strong> জন
                                      </span>
                                    </div>
                                    <svg className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                  </button>

                                  {/* Expanded Student List */}
                                  {isExpanded && (
                                    <div className="p-4 pt-0 space-y-3">
                                      {students.length === 0 ? (
                                        <p className="text-sm text-gray-500 text-center py-4">
                                          এই ক্লাসে কোনো শিক্ষার্থী নেই
                                        </p>
                                      ) : (
                                        <>
                                          {/* Quick Actions */}
                                          <div className="flex gap-2">
                                            <button
                                              onClick={() => markAllCorrect(question.id)}
                                              className="text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-lg hover:bg-green-200 transition-colors"
                                            >
                                              সবাই সঠিক
                                            </button>
                                            <button
                                              onClick={() => setCorrectStudents(prev => ({ ...prev, [question.id]: [] }))}
                                              className="text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition-colors"
                                            >
                                              সব মুছুন
                                            </button>
                                          </div>

                                          {/* Student List */}
                                          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                                            {students.map((student) => {
                                              const isMarkedCorrect = studentsCorrect.includes(student.id);
                                              return (
                                                <button
                                                  key={student.id}
                                                  onClick={() => toggleStudentCorrect(question.id, student.id)}
                                                  className={`flex items-center gap-2 p-2 rounded-lg text-left transition-all text-sm ${
                                                    isMarkedCorrect
                                                      ? "bg-green-100 border-2 border-green-400"
                                                      : "bg-gray-50 border border-gray-200 hover:border-green-300"
                                                  }`}
                                                >
                                                  <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${
                                                    isMarkedCorrect ? "bg-green-500" : "bg-white border border-gray-300"
                                                  }`}>
                                                    {isMarkedCorrect && (
                                                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                      </svg>
                                                    )}
                                                  </div>
                                                  <div className="min-w-0">
                                                    <p className={`font-medium truncate ${isMarkedCorrect ? "text-green-800" : "text-gray-800"}`}>
                                                      {student.name}
                                                    </p>
                                                    <p className="text-xs text-gray-500">রোল: {student.rollNumber}</p>
                                                  </div>
                                                </button>
                                              );
                                            })}
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Summary & End Session */}
                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-bold text-green-800">সেশন সারসংক্ষেপ</h4>
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                              {getTermName(getCurrentTerm())} রিপোর্টে যোগ হবে
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className="bg-white rounded-lg p-3 text-center">
                              <p className="text-2xl font-bold text-green-600">
                                {toBengaliNumber(quizQuestions.length)}
                              </p>
                              <p className="text-xs text-gray-500">মোট প্রশ্ন</p>
                            </div>
                            <div className="bg-white rounded-lg p-3 text-center">
                              <p className="text-2xl font-bold text-green-600">
                                {toBengaliNumber(
                                  Object.values(correctStudents).reduce((sum, arr) => sum + arr.length, 0)
                                )}
                              </p>
                              <p className="text-xs text-gray-500">মোট সঠিক উত্তর</p>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setShowQuizReportCard(true);
                            }}
                            className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 transition-all flex items-center justify-center gap-2"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            সেশন শেষ করুন ও রিপোর্ট দেখুন
                          </button>
                        </div>

                        {/* New Quiz Button */}
                        <button
                          onClick={() => {
                            setQuizQuestions([]);
                            setCorrectStudents({});
                            setShowQuizSession(false);
                            setShowQuizConfigModal(true);
                          }}
                          className="w-full text-pink-600 py-2 text-sm font-medium hover:underline"
                        >
                          নতুন কুইজ তৈরি করুন
                        </button>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            )}

            {/* ==================== SUMMARY MODE ==================== */}
            {aiMode === "summary" && (
              <div className="space-y-4">
                {!summary && !isGeneratingSummary ? (
                  <div className="bg-gray-50 rounded-lg p-6 text-center">
                    <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h3 className="font-bold text-gray-800 mb-2">পাঠের সারাংশ</h3>
                    <p className="text-gray-600 text-sm mb-2">
                      AI এই টপিকের মূল পয়েন্টগুলো সারাংশ আকারে তৈরি করবে
                    </p>
                    <p className="text-gray-500 text-xs mb-6">
                      পৃষ্ঠা {topic?.pdfStartPage || "?"} - {topic?.pdfEndPage || "?"} থেকে
                    </p>
                    <button
                      onClick={generateSummary}
                      disabled={isGeneratingSummary}
                      className="bg-pink-600 text-white py-2.5 px-6 rounded-lg font-medium hover:bg-pink-700 transition-all disabled:opacity-50"
                    >
                      সারাংশ তৈরি করুন
                    </button>
                  </div>
                ) : isGeneratingSummary && !summary ? (
                  // AI Thinking animation while waiting for first response
                  <div className="bg-gradient-to-br from-white to-purple-50 rounded-lg p-6 border border-purple-100">
                    <AIThinking type="summary" />
                    <div className="space-y-3 animate-pulse mt-6">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-4 bg-gray-200 rounded w-full"></div>
                      <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                      <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                      <div className="h-4 bg-gray-200 rounded w-4/5"></div>
                    </div>
                  </div>
                ) : (
                  // Summary content (shows as it streams)
                  <div className="bg-gradient-to-br from-white to-pink-50 rounded-2xl p-6 shadow-sm border border-pink-100">
                    {isGeneratingSummary && (
                      <div className="mb-4">
                        <AIThinking type="summary" />
                      </div>
                    )}

                    {/* Rendered Summary Content */}
                    <div className="space-y-4">
                      {summary.split("\n").map((line, index) => {
                        const trimmedLine = line.trim();
                        if (!trimmedLine) return null;

                        // Heading (## ...)
                        if (trimmedLine.startsWith("##")) {
                          const headingText = trimmedLine.replace(/^##\s*/, "");
                          return (
                            <h3 key={index} className="text-lg font-bold text-gray-800 border-b-2 border-pink-200 pb-2 mb-3">
                              {headingText}
                            </h3>
                          );
                        }

                        // Bullet point (• or -)
                        if (trimmedLine.startsWith("•") || trimmedLine.startsWith("-") || trimmedLine.startsWith("*")) {
                          const bulletText = trimmedLine.replace(/^[•\-*]\s*/, "");
                          const formatted = formatInlineStyles(bulletText);
                          return (
                            <div key={index} className="flex items-start gap-3 bg-white rounded-xl p-3 shadow-sm border border-gray-100">
                              <div className="w-6 h-6 rounded-full bg-pink-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                                •
                              </div>
                              <div className="text-gray-700 text-sm leading-relaxed flex-1">{formatted}</div>
                            </div>
                          );
                        }

                        // Skip encouragement lines (contains বাহ, দারুণ, চমৎকার)
                        if (trimmedLine.includes("বাহ") || trimmedLine.includes("দারুণ") || trimmedLine.includes("চমৎকার") || trimmedLine.includes("শেখা চালিয়ে")) {
                          return null;
                        }

                        // Regular paragraph
                        const formatted = formatInlineStyles(trimmedLine);
                        return (
                          <p key={index} className="text-gray-700 text-sm leading-relaxed">
                            {formatted}
                          </p>
                        );
                      })}

                      {isGeneratingSummary && <span className="inline-block w-2 h-5 bg-pink-500 animate-pulse rounded-sm"></span>}
                    </div>

                    {!isGeneratingSummary && summary && (
                      <div className="mt-6 pt-4 border-t border-pink-100 flex justify-between items-center">
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <svg className="w-4 h-4 text-pink-500" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          <span>শিখো AI দ্বারা তৈরি</span>
                        </div>
                        <button
                          onClick={() => {
                            setSummary("");
                            generateSummary();
                          }}
                          className="text-xs bg-pink-100 text-pink-700 hover:bg-pink-200 px-3 py-1.5 rounded-lg font-medium transition-colors"
                        >
                          আবার তৈরি করুন
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ==================== ASK MODE ==================== */}
            {aiMode === "ask" && (
              <div className="space-y-4">
                {/* Chat History */}
                <div className="bg-gray-50 rounded-lg overflow-hidden">
                  <div className="h-64 overflow-y-auto p-4 space-y-3">
                    {chatHistory.length === 0 ? (
                      <div className="text-center text-gray-400 py-8">
                        <p className="text-sm">এই টপিক সম্পর্কে যেকোনো প্রশ্ন করুন</p>
                      </div>
                    ) : (
                      chatHistory.map((msg, i) => {
                        const isLastMessage = i === chatHistory.length - 1;
                        const isStreaming = isAsking && isLastMessage && msg.role === "assistant";

                        return (
                          <div
                            key={i}
                            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                          >
                            {msg.role === "assistant" && (
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold mr-2 flex-shrink-0">
                                AI
                              </div>
                            )}
                            <div
                              className={`max-w-[80%] p-3 rounded-xl ${
                                msg.role === "user"
                                  ? "bg-pink-600 text-white rounded-br-sm"
                                  : "bg-white text-gray-700 rounded-bl-sm border border-gray-200 shadow-sm"
                              }`}
                            >
                              {msg.content ? (
                                msg.role === "user" ? (
                                  <p className="text-sm whitespace-pre-wrap leading-relaxed">
                                    {msg.content}
                                  </p>
                                ) : (
                                  <div className="text-sm leading-relaxed">
                                    {formatAIResponse(msg.content)}
                                    {isStreaming && (
                                      <span className="inline-block w-2 h-4 bg-pink-500 animate-pulse ml-1 rounded-sm"></span>
                                    )}
                                  </div>
                                )
                              ) : isStreaming ? (
                                <AIThinking type="default" />
                              ) : null}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                  
                  {/* Input */}
                  <div className="p-4 border-t border-gray-200">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={askQuestion}
                        onChange={(e) => setAskQuestion(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAsk()}
                        placeholder="আপনার প্রশ্ন লিখুন..."
                        className="flex-1 p-2.5 border border-gray-300 rounded-lg focus:border-pink-500 focus:ring-1 focus:ring-pink-500 outline-none text-sm"
                      />
                      <button
                        onClick={handleAsk}
                        disabled={isAsking || !askQuestion.trim()}
                        className="px-4 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors disabled:opacity-50"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ==================== LESSON PLAN MODE ==================== */}
            {aiMode === "lessonPlan" && (
              <div className="space-y-4">
                {!lessonPlan ? (
                  <div className="bg-gray-50 rounded-lg p-6 text-center">
                    <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h3 className="font-bold text-gray-800 mb-2">পাঠ পরিকল্পনা তৈরি করুন</h3>
                    <p className="text-gray-600 text-sm mb-4">
                      AI দিয়ে <strong>{topic?.name}</strong> টপিকের পাঠ পরিকল্পনা তৈরি করুন
                    </p>

                    {/* Duration Selector */}
                    <div className="max-w-xs mx-auto mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">ক্লাসের সময়কাল</label>
                      <select
                        value={lessonDuration}
                        onChange={(e) => setLessonDuration(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:border-pink-500 focus:ring-1 focus:ring-pink-500 outline-none"
                      >
                        <option value="30">৩০ মিনিট</option>
                        <option value="40">৪০ মিনিট</option>
                        <option value="45">৪৫ মিনিট</option>
                        <option value="60">৬০ মিনিট</option>
                      </select>
                    </div>

                    <button
                      onClick={generateLessonPlan}
                      disabled={isGeneratingLessonPlan}
                      className="bg-pink-600 text-white py-2.5 px-6 rounded-lg font-medium hover:bg-pink-700 transition-all disabled:opacity-50"
                    >
                      {isGeneratingLessonPlan ? (
                        <span className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          তৈরি হচ্ছে...
                        </span>
                      ) : (
                        "পরিকল্পনা তৈরি করুন"
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Success Header */}
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <p className="text-green-700 font-medium">পাঠ পরিকল্পনা তৈরি হয়েছে!</p>
                      </div>
                      <p className="text-green-600 text-sm">
                        {lessonPlan.topic} • {lessonPlan.duration}
                      </p>
                    </div>

                    {/* Lesson Plan Content */}
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                      <div className="p-4 space-y-4">
                        {/* Title */}
                        <div>
                          <h3 className="text-lg font-bold text-gray-900 mb-1">{lessonPlan.title}</h3>
                          <p className="text-sm text-gray-500">ক্লাস {lessonPlan.classId} • {lessonPlan.duration}</p>
                        </div>

                        {/* Learning Objectives */}
                        <div>
                          <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                            </svg>
                            শিখনফল
                          </h4>
                          <ul className="space-y-1.5 ml-7">
                            {lessonPlan.objectives.map((obj, i) => (
                              <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                                <span className="text-blue-500 mt-1">•</span>
                                <span>{obj}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Materials */}
                        <div>
                          <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                            প্রয়োজনীয় উপকরণ
                          </h4>
                          <ul className="space-y-1.5 ml-7">
                            {lessonPlan.materials.map((material, i) => (
                              <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                                <span className="text-purple-500 mt-1">•</span>
                                <span>{material}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Activities */}
                        <div>
                          <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            কার্যক্রম
                          </h4>

                          {/* Warm Up */}
                          <div className="mb-3 ml-7 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                            <p className="text-xs font-medium text-yellow-800 mb-1">ওয়ার্ম আপ • {lessonPlan.activities.warmUp.duration}</p>
                            <p className="text-sm text-gray-700">{lessonPlan.activities.warmUp.activity}</p>
                          </div>

                          {/* Main Lesson */}
                          <div className="mb-3 ml-7 bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <p className="text-xs font-medium text-blue-800 mb-2">মূল পাঠ • {lessonPlan.activities.mainLesson.duration}</p>
                            <ul className="space-y-1.5">
                              {lessonPlan.activities.mainLesson.steps.map((step, i) => (
                                <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                                  <span className="text-blue-500 font-bold">{toBengaliNumber(i + 1)}.</span>
                                  <span>{step}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Practice */}
                          <div className="mb-3 ml-7 bg-green-50 border border-green-200 rounded-lg p-3">
                            <p className="text-xs font-medium text-green-800 mb-1">অনুশীলন • {lessonPlan.activities.practice.duration}</p>
                            <p className="text-sm text-gray-700">{lessonPlan.activities.practice.activity}</p>
                          </div>

                          {/* Closing */}
                          <div className="ml-7 bg-purple-50 border border-purple-200 rounded-lg p-3">
                            <p className="text-xs font-medium text-purple-800 mb-1">সমাপনী • {lessonPlan.activities.closing.duration}</p>
                            <p className="text-sm text-gray-700">{lessonPlan.activities.closing.activity}</p>
                          </div>
                        </div>

                        {/* Assessment */}
                        <div>
                          <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                            <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                            </svg>
                            মূল্যায়ন
                          </h4>
                          <p className="text-sm text-gray-700 ml-7">{lessonPlan.assessment}</p>
                        </div>

                        {/* Homework */}
                        <div>
                          <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                            <svg className="w-5 h-5 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                            বাড়ির কাজ
                          </h4>
                          <p className="text-sm text-gray-700 ml-7">{lessonPlan.homework}</p>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => setLessonPlan(null)}
                        className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg font-medium hover:bg-gray-200 transition-all"
                      >
                        নতুন পরিকল্পনা
                      </button>
                      <button
                        onClick={() => {
                          const planText = `পাঠ পরিকল্পনা: ${lessonPlan.title}\n\nশিখনফল:\n${lessonPlan.objectives.map((o, i) => `${i + 1}. ${o}`).join('\n')}\n\nউপকরণ:\n${lessonPlan.materials.join(', ')}\n\nমূল্যায়ন: ${lessonPlan.assessment}\n\nবাড়ির কাজ: ${lessonPlan.homework}`;
                          navigator.clipboard.writeText(planText);
                          success('পাঠ পরিকল্পনা কপি হয়েছে!');
                        }}
                        className="flex-1 bg-pink-600 text-white py-2.5 rounded-lg font-medium hover:bg-pink-700 transition-all flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                        </svg>
                        কপি করুন
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            </div>
          </div>
        )}
      </main>

      {/* ==================== QUIZ REPORT CARD MODAL ==================== */}
      {showQuizReportCard && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 text-white sticky top-0 z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold mb-1">কুইজ সেশন রিপোর্ট</h2>
                  <p className="text-green-100 text-sm">{chapterName} • {topic?.name}</p>
                  <p className="text-green-100 text-xs mt-1">{new Date().toLocaleDateString('bn-BD')}</p>
                </div>
                <button
                  onClick={() => setShowQuizReportCard(false)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Report Content */}
            <div className="p-6" id="quiz-report-content">
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 rounded-xl p-4 text-center border border-blue-100">
                  <p className="text-3xl font-bold text-blue-600">{toBengaliNumber(quizQuestions.length)}</p>
                  <p className="text-sm text-blue-700 mt-1">মোট প্রশ্ন</p>
                </div>
                <div className="bg-purple-50 rounded-xl p-4 text-center border border-purple-100">
                  <p className="text-3xl font-bold text-purple-600">{toBengaliNumber(students.length)}</p>
                  <p className="text-sm text-purple-700 mt-1">মোট শিক্ষার্থী</p>
                </div>
                <div className="bg-green-50 rounded-xl p-4 text-center border border-green-100">
                  <p className="text-3xl font-bold text-green-600">
                    {toBengaliNumber(
                      Math.round(
                        (Object.values(correctStudents).flat().length /
                          (students.length * quizQuestions.length || 1)) *
                          100
                      )
                    )}%
                  </p>
                  <p className="text-sm text-green-700 mt-1">গড় সফলতা</p>
                </div>
              </div>

              {/* Optional/Mandatory Toggle */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 mb-1">কুইজ মার্কিং সেটিংস</h3>
                    <p className="text-sm text-gray-600 mb-3">
                      এই কুইজের নম্বর রিপোর্ট কার্ডে যোগ করা হবে কি না তা নির্ধারণ করুন
                    </p>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="quizType"
                          checked={!quizIsOptional}
                          onChange={() => setQuizIsOptional(false)}
                          className="w-4 h-4 text-green-600"
                        />
                        <span className="font-medium text-gray-700">
                          <span className="text-green-600">●</span> বাধ্যতামূলক
                        </span>
                        <span className="text-xs text-gray-500">(নম্বর যোগ হবে)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="quizType"
                          checked={quizIsOptional}
                          onChange={() => setQuizIsOptional(true)}
                          className="w-4 h-4 text-gray-600"
                        />
                        <span className="font-medium text-gray-700">
                          <span className="text-gray-400">○</span> ঐচ্ছিক
                        </span>
                        <span className="text-xs text-gray-500">(নম্বর যোগ হবে না)</span>
                      </label>
                    </div>
                  </div>
                  <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Student Results Table */}
              <div className="mb-6">
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  শিক্ষার্থীদের ফলাফল
                </h3>
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">রোল</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">নাম</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">সঠিক উত্তর</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">শতাংশ</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">গ্রেড</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {students.map((student) => {
                        const correctCount = Object.values(correctStudents).filter(
                          (studentIds) => studentIds.includes(student.id)
                        ).length;
                        const percentage = Math.round((correctCount / quizQuestions.length) * 100);
                        const grade = percentage >= 80 ? 'A+' : percentage >= 70 ? 'A' : percentage >= 60 ? 'A-' : percentage >= 50 ? 'B' : percentage >= 40 ? 'C' : 'F';
                        const gradeColor = percentage >= 80 ? 'text-green-600' : percentage >= 60 ? 'text-blue-600' : percentage >= 40 ? 'text-orange-600' : 'text-red-600';

                        return (
                          <tr key={student.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium text-gray-700">
                              {student.rollNumber && !isNaN(parseInt(student.rollNumber))
                                ? toBengaliNumber(parseInt(student.rollNumber))
                                : student.rollNumber || '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">{student.name}</td>
                            <td className="px-4 py-3 text-center">
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                                {toBengaliNumber(correctCount)}/{toBengaliNumber(quizQuestions.length)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                              {toBengaliNumber(percentage)}%
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`text-lg font-bold ${gradeColor}`}>{grade}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Question-wise Analysis */}
              <div>
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  প্রশ্ন অনুযায়ী বিশ্লেষণ
                </h3>
                <div className="space-y-3">
                  {quizQuestions.map((question, index) => {
                    const correctCount = correctStudents[question.id]?.length || 0;
                    const successRate = Math.round((correctCount / students.length) * 100);

                    return (
                      <div key={question.id} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                        <div className="flex items-start gap-3">
                          <span className="flex-shrink-0 w-8 h-8 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center text-sm font-bold">
                            {toBengaliNumber(index + 1)}
                          </span>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900 mb-2">{question.question}</p>
                            <div className="flex items-center gap-4">
                              <span className="text-xs text-gray-600">
                                সঠিক: {toBengaliNumber(correctCount)}/{toBengaliNumber(students.length)}
                              </span>
                              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${
                                    successRate >= 70 ? 'bg-green-500' : successRate >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                                  }`}
                                  style={{ width: `${successRate}%` }}
                                />
                              </div>
                              <span className="text-sm font-semibold text-gray-700">{toBengaliNumber(successRate)}%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="border-t border-gray-200 p-6 bg-gray-50 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    const printContent = document.getElementById('quiz-report-content');
                    if (printContent) {
                      const printWindow = window.open('', '', 'height=600,width=800');
                      printWindow?.document.write('<html><head><title>কুইজ রিপোর্ট</title>');
                      printWindow?.document.write('<style>body{font-family:Arial,sans-serif;padding:20px;}</style>');
                      printWindow?.document.write('</head><body>');
                      printWindow?.document.write('<h1>কুইজ সেশন রিপোর্ট</h1>');
                      printWindow?.document.write(`<p>${chapterName} • ${topic?.name}</p>`);
                      printWindow?.document.write(printContent.innerHTML);
                      printWindow?.document.write('</body></html>');
                      printWindow?.document.close();
                      printWindow?.print();
                    }
                  }}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  প্রিন্ট করুন
                </button>
                <button
                  onClick={() => {
                    // Create CSV content
                    let csv = 'রোল,নাম,সঠিক উত্তর,মোট প্রশ্ন,শতাংশ,গ্রেড\n';
                    students.forEach(student => {
                      const correctCount = Object.values(correctStudents).filter(
                        (studentIds) => studentIds.includes(student.id)
                      ).length;
                      const percentage = Math.round((correctCount / quizQuestions.length) * 100);
                      const grade = percentage >= 80 ? 'A+' : percentage >= 70 ? 'A' : percentage >= 60 ? 'A-' : percentage >= 50 ? 'B' : percentage >= 40 ? 'C' : 'F';
                      csv += `${student.rollNumber},${student.name},${correctCount},${quizQuestions.length},${percentage}%,${grade}\n`;
                    });

                    // Download
                    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(blob);
                    link.download = `quiz-report-${new Date().toISOString().split('T')[0]}.csv`;
                    link.click();
                  }}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  ডাউনলোড (CSV)
                </button>
              </div>
              <button
                onClick={() => {
                  if (!user) return;

                  // Build student responses from the correctStudents data
                  const responses: StudentQuizResponse[] = [];

                  students.forEach(student => {
                    quizQuestions.forEach(question => {
                      const isCorrect = correctStudents[question.id]?.includes(student.id) || false;
                      const selectedAnswer = isCorrect ? question.correctAnswer : -1;

                      responses.push({
                        studentId: student.id,
                        questionId: question.id,
                        selectedAnswer,
                        isCorrect,
                      });
                    });
                  });

                  // Save quiz session to localStorage
                  const sessionId = `session_${classId}_${Date.now()}`;
                  const savedSession = saveQuizSession({
                    id: sessionId,
                    quizId: `quiz-${Date.now()}`,
                    classId: classId,
                    subjectId: subjectId,
                    teacherId: user.id,
                    date: new Date().toISOString(),
                    responses,
                    totalQuestions: quizQuestions.length,
                    isOptional: quizIsOptional,
                    topicName: topic?.name,
                    chapterName: chapterName,
                  });

                  console.log('Quiz session saved:', savedSession);

                  // Close modals and reset state
                  setShowQuizReportCard(false);
                  setShowQuizSession(false);
                  setExpandedQuestionId(null);
                  setQuizCompleted(true);

                  // Show success message
                  success(
                    quizIsOptional
                      ? 'ঐচ্ছিক কুইজ সংরক্ষিত হয়েছে! এই নম্বর রিপোর্ট কার্ডে যোগ হবে না।'
                      : 'বাধ্যতামূলক কুইজ সংরক্ষিত হয়েছে! নম্বর রিপোর্ট কার্ডে যোগ হবে এবং ক্লাস পার্টিসিপেশনে গণনা করা হবে।',
                    5000
                  );
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                সংরক্ষণ করুন ও বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* End Class Button - Fixed at bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-40">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => router.push("/dashboard")}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-4 rounded-xl transition-all shadow-lg active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>ক্লাস শেষ করুন</span>
          </button>
        </div>
      </div>

      {/* Quiz Config Modal */}
      <QuizConfigModal
        isOpen={showQuizConfigModal}
        onClose={() => setShowQuizConfigModal(false)}
        onGenerate={(config) => {
          generateQuiz(config);
          setShowQuizConfigModal(false);
        }}
        topicName={topic?.name || ""}
      />

      {/* Toast Notifications */}
      <Toast toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
