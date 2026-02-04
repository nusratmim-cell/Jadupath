"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getCurrentUser,
  getProfileByUserId,
  type SessionUser,
  type TeacherProfile,
} from "@/lib/auth";
import {
  CLASS_LABELS,
  SUBJECTS,
  toBengaliNumber,
  type Chapter,
} from "@/lib/data";
import { getCachedChapters } from "@/lib/content";
import { Toast, useToast, useConfirm } from "@/components";

// Lesson Plan types
interface LessonPlan {
  id: string;
  title: string;
  classId: string;
  subjectId: string;
  chapterId: string;
  topicId: string;
  duration: string;
  objectives: string[];
  materials: string[];
  warmUp: { activity: string; duration: string };
  mainLesson: { steps: string[]; duration: string };
  practice: { activity: string; duration: string };
  assessment: { method: string; criteria: string[] };
  homework?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  status: "draft" | "ready" | "completed";
}

// Storage key
const LESSON_PLANS_KEY = "shikho_lesson_plans";

// Get all lesson plans
const getLessonPlans = (teacherId: string): LessonPlan[] => {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(LESSON_PLANS_KEY);
  const allPlans: (LessonPlan & { teacherId: string })[] = data ? JSON.parse(data) : [];
  return allPlans.filter(p => p.teacherId === teacherId);
};

