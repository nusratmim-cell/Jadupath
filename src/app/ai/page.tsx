"use client";

import { useEffect, useState, useRef, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import {
  getCurrentUser,
  getProfileByUserId,
  type TeacherProfile,
  type SessionUser,
} from "@/lib/auth";
import {
  CLASS_LABELS,
  SUBJECTS,
  toBengaliNumber,
  trackAIToolUsage,
  type Chapter,
} from "@/lib/data";
import { getCachedChapters } from "@/lib/content";
import BottomNav from "@/components/BottomNav";
import { ShikhoHeader, NoticeBar } from "@/components";
import AIThinking from "@/components/AIThinking";

// Tool types
type AITool = "planner" | "guide";

// Chat message types
interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

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
        // Start code block
        inCodeBlock = true;
        codeBlockLang = line.trim().substring(3).trim();
        codeBlockLines = [];
      } else {
        // End code block
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

    // If inside code block, accumulate lines
    if (inCodeBlock) {
      codeBlockLines.push(line);
      continue;
    }

    // Skip empty lines
    if (!line.trim()) {
      elements.push(<div key={key++} className="h-2" />);
      continue;
    }

    // H2 Headings (## text) - Large section headers
    if (line.startsWith('## ')) {
      const heading = line.substring(3).trim();
      elements.push(
        <h2 key={key++} className="text-lg font-bold text-slate-900 mt-5 mb-3 pb-2 border-b-2 border-blue-200">
          {heading}
        </h2>
      );
      continue;
    }

    // H3 Headings (### text) - Subsection headers
    if (line.startsWith('### ')) {
      const heading = line.substring(4).trim();
      elements.push(
        <h3 key={key++} className="text-base font-bold text-slate-800 mt-4 mb-2">
          {heading}
        </h3>
      );
      continue;
    }

    // Numbered lists (1. text, ২. text, etc.)
    const numberedMatch = line.trim().match(/^(\d+[\u0966-\u096F]*|[০-৯]+)\.\s+(.+)$/);
    if (numberedMatch) {
      const number = numberedMatch[1];
      const content = numberedMatch[2];
      const formatted = formatInlineStyles(content);
      elements.push(
        <div key={key++} className="flex items-start gap-3 ml-2 mb-2 leading-relaxed">
          <span className="text-blue-700 font-bold flex-shrink-0 min-w-[24px]">{number}.</span>
          <span className="text-sm text-slate-800">{formatted}</span>
        </div>
      );
      continue;
    }

    // Bullet points (• or - or * at start)
    if (line.trim().match(/^[•\-\*]\s+/)) {
      const bulletText = line.trim().replace(/^[•\-\*]\s+/, '');
      const formatted = formatInlineStyles(bulletText);
      elements.push(
        <div key={key++} className="flex items-start gap-3 ml-2 mb-2 leading-relaxed">
          <span className="text-blue-600 text-lg leading-none flex-shrink-0 mt-0.5">•</span>
          <span className="text-sm text-slate-800">{formatted}</span>
        </div>
      );
      continue;
    }

    // Regular paragraphs with justified text like LaTeX
    const formatted = formatInlineStyles(line);
    elements.push(
      <p key={key++} className="text-sm text-slate-800 mb-3 leading-relaxed text-justify">
        {formatted}
      </p>
    );
  }

  return <div className="space-y-1">{elements}</div>;
}

// Format inline styles (bold, italic, code) with enhanced LaTeX-like appearance
function formatInlineStyles(text: string): (ReactElement | string)[] {
  const parts: (ReactElement | string)[] = [];
  let remaining = text;
  let key = 0;

  // Process text character by character looking for markdown patterns
  let i = 0;
  let currentSegment = '';

  while (i < remaining.length) {
    // Check for bold **text**
    if (remaining.substring(i, i + 2) === '**') {
      // Find closing **
      const closeIndex = remaining.indexOf('**', i + 2);
      if (closeIndex !== -1) {
        // Add previous text
        if (currentSegment) {
          parts.push(currentSegment);
          currentSegment = '';
        }
        // Add bold text with LaTeX-like emphasis
        const boldText = remaining.substring(i + 2, closeIndex);
        parts.push(
          <strong key={`bold-${key++}`} className="font-extrabold text-slate-900 tracking-tight">
            {boldText}
          </strong>
        );
        i = closeIndex + 2;
        continue;
      }
    }

    // Check for code `text`
    if (remaining[i] === '`') {
      const closeIndex = remaining.indexOf('`', i + 1);
      if (closeIndex !== -1) {
        // Add previous text
        if (currentSegment) {
          parts.push(currentSegment);
          currentSegment = '';
        }
        // Add code text with monospace styling
        const codeText = remaining.substring(i + 1, closeIndex);
        parts.push(
          <code key={`code-${key++}`} className="bg-slate-800 text-green-400 px-2 py-0.5 rounded text-xs font-mono border border-slate-700">
            {codeText}
          </code>
        );
        i = closeIndex + 1;
        continue;
      }
    }

    // Regular character
    currentSegment += remaining[i];
    i++;
  }

  // Add any remaining text
  if (currentSegment) {
    parts.push(currentSegment);
  }

  return parts.length > 0 ? parts : [text];
}

