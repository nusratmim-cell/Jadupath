"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  getCurrentUser,
  getProfileByUserId,
  type SessionUser,
  type TeacherProfile,
} from "@/lib/auth";
import {
  SUBJECTS,
  CLASS_LABELS,
  toBengaliNumber,
  type Topic,
  type Chapter,
} from "@/lib/data";
import { getTopicById } from "@/lib/content";

// Learning modes matching Google's Learn Your Way
type LearningMode = "source" | "immersive" | "slides" | "audio" | "mindmap" | "quiz";

// Student interests for personalization
type Interest = "sports" | "music" | "food" | "animals" | "games" | "nature";

interface InterestConfig {
  id: Interest;
  icon: string;
  label: string;
  examples: { [key: string]: string };
}

const INTERESTS: InterestConfig[] = [
  {
    id: "sports",
    icon: "⚽",
    label: "খেলাধুলা",
    examples: {
      "comparison": "রাফি ৫টি গোল করেছে। সাকিব ৩টি গোল করেছে। কে বেশি গোল করেছে?",
      "counting": "মাঠে ৭ জন খেলোয়াড় আছে। আরো ৩ জন এলো। এখন মোট কতজন?",
      "subtraction": "দলে ১০ জন খেলোয়াড় ছিল। ৪ জন চলে গেল। এখন কতজন আছে?",
    }
  },
  {
    id: "music",
    icon: "🎵",
    label: "গান",
    examples: {
      "comparison": "রিমা ৫টি গান জানে। নিমা ৩টি গান জানে। কে বেশি গান জানে?",
      "counting": "গায়ক ৪টি গান গাইলেন। আরো ২টি গাইলেন। মোট কয়টি গান?",
      "subtraction": "প্লেলিস্টে ১০টি গান ছিল। ৩টি মুছে দিলাম। এখন কয়টি আছে?",
    }
  },
  {
    id: "food",
    icon: "🍕",
    label: "খাবার",
    examples: {
      "comparison": "থালায় ৫টি রসগোল্লা আছে। অন্য থালায় ৩টি। কোথায় বেশি?",
      "counting": "মা ৪টি পিঠা দিল। বাবা ৩টি দিল। মোট কয়টি পিঠা পেলাম?",
      "subtraction": "৮টি বিস্কুট ছিল। ৫টি খেয়ে ফেললাম। এখন কয়টি আছে?",
    }
  },
  {
    id: "animals",
    icon: "🐾",
    label: "প্রাণী",
    examples: {
      "comparison": "পুকুরে ৫টি হাঁস আছে। ৩টি মুরগি আছে। কোনটি বেশি?",
      "counting": "খাঁচায় ৪টি পাখি ছিল। আরো ২টি এলো। এখন কয়টি পাখি?",
      "subtraction": "গোয়ালে ৭টি গরু ছিল। ৩টি বিক্রি হলো। এখন কয়টি আছে?",
    }
  },
  {
    id: "games",
    icon: "🎮",
    label: "গেম",
    examples: {
      "comparison": "রাকিব ৫ পয়েন্ট পেয়েছে। সামি ৩ পয়েন্ট। কে বেশি পেয়েছে?",
      "counting": "১ম রাউন্ডে ৪ স্টার, ২য় রাউন্ডে ৩ স্টার। মোট কত স্টার?",
      "subtraction": "১০টি লাইফ ছিল। ৪টি শেষ হয়ে গেল। এখন কয়টি আছে?",
    }
  },
  {
    id: "nature",
    icon: "🌳",
    label: "প্রকৃতি",
    examples: {
      "comparison": "বাগানে ৫টি গোলাপ আছে। ৩টি গাঁদা আছে। কোনটি বেশি?",
      "counting": "গাছে ৪টি পাখি বসেছিল। আরো ২টি এলো। এখন কয়টি পাখি?",
      "subtraction": "৮টি পাতা ছিল। ৩টি ঝরে পড়ল। এখন কয়টি আছে?",
    }
  },
];

// Section content structure
interface ContentSection {
  id: string;
  title: string;
  content: string;
  hasQuiz: boolean;
  images?: { src: string; alt: string; caption: string }[];
  keyTerms?: string[];
  personalizedExample?: string;
}

// Quiz question for embedded quizzes
interface EmbeddedQuiz {
  sectionId: string;
  questions: {
    id: string;
    question: string;
    options: string[];
    correctAnswer: number;
  }[];
}