// Save lesson plan
const saveLessonPlan = (teacherId: string, plan: Omit<LessonPlan, "id" | "createdAt" | "updatedAt">): LessonPlan => {
  const data = localStorage.getItem(LESSON_PLANS_KEY);
  const allPlans = data ? JSON.parse(data) : [];
  
  const newPlan = {
    ...plan,
    id: Date.now().toString(36),
    teacherId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  allPlans.push(newPlan);
  localStorage.setItem(LESSON_PLANS_KEY, JSON.stringify(allPlans));
  
  return newPlan;
};

// Update lesson plan
const updateLessonPlan = (planId: string, updates: Partial<LessonPlan>): void => {
  const data = localStorage.getItem(LESSON_PLANS_KEY);
  const allPlans = data ? JSON.parse(data) : [];
  
  const idx = allPlans.findIndex((p: LessonPlan) => p.id === planId);
  if (idx !== -1) {
    allPlans[idx] = { ...allPlans[idx], ...updates, updatedAt: new Date().toISOString() };
    localStorage.setItem(LESSON_PLANS_KEY, JSON.stringify(allPlans));
  }
};

// Delete lesson plan
const deleteLessonPlan = (planId: string): void => {
  const data = localStorage.getItem(LESSON_PLANS_KEY);
  const allPlans = data ? JSON.parse(data) : [];
  const filtered = allPlans.filter((p: LessonPlan) => p.id !== planId);
  localStorage.setItem(LESSON_PLANS_KEY, JSON.stringify(filtered));
};

export default function LessonPlansPage() {
  const router = useRouter();
  
  const [user, setUser] = useState<SessionUser | null>(null);
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [plans, setPlans] = useState<LessonPlan[]>([]);
  const [filterClass, setFilterClass] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<LessonPlan | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<LessonPlan | null>(null);

  // Chapter/topic data from database
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loadingChapters, setLoadingChapters] = useState(false);
  
  // Form state
  const [formClass, setFormClass] = useState("");
  const [formSubject, setFormSubject] = useState("");
  const [formChapter, setFormChapter] = useState("");
  const [formTopic, setFormTopic] = useState("");
  const [formDuration, setFormDuration] = useState("40");
  const [formObjectives, setFormObjectives] = useState<string[]>([""]);
  const [formMaterials, setFormMaterials] = useState<string[]>(["NCTB পাঠ্যবই"]);
  const [formWarmUp, setFormWarmUp] = useState({ activity: "", duration: "৫ মিনিট" });
  const [formMainSteps, setFormMainSteps] = useState<string[]>([""]);
  const [formPractice, setFormPractice] = useState({ activity: "", duration: "৫ মিনিট" });
  const [formHomework, setFormHomework] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  // Toast and confirm dialog hooks
  const { toasts, removeToast, success } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();

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

    // Load plans
    const savedPlans = getLessonPlans(currentUser.id);
    setPlans(savedPlans);

    if (teacherProfile.classes.length > 0) {
      setFormClass(teacherProfile.classes[0]);
    }

    if (teacherProfile.subjects.length > 0) {
      setFormSubject(teacherProfile.subjects[0]);
    }

    setIsLoading(false);
  }, [router]);

  // Get topics from current chapter
  const currentChapter = chapters.find(ch => ch.id === formChapter);
  const topics = currentChapter?.topics || [];
  const currentTopic = topics.find(t => t.id === formTopic);

  // Fetch chapters when class or subject changes
  useEffect(() => {
    if (!formClass || !formSubject) {
      setChapters([]);
      return;
    }

    const fetchChapters = async () => {
      setLoadingChapters(true);
      setFormChapter("");
      setFormTopic("");

      try {
        const fetchedChapters = await getCachedChapters(formClass, formSubject);
        setChapters(fetchedChapters);

        // Auto-select first chapter if available
        if (fetchedChapters.length > 0) {
          setFormChapter(fetchedChapters[0].id);
        }
      } catch (error) {
        console.error("Error fetching chapters:", error);
        setChapters([]);
      } finally {
        setLoadingChapters(false);
      }
    };

    fetchChapters();
  }, [formClass, formSubject]);

  // Set first topic when chapter changes
  useEffect(() => {
    if (topics.length > 0 && !formTopic) {
      setFormTopic(topics[0].id);
    }
  }, [formChapter, topics]);

  // Filter plans
  const filteredPlans = plans.filter(p => {
    if (filterClass !== "all" && p.classId !== filterClass) return false;
    if (filterStatus !== "all" && p.status !== filterStatus) return false;
    return true;
  });

  // Reset form
  const resetForm = () => {
    if (profile?.classes.length) setFormClass(profile.classes[0]);
    if (profile?.subjects.length) setFormSubject(profile.subjects[0]);
    setFormChapter("");
    setFormTopic("");
    setFormDuration("40");
    setFormObjectives([""]);
    setFormMaterials(["NCTB পাঠ্যবই"]);
    setFormWarmUp({ activity: "", duration: "৫ মিনিট" });
    setFormMainSteps([""]);
    setFormPractice({ activity: "", duration: "৫ মিনিট" });
    setFormHomework("");
    setFormNotes("");
    setEditingPlan(null);
  };

  // Generate with AI
  const generateWithAI = async () => {
    if (!currentTopic || !currentChapter) return;
    
    setIsGenerating(true);
    
    // Simulate AI generation
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setFormObjectives([
      `${currentTopic.name} এর মূল ধারণা বুঝতে পারবে`,
      `সংশ্লিষ্ট সমস্যা সমাধান করতে পারবে`,
      `বাস্তব জীবনে প্রয়োগ করতে পারবে`
    ]);
    
    setFormMaterials([
      "NCTB পাঠ্যবই",
      "হোয়াইটবোর্ড ও মার্কার",
      "চার্ট পেপার",
      "ডিজিটাল কনটেন্ট"
    ]);
    
    setFormWarmUp({
      activity: `আগের পাঠের পুনরালোচনা এবং ${currentTopic.name} সম্পর্কে শিক্ষার্থীদের পূর্ব ধারণা জানা`,
      duration: "৫ মিনিট"
    });
    
    setFormMainSteps([
      `${currentTopic.name} এর ভূমিকা ও গুরুত্ব ব্যাখ্যা`,
      "চিত্র ও উদাহরণ সহ মূল ধারণা উপস্থাপন",
      "ভিডিও/অ্যানিমেশন দেখানো",
      "শিক্ষার্থীদের সাথে আলোচনা ও প্রশ্নোত্তর",
      "বোর্ডে সমস্যা সমাধান প্রদর্শন"
    ]);
    
    setFormPractice({
      activity: "জোড়ায় কাজ করে সমস্যা সমাধান অনুশীলন",
      duration: "৫ মিনিট"
    });
    
    setFormHomework(`${currentChapter.name} অধ্যায়ের অনুশীলনী থেকে ৫টি সমস্যা সমাধান`);
    
    setIsGenerating(false);
  };

  // Save plan
  const handleSave = (status: "draft" | "ready") => {
    if (!user || !currentTopic || !currentChapter) return;
    
    const planData = {
      title: currentTopic.name,
      classId: formClass,
      subjectId: formSubject,
      chapterId: formChapter,
      topicId: formTopic,
      duration: `${formDuration} মিনিট`,
      objectives: formObjectives.filter(o => o.trim()),
      materials: formMaterials.filter(m => m.trim()),
      warmUp: formWarmUp,
      mainLesson: {
        steps: formMainSteps.filter(s => s.trim()),
        duration: `${parseInt(formDuration) - 10} মিনিট`
      },
      practice: formPractice,
      assessment: {
        method: "মৌখিক প্রশ্নোত্তর ও দ্রুত কুইজ",
        criteria: ["মূল ধারণা বুঝেছে", "সমস্যা সমাধান করতে পারছে", "সক্রিয় অংশগ্রহণ"]
      },
      homework: formHomework,
      notes: formNotes,
      status
    };
    
    if (editingPlan) {
      updateLessonPlan(editingPlan.id, planData);
    } else {
      saveLessonPlan(user.id, planData);
    }
    
    // Refresh plans
    const updatedPlans = getLessonPlans(user.id);
    setPlans(updatedPlans);
    
    setShowCreateModal(false);
    resetForm();
  };

  // Delete plan
  const handleDelete = async (planId: string) => {
    const confirmed = await confirm({
      message: "এই পরিকল্পনাটি মুছে ফেলতে চান?",
      confirmText: "মুছে ফেলুন",
      type: "danger",
    });

    if (confirmed) {
      deleteLessonPlan(planId);
      if (user) {
        setPlans(getLessonPlans(user.id));
      }
      success("পরিকল্পনা মুছে ফেলা হয়েছে");
    }
  };

  // Edit plan
  const handleEdit = (plan: LessonPlan) => {
    setEditingPlan(plan);
    setFormClass(plan.classId);
    setFormSubject(plan.subjectId);
    setFormChapter(plan.chapterId);
    setFormTopic(plan.topicId);
    setFormDuration(plan.duration.replace(" মিনিট", ""));
    setFormObjectives(plan.objectives.length > 0 ? plan.objectives : [""]);
    setFormMaterials(plan.materials.length > 0 ? plan.materials : [""]);
    setFormWarmUp(plan.warmUp);
    setFormMainSteps(plan.mainLesson.steps.length > 0 ? plan.mainLesson.steps : [""]);
    setFormPractice(plan.practice);
    setFormHomework(plan.homework || "");
    setFormNotes(plan.notes || "");
    setShowCreateModal(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="w-12 h-12 border-4 border-[#cf278d] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 pb-24">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-4">
          <button
            onClick={() => router.push("/dashboard")}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-slate-800">পাঠ পরিকল্পনা</h1>
            <p className="text-sm text-slate-500">{toBengaliNumber(plans.length)}টি পরিকল্পনা</p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowCreateModal(true);
            }}
            className="px-4 py-2 gradient-blue-pink text-white rounded-xl font-medium text-sm hover:shadow-lg transition-all flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            নতুন
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Filters */}
        <div className="flex gap-3 overflow-x-auto pb-2">
          <select
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
            className="px-4 py-2 bg-white rounded-xl shadow-md text-sm focus:outline-none focus:ring-2 focus:ring-[#cf278d]"
          >
            <option value="all">সব ক্লাস</option>
            {profile?.classes.map(c => (
              <option key={c} value={c}>{CLASS_LABELS[c]}</option>
            ))}
          </select>
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 bg-white rounded-xl shadow-md text-sm focus:outline-none focus:ring-2 focus:ring-[#cf278d]"
          >
            <option value="all">সব স্ট্যাটাস</option>
            <option value="draft">খসড়া</option>
            <option value="ready">প্রস্তুত</option>
            <option value="completed">সম্পন্ন</option>
          </select>
        </div>

        {/* Plans Grid */}
        {filteredPlans.length > 0 ? (
          <div className="grid gap-4">
            {filteredPlans.map((plan) => {
              const subject = SUBJECTS.find(s => s.id === plan.subjectId);
              const chapter = chapters.find(ch => ch.id === plan.chapterId);

              return (
                <div
                  key={plan.id}
                  className="bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-lg transition-all"
                >
                  <div className={`h-2 ${
                    plan.status === "completed" ? "bg-green-500" :
                    plan.status === "ready" ? "bg-blue-500" : "bg-yellow-500"
                  }`}></div>
                  
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 bg-[#cf278d]/10 text-[#cf278d] rounded-full text-xs font-medium">
                            {CLASS_LABELS[plan.classId]}
                          </span>
                          {subject && (
                            <span className={`px-2 py-0.5 ${subject.bgColor} ${subject.textColor} rounded-full text-xs font-medium`}>
                              {subject.name}
                            </span>
                          )}
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            plan.status === "completed" ? "bg-green-100 text-green-700" :
                            plan.status === "ready" ? "bg-blue-100 text-blue-700" : "bg-yellow-100 text-yellow-700"
                          }`}>
                            {plan.status === "completed" ? "সম্পন্ন" : plan.status === "ready" ? "প্রস্তুত" : "খসড়া"}
                          </span>
                        </div>
                        
                        <h3 className="font-bold text-slate-800 text-lg truncate">{plan.title}</h3>
                        <p className="text-sm text-slate-500 truncate">{chapter?.name}</p>
                        
                        <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {plan.duration}
                          </span>
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            {toBengaliNumber(plan.objectives.length)} শিখনফল
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex gap-1">
                        <button
                          onClick={() => {
                            setSelectedPlan(plan);
                            setShowDetailModal(true);
                          }}
                          className="p-2 text-slate-400 hover:text-[#cf278d] hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleEdit(plan)}
                          className="p-2 text-slate-400 hover:text-[#cf278d] hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(plan.id)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-8 shadow-md text-center">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-slate-500 mb-4">কোনো পাঠ পরিকল্পনা নেই</p>
            <button
              onClick={() => {
                resetForm();
                setShowCreateModal(true);
              }}
              className="px-6 py-3 gradient-blue-pink text-white rounded-xl font-medium"
            >
              প্রথম পরিকল্পনা তৈরি করুন
            </button>
          </div>
        )}

        {/* Quick Access to AI */}
        <button
          onClick={() => router.push("/ai")}
          className="w-full bg-gradient-to-br from-purple-500 to-purple-700 rounded-2xl p-5 text-white text-left shadow-lg hover:shadow-xl transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg">AI দিয়ে পরিকল্পনা তৈরি করুন</h3>
              <p className="text-white/80 text-sm">দ্রুত ও স্মার্ট পরিকল্পনা</p>
            </div>
            <svg className="w-6 h-6 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </button>
      </main>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto">
          <div className="min-h-screen flex items-start justify-center p-4 pt-20">
            <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-scaleIn">
              {/* Modal Header */}
              <div className="gradient-blue-pink p-4 text-white">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-lg">
                    {editingPlan ? "পরিকল্পনা সম্পাদনা" : "নতুন পাঠ পরিকল্পনা"}
                  </h3>
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      resetForm();
                    }}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-4 max-h-[70vh] overflow-y-auto space-y-4">
                {/* Class & Subject & Topic Selection */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-slate-600 mb-1 block">ক্লাস</label>
                    <select
                      value={formClass}
                      onChange={(e) => {
                        setFormClass(e.target.value);
                        setFormChapter("");
                        setFormTopic("");
                      }}
                      className="w-full p-2.5 border-2 border-slate-200 rounded-xl focus:border-[#cf278d] outline-none text-sm"
                    >
                      {profile?.classes.map(c => (
                        <option key={c} value={c}>{CLASS_LABELS[c]}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600 mb-1 block">বিষয়</label>
                    <select
                      value={formSubject}
                      onChange={(e) => {
                        setFormSubject(e.target.value);
                        setFormChapter("");
                        setFormTopic("");
                      }}
                      className="w-full p-2.5 border-2 border-slate-200 rounded-xl focus:border-[#cf278d] outline-none text-sm"
                    >
                      {profile?.subjects.map(s => {
                        const subject = SUBJECTS.find(sub => sub.id === s);
                        return (
                          <option key={s} value={s}>{subject?.name || s}</option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-slate-600 mb-1 block">অধ্যায়</label>
                    <select
                      value={formChapter}
                      onChange={(e) => {
                        setFormChapter(e.target.value);
                        setFormTopic("");
                      }}
                      className="w-full p-2.5 border-2 border-slate-200 rounded-xl focus:border-[#cf278d] outline-none text-sm disabled:bg-slate-100 disabled:cursor-not-allowed"
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
                    {!loadingChapters && chapters.length === 0 && formClass && formSubject && (
                      <p className="text-xs text-orange-600 mt-1">⚠️ এই ক্লাস ও বিষয়ের জন্য কোন অধ্যায় নেই</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600 mb-1 block">টপিক</label>
                    <select
                      value={formTopic}
                      onChange={(e) => setFormTopic(e.target.value)}
                      className="w-full p-2.5 border-2 border-slate-200 rounded-xl focus:border-[#cf278d] outline-none text-sm disabled:bg-slate-100 disabled:cursor-not-allowed"
                      disabled={loadingChapters || topics.length === 0}
                    >
                      <option value="">নির্বাচন করুন</option>
                      {topics.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                    {!loadingChapters && topics.length === 0 && formChapter && (
                      <p className="text-xs text-orange-600 mt-1">⚠️ এই অধ্যায়ের জন্য কোন টপিক নেই</p>
                    )}
                  </div>
                </div>

                {/* AI Generate Button */}
                {currentTopic && (
                  <button
                    onClick={generateWithAI}
                    disabled={isGenerating}
                    className="w-full py-3 bg-gradient-to-r from-purple-500 to-purple-700 text-white rounded-xl font-medium flex items-center justify-center gap-2"
                  >
                    {isGenerating ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        AI তৈরি করছে...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        AI দিয়ে স্বয়ংক্রিয়ভাবে পূরণ করুন
                      </>
                    )}
                  </button>
                )}

                {/* Duration */}
                <div>
                  <label className="text-sm font-medium text-slate-600 mb-1 block">ক্লাসের সময়কাল</label>
                  <div className="flex gap-2">
                    {["30", "40", "45", "60"].map(dur => (
                      <button
                        key={dur}
                        onClick={() => setFormDuration(dur)}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                          formDuration === dur
                            ? "bg-[#cf278d] text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {toBengaliNumber(parseInt(dur))} মিনিট
                      </button>
                    ))}
                  </div>
                </div>

                {/* Objectives */}
                <div>
                  <label className="text-sm font-medium text-slate-600 mb-1 block">
                    শিখনফল
                    <button
                      onClick={() => setFormObjectives([...formObjectives, ""])}
                      className="ml-2 text-[#cf278d] text-xs"
                    >
                      + যোগ করুন
                    </button>
                  </label>
                  {formObjectives.map((obj, i) => (
                    <div key={i} className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={obj}
                        onChange={(e) => {
                          const newObjs = [...formObjectives];
                          newObjs[i] = e.target.value;
                          setFormObjectives(newObjs);
                        }}
                        placeholder={`শিখনফল ${toBengaliNumber(i + 1)}`}
                        className="flex-1 p-2.5 border-2 border-slate-200 rounded-xl focus:border-[#cf278d] outline-none text-sm"
                      />
                      {formObjectives.length > 1 && (
                        <button
                          onClick={() => setFormObjectives(formObjectives.filter((_, idx) => idx !== i))}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Warm Up */}
                <div>
                  <label className="text-sm font-medium text-slate-600 mb-1 block">ওয়ার্ম আপ কার্যক্রম</label>
                  <textarea
                    value={formWarmUp.activity}
                    onChange={(e) => setFormWarmUp({ ...formWarmUp, activity: e.target.value })}
                    placeholder="ক্লাস শুরুর কার্যক্রম..."
                    rows={2}
                    className="w-full p-2.5 border-2 border-slate-200 rounded-xl focus:border-[#cf278d] outline-none text-sm resize-none"
                  />
                </div>

                {/* Main Lesson Steps */}
                <div>
                  <label className="text-sm font-medium text-slate-600 mb-1 block">
                    মূল পাঠের ধাপ
                    <button
                      onClick={() => setFormMainSteps([...formMainSteps, ""])}
                      className="ml-2 text-[#cf278d] text-xs"
                    >
                      + যোগ করুন
                    </button>
                  </label>
                  {formMainSteps.map((step, i) => (
                    <div key={i} className="flex gap-2 mb-2">
                      <span className="w-8 h-10 bg-[#cf278d] text-white rounded-lg flex items-center justify-center text-sm font-bold">
                        {toBengaliNumber(i + 1)}
                      </span>
                      <input
                        type="text"
                        value={step}
                        onChange={(e) => {
                          const newSteps = [...formMainSteps];
                          newSteps[i] = e.target.value;
                          setFormMainSteps(newSteps);
                        }}
                        placeholder={`ধাপ ${toBengaliNumber(i + 1)}`}
                        className="flex-1 p-2.5 border-2 border-slate-200 rounded-xl focus:border-[#cf278d] outline-none text-sm"
                      />
                      {formMainSteps.length > 1 && (
                        <button
                          onClick={() => setFormMainSteps(formMainSteps.filter((_, idx) => idx !== i))}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Practice */}
                <div>
                  <label className="text-sm font-medium text-slate-600 mb-1 block">অনুশীলন কার্যক্রম</label>
                  <textarea
                    value={formPractice.activity}
                    onChange={(e) => setFormPractice({ ...formPractice, activity: e.target.value })}
                    placeholder="শিক্ষার্থীদের অনুশীলন..."
                    rows={2}
                    className="w-full p-2.5 border-2 border-slate-200 rounded-xl focus:border-[#cf278d] outline-none text-sm resize-none"
                  />
                </div>

                {/* Homework */}
                <div>
                  <label className="text-sm font-medium text-slate-600 mb-1 block">বাড়ির কাজ (ঐচ্ছিক)</label>
                  <textarea
                    value={formHomework}
                    onChange={(e) => setFormHomework(e.target.value)}
                    placeholder="বাড়ির কাজের বিবরণ..."
                    rows={2}
                    className="w-full p-2.5 border-2 border-slate-200 rounded-xl focus:border-[#cf278d] outline-none text-sm resize-none"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="text-sm font-medium text-slate-600 mb-1 block">অতিরিক্ত নোট (ঐচ্ছিক)</label>
                  <textarea
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder="নিজের জন্য নোট..."
                    rows={2}
                    className="w-full p-2.5 border-2 border-slate-200 rounded-xl focus:border-[#cf278d] outline-none text-sm resize-none"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-100 flex gap-3">
                <button
                  onClick={() => handleSave("draft")}
                  disabled={!formTopic}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-medium disabled:opacity-50"
                >
                  খসড়া সংরক্ষণ
                </button>
                <button
                  onClick={() => handleSave("ready")}
                  disabled={!formTopic}
                  className="flex-1 py-3 gradient-blue-pink text-white rounded-xl font-medium disabled:opacity-50"
                >
                  প্রস্তুত হিসেবে সংরক্ষণ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedPlan && (
        <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto">
          <div className="min-h-screen flex items-start justify-center p-4 pt-20">
            <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-scaleIn">
              {/* Modal Header */}
              <div className="gradient-blue-pink p-5 text-white">
                <div className="flex items-center justify-between mb-2">
                  <span className="px-3 py-1 bg-white/20 rounded-full text-sm">
                    {CLASS_LABELS[selectedPlan.classId]}
                  </span>
                  <button
                    onClick={() => {
                      setShowDetailModal(false);
                      setSelectedPlan(null);
                    }}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <h3 className="font-bold text-xl">{selectedPlan.title}</h3>
                <p className="text-white/80 text-sm mt-1">{selectedPlan.duration}</p>
              </div>

              {/* Modal Body */}
              <div className="p-5 max-h-[60vh] overflow-y-auto space-y-5">
                {/* Objectives */}
                <div>
                  <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                    <span className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </span>
                    শিখনফল
                  </h4>
                  <ul className="space-y-1 text-sm text-slate-600 pl-8">
                    {selectedPlan.objectives.map((obj, i) => (
                      <li key={i}>• {obj}</li>
                    ))}
                  </ul>
                </div>

                {/* Timeline */}
                <div>
                  <h4 className="font-bold text-slate-800 mb-3">পাঠ প্রবাহ</h4>
                  <div className="space-y-4 pl-4 border-l-2 border-[#cf278d]">
                    {/* Warm Up */}
                    <div className="relative pl-4">
                      <div className="absolute -left-[9px] top-1 w-4 h-4 bg-yellow-500 rounded-full"></div>
                      <p className="font-medium text-slate-800">ওয়ার্ম আপ ({selectedPlan.warmUp.duration})</p>
                      <p className="text-sm text-slate-600">{selectedPlan.warmUp.activity}</p>
                    </div>
                    
                    {/* Main Lesson */}
                    <div className="relative pl-4">
                      <div className="absolute -left-[9px] top-1 w-4 h-4 bg-blue-500 rounded-full"></div>
                      <p className="font-medium text-slate-800">মূল পাঠ ({selectedPlan.mainLesson.duration})</p>
                      <ul className="text-sm text-slate-600 mt-1 space-y-1">
                        {selectedPlan.mainLesson.steps.map((step, i) => (
                          <li key={i}>{toBengaliNumber(i + 1)}। {step}</li>
                        ))}
                      </ul>
                    </div>
                    
                    {/* Practice */}
                    <div className="relative pl-4">
                      <div className="absolute -left-[9px] top-1 w-4 h-4 bg-green-500 rounded-full"></div>
                      <p className="font-medium text-slate-800">অনুশীলন ({selectedPlan.practice.duration})</p>
                      <p className="text-sm text-slate-600">{selectedPlan.practice.activity}</p>
                    </div>
                  </div>
                </div>

                {/* Homework */}
                {selectedPlan.homework && (
                  <div>
                    <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                      <span className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      </span>
                      বাড়ির কাজ
                    </h4>
                    <p className="text-sm text-slate-600 pl-8">{selectedPlan.homework}</p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-100 flex gap-3">
                <button
                  onClick={() => {
                    handleEdit(selectedPlan);
                    setShowDetailModal(false);
                  }}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-medium flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  সম্পাদনা
                </button>
                <button
                  onClick={() => router.push(`/classroom/${selectedPlan.classId}`)}
                  className="flex-1 py-3 gradient-blue-pink text-white rounded-xl font-medium flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  ক্লাসে ব্যবহার করুন
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <Toast toasts={toasts} onRemove={removeToast} />

      {/* Confirm Dialog */}
      {ConfirmDialog}
    </div>
  );
}