// Lesson Plan structure
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

export default function AIToolsPage() {
  const router = useRouter();
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [user, setUser] = useState<SessionUser | null>(null);
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Selected tool
  const [activeTool, setActiveTool] = useState<AITool>("planner");

  // Lesson planner selections
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedChapter, setSelectedChapter] = useState<string>("");
  const [selectedTopic, setSelectedTopic] = useState<string>("");
  const [lessonDuration, setLessonDuration] = useState("40");

  // Chapter/topic data from database
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loadingChapters, setLoadingChapters] = useState(false);

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  // Generated lesson plan
  const [generatedPlan, setGeneratedPlan] = useState<LessonPlan | null>(null);

  // Get topics from current chapter
  const currentChapter = chapters.find(ch => ch.id === selectedChapter);
  const topics = currentChapter?.topics || [];
  const currentTopic = topics.find(t => t.id === selectedTopic);

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

    if (teacherProfile.classes.length > 0) {
      setSelectedClass(teacherProfile.classes[0]);
    }

    if (teacherProfile.subjects.length > 0) {
      setSelectedSubject(teacherProfile.subjects[0]);
    }

    setIsLoading(false);
  }, [router]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Fetch chapters when class or subject changes
  useEffect(() => {
    if (!selectedClass || !selectedSubject) {
      setChapters([]);
      return;
    }

    const fetchChapters = async () => {
      setLoadingChapters(true);
      setSelectedChapter("");
      setSelectedTopic("");

      try {
        const fetchedChapters = await getCachedChapters(selectedClass, selectedSubject);
        setChapters(fetchedChapters);

        // Auto-select first chapter if available
        if (fetchedChapters.length > 0) {
          setSelectedChapter(fetchedChapters[0].id);
        }
      } catch (error) {
        console.error("Error fetching chapters:", error);
        setChapters([]);
      } finally {
        setLoadingChapters(false);
      }
    };

    fetchChapters();
  }, [selectedClass, selectedSubject]);

  // Set first topic when chapter changes
  useEffect(() => {
    if (topics.length > 0 && !selectedTopic) {
      setSelectedTopic(topics[0].id);
    }
  }, [selectedChapter, topics]);

  const generateLessonPlan = async () => {
    if (!currentTopic || !currentChapter || !user) return;

    setIsGenerating(true);

    // Track AI tool usage
    trackAIToolUsage(user.id, "lesson-planner");

    const subjectName = SUBJECTS.find(s => s.id === selectedSubject)?.name || "";

    setMessages(prev => [...prev, {
      role: "user",
      content: `${CLASS_LABELS[selectedClass]} - ${subjectName} - ${currentTopic.name} এর জন্য ${lessonDuration} মিনিটের পাঠ পরিকল্পনা তৈরি করুন`,
      timestamp: new Date(),
    }]);

    try {
      const response = await fetch("/api/generate-lesson-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          className: CLASS_LABELS[selectedClass],
          subjectName: subjectName,
          chapterName: currentChapter.name,
          topicName: currentTopic.name,
          duration: lessonDuration,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate lesson plan");
      }

      const data = await response.json();

      if (data.success && data.plan) {
        const plan: LessonPlan = data.plan;
        setGeneratedPlan(plan);

        setMessages(prev => [...prev, {
          role: "assistant",
          content: `পাঠ পরিকল্পনা তৈরি হয়েছে। বিষয়: ${currentTopic.name}, সময়কাল: ${lessonDuration} মিনিট`,
          timestamp: new Date(),
        }]);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (error) {
      console.error("Error generating lesson plan:", error);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "দুঃখিত, পাঠ পরিকল্পনা তৈরি করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।",
        timestamp: new Date(),
      }]);
    } finally {
      setIsGenerating(false);
    }
  };

  const sendQuestion = async (question: string) => {
    if (!question.trim() || !user) return;

    setInputText("");
    setIsGenerating(true);

    // Track AI tool usage
    trackAIToolUsage(user.id, "qa-assistant");

    // Add user message
    setMessages(prev => [...prev, {
      role: "user",
      content: question,
      timestamp: new Date(),
    }]);

    try {
      // Call the portal guide API
      const response = await fetch("/api/portal-guide", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: question,
          chatHistory: messages.slice(-10).map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      const decoder = new TextDecoder();
      let assistantMessage = "";

      // Add initial empty assistant message
      const messageIndex = messages.length + 1;
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "",
        timestamp: new Date(),
      }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        assistantMessage += chunk;

        // Update the assistant message
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[messageIndex] = {
            role: "assistant",
            content: assistantMessage,
            timestamp: new Date(),
          };
          return newMessages;
        });
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "দুঃখিত, উত্তর পেতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।",
        timestamp: new Date(),
      }]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;
    await sendQuestion(inputText);
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30 pb-24">
      {/* Header */}
      <ShikhoHeader
        variant="light"
        showBackButton={true}
        onBack={() => router.push("/dashboard")}
        rightContent={
          <div className="flex items-center gap-3">
            <div className="text-right">
              <h1 className="text-base font-bold text-slate-800">AI টুলস</h1>
              <p className="text-xs text-slate-500">আপনার শিক্ষা সহায়ক</p>
            </div>
            <div className="w-10 h-10 bg-gradient-to-br from-[#cf278d] to-[#cf278d] rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
          </div>
        }
      />

      {/* Notice Ticker Bar */}
      <NoticeBar />

      <main className="max-w-4xl mx-auto px-4 py-4">
        {/* Tool Selection */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <button
            onClick={() => {
              setActiveTool("planner");
              setGeneratedPlan(null);
            }}
            className={`p-4 rounded-xl text-left transition-all ${
              activeTool === "planner"
                ? "bg-gradient-to-br from-[#cf278d] to-[#cf278d] text-white shadow-lg"
                : "bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center mb-2">
              <svg className={`w-6 h-6 ${activeTool === "planner" ? "text-white" : "text-[#cf278d]"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-base font-bold mb-1">জাদু AI প্ল্যানার</h3>
            <p className={`text-xs ${activeTool === "planner" ? "text-white/80" : "text-slate-500"}`}>
              পাঠ পরিকল্পনা তৈরি করুন
            </p>
          </button>

          <button
            onClick={() => {
              setActiveTool("guide");
              setGeneratedPlan(null);
            }}
            className={`p-4 rounded-xl text-left transition-all ${
              activeTool === "guide"
                ? "bg-gradient-to-br from-[#cf278d] to-[#cf278d] text-white shadow-lg"
                : "bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center mb-2">
              <svg className={`w-6 h-6 ${activeTool === "guide" ? "text-white" : "text-[#cf278d]"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-base font-bold mb-1">জাদু পোর্টাল সহায়ক</h3>
            <p className={`text-xs ${activeTool === "guide" ? "text-white/80" : "text-slate-500"}`}>
              পোর্টাল ব্যবহার সম্পর্কে জানুন
            </p>
          </button>
        </div>

        {/* Lesson Planner Section */}
        {activeTool === "planner" && (
          <div className="space-y-4">
            {/* Settings Card */}
            <div className="bg-white rounded-xl p-4 shadow-md">
              <h3 className="text-base font-bold text-slate-800 mb-3">পাঠ পরিকল্পনা সেটিংস</h3>

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block font-semibold">ক্লাস</label>
                  <select
                    value={selectedClass}
                    onChange={(e) => {
                      setSelectedClass(e.target.value);
                      setSelectedChapter("");
                      setSelectedTopic("");
                    }}
                    className="w-full p-2.5 border border-slate-200 rounded-lg focus:border-[#cf278d] outline-none text-sm"
                  >
                    {profile?.classes.map(c => (
                      <option key={c} value={c}>{CLASS_LABELS[c]}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-500 mb-1 block font-semibold">বিষয়</label>
                  <select
                    value={selectedSubject}
                    onChange={(e) => {
                      setSelectedSubject(e.target.value);
                      setSelectedChapter("");
                      setSelectedTopic("");
                    }}
                    className="w-full p-2.5 border border-slate-200 rounded-lg focus:border-[#cf278d] outline-none text-sm"
                  >
                    {profile?.subjects.map(s => {
                      const subject = SUBJECTS.find(sub => sub.id === s);
                      return (
                        <option key={s} value={s}>{subject?.name || s}</option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-500 mb-1 block font-semibold">অধ্যায়</label>
                  <select
                    value={selectedChapter}
                    onChange={(e) => {
                      setSelectedChapter(e.target.value);
                      setSelectedTopic("");
                    }}
                    className="w-full p-2.5 border border-slate-200 rounded-lg focus:border-[#cf278d] outline-none text-sm disabled:bg-slate-100 disabled:cursor-not-allowed"
                    disabled={loadingChapters || chapters.length === 0}
                  >
                    {loadingChapters ? (
                      <option value="">লোড হচ্ছে...</option>
                    ) : (
                      <>
                        <option value="">নির্বাচন করুন</option>
                        {chapters.map(ch => (
                          <option key={ch.id} value={ch.id}>{ch.name}</option>
                        ))}
                      </>
                    )}
                  </select>
                  {!loadingChapters && chapters.length === 0 && selectedClass && selectedSubject && (
                    <p className="text-xs text-orange-600 mt-1">⚠️ এই ক্লাস ও বিষয়ের জন্য কোন অধ্যায় নেই</p>
                  )}
                </div>

                <div>
                  <label className="text-xs text-slate-500 mb-1 block font-semibold">টপিক</label>
                  <select
                    value={selectedTopic}
                    onChange={(e) => setSelectedTopic(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-lg focus:border-[#cf278d] outline-none text-sm disabled:bg-slate-100 disabled:cursor-not-allowed"
                    disabled={loadingChapters || topics.length === 0}
                  >
                    <option value="">নির্বাচন করুন</option>
                    {topics.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                  {!loadingChapters && topics.length === 0 && selectedChapter && (
                    <p className="text-xs text-orange-600 mt-1">⚠️ এই অধ্যায়ের জন্য কোন টপিক নেই</p>
                  )}
                </div>

                <div>
                  <label className="text-xs text-slate-500 mb-1 block font-semibold">ক্লাসের সময়কাল</label>
                  <div className="grid grid-cols-4 gap-2">
                    {["30", "40", "45", "60"].map(dur => (
                      <button
                        key={dur}
                        onClick={() => setLessonDuration(dur)}
                        className={`py-2 rounded-lg text-sm font-semibold transition-all ${
                          lessonDuration === dur
                            ? "bg-[#cf278d] text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {toBengaliNumber(parseInt(dur))} মিনিট
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={generateLessonPlan}
                disabled={isGenerating || !currentTopic}
                className="w-full mt-4 gradient-blue-pink text-white py-3 rounded-lg font-bold text-sm shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    পরিকল্পনা তৈরি হচ্ছে...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    পাঠ পরিকল্পনা তৈরি করুন
                  </>
                )}
              </button>
            </div>

            {/* AI Thinking Animation for Lesson Planner */}
            {isGenerating && activeTool === "planner" && (
              <div className="bg-white rounded-xl p-6 shadow-md">
                <AIThinking type="lesson" />
              </div>
            )}

            {/* Generated Lesson Plan Display */}
            {generatedPlan && !isGenerating && (
              <div className="bg-white rounded-xl p-4 shadow-md">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-bold text-slate-800">পাঠ পরিকল্পনা</h3>
                  <button
                    onClick={() => window.print()}
                    className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-200 transition-colors flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    প্রিন্ট
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Overview */}
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-3">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-slate-500 text-xs">ক্লাস</p>
                        <p className="font-semibold text-slate-800">{CLASS_LABELS[generatedPlan.classId]}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-xs">সময়কাল</p>
                        <p className="font-semibold text-slate-800">{generatedPlan.duration}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-slate-500 text-xs">বিষয়</p>
                        <p className="font-semibold text-slate-800">{generatedPlan.topic}</p>
                      </div>
                    </div>
                  </div>

                  {/* Objectives */}
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 mb-2">শিখনফল</h4>
                    <ul className="space-y-1 text-sm text-slate-600">
                      {generatedPlan.objectives.map((obj, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-blue-600 mt-0.5">•</span>
                          <span>{obj}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Materials */}
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 mb-2">প্রয়োজনীয় উপকরণ</h4>
                    <div className="flex flex-wrap gap-2">
                      {generatedPlan.materials.map((material, i) => (
                        <span key={i} className="px-2 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium">
                          {material}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Activities */}
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 mb-3">পাঠ প্রবাহ</h4>
                    <div className="space-y-3">
                      {/* Warm Up */}
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <span className="text-yellow-700 font-bold text-sm">১</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-slate-800 mb-1">
                            ওয়ার্ম আপ ({generatedPlan.activities.warmUp.duration})
                          </p>
                          <p className="text-sm text-slate-600">{generatedPlan.activities.warmUp.activity}</p>
                        </div>
                      </div>

                      {/* Main Lesson */}
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <span className="text-blue-700 font-bold text-sm">২</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-slate-800 mb-1">
                            মূল পাঠ ({generatedPlan.activities.mainLesson.duration})
                          </p>
                          <ul className="space-y-1 text-sm text-slate-600">
                            {generatedPlan.activities.mainLesson.steps.map((step, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <span className="text-blue-600 mt-0.5">•</span>
                                <span>{step}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Practice */}
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <span className="text-green-700 font-bold text-sm">৩</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-slate-800 mb-1">
                            অনুশীলন ({generatedPlan.activities.practice.duration})
                          </p>
                          <p className="text-sm text-slate-600">{generatedPlan.activities.practice.activity}</p>
                        </div>
                      </div>

                      {/* Closing */}
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <span className="text-purple-700 font-bold text-sm">৪</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-slate-800 mb-1">
                            সমাপনী ({generatedPlan.activities.closing.duration})
                          </p>
                          <p className="text-sm text-slate-600">{generatedPlan.activities.closing.activity}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Assessment */}
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 mb-2">মূল্যায়ন</h4>
                    <p className="text-sm text-slate-600">{generatedPlan.assessment}</p>
                  </div>

                  {/* Homework */}
                  {generatedPlan.homework && (
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 mb-2">বাড়ির কাজ</h4>
                      <p className="text-sm text-slate-600">{generatedPlan.homework}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Portal Guide Section */}
        {activeTool === "guide" && (
          <div className="space-y-4">
            {/* Info Card - Only show when conversation is active */}
            {messages.length > 0 && (
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-200">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-blue-900 mb-1">জাদু পোর্টাল সহায়ক</h3>
                    <p className="text-xs text-blue-800">
                      আপনার প্রশ্নের উত্তর দেওয়ার জন্য প্রস্তুত
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Questions */}
            {messages.length === 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-slate-700">সাধারণ প্রশ্ন:</h4>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    onClick={() => sendQuestion("ক্লাস কীভাবে শুরু করব?")}
                    className="p-3 bg-white border-2 border-slate-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      </div>
                      <span className="text-sm font-medium text-slate-700 group-hover:text-blue-700">ক্লাস কীভাবে শুরু করব?</span>
                    </div>
                  </button>

                  <button
                    onClick={() => sendQuestion("শিক্ষার্থীদের হাজিরা কীভাবে দেব?")}
                    className="p-3 bg-white border-2 border-slate-200 rounded-xl hover:border-green-400 hover:bg-green-50 transition-all text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <span className="text-sm font-medium text-slate-700 group-hover:text-green-700">শিক্ষার্থীদের হাজিরা কীভাবে দেব?</span>
                    </div>
                  </button>

                  <button
                    onClick={() => sendQuestion("প্রোফাইল কীভাবে এডিট করব?")}
                    className="p-3 bg-white border-2 border-slate-200 rounded-xl hover:border-purple-400 hover:bg-purple-50 transition-all text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                        <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <span className="text-sm font-medium text-slate-700 group-hover:text-purple-700">প্রোফাইল কীভাবে এডিট করব?</span>
                    </div>
                  </button>

                  <button
                    onClick={() => sendQuestion("নতুন শিক্ষার্থী কীভাবে যোগ করব?")}
                    className="p-3 bg-white border-2 border-slate-200 rounded-xl hover:border-orange-400 hover:bg-orange-50 transition-all text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center group-hover:bg-orange-200 transition-colors">
                        <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                        </svg>
                      </div>
                      <span className="text-sm font-medium text-slate-700 group-hover:text-orange-700">নতুন শিক্ষার্থী কীভাবে যোগ করব?</span>
                    </div>
                  </button>

                  <button
                    onClick={() => sendQuestion("শিক্ষার্থীদের মার্কস কীভাবে দেব?")}
                    className="p-3 bg-white border-2 border-slate-200 rounded-xl hover:border-pink-400 hover:bg-pink-50 transition-all text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-pink-100 rounded-lg flex items-center justify-center group-hover:bg-pink-200 transition-colors">
                        <svg className="w-4 h-4 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </div>
                      <span className="text-sm font-medium text-slate-700 group-hover:text-pink-700">শিক্ষার্থীদের মার্কস কীভাবে দেব?</span>
                    </div>
                  </button>

                  <button
                    onClick={() => sendQuestion("রিপোর্ট কার্ড কীভাবে তৈরি করব?")}
                    className="p-3 bg-white border-2 border-slate-200 rounded-xl hover:border-indigo-400 hover:bg-indigo-50 transition-all text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
                        <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <span className="text-sm font-medium text-slate-700 group-hover:text-indigo-700">রিপোর্ট কার্ড কীভাবে তৈরি করব?</span>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Chat Messages */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="h-[600px] overflow-y-auto p-4 space-y-3">
                {messages.map((msg, i) => (
                  <div key={i}>
                    <div
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl ${
                          msg.role === "user"
                            ? "bg-gradient-to-br from-[#cf278d] to-[#cf278d] text-white rounded-br-sm px-4 py-3"
                            : "bg-slate-100 text-slate-800 rounded-bl-sm px-4 py-3"
                        }`}
                      >
                        {msg.role === "user" ? (
                          <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                        ) : (
                          <div className="text-sm">{formatAIResponse(msg.content)}</div>
                        )}
                        <p className={`text-xs mt-2 ${msg.role === "user" ? "text-white/60" : "text-slate-400"}`}>
                          {msg.timestamp.toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>

                    {/* Follow-up buttons for assistant messages */}
                    {msg.role === "assistant" && i === messages.length - 1 && !isGenerating && (
                      <div className="flex flex-wrap gap-2 mt-2 ml-2">
                        <button
                          onClick={() => sendQuestion("উদাহরণ দেন")}
                          className="px-3 py-1.5 bg-white border border-blue-300 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-50 transition-colors"
                        >
                          উদাহরণ দেন
                        </button>
                        <button
                          onClick={() => sendQuestion("আরো বুঝিয়ে বলুন")}
                          className="px-3 py-1.5 bg-white border border-green-300 text-green-700 rounded-lg text-xs font-medium hover:bg-green-50 transition-colors"
                        >
                          আরো বুঝিয়ে বলুন
                        </button>
                        <button
                          onClick={() => sendQuestion("ধাপে ধাপে দেখান")}
                          className="px-3 py-1.5 bg-white border border-purple-300 text-purple-700 rounded-lg text-xs font-medium hover:bg-purple-50 transition-colors"
                        >
                          ধাপে ধাপে দেখান
                        </button>
                        <button
                          onClick={() => setMessages([])}
                          className="px-3 py-1.5 bg-white border border-orange-300 text-orange-700 rounded-lg text-xs font-medium hover:bg-orange-50 transition-colors"
                        >
                          অন্য কিছু জিজ্ঞাসা করবো
                        </button>
                      </div>
                    )}
                  </div>
                ))}

                {/* AI Thinking Animation for Chat */}
                {isGenerating && activeTool === "guide" && (
                  <div className="flex justify-start">
                    <div className="max-w-[85%] bg-slate-100 rounded-2xl rounded-bl-sm px-4 py-3">
                      <AIThinking type="portal" />
                    </div>
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>

              {/* Chat Input */}
              <div className="p-4 border-t border-slate-100">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !isGenerating && handleSendMessage()}
                    placeholder="আপনার প্রশ্ন লিখুন..."
                    disabled={isGenerating}
                    className="flex-1 p-3 border border-slate-200 rounded-lg focus:border-[#cf278d] outline-none text-sm disabled:opacity-50"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!inputText.trim() || isGenerating}
                    className="px-4 gradient-blue-pink text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isGenerating ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
