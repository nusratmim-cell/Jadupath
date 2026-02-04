"use client";

import { useEffect, useState, type ReactElement } from "react";
import { useRouter, useParams } from "next/navigation";
import { getCurrentUser, type SessionUser } from "@/lib/auth";
import { InteractiveQuiz } from "@/components";
import AIThinking from "@/components/AIThinking";
import {
  TRAINING_COURSES,
  isTopicCompleted,
  isTopicUnlocked,
  completeTrainingTopic,
  type TrainingCourse,
  type TrainingChapter,
  type TrainingTopic,
} from "@/lib/data";

type LearningPhase = "materials" | "completed";
type MaterialTab = "book" | "video" | "ai" | "quiz";

// Format AI response text - convert markdown to HTML with LaTeX-like styling
function formatAIResponse(text: string): ReactElement {
  const lines = text.split('\n');
  const elements: ReactElement[] = [];
  let key = 0;
  let inCodeBlock = false;
  let codeBlockLines: string[] = [];
  let codeBlockLang = '';

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Handle code blocks (```language)
    if (line.trim().startsWith('```')) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeBlockLang = line.trim().substring(3).trim();
        codeBlockLines = [];
      } else {
        inCodeBlock = false;
        elements.push(
          <div key={key++} className="my-3 bg-slate-900 rounded-lg overflow-hidden shadow-md">
            <div className="bg-slate-800 px-3 py-1.5 flex items-center justify-between">
              <span className="text-xs text-slate-400 font-mono">{codeBlockLang || 'code'}</span>
            </div>
            <pre className="p-3 overflow-x-auto">
              <code className="text-sm text-green-400 font-mono">{codeBlockLines.join('\n')}</code>
            </pre>
          </div>
        );
        codeBlockLines = [];
        codeBlockLang = '';
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      continue;
    }

    if (!line.trim()) {
      elements.push(<div key={key++} className="h-2" />);
      continue;
    }

    // H2 Headings (## text)
    if (line.startsWith('## ')) {
      const heading = line.substring(3).trim();
      elements.push(
        <h2 key={key++} className="text-base font-bold text-slate-900 mt-4 mb-2 pb-1.5 border-b-2 border-purple-200">
          {heading}
        </h2>
      );
      continue;
    }

    // H3 Headings (### text)
    if (line.startsWith('### ')) {
      const heading = line.substring(4).trim();
      elements.push(
        <h3 key={key++} className="text-sm font-bold text-slate-800 mt-3 mb-1.5">
          {heading}
        </h3>
      );
      continue;
    }

    // Numbered lists
    const numberedMatch = line.trim().match(/^(\d+[\u0966-\u096F]*|[০-৯]+)\.\s+(.+)$/);
    if (numberedMatch) {
      const number = numberedMatch[1];
      const content = numberedMatch[2];
      const formatted = formatInlineStyles(content);
      elements.push(
        <div key={key++} className="flex items-start gap-2.5 ml-1.5 mb-1.5 leading-relaxed">
          <span className="text-purple-700 font-bold flex-shrink-0 min-w-[20px] text-xs">{number}.</span>
          <span className="text-xs text-slate-800">{formatted}</span>
        </div>
      );
      continue;
    }

    // Bullet points
    if (line.trim().match(/^[•\-\*]\s+/)) {
      const bulletText = line.trim().replace(/^[•\-\*]\s+/, '');
      const formatted = formatInlineStyles(bulletText);
      elements.push(
        <div key={key++} className="flex items-start gap-2.5 ml-1.5 mb-1.5 leading-relaxed">
          <span className="text-purple-600 text-base leading-none flex-shrink-0 mt-0.5">•</span>
          <span className="text-xs text-slate-800">{formatted}</span>
        </div>
      );
      continue;
    }

    // Regular paragraphs
    const formatted = formatInlineStyles(line);
    elements.push(
      <p key={key++} className="text-xs text-slate-800 mb-2 leading-relaxed">
        {formatted}
      </p>
    );
  }

  return <div className="space-y-0.5">{elements}</div>;
}