export default function LearnYourWayPage() {
  const router = useRouter();
  const params = useParams();
  const classId = params.classId as string;
  const subjectId = params.subjectId as string;
  const chapterId = params.chapterId as string;
  const topicId = params.topicId as string;

  const [user, setUser] = useState<SessionUser | null>(null);
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [topic, setTopic] = useState<Topic | null>(null);

  // Learning mode state
  const [activeMode, setActiveMode] = useState<LearningMode>("immersive");

  // Personalization state
  const [selectedInterest, setSelectedInterest] = useState<Interest>("sports");
  const [showInterestPicker, setShowInterestPicker] = useState(false);

  // Content state
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);
  const [completedSections, setCompletedSections] = useState<string[]>([]);

  // Quiz state
  const [showSectionQuiz, setShowSectionQuiz] = useState(false);
  const [currentQuizQuestion, setCurrentQuizQuestion] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<{ [questionId: string]: number }>({});
  const [showQuizResult, setShowQuizResult] = useState(false);

  const contentRef = useRef<HTMLDivElement>(null);

  // Get subject data
  const subject = SUBJECTS.find(s => s.id === subjectId);

  // Fetch topic data from Supabase
  useEffect(() => {
    const fetchTopic = async () => {
      try {
        const topicData = await getTopicById(classId, subjectId, chapterId, topicId);
        setTopic(topicData);
      } catch (error) {
        console.error("Error fetching topic:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTopic();
  }, [classId, subjectId, chapterId, topicId]);

  // Generate content sections based on topic
  const generateSections = (): ContentSection[] => {
    if (!topic) return [];

    const interest = INTERESTS.find(i => i.id === selectedInterest);

    return [
      {
        id: "intro",
        title: topic.name,
        content: `আমরা প্রতিদিন অনেক কিছু **তুলনা** করি। কোনটি **বেশি**? কোনটি **কম**? এটি বোঝা খুবই গুরুত্বপূর্ণ। এই পাঠে আমরা শিখব কীভাবে দুটি জিনিসের মধ্যে তুলনা করতে হয়।`,
        hasQuiz: false,
        keyTerms: ["তুলনা", "বেশি", "কম"],
        images: [
          {
            src: "/images/comparison-intro.svg",
            alt: "কম বনাম বেশি",
            caption: "চিত্র ১.১: কম ও বেশি বোঝার উদাহরণ"
          }
        ]
      },
      {
        id: "concept",
        title: "মূল ধারণা",
        content: `যখন আমরা দুটি জিনিসের সংখ্যা গুনি, তখন বুঝতে পারি কোনটি **বেশি** আর কোনটি **কম**। বড় সংখ্যা মানে বেশি, ছোট সংখ্যা মানে কম।`,
        hasQuiz: true,
        keyTerms: ["সংখ্যা", "বড়", "ছোট"],
        personalizedExample: interest?.examples["comparison"] || "",
        images: [
          {
            src: "/images/counting-objects.svg",
            alt: "গণনা করে তুলনা",
            caption: "চিত্র ১.২: গণনা করে তুলনা করা"
          }
        ]
      },
      {
        id: "examples",
        title: "উদাহরণ",
        content: `চলো কিছু উদাহরণ দেখি। নিচের ছবিতে বাম পাশে ৩টি জিনিস আছে, ডান পাশে ৫টি জিনিস আছে। ৫ বড় সংখ্যা, তাই ডান পাশে **বেশি**। ৩ ছোট সংখ্যা, তাই বাম পাশে **কম**।`,
        hasQuiz: true,
        keyTerms: ["৩", "৫", "বড়", "ছোট"],
        personalizedExample: interest?.examples["counting"] || "",
      },
      {
        id: "practice",
        title: "অনুশীলন",
        content: `এবার তুমি নিজে চেষ্টা করো! নিচের প্রশ্নগুলোর উত্তর দাও এবং দেখো তুমি কতটা শিখেছ।`,
        hasQuiz: true,
      },
    ];
  };

  const sections = generateSections();
  const currentSection = sections[activeSectionIndex];

  // Generate quiz for current section
  const generateSectionQuiz = (): EmbeddedQuiz => {
    const interest = INTERESTS.find(i => i.id === selectedInterest);

    return {
      sectionId: currentSection?.id || "",
      questions: [
        {
          id: "q1",
          question: "৪টি কলা আর ৮টি কলা - কোনটি বেশি?",
          options: ["৪টি কলা", "৮টি কলা", "দুটো সমান", "বলা যায় না"],
          correctAnswer: 1,
        },
        {
          id: "q2",
          question: "৬ আর ২ এর মধ্যে কোনটি কম?",
          options: ["৬", "২", "দুটো সমান", "কোনোটিই না"],
          correctAnswer: 1,
        },
        {
          id: "q3",
          question: interest?.id === "sports"
            ? "রাফির ৫টি বল, সাকিবের ৩টি বল। কার বেশি?"
            : "রিমার ৫টি আপেল, নিমার ৩টি আপেল। কার বেশি?",
          options: [
            interest?.id === "sports" ? "রাফির" : "রিমার",
            interest?.id === "sports" ? "সাকিবের" : "নিমার",
            "দুজনের সমান",
            "বলা যায় না"
          ],
          correctAnswer: 0,
        },
      ],
    };
  };

  const sectionQuiz = generateSectionQuiz();

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
    setIsLoading(false);
  }, [router]);

  const handleBack = () => {
    router.push(`/teach/${classId}/${subjectId}/${chapterId}/${topicId}`);
  };

  const handleSectionClick = (index: number) => {
    setActiveSectionIndex(index);
    setShowSectionQuiz(false);
    setCurrentQuizQuestion(0);
    setQuizAnswers({});
    setShowQuizResult(false);
    contentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleQuizAnswer = (questionId: string, answerIndex: number) => {
    setQuizAnswers(prev => ({ ...prev, [questionId]: answerIndex }));
  };

  const handleQuizSubmit = () => {
    setShowQuizResult(true);
    // Mark section as completed if all answers are correct
    const allCorrect = sectionQuiz.questions.every(
      q => quizAnswers[q.id] === q.correctAnswer
    );
    if (allCorrect && currentSection) {
      setCompletedSections(prev => [...prev, currentSection.id]);
    }
  };

  const handleNextSection = () => {
    if (activeSectionIndex < sections.length - 1) {
      handleSectionClick(activeSectionIndex + 1);
    }
  };

  const handlePrevSection = () => {
    if (activeSectionIndex > 0) {
      handleSectionClick(activeSectionIndex - 1);
    }
  };

  // Render bold text
  const renderFormattedText = (text: string) => {
    const parts = text.split(/\*\*(.*?)\*\*/g);
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        return <strong key={index} className="text-[#cf278d] font-bold">{part}</strong>;
      }
      return part;
    });
  };

  if (isLoading || !topic) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#E07B4C] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg text-slate-600">লোড হচ্ছে...</p>
        </div>
      </div>
    );
  }

  const currentInterest = INTERESTS.find(i => i.id === selectedInterest);

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col">
      {/* ==================== HEADER ==================== */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4">
          {/* Top Bar */}
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <button
                onClick={handleBack}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-lg font-bold text-slate-800">
                  শিখো <span className="text-[#E07B4C]">Learn Your Way</span>
                </h1>
              </div>
            </div>

            {/* Interest Badge */}
            <button
              onClick={() => setShowInterestPicker(true)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors"
            >
              <span>আগ্রহ</span>
              <span className="text-lg">{currentInterest?.icon}</span>
              <span className="font-medium">{CLASS_LABELS[classId]}</span>
              <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Right Actions */}
            <div className="flex items-center gap-2">
              <button className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </button>
              <button className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Learning Mode Tabs */}
          <div className="flex items-center gap-1 pb-3 overflow-x-auto">
            {[
              { id: "source", label: "মূলবই", path: `/teach/${classId}/${subjectId}/${chapterId}/${topicId}` },
              { id: "immersive", label: "ইমার্সিভ পাঠ", path: null },
              { id: "slides", label: "স্লাইড + বর্ণনা", path: `/learn/${classId}/${subjectId}/${chapterId}/${topicId}/slides` },
              { id: "audio", label: "অডিও পাঠ", path: `/learn/${classId}/${subjectId}/${chapterId}/${topicId}/audio` },
              { id: "mindmap", label: "মাইন্ড ম্যাপ", path: `/learn/${classId}/${subjectId}/${chapterId}/${topicId}/mindmap` },
              { id: "quiz", label: "কুইজ", path: null },
            ].map((mode) => (
              <button
                key={mode.id}
                onClick={() => {
                  if (mode.path) {
                    router.push(mode.path);
                  } else {
                    setActiveMode(mode.id as LearningMode);
                  }
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full font-medium text-sm whitespace-nowrap transition-all ${
                  activeMode === mode.id
                    ? "bg-[#E07B4C] text-white shadow-md"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <span>{mode.label}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ==================== MAIN CONTENT ==================== */}
      <main className="flex-1 flex max-w-7xl mx-auto w-full">

        {/* Left Sidebar - Table of Contents */}
        <aside className="w-72 bg-white border-r border-slate-200 p-4 hidden lg:block overflow-y-auto">
          <nav className="space-y-2">
            {sections.map((section, index) => (
              <div key={section.id}>
                <button
                  onClick={() => handleSectionClick(index)}
                  className={`w-full text-left p-3 rounded-xl transition-all ${
                    activeSectionIndex === index
                      ? "bg-[#FFF5F0] border-2 border-[#E07B4C]"
                      : "hover:bg-slate-50 border-2 border-transparent"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      completedSections.includes(section.id)
                        ? "bg-green-500 border-green-500"
                        : "border-slate-300"
                    }`}>
                      {completedSections.includes(section.id) && (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium text-sm ${
                        activeSectionIndex === index ? "text-[#E07B4C]" : "text-slate-700"
                      }`}>
                        {section.title}
                      </p>
                    </div>
                  </div>
                </button>

                {/* Quiz button for sections with quiz */}
                {section.hasQuiz && activeSectionIndex === index && (
                  <button
                    onClick={() => setShowSectionQuiz(true)}
                    className="ml-8 mt-2 px-3 py-1.5 bg-[#E07B4C] text-white text-xs font-medium rounded-lg hover:bg-[#d06a3c] transition-colors"
                  >
                    কুইজ দাও
                  </button>
                )}
              </div>
            ))}
          </nav>
        </aside>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto" ref={contentRef}>
          <div className="max-w-3xl mx-auto px-6 py-8">

            {/* Section Title with Navigation */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-800">
                {currentSection?.title}
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrevSection}
                  disabled={activeSectionIndex === 0}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={handleNextSection}
                  disabled={activeSectionIndex === sections.length - 1}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Main Content */}
            <div className="prose prose-lg max-w-none">
              {/* Content Text */}
              <p className="text-slate-700 leading-relaxed text-lg relative">
                {renderFormattedText(currentSection?.content || "")}
                {/* Annotation dot */}
                <span className="absolute -right-8 top-0 w-3 h-3 bg-[#E07B4C] rounded-full"></span>
              </p>

              {/* Image/Diagram */}
              {currentSection?.images && currentSection.images.length > 0 && (
                <div className="my-8 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  <div className="text-center mb-4">
                    <h4 className="text-lg font-semibold text-slate-700">
                      {currentSection.images[0].alt}
                    </h4>
                    <p className="text-sm text-slate-500">
                      ({currentSection.images[0].alt} - Illustration)
                    </p>
                  </div>

                  {/* Visual Comparison */}
                  <div className="flex items-center justify-center gap-12 py-8 bg-slate-50 rounded-xl">
                    <div className="text-center">
                      <div className="flex gap-2 justify-center mb-2">
                        <div className="w-12 h-12 bg-red-500 rounded-full"></div>
                        <div className="w-12 h-12 bg-red-500 rounded-full"></div>
                        <div className="w-12 h-12 bg-red-500 rounded-full"></div>
                      </div>
                      <p className="text-xl font-bold text-slate-700">৩টি</p>
                      <p className="text-sm text-slate-500">কম</p>
                    </div>
                    <div className="text-3xl text-slate-400">&lt;</div>
                    <div className="text-center">
                      <div className="flex gap-2 justify-center mb-2">
                        <div className="w-12 h-12 bg-red-500 rounded-full"></div>
                        <div className="w-12 h-12 bg-red-500 rounded-full"></div>
                        <div className="w-12 h-12 bg-red-500 rounded-full"></div>
                        <div className="w-12 h-12 bg-red-500 rounded-full"></div>
                        <div className="w-12 h-12 bg-red-500 rounded-full"></div>
                      </div>
                      <p className="text-xl font-bold text-slate-700">৫টি</p>
                      <p className="text-sm text-slate-500">বেশি</p>
                    </div>
                  </div>

                  <p className="text-center text-sm text-slate-500 mt-4">
                    {currentSection.images[0].caption}
                  </p>
                </div>
              )}

              {/* Personalized Example Box */}
              {currentSection?.personalizedExample && (
                <div className="my-8 bg-gradient-to-r from-[#FFF5F0] to-[#FEF3E7] border-l-4 border-[#E07B4C] rounded-r-xl p-5 relative">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{currentInterest?.icon}</span>
                    <div>
                      <p className="text-slate-700 font-medium">
                        {currentSection.personalizedExample}
                      </p>
                      <p className="text-xs text-slate-500 mt-2">
                        ↑ তোমার পছন্দ ({currentInterest?.label}) অনুযায়ী উদাহরণ
                      </p>
                    </div>
                  </div>
                  {/* Annotation dot */}
                  <span className="absolute -right-3 top-4 w-3 h-3 bg-[#E07B4C] rounded-full"></span>
                </div>
              )}

              {/* Figure with Labels */}
              {activeSectionIndex === 2 && (
                <div className="my-8 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm relative">
                  <div className="flex items-center justify-center gap-16 py-6">
                    <div className="text-center">
                      <div className="flex gap-1 justify-center mb-2">
                        <div className="w-8 h-8 bg-[#E07B4C] rounded-full"></div>
                        <div className="w-8 h-8 bg-[#E07B4C] rounded-full"></div>
                        <div className="w-8 h-8 bg-[#E07B4C] rounded-full"></div>
                      </div>
                      <p className="text-sm text-slate-500">(a)</p>
                      <p className="font-bold text-slate-700">৩টি</p>
                    </div>
                    <div className="text-center">
                      <div className="flex gap-1 justify-center mb-2 flex-wrap max-w-[200px]">
                        {[1,2,3,4,5,6,7].map(i => (
                          <div key={i} className="w-8 h-8 bg-[#cf278d] rounded-full"></div>
                        ))}
                      </div>
                      <p className="text-sm text-slate-500">(b)</p>
                      <p className="font-bold text-slate-700">৭টি</p>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-4 mt-4">
                    <p className="text-sm text-slate-600">
                      <strong>চিত্র ১.২</strong> (a) ৩টি বৃত্ত দেখাচ্ছে। (b) ৭টি বৃত্ত দেখাচ্ছে।
                      <br />৭ &gt; ৩, তাই (b) তে <strong>বেশি</strong>।
                    </p>
                  </div>

                  {/* Annotation dot */}
                  <span className="absolute -right-3 top-8 w-3 h-3 bg-[#E07B4C] rounded-full"></span>
                </div>
              )}
            </div>

            {/* ==================== EMBEDDED QUIZ ==================== */}
            {currentSection?.hasQuiz && (
              <div className="mt-12 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                {/* Quiz Header */}
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                  <div className="flex items-center gap-3">
                    <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <h3 className="font-bold text-slate-800">বোঝা যাচাই করো</h3>
                      <p className="text-sm text-slate-500">Take a quiz to check your understanding</p>
                    </div>
                    <span className="ml-auto text-sm text-slate-500">
                      {currentQuizQuestion + 1}/{sectionQuiz.questions.length}
                    </span>
                  </div>
                  {/* Progress Bar */}
                  <div className="mt-3 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#E07B4C] rounded-full transition-all duration-300"
                      style={{ width: `${((currentQuizQuestion + 1) / sectionQuiz.questions.length) * 100}%` }}
                    ></div>
                  </div>
                </div>

                {/* Quiz Content */}
                <div className="p-6">
                  {!showQuizResult ? (
                    <>
                      <p className="text-lg font-medium text-slate-800 mb-4">
                        প্রশ্ন {toBengaliNumber(currentQuizQuestion + 1)}: {sectionQuiz.questions[currentQuizQuestion].question}
                      </p>

                      <div className="space-y-3">
                        {sectionQuiz.questions[currentQuizQuestion].options.map((option, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleQuizAnswer(sectionQuiz.questions[currentQuizQuestion].id, idx)}
                            className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                              quizAnswers[sectionQuiz.questions[currentQuizQuestion].id] === idx
                                ? "border-[#E07B4C] bg-[#FFF5F0]"
                                : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                            }`}
                          >
                            <span className="font-medium text-slate-700">
                              {String.fromCharCode(2453 + idx)}। {option}
                            </span>
                          </button>
                        ))}
                      </div>

                      {/* Quiz Navigation */}
                      <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
                        {currentQuizQuestion < sectionQuiz.questions.length - 1 ? (
                          <button
                            onClick={() => setCurrentQuizQuestion(prev => prev + 1)}
                            disabled={quizAnswers[sectionQuiz.questions[currentQuizQuestion].id] === undefined}
                            className="px-6 py-2.5 bg-[#E07B4C] text-white font-medium rounded-xl hover:bg-[#d06a3c] transition-colors disabled:opacity-50 disabled:cursor-not-allowed ml-auto flex items-center gap-2"
                          >
                            পরের প্রশ্ন
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                          </button>
                        ) : (
                          <button
                            onClick={handleQuizSubmit}
                            disabled={Object.keys(quizAnswers).length < sectionQuiz.questions.length}
                            className="px-6 py-2.5 bg-green-500 text-white font-medium rounded-xl hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ml-auto flex items-center gap-2"
                          >
                            জমা দাও
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </>
                  ) : (
                    // Quiz Results
                    <div className="text-center py-4">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <h4 className="text-xl font-bold text-slate-800 mb-2">কুইজ শেষ!</h4>
                      <p className="text-slate-600 mb-6">
                        তুমি {sectionQuiz.questions.filter(q => quizAnswers[q.id] === q.correctAnswer).length}/{sectionQuiz.questions.length}টি সঠিক উত্তর দিয়েছ
                      </p>

                      <div className="flex items-center justify-center gap-4">
                        <button
                          onClick={() => {
                            setShowQuizResult(false);
                            setCurrentQuizQuestion(0);
                            setQuizAnswers({});
                          }}
                          className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          আবার শুরু
                        </button>
                        <button
                          onClick={handleNextSection}
                          disabled={activeSectionIndex === sections.length - 1}
                          className="px-6 py-2.5 bg-[#E07B4C] text-white font-medium rounded-xl hover:bg-[#d06a3c] transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                          পরের সেকশন
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Navigation Footer */}
            <div className="mt-12 flex items-center justify-between py-6 border-t border-slate-200">
              <button
                onClick={handlePrevSection}
                disabled={activeSectionIndex === 0}
                className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                আগের সেকশন
              </button>

              <div className="flex items-center gap-2">
                {sections.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSectionClick(idx)}
                    className={`w-2.5 h-2.5 rounded-full transition-colors ${
                      idx === activeSectionIndex
                        ? "bg-[#E07B4C]"
                        : completedSections.includes(sections[idx].id)
                        ? "bg-green-500"
                        : "bg-slate-300"
                    }`}
                  />
                ))}
              </div>

              <button
                onClick={handleNextSection}
                disabled={activeSectionIndex === sections.length - 1}
                className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                পরের সেকশন
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* ==================== INTEREST PICKER MODAL ==================== */}
      {showInterestPicker && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden animate-fadeIn">
            <div className="p-6">
              <h3 className="text-xl font-bold text-slate-800 mb-2">আগ্রহ নির্বাচন করো</h3>
              <p className="text-slate-500 text-sm mb-6">
                তোমার পছন্দ অনুযায়ী উদাহরণ দেখানো হবে
              </p>

              <div className="grid grid-cols-3 gap-3">
                {INTERESTS.map((interest) => (
                  <button
                    key={interest.id}
                    onClick={() => {
                      setSelectedInterest(interest.id);
                      setShowInterestPicker(false);
                    }}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                      selectedInterest === interest.id
                        ? "border-[#E07B4C] bg-[#FFF5F0]"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <span className="text-3xl">{interest.icon}</span>
                    <span className="text-sm font-medium text-slate-700">{interest.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
              <button
                onClick={() => setShowInterestPicker(false)}
                className="w-full py-3 bg-[#E07B4C] text-white font-medium rounded-xl hover:bg-[#d06a3c] transition-colors"
              >
                সংরক্ষণ করো
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Nav for Learning Modes */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-2 overflow-x-auto">
        <div className="flex items-center gap-2">
          {sections.map((section, index) => (
            <button
              key={section.id}
              onClick={() => handleSectionClick(index)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                activeSectionIndex === index
                  ? "bg-[#E07B4C] text-white"
                  : completedSections.includes(section.id)
                  ? "bg-green-100 text-green-700"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {section.title}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