// Format inline styles (bold, code)
function formatInlineStyles(text: string): (ReactElement | string)[] {
  const parts: (ReactElement | string)[] = [];
  let remaining = text;
  let key = 0;
  let i = 0;
  let currentSegment = '';

  while (i < remaining.length) {
    // Bold **text**
    if (remaining[i] === '*' && remaining[i + 1] === '*') {
      const closeIndex = remaining.indexOf('**', i + 2);
      if (closeIndex !== -1) {
        if (currentSegment) {
          parts.push(currentSegment);
          currentSegment = '';
        }
        const boldText = remaining.substring(i + 2, closeIndex);
        parts.push(
          <strong key={`bold-${key++}`} className="font-bold text-slate-900">
            {boldText}
          </strong>
        );
        i = closeIndex + 2;
        continue;
      }
    }

    // Code `text`
    if (remaining[i] === '`') {
      const closeIndex = remaining.indexOf('`', i + 1);
      if (closeIndex !== -1) {
        if (currentSegment) {
          parts.push(currentSegment);
          currentSegment = '';
        }
        const codeText = remaining.substring(i + 1, closeIndex);
        parts.push(
          <code key={`code-${key++}`} className="bg-slate-800 text-green-400 px-1.5 py-0.5 rounded text-xs font-mono border border-slate-700">
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

// Sample quiz data structure
interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

export default function TopicLearningPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.courseId as string;
  const chapterId = params.chapterId as string;
  const topicId = params.topicId as string;

  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [course, setCourse] = useState<TrainingCourse | null>(null);
  const [chapter, setChapter] = useState<TrainingChapter | null>(null);
  const [topic, setTopic] = useState<TrainingTopic | null>(null);

  // Learning flow state
  const [phase, setPhase] = useState<LearningPhase>("materials");
  const [activeTab, setActiveTab] = useState<MaterialTab>("book");

  // Image viewer state
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Quiz state
  const [quiz, setQuiz] = useState<QuizQuestion[]>([]);
  const [showQuiz, setShowQuiz] = useState(false);
  const [isQuizLoading, setIsQuizLoading] = useState(false);
  const [quizResults, setQuizResults] = useState<{ score: number; total: number; passed: boolean } | null>(null);

  // AI Chat state
  const [aiMessages, setAiMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [aiInput, setAiInput] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);

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

    // Find chapter and topic
    const foundChapter = foundCourse.chapters.find(ch => ch.id === chapterId);
    if (!foundChapter) {
      router.push("/training");
      return;
    }
    setChapter(foundChapter);

    const foundTopic = foundChapter.topics.find(t => t.id === topicId);
    if (!foundTopic) {
      router.push("/training");
      return;
    }
    setTopic(foundTopic);

    // Check if topic is unlocked
    if (!isTopicUnlocked(currentUser.id, courseId, chapterId, topicId)) {
      router.push("/training");
      return;
    }

    // Generate quiz for this topic using API with training images
    const fetchQuiz = async () => {
      setIsQuizLoading(true);
      try {
        const response = await fetch("/api/generate-quiz", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topicId,
            topicName: foundTopic.name,
            chapterName: foundChapter.name,
            courseName: foundCourse.name,
            isTrainingQuiz: true,
            trainingImages: foundTopic.images || [], // Send local image paths for AI extraction
            questionCount: 5,
          }),
        });

        const data = await response.json();
        if (data.success && data.questions) {
          setQuiz(data.questions);
        } else {
          console.error("Quiz generation failed:", data.error);
        }
      } catch (error) {
        console.error("Failed to generate quiz:", error);
      } finally {
        setIsQuizLoading(false);
      }
    };

    fetchQuiz();

    // Check if already completed - don't set phase, allow reviewing content
    // Users can always access materials even after completion
    const alreadyCompleted = isTopicCompleted(currentUser.id, courseId, chapterId, topicId);
    if (alreadyCompleted) {
      // Show a completion indicator but don't lock content
      // They can still review materials and retake quiz if needed
    }

    setIsLoading(false);
  }, [router, courseId, chapterId, topicId]);

  // Handle quiz completion
  const handleQuizComplete = (score: number) => {
    const total = quiz.length;
    const passed = score >= 80;

    setQuizResults({ score, total, passed });
    setShowQuiz(false);

    if (passed && user) {
      completeTrainingTopic(user.id, courseId, chapterId, topicId, score);
      // Don't set phase to "completed" immediately - let them see results first
    }
  };

  // Handle AI message send
  const handleSendAiMessage = async () => {
    if (!aiInput.trim() || !topic || !chapter) return;

    const userMessage = aiInput.trim();
    setAiInput("");
    setAiMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsAiLoading(true);

    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: userMessage,
          topicName: topic.name,
          chapterName: chapter.name,
          chatHistory: aiMessages.slice(-10),
        }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = "";

      if (reader) {
        setAiMessages(prev => [...prev, { role: "assistant", content: "" }]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          accumulatedText += chunk;

          setAiMessages(prev => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1] = {
              role: "assistant",
              content: accumulatedText,
            };
            return newMessages;
          });
        }
      }
    } catch (error) {
      console.error("AI error:", error);
      setAiMessages(prev => [
        ...prev,
        { role: "assistant", content: "দুঃখিত, এই মুহূর্তে উত্তর দিতে পারছি না। অনুগ্রহ করে আবার চেষ্টা করুন।" },
      ]);
    } finally {
      setIsAiLoading(false);
    }
  };

  if (isLoading || !course || !chapter || !topic || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#cf278d] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm text-slate-600">লোড হচ্ছে...</p>
        </div>
      </div>
    );
  }

  // Materials Phase
  if (phase === "materials") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100">
        {/* Header */}
        <header className="bg-white shadow-md sticky top-0 z-50">
          <div className="max-w-4xl mx-auto px-4 py-2">
            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1.5">
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
              <button onClick={() => router.push(`/training/${courseId}/${chapterId}`)} className="hover:text-purple-600 transition-colors">
                {chapter.name}
              </button>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className="text-gray-700 font-semibold">টপিক</span>
            </div>

            <div className="flex items-center justify-between mb-2">
              <button
                onClick={() => router.push(`/training/${courseId}/${chapterId}`)}
                className="flex items-center gap-1.5 text-gray-600 hover:text-gray-800 font-semibold text-xs"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                ফিরে যান
              </button>
              <div className="flex-1 text-center">
                <div className="flex items-center justify-center gap-2">
                  <h1 className="text-base font-bold text-gray-800">{topic.name}</h1>
                  {user && isTopicCompleted(user.id, courseId, chapterId, topicId) && (
                    <div className="inline-flex items-center gap-1 bg-green-500 text-white px-2 py-0.5 rounded-full text-xs font-semibold">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                      সম্পন্ন
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1.5 border-t pt-2">
              <button
                onClick={() => setActiveTab("book")}
                className={`flex-1 py-1.5 px-3 rounded-lg font-semibold text-xs transition-all ${
                  activeTab === "book"
                    ? "bg-purple-600 text-white shadow-lg"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                শিক্ষক সহায়িকা বই
              </button>
              <button
                onClick={() => setActiveTab("video")}
                className={`flex-1 py-1.5 px-3 rounded-lg font-semibold text-xs transition-all ${
                  activeTab === "video"
                    ? "bg-purple-600 text-white shadow-lg"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                ভিডিও
              </button>
              <button
                onClick={() => setActiveTab("quiz")}
                className={`flex-1 py-1.5 px-3 rounded-lg font-semibold text-xs transition-all ${
                  activeTab === "quiz"
                    ? "bg-purple-600 text-white shadow-lg"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                কুইজ
              </button>
              <button
                onClick={() => setActiveTab("ai")}
                className={`flex-1 py-1.5 px-3 rounded-lg font-semibold text-xs transition-all ${
                  activeTab === "ai"
                    ? "bg-purple-600 text-white shadow-lg"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                শিখো সহায়ক
              </button>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="max-w-4xl mx-auto px-4 py-4">
          {/* Book Tab - Image Gallery Viewer */}
          {activeTab === "book" && (
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-white mb-0.5">শিক্ষক সহায়িকা</h2>
                    <p className="text-white/90 text-xs">{topic.name}</p>
                  </div>
                  {topic.images && topic.images.length > 0 && (
                    <div className="bg-white/20 px-3 py-1 rounded-full">
                      <span className="text-white text-xs font-semibold">
                        পৃষ্ঠা {currentImageIndex + 1} / {topic.images.length}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Image Viewer */}
              {topic.images && topic.images.length > 0 ? (
                <div className="relative">
                  {/* Main Image */}
                  <div className="relative bg-gray-100 flex items-center justify-center min-h-[500px]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={topic.images[currentImageIndex].startsWith('http') ? topic.images[currentImageIndex] : `/${topic.images[currentImageIndex]}`}
                      alt={`পৃষ্ঠা ${currentImageIndex + 1}`}
                      className="max-w-full max-h-[600px] object-contain"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = '/placeholder-page.png';
                      }}
                    />

                    {/* Navigation Arrows */}
                    {currentImageIndex > 0 && (
                      <button
                        onClick={() => setCurrentImageIndex(prev => prev - 1)}
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 hover:bg-white rounded-full shadow-lg flex items-center justify-center transition-all"
                        aria-label="আগের পৃষ্ঠা"
                      >
                        <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                    )}
                    {currentImageIndex < topic.images.length - 1 && (
                      <button
                        onClick={() => setCurrentImageIndex(prev => prev + 1)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 hover:bg-white rounded-full shadow-lg flex items-center justify-center transition-all"
                        aria-label="পরের পৃষ্ঠা"
                      >
                        <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    )}
                  </div>

                  {/* Thumbnail Navigation */}
                  <div className="p-3 bg-gray-50 border-t">
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {topic.images.map((img, idx) => (
                        <button
                          key={idx}
                          onClick={() => setCurrentImageIndex(idx)}
                          className={`flex-shrink-0 w-16 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                            idx === currentImageIndex
                              ? 'border-purple-600 shadow-lg'
                              : 'border-gray-200 hover:border-purple-300'
                          }`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={img.startsWith('http') ? img : `/${img}`}
                            alt={`পৃষ্ঠা ${idx + 1}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = '/placeholder-page.png';
                            }}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : topic.pdfUrl ? (
                /* Fallback to PDF if no images but has PDF URL */
                <div className="relative">
                  <iframe
                    src={`${topic.pdfUrl}#page=${topic.pdfStartPage || 1}&toolbar=1&navpanes=1&scrollbar=1`}
                    className="w-full h-[600px] border-0"
                    title="শিক্ষক সহায়িকা বই"
                  />
                </div>
              ) : (
                /* No content available */
                <div className="p-8 text-center text-gray-500">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold mb-1">কনটেন্ট শীঘ্রই আসছে</p>
                  <p className="text-xs text-gray-400">এই টপিকের শিক্ষক সহায়িকা প্রস্তুত করা হচ্ছে</p>
                </div>
              )}
            </div>
          )}

          {/* Quiz Tab */}
          {activeTab === "quiz" && (
            <div>
              {showQuiz ? (
                // Quiz in progress
                <div>
                  <button
                    onClick={() => setShowQuiz(false)}
                    className="mb-3 px-4 py-1.5 bg-white rounded-full shadow-md text-gray-700 font-semibold text-xs hover:shadow-lg transition-shadow"
                  >
                    ← পিছনে যান
                  </button>
                  <InteractiveQuiz
                    questions={quiz}
                    onComplete={handleQuizComplete}
                    passingScore={80}
                  />
                </div>
              ) : quizResults ? (
                // Quiz results screen
                <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                  <div className="p-6 bg-gradient-to-br from-purple-50 to-indigo-50">
                    <div className="max-w-2xl mx-auto">
                      {/* Results Header */}
                      <div className="text-center mb-6">
                        <div className={`w-20 h-20 ${quizResults.passed ? 'bg-green-500' : 'bg-orange-500'} rounded-full mx-auto mb-3 flex items-center justify-center`}>
                          {quizResults.passed ? (
                            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                          )}
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                          {quizResults.passed ? 'অভিনন্দন! আপনি পাস করেছেন!' : 'আরেকবার চেষ্টা করুন'}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {quizResults.passed
                            ? 'আপনি সফলভাবে কুইজ সম্পন্ন করেছেন।'
                            : 'পাসের জন্য ৮০% নম্বর প্রয়োজন। আবার চেষ্টা করুন।'}
                        </p>
                      </div>

                      {/* Score Display */}
                      <div className="bg-white rounded-xl p-6 mb-6 shadow-md">
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div>
                            <p className="text-3xl font-bold text-purple-600 mb-1">
                              {Math.round(Math.min(100, quizResults.score))}%
                            </p>
                            <p className="text-xs text-gray-600 font-medium">আপনার স্কোর</p>
                          </div>
                          <div>
                            <p className="text-3xl font-bold text-green-600 mb-1">
                              {Math.min(quizResults.total, Math.round(quizResults.score * quizResults.total / 100))}
                            </p>
                            <p className="text-xs text-gray-600 font-medium">সঠিক উত্তর</p>
                          </div>
                          <div>
                            <p className="text-3xl font-bold text-red-600 mb-1">
                              {Math.max(0, quizResults.total - Math.round(quizResults.score * quizResults.total / 100))}
                            </p>
                            <p className="text-xs text-gray-600 font-medium">ভুল উত্তর</p>
                          </div>
                        </div>
                      </div>

                      {/* Success/Unlock Message */}
                      {quizResults.passed && (
                        <div className="bg-gradient-to-r from-green-100 to-emerald-100 border-2 border-green-500 rounded-xl p-4 mb-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                              </svg>
                            </div>
                            <div className="flex-1">
                              <p className="font-bold text-green-800 text-sm mb-1">পরবর্তী টপিক আনলক হয়েছে!</p>
                              <p className="text-xs text-green-700">
                                আপনি এখন পরবর্তী টপিকে এগিয়ে যেতে পারবেন।
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="space-y-2">
                        {quizResults.passed ? (
                          <>
                            <button
                              onClick={() => router.push(`/training/${courseId}/${chapterId}`)}
                              className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-bold text-sm hover:shadow-xl transition-shadow"
                            >
                              অধ্যায়ে ফিরে যান
                            </button>
                            <button
                              onClick={() => {
                                setQuizResults(null);
                                setActiveTab("book");
                              }}
                              className="w-full py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg font-semibold text-sm hover:bg-gray-50 transition-colors"
                            >
                              টপিক পুনরায় দেখুন
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                setQuizResults(null);
                                setShowQuiz(true);
                              }}
                              className="w-full py-2.5 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg font-bold text-sm hover:shadow-xl transition-shadow"
                            >
                              আবার কুইজ দিন
                            </button>
                            <button
                              onClick={() => {
                                setQuizResults(null);
                                setActiveTab("book");
                              }}
                              className="w-full py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg font-semibold text-sm hover:bg-gray-50 transition-colors"
                            >
                              শিক্ষক সহায়িকা আবার পড়ুন
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                // Quiz start screen
                <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                  <div className="p-4 bg-gradient-to-br from-purple-50 to-indigo-50">
                    <div className="max-w-2xl mx-auto">
                      {isQuizLoading ? (
                        <div className="py-4">
                          <AIThinking type="quiz" />
                        </div>
                      ) : (
                        <>
                          <div className="text-center mb-4">
                            <div className="w-12 h-12 bg-purple-600 rounded-full mx-auto mb-2 flex items-center justify-center">
                              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                            <h3 className="text-base font-bold text-gray-900 mb-1">প্রস্তুত? এখন কুইজ দিন!</h3>
                            <p className="text-xs text-gray-700">
                              শিক্ষক সহায়িকা পড়ে কুইজ সম্পন্ন করুন
                            </p>
                          </div>

                          <div className="bg-white border border-purple-200 rounded-lg p-3 mb-4">
                            <div className="grid md:grid-cols-3 gap-2 text-center">
                              <div>
                                <p className="text-lg font-bold text-purple-600 mb-0.5">৫টি</p>
                                <p className="text-xs text-gray-600 font-medium">প্রশ্ন</p>
                              </div>
                              <div>
                                <p className="text-lg font-bold text-purple-600 mb-0.5">৮০%</p>
                                <p className="text-xs text-gray-600 font-medium">পাসিং স্কোর</p>
                              </div>
                              <div>
                                <p className="text-lg font-bold text-purple-600 mb-0.5">৪টি</p>
                                <p className="text-xs text-gray-600 font-medium">সঠিক উত্তর প্রয়োজন</p>
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => setShowQuiz(true)}
                            disabled={quiz.length === 0}
                            className="w-full py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-bold text-sm hover:shadow-xl transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            কুইজ শুরু করুন
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Video Tab */}
          {activeTab === "video" && (
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              {/* Video Header */}
              <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-3">
                <h2 className="text-base font-bold text-white mb-0.5">ভিডিও শিক্ষা</h2>
                <p className="text-white/90 text-xs">{topic.name}</p>
              </div>

              {topic.videoUrl || topic.video?.url ? (
                <>
                  {/* YouTube Video */}
                  <div className="relative aspect-video bg-gray-900">
                    <iframe
                      src={topic.videoUrl || topic.video?.url || "https://www.youtube.com/embed/XRiKMbUckwo"}
                      className="w-full h-full border-0"
                      title="ভিডিও শিক্ষা"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>

                  {/* Video Info */}
                  <div className="p-4 bg-gradient-to-br from-purple-50 to-indigo-50">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-bold text-gray-800 mb-1">
                          শিক্ষণীয় ভিডিও
                        </h3>
                        <p className="text-xs text-gray-600 leading-relaxed">
                          এই ভিডিওটি দেখে টপিক সম্পর্কে আরও ভালোভাবে বুঝুন। প্রয়োজনে একাধিকবার দেখতে পারেন।
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                /* No video available */
                <div className="p-8 text-center text-gray-500">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold mb-1">ভিডিও শীঘ্রই আসছে</p>
                  <p className="text-xs text-gray-400">এই টপিকের ভিডিও প্রস্তুত করা হচ্ছে</p>
                </div>
              )}
            </div>
          )}

          {/* AI Tab */}
          {activeTab === "ai" && (
            <div className="bg-white rounded-xl shadow-lg p-4 h-[550px] flex flex-col">
              <h2 className="text-base font-bold text-gray-800 mb-3">শিখো সহায়ক</h2>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto mb-3 space-y-2 bg-gray-50 rounded-lg p-3">
                {aiMessages.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                      </svg>
                    </div>
                    <p className="text-sm font-semibold mb-0.5">সহায়কের সাথে কথা বলুন</p>
                    <p className="text-xs text-gray-400">এই টপিক সম্পর্কে যেকোনো প্রশ্ন করুন</p>
                  </div>
                ) : (
                  aiMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex gap-1.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      {msg.role === "assistant" && (
                        <div className="w-7 h-7 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                        </div>
                      )}
                      <div
                        className={`max-w-[70%] px-3 py-2 rounded-xl ${
                          msg.role === "user"
                            ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white"
                            : "bg-white border border-gray-200 text-gray-800"
                        }`}
                      >
                        {msg.role === "user" ? (
                          <p className="text-xs whitespace-pre-wrap">{msg.content}</p>
                        ) : (
                          <div className="text-xs">{formatAIResponse(msg.content)}</div>
                        )}
                      </div>
                      {msg.role === "user" && (
                        <div className="w-7 h-7 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                      )}
                    </div>
                  ))
                )}
                {isAiLoading && (
                  <div className="flex justify-center py-2">
                    <AIThinking type="default" />
                  </div>
                )}
              </div>

              {/* Input Area */}
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendAiMessage()}
                  placeholder="আপনার প্রশ্ন লিখুন..."
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-purple-500"
                  disabled={isAiLoading}
                />
                <button
                  onClick={handleSendAiMessage}
                  disabled={isAiLoading || !aiInput.trim()}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-bold text-xs disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-shadow"
                >
                  পাঠান
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    );
  }

  // Completed Phase
  if (phase === "completed") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-white rounded-xl shadow-lg p-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h1 className="text-xl font-bold text-gray-800 mb-2">অভিনন্দন!</h1>
            <p className="text-sm text-gray-600 mb-4">
              আপনি সফলভাবে এই টপিক সম্পন্ন করেছেন!
            </p>

            <div className="bg-gradient-to-r from-purple-100 to-indigo-100 rounded-lg p-4 mb-4">
              <h2 className="text-base font-bold text-gray-800 mb-2">{topic.name}</h2>
              <p className="text-xs text-gray-600">{course.name} • {chapter.name}</p>
              <div className="mt-3 inline-flex items-center gap-2 px-4 py-1.5 bg-green-500 text-white rounded-full font-bold text-xs">
                ৫টি প্রশ্নের উত্তর সম্পন্ন
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => router.push("/training")}
                className="w-full py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-bold text-sm hover:shadow-lg transition-shadow"
              >
                ড্যাশবোর্ডে যান
              </button>
              <button
                onClick={() => {
                  setPhase("materials");
                  setActiveTab("book");
                }}
                className="w-full py-2 bg-white border border-gray-200 text-gray-700 rounded-lg font-semibold text-sm hover:bg-gray-50 transition-colors"
              >
                আবার অনুশীলন করুন
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
