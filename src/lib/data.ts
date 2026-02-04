/**
 * @file data.ts
 * @description Data models, constants, and educational content
 *
 * This file contains:
 * - Type definitions for educational content
 * - Class labels and subjects
 * - Chapter and topic data for classes 4 & 5
 * - Utility functions
 */

// ==================== TYPES ====================

export interface Topic {
  id: string;
  name: string;
  description?: string;
  pdfStartPage?: number;
  pdfEndPage?: number;
  nctbBook?: {
    title: string;
    pdfUrl: string;
    pages: number;
  };
  video?: {
    title: string;
    url: string;
    duration: string;
    thumbnail?: string;
  };
}

export interface Chapter {
  id: string;
  name: string;
  topics: Topic[];
}

export interface Subject {
  id: string;
  name: string;
  icon: string;
  color: string;
  bgColor: string;
  textColor: string;
}

export interface TermDates {
  termNumber: 1 | 2 | 3;
  name: string;
  startMonth: number;
  startDay: number;
  endMonth: number;
  endDay: number;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

export interface Quiz {
  id: string;
  topicId: string;
  chapterId: string;
  subjectId: string;
  classId: string;
  teacherId: string;
  questions: QuizQuestion[];
  createdAt: string;
}

export interface StudentQuizResponse {
  studentId: string;
  questionId: string;
  selectedAnswer: number;
  isCorrect: boolean;
}

export interface QuizSession {
  id: string;
  quizId: string;
  classId: string;
  subjectId: string;
  teacherId: string;
  date: string;
  responses: StudentQuizResponse[];
  totalQuestions: number;
  isOptional?: boolean;
  topicName?: string;
  chapterName?: string;
}

export interface StudentMark {
  studentId: string;
  classId: string;
  subjectId: string;
  teacherId: string;
  term: 1 | 2 | 3;
  year: number;
  quizMarks: number;
  quizCount: number;
  classEngagement: number;
  writtenMarks?: number;
  practicalMarks?: number;
  totalMarks?: number;
  lastUpdated: string;
}

export interface AttendanceRecord {
  id: string;
  classId: string;
  teacherId: string;
  subjectId?: string;
  date: string;
  presentStudentIds: string[];
  absentStudentIds: string[];
}

export interface CastDevice {
  id: string;
  name: string;
  type: 'chromecast' | 'smart_tv' | 'miracast';
  status: 'available' | 'busy' | 'offline';
}

export interface CompletedTopic {
  teacherId: string;
  classId: string;
  subjectId: string;
  chapterId: string;
  topicId: string;
  completedAt: string;
  quizScore?: number;
}

export interface ReportCard {
  studentId: string;
  studentName: string;
  studentRoll?: string;
  classId: string;
  term: 1 | 2 | 3;
  year: number;
  subjects: {
    subjectId: string;
    subjectName: string;
    quizMarks: number;
    writtenMarks?: number;
    practicalMarks?: number;
    totalMarks?: number;
    grade: string;
  }[];
  totalMarks?: number;
  averageMarks?: number;
  overallGrade: string;
  attendance: number | {
    totalDays: number;
    presentDays: number;
    percentage: number;
  };
  generatedAt?: string;
}

// ==================== TRAINING TYPES ====================

export interface TrainingTopic {
  id: string;
  name: string;
  duration: string;
  description?: string;
  pdfUrl?: string;
  pdfStartPage?: number;
  video?: {
    url: string;
    duration: string;
  };
  quiz?: QuizQuestion[];
}

export interface TrainingChapter {
  id: string;
  name: string;
  topics: TrainingTopic[];
}

export interface TrainingCourse {
  id: string;
  name: string;
  description?: string;
  icon: string;
  color: string;
  chapters: TrainingChapter[];
}

export interface TeacherTrainingProgress {
  teacherId: string;
  courseId: string;
  chapterId: string;
  topicId: string;
  completed: boolean;
  quizScore?: number;
  completedAt?: string;
  attempts: number;
}

// ==================== SUBJECTS ====================

export const SUBJECTS: Subject[] = [
  {
    id: "bangla",
    name: "বাংলা",
    icon: "📖",
    color: "from-blue-500 to-blue-600",
    bgColor: "bg-blue-50",
    textColor: "text-blue-600",
  },
  {
    id: "english",
    name: "ইংরেজি",
    icon: "🔤",
    color: "from-purple-500 to-purple-600",
    bgColor: "bg-purple-50",
    textColor: "text-purple-600",
  },
  {
    id: "math",
    name: "গণিত",
    icon: "🔢",
    color: "from-green-500 to-green-600",
    bgColor: "bg-green-50",
    textColor: "text-green-600",
  },
  {
    id: "science",
    name: "বিজ্ঞান",
    icon: "🔬",
    color: "from-orange-500 to-orange-600",
    bgColor: "bg-orange-50",
    textColor: "text-orange-600",
  },
  {
    id: "bangladesh",
    name: "বাংলাদেশ ও বিশ্বপরিচয়",
    icon: "🌍",
    color: "from-teal-500 to-teal-600",
    bgColor: "bg-teal-50",
    textColor: "text-teal-600",
  },
];

export const SUBJECT_NAMES: { [key: string]: string } = {
  bangla: "বাংলা",
  english: "ইংরেজি",
  math: "গণিত",
  science: "বিজ্ঞান",
  bangladesh: "বাংলাদেশ ও বিশ্বপরিচয়",
};

// ==================== CLASS LABELS ====================

export const CLASS_LABELS: { [key: string]: string } = {
  "1": "ক্লাস ১",
  "2": "ক্লাস ২",
  "3": "ক্লাস ৩",
  "4": "ক্লাস ৪",
  "5": "ক্লাস ৫",
};

// ==================== TERM DATES ====================

export const TERM_DATES: TermDates[] = [
  { termNumber: 1, name: "প্রথম সাময়িক", startMonth: 0, startDay: 1, endMonth: 3, endDay: 30 },
  { termNumber: 2, name: "দ্বিতীয় সাময়িক", startMonth: 4, startDay: 1, endMonth: 7, endDay: 31 },
  { termNumber: 3, name: "বার্ষিক", startMonth: 8, startDay: 1, endMonth: 11, endDay: 31 },
];

// ==================== NCTB PDF URLs ====================
// Add your NCTB textbook PDF URLs here

export const NCTB_PDF_URLS: { [classId: string]: { [subjectId: string]: string } } = {
  "4": {},
  "5": {},
};

// ==================== CHAPTERS & TOPICS DATA ====================
// NOTE: Add your textbook content (subjects, chapters, topics) here later

export const CHAPTERS_DATA: { [classId: string]: { [subjectId: string]: Chapter[] } } = {
  "4": {},
  "5": {},
};

// ==================== TRAINING COURSES ====================

// Empty placeholder training course
export const PROFESSIONALISM_TRAINING: TrainingCourse = {
  id: "professionalism",
  name: "Professional Development",
  icon: "🎓",
  color: "from-blue-500 to-indigo-600",
  chapters: [],
};

export const TRAINING_COURSES: TrainingCourse[] = [];

// ==================== STORAGE KEYS ====================

const MARKS_KEY = "shikho_student_marks";
const ATTENDANCE_KEY = "shikho_attendance";
const QUIZZES_KEY = "shikho_quizzes";
const QUIZ_SESSIONS_KEY = "shikho_quiz_sessions";
const CLASS_PROGRESS_KEY = "shikho_class_progress";
const TODAY_STATS_KEY = "shikho_today_stats";
const COMPLETED_TOPICS_KEY = "shikho_completed_topics";
const TRAINING_PROGRESS_KEY = "shikho_training_progress";

// ==================== CLASS PROGRESS TRACKING ====================

export interface ClassProgress {
  teacherId: string;
  classId: string;
  subjectId: string;
  chapterIndex: number;
  topicIndex: number;
  completed: boolean;
  lastUpdated: string;
}

export interface TodayClassStats {
  teacherId: string;
  classId: string;
  date: string;
  attendance: number;
  quizParticipation: number;
  avgScore: number;
  topicsCompleted: number;
}

// Performance optimization: Cache expensive calculations
let _cachedTotalChapters: number | null = null;
let _cachedTotalTopics: number | null = null;
const _completedChaptersCache = new Map<string, number>();
const _completedTopicsCache = new Map<string, number>();
const _videosWatchedCache = new Map<string, number>();
const _trainingProgressCache = new Map<string, TeacherTrainingProgress[]>();

export const getClassProgress = (
  teacherId: string,
  classId: string,
  subjectId: string
): { chapterIndex: number; topicIndex: number; completed: boolean } | null => {
  if (typeof window === "undefined") return null;
  const data = localStorage.getItem(CLASS_PROGRESS_KEY);
  const allProgress: ClassProgress[] = data ? JSON.parse(data) : [];

  const progress = allProgress.find(
    p => p.teacherId === teacherId && p.classId === classId && p.subjectId === subjectId
  );

  if (progress) {
    return {
      chapterIndex: progress.chapterIndex,
      topicIndex: progress.topicIndex,
      completed: progress.completed,
    };
  }

  return { chapterIndex: 0, topicIndex: 0, completed: false };
};

export const setClassProgress = (
  teacherId: string,
  classId: string,
  subjectId: string,
  chapterIndex: number,
  topicIndex: number,
  completed: boolean
): void => {
  if (typeof window === "undefined") return;
  const data = localStorage.getItem(CLASS_PROGRESS_KEY);
  const allProgress: ClassProgress[] = data ? JSON.parse(data) : [];

  const existingIndex = allProgress.findIndex(
    p => p.teacherId === teacherId && p.classId === classId && p.subjectId === subjectId
  );

  const newProgress: ClassProgress = {
    teacherId,
    classId,
    subjectId,
    chapterIndex,
    topicIndex,
    completed,
    lastUpdated: new Date().toISOString(),
  };

  if (existingIndex !== -1) {
    allProgress[existingIndex] = newProgress;
  } else {
    allProgress.push(newProgress);
  }

  localStorage.setItem(CLASS_PROGRESS_KEY, JSON.stringify(allProgress));

  // Invalidate caches when progress updates
  _completedChaptersCache.delete(teacherId);
  _completedTopicsCache.delete(teacherId);
};

export const advanceToNextTopic = (
  teacherId: string,
  classId: string,
  subjectId: string
): { chapterIndex: number; topicIndex: number } | null => {
  const current = getClassProgress(teacherId, classId, subjectId);
  if (!current) return null;

  const chapters = CHAPTERS_DATA[classId]?.[subjectId] || [];
  if (chapters.length === 0) return null;

  let newChapterIndex = current.chapterIndex;
  let newTopicIndex = current.topicIndex + 1;

  const currentChapter = chapters[newChapterIndex];
  if (currentChapter && newTopicIndex >= currentChapter.topics.length) {
    newChapterIndex++;
    newTopicIndex = 0;
  }

  if (newChapterIndex >= chapters.length) {
    setClassProgress(teacherId, classId, subjectId, 0, 0, true);
    return { chapterIndex: 0, topicIndex: 0 };
  }

  setClassProgress(teacherId, classId, subjectId, newChapterIndex, newTopicIndex, false);
  return { chapterIndex: newChapterIndex, topicIndex: newTopicIndex };
};

export const getTodayClassStats = (
  teacherId: string,
  classId: string
): { attendance: number; quizParticipation: number; avgScore: number } => {
  if (typeof window === "undefined") return { attendance: 0, quizParticipation: 0, avgScore: 0 };

  const today = new Date().toISOString().split('T')[0];
  const data = localStorage.getItem(TODAY_STATS_KEY);
  const allStats: TodayClassStats[] = data ? JSON.parse(data) : [];

  const todayStats = allStats.find(
    s => s.teacherId === teacherId && s.classId === classId && s.date === today
  );

  if (todayStats) {
    return {
      attendance: todayStats.attendance,
      quizParticipation: todayStats.quizParticipation,
      avgScore: todayStats.avgScore,
    };
  }

  return { attendance: 0, quizParticipation: 0, avgScore: 0 };
};

export const updateTodayClassStats = (
  teacherId: string,
  classId: string,
  updates: Partial<{ attendance: number; quizParticipation: number; avgScore: number }>
): void => {
  if (typeof window === "undefined") return;

  const today = new Date().toISOString().split('T')[0];
  const data = localStorage.getItem(TODAY_STATS_KEY);
  const allStats: TodayClassStats[] = data ? JSON.parse(data) : [];

  const existingIndex = allStats.findIndex(
    s => s.teacherId === teacherId && s.classId === classId && s.date === today
  );

  if (existingIndex !== -1) {
    allStats[existingIndex] = { ...allStats[existingIndex], ...updates };
  } else {
    allStats.push({
      teacherId,
      classId,
      date: today,
      attendance: updates.attendance || 0,
      quizParticipation: updates.quizParticipation || 0,
      avgScore: updates.avgScore || 0,
      topicsCompleted: 0,
    });
  }

  localStorage.setItem(TODAY_STATS_KEY, JSON.stringify(allStats));
};

export const getTodayAttendance = (
  teacherId: string,
  classId: string
): string[] => {
  const today = new Date().toISOString().split('T')[0];
  const record = getAttendanceForDate(classId, teacherId, today);
  return record?.presentStudentIds || [];
};

export const saveTodayAttendance = (
  teacherId: string,
  classId: string,
  presentStudentIds: string[],
  allStudentIds: string[],
  subjectId?: string
): void => {
  const today = new Date().toISOString().split('T')[0];
  const absentStudentIds = allStudentIds.filter(id => !presentStudentIds.includes(id));
  saveAttendance(classId, teacherId, today, presentStudentIds, absentStudentIds, subjectId);
  updateTodayClassStats(teacherId, classId, { attendance: presentStudentIds.length });
};

// ==================== HELPER FUNCTIONS ====================

export const toBengaliNumber = (num: number): string => {
  const bengaliDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
  return num.toString().split("").map((d) => bengaliDigits[parseInt(d)] || d).join("");
};

export const getTotalChapters = (): number => {
  if (_cachedTotalChapters !== null) return _cachedTotalChapters;

  let total = 0;
  Object.values(CHAPTERS_DATA).forEach(classData => {
    Object.values(classData).forEach(chapters => {
      total += chapters.length;
    });
  });

  _cachedTotalChapters = total;
  return total;
};

export const getTotalTopics = (): number => {
  if (_cachedTotalTopics !== null) return _cachedTotalTopics;

  let total = 0;
  Object.values(CHAPTERS_DATA).forEach(classData => {
    Object.values(classData).forEach(chapters => {
      chapters.forEach(chapter => {
        total += chapter.topics.length;
      });
    });
  });

  _cachedTotalTopics = total;
  return total;
};

export const getTotalCompletedChapters = (teacherId: string): number => {
  if (_completedChaptersCache.has(teacherId)) {
    return _completedChaptersCache.get(teacherId)!;
  }

  let completed = 0;
  Object.keys(CHAPTERS_DATA).forEach(classId => {
    Object.keys(CHAPTERS_DATA[classId]).forEach(subjectId => {
      const progress = getClassProgress(teacherId, classId, subjectId);
      if (progress && progress.chapterIndex > 0) {
        completed += progress.chapterIndex;
      }
    });
  });

  _completedChaptersCache.set(teacherId, completed);
  return completed;
};

export const getTotalCompletedTopics = (teacherId: string): number => {
  if (_completedTopicsCache.has(teacherId)) {
    return _completedTopicsCache.get(teacherId)!;
  }

  let completed = 0;
  Object.keys(CHAPTERS_DATA).forEach(classId => {
    Object.keys(CHAPTERS_DATA[classId]).forEach(subjectId => {
      const progress = getClassProgress(teacherId, classId, subjectId);
      if (progress) {
        const chapters = CHAPTERS_DATA[classId][subjectId];
        for (let i = 0; i < progress.chapterIndex; i++) {
          if (chapters[i]) {
            completed += chapters[i].topics.length;
          }
        }
        completed += progress.topicIndex;
      }
    });
  });

  _completedTopicsCache.set(teacherId, completed);
  return completed;
};

export const getVideosWatchedCount = (teacherId: string): number => {
  return 0;
};

export const getActivityStreakDays = (teacherId: string): number => {
  return 0;
};

export const getCurrentTerm = (): 1 | 2 | 3 => {
  const now = new Date();
  const month = now.getMonth();
  const day = now.getDate();

  for (const term of TERM_DATES) {
    const isAfterStart =
      month > term.startMonth ||
      (month === term.startMonth && day >= term.startDay);
    const isBeforeEnd =
      month < term.endMonth || (month === term.endMonth && day <= term.endDay);

    if (isAfterStart && isBeforeEnd) {
      return term.termNumber;
    }
  }

  return TERM_DATES[0].termNumber; // Default to first term
}

// ==================== COMPLETED TOPICS ====================

export const getCompletedTopics = (teacherId: string): CompletedTopic[] => {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(COMPLETED_TOPICS_KEY);
  const allCompleted: CompletedTopic[] = data ? JSON.parse(data) : [];
  return allCompleted.filter(t => t.teacherId === teacherId);
};

export const isTopicCompletedForClass = (
  teacherId: string,
  classId: string,
  subjectId: string,
  chapterId: string,
  topicId: string
): boolean => {
  const completed = getCompletedTopics(teacherId);
  return completed.some(
    t => t.classId === classId &&
         t.subjectId === subjectId &&
         t.chapterId === chapterId &&
         t.topicId === topicId
  );
};

export const markTopicComplete = (
  teacherId: string,
  classId: string,
  subjectId: string,
  chapterId: string,
  topicId: string,
  quizScore?: number
): void => {
  if (typeof window === "undefined") return;
  const data = localStorage.getItem(COMPLETED_TOPICS_KEY);
  const allCompleted: CompletedTopic[] = data ? JSON.parse(data) : [];

  const exists = allCompleted.find(
    t => t.teacherId === teacherId &&
         t.classId === classId &&
         t.subjectId === subjectId &&
         t.chapterId === chapterId &&
         t.topicId === topicId
  );

  if (!exists) {
    allCompleted.push({
      teacherId,
      classId,
      subjectId,
      chapterId,
      topicId,
      completedAt: new Date().toISOString(),
      quizScore,
    });
    localStorage.setItem(COMPLETED_TOPICS_KEY, JSON.stringify(allCompleted));
  }
};

// ==================== QUIZ FUNCTIONS ====================

export const saveQuiz = (quiz: Quiz): void => {
  if (typeof window === "undefined") return;
  const data = localStorage.getItem(QUIZZES_KEY);
  const quizzes: Quiz[] = data ? JSON.parse(data) : [];
  quizzes.push(quiz);
  localStorage.setItem(QUIZZES_KEY, JSON.stringify(quizzes));
};

export const getQuizzesForTopic = (topicId: string, teacherId: string): Quiz[] => {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(QUIZZES_KEY);
  const quizzes: Quiz[] = data ? JSON.parse(data) : [];
  return quizzes.filter(q => q.topicId === topicId && q.teacherId === teacherId);
};

export const saveQuizSession = (session: QuizSession): void => {
  if (typeof window === "undefined") return;
  const data = localStorage.getItem(QUIZ_SESSIONS_KEY);
  const sessions: QuizSession[] = data ? JSON.parse(data) : [];
  sessions.push(session);
  localStorage.setItem(QUIZ_SESSIONS_KEY, JSON.stringify(sessions));
};

export const getQuizSessionsForClass = (classId: string, teacherId: string): QuizSession[] => {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(QUIZ_SESSIONS_KEY);
  const sessions: QuizSession[] = data ? JSON.parse(data) : [];
  return sessions.filter(s => s.classId === classId && s.teacherId === teacherId);
};

// ==================== MARKS FUNCTIONS ====================

export const getStudentMarks = (studentId: string, classId: string, term: 1 | 2 | 3): StudentMark | null => {
  if (typeof window === "undefined") return null;
  const data = localStorage.getItem(MARKS_KEY);
  const marks: StudentMark[] = data ? JSON.parse(data) : [];
  const currentYear = new Date().getFullYear();
  return marks.find(
    m => m.studentId === studentId && m.classId === classId && m.term === term && m.year === currentYear
  ) || null;
};

export const saveStudentMarks = (marks: StudentMark): void => {
  if (typeof window === "undefined") return;
  const data = localStorage.getItem(MARKS_KEY);
  const allMarks: StudentMark[] = data ? JSON.parse(data) : [];

  const existingIndex = allMarks.findIndex(
    m => m.studentId === marks.studentId &&
         m.classId === marks.classId &&
         m.subjectId === marks.subjectId &&
         m.term === marks.term &&
         m.year === marks.year
  );

  if (existingIndex !== -1) {
    allMarks[existingIndex] = marks;
  } else {
    allMarks.push(marks);
  }

  localStorage.setItem(MARKS_KEY, JSON.stringify(allMarks));
};

export const updateQuizMarks = (
  studentId: string,
  classId: string,
  subjectId: string,
  teacherId: string,
  quizScore: number
): void => {
  const currentTermNumber = getCurrentTerm() as 1 | 2 | 3;

  const existingMarks = getStudentMarks(studentId, classId, currentTermNumber);
  const currentYear = new Date().getFullYear();

  if (existingMarks) {
    const newQuizCount = existingMarks.quizCount + 1;
    const newQuizAvg = ((existingMarks.quizMarks * existingMarks.quizCount) + quizScore) / newQuizCount;

    saveStudentMarks({
      ...existingMarks,
      quizMarks: newQuizAvg,
      quizCount: newQuizCount,
      lastUpdated: new Date().toISOString(),
    });
  } else {
    saveStudentMarks({
      studentId,
      classId,
      subjectId,
      teacherId,
      term: currentTermNumber,
      year: currentYear,
      quizMarks: quizScore,
      quizCount: 1,
      classEngagement: 0,
      lastUpdated: new Date().toISOString(),
    });
  }
};

/**
 * Process quiz results and update marks for all students
 * This function fixes the critical bug where quiz marks were never saved
 *
 * @param quizSession - The completed quiz session with all student responses
 * @param questions - Array of quiz questions with correct answers
 * @param normalizeToMax - Normalize scores to this maximum (5, 10, or 20). Default: 10
 */
export const processQuizResults = (
  quizSession: QuizSession,
  questions: QuizQuestion[],
  normalizeToMax: 5 | 10 | 20 = 10
): void => {
  const { responses, classId, subjectId, teacherId } = quizSession;

  // Group responses by student
  const studentResponses = responses.reduce((acc, response) => {
    if (!acc[response.studentId]) {
      acc[response.studentId] = [];
    }
    acc[response.studentId].push(response);
    return acc;
  }, {} as Record<string, StudentQuizResponse[]>);

  // Process each student's responses
  for (const [studentId, studentAnswers] of Object.entries(studentResponses)) {
    let correctCount = 0;

    // Count correct answers
    for (const answer of studentAnswers) {
      if (answer.isCorrect) {
        correctCount++;
      }
    }

    // Calculate raw score (out of total questions)
    const totalQuestions = questions.length;
    const rawScore = correctCount;

    // Normalize to desired maximum (default 10)
    const normalizedScore = (rawScore / totalQuestions) * normalizeToMax;

    // Round to 2 decimal places
    const finalScore = Math.round(normalizedScore * 100) / 100;

    // Update marks for this student
    updateQuizMarks(
      studentId,
      classId,
      subjectId,
      teacherId,
      finalScore
    );
  }
};

// ==================== ATTENDANCE FUNCTIONS ====================

export const saveAttendance = (
  classId: string,
  teacherId: string,
  date: string,
  presentStudentIds: string[],
  absentStudentIds: string[],
  subjectId?: string
): void => {
  if (typeof window === "undefined") return;
  const data = localStorage.getItem(ATTENDANCE_KEY);
  const records: AttendanceRecord[] = data ? JSON.parse(data) : [];

  const existingIndex = records.findIndex(
    r => r.classId === classId && r.teacherId === teacherId && r.date === date
  );

  const record: AttendanceRecord = {
    id: existingIndex !== -1 ? records[existingIndex].id : Date.now().toString(),
    classId,
    teacherId,
    subjectId,
    date,
    presentStudentIds,
    absentStudentIds,
  };

  if (existingIndex !== -1) {
    records[existingIndex] = record;
  } else {
    records.push(record);
  }

  localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(records));
};

export const getAttendanceForDate = (
  classId: string,
  teacherId: string,
  date: string
): AttendanceRecord | null => {
  if (typeof window === "undefined") return null;
  const data = localStorage.getItem(ATTENDANCE_KEY);
  const records: AttendanceRecord[] = data ? JSON.parse(data) : [];
  return records.find(
    r => r.classId === classId && r.teacherId === teacherId && r.date === date
  ) || null;
};

export const getAttendanceForClass = (classId: string, teacherId: string): AttendanceRecord[] => {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(ATTENDANCE_KEY);
  const records: AttendanceRecord[] = data ? JSON.parse(data) : [];
  return records.filter(r => r.classId === classId && r.teacherId === teacherId);
};

// ==================== TRAINING FUNCTIONS ====================

export const getTeacherTrainingProgress = (teacherId: string): TeacherTrainingProgress[] => {
  if (typeof window === "undefined") return [];

  if (_trainingProgressCache.has(teacherId)) {
    return _trainingProgressCache.get(teacherId)!;
  }

  const data = localStorage.getItem(TRAINING_PROGRESS_KEY);
  const allProgress: TeacherTrainingProgress[] = data ? JSON.parse(data) : [];
  const teacherProgress = allProgress.filter(p => p.teacherId === teacherId);

  _trainingProgressCache.set(teacherId, teacherProgress);
  return teacherProgress;
};

const saveAllTrainingProgress = (progress: TeacherTrainingProgress[]): void => {
  localStorage.setItem(TRAINING_PROGRESS_KEY, JSON.stringify(progress));
};

export const isTrainingTopicCompleted = (
  teacherId: string,
  courseId: string,
  chapterId: string,
  topicId: string
): boolean => {
  const progress = getTeacherTrainingProgress(teacherId);
  return progress.some(
    p => p.courseId === courseId && p.chapterId === chapterId && p.topicId === topicId && p.completed
  );
};

// Alias for backwards compatibility
export const isTopicCompleted = isTrainingTopicCompleted;

export const getTopicProgress = (
  teacherId: string,
  courseId: string,
  chapterId: string,
  topicId: string
): TeacherTrainingProgress | null => {
  const progress = getTeacherTrainingProgress(teacherId);
  return progress.find(
    p => p.courseId === courseId && p.chapterId === chapterId && p.topicId === topicId
  ) || null;
};

export const completeTrainingTopic = (
  teacherId: string,
  courseId: string,
  chapterId: string,
  topicId: string,
  quizScore: number
): void => {
  const allProgress: TeacherTrainingProgress[] = (() => {
    if (typeof window === "undefined") return [];
    const data = localStorage.getItem(TRAINING_PROGRESS_KEY);
    return data ? JSON.parse(data) : [];
  })();

  const existingIndex = allProgress.findIndex(
    p => p.teacherId === teacherId && p.courseId === courseId && p.chapterId === chapterId && p.topicId === topicId
  );

  const newProgress: TeacherTrainingProgress = {
    teacherId,
    courseId,
    chapterId,
    topicId,
    completed: true,
    quizScore,
    completedAt: new Date().toISOString(),
    attempts: existingIndex >= 0 ? allProgress[existingIndex].attempts + 1 : 1,
  };

  if (existingIndex >= 0) {
    allProgress[existingIndex] = newProgress;
  } else {
    allProgress.push(newProgress);
  }

  saveAllTrainingProgress(allProgress);

  _trainingProgressCache.delete(teacherId);
};

export const recordFailedQuizAttempt = (
  teacherId: string,
  courseId: string,
  chapterId: string,
  topicId: string,
  quizScore: number
): void => {
  const allProgress: TeacherTrainingProgress[] = (() => {
    if (typeof window === "undefined") return [];
    const data = localStorage.getItem(TRAINING_PROGRESS_KEY);
    return data ? JSON.parse(data) : [];
  })();

  const existingIndex = allProgress.findIndex(
    p => p.teacherId === teacherId && p.courseId === courseId && p.chapterId === chapterId && p.topicId === topicId
  );

  if (existingIndex >= 0) {
    allProgress[existingIndex].attempts += 1;
    allProgress[existingIndex].quizScore = quizScore;
  } else {
    allProgress.push({
      teacherId,
      courseId,
      chapterId,
      topicId,
      completed: false,
      quizScore,
      attempts: 1,
    });
  }

  saveAllTrainingProgress(allProgress);

  _trainingProgressCache.delete(teacherId);
};

export const getCourseCompletionStats = (teacherId: string, courseId: string): {
  totalTopics: number;
  completedTopics: number;
  percentage: number;
  inProgress: boolean;
} => {
  const course = TRAINING_COURSES.find(c => c.id === courseId);
  if (!course) return { totalTopics: 0, completedTopics: 0, percentage: 0, inProgress: false };

  let totalTopics = 0;
  course.chapters.forEach(chapter => {
    totalTopics += chapter.topics.length;
  });

  const progress = getTeacherTrainingProgress(teacherId);
  const completedTopics = progress.filter(
    p => p.courseId === courseId && p.completed
  ).length;

  const percentage = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;
  const inProgress = completedTopics > 0 && completedTopics < totalTopics;

  return { totalTopics, completedTopics, percentage, inProgress };
};

export const getOverallTrainingStats = (teacherId: string): {
  totalCourses: number;
  completedCourses: number;
  inProgressCourses: number;
  remainingCourses: number;
  overallPercentage: number;
} => {
  let completedCourses = 0;
  let inProgressCourses = 0;

  TRAINING_COURSES.forEach(course => {
    const stats = getCourseCompletionStats(teacherId, course.id);
    if (stats.percentage === 100) {
      completedCourses++;
    } else if (stats.inProgress) {
      inProgressCourses++;
    }
  });

  const totalCourses = TRAINING_COURSES.length;
  const remainingCourses = totalCourses - completedCourses - inProgressCourses;

  let totalTopics = 0;
  let totalCompleted = 0;
  TRAINING_COURSES.forEach(course => {
    const stats = getCourseCompletionStats(teacherId, course.id);
    totalTopics += stats.totalTopics;
    totalCompleted += stats.completedTopics;
  });
  const overallPercentage = totalTopics > 0 ? Math.round((totalCompleted / totalTopics) * 100) : 0;

  return {
    totalCourses,
    completedCourses,
    inProgressCourses,
    remainingCourses,
    overallPercentage,
  };
};

export const isTopicUnlocked = (
  teacherId: string,
  courseId: string,
  chapterId: string,
  topicId: string
): boolean => {
  const course = TRAINING_COURSES.find(c => c.id === courseId);
  if (!course) return false;

  let allTopics: { courseId: string; chapterId: string; topicId: string }[] = [];
  course.chapters.forEach(chapter => {
    chapter.topics.forEach(topic => {
      allTopics.push({ courseId: course.id, chapterId: chapter.id, topicId: topic.id });
    });
  });

  const currentIndex = allTopics.findIndex(
    t => t.courseId === courseId && t.chapterId === chapterId && t.topicId === topicId
  );

  if (currentIndex === 0) return true;

  const previousTopic = allTopics[currentIndex - 1];
  return isTrainingTopicCompleted(teacherId, previousTopic.courseId, previousTopic.chapterId, previousTopic.topicId);
};

export const getNextTopicToLearn = (teacherId: string): {
  course: TrainingCourse;
  chapter: TrainingChapter;
  topic: TrainingTopic;
} | null => {
  for (const course of TRAINING_COURSES) {
    for (const chapter of course.chapters) {
      for (const topic of chapter.topics) {
        if (!isTrainingTopicCompleted(teacherId, course.id, chapter.id, topic.id) &&
            isTopicUnlocked(teacherId, course.id, chapter.id, topic.id)) {
          return { course, chapter, topic };
        }
      }
    }
  }
  return null;
};

export const getInProgressCourses = (teacherId: string): TrainingCourse[] => {
  return TRAINING_COURSES.filter(course => {
    const stats = getCourseCompletionStats(teacherId, course.id);
    return stats.inProgress;
  });
};

export const getRemainingCourses = (teacherId: string): TrainingCourse[] => {
  return TRAINING_COURSES.filter(course => {
    const stats = getCourseCompletionStats(teacherId, course.id);
    return stats.completedTopics === 0;
  });
};

export const getCompletedCourses = (teacherId: string): TrainingCourse[] => {
  return TRAINING_COURSES.filter(course => {
    const stats = getCourseCompletionStats(teacherId, course.id);
    return stats.percentage === 100;
  });
};

// ==================== ADDITIONAL HELPER FUNCTIONS ====================

export const addClassEngagementPoint = (
  studentId: string,
  classId: string,
  subjectId: string,
  teacherId: string
): void => {
  const currentTermNumber = getCurrentTerm() as 1 | 2 | 3;

  const existingMarks = getStudentMarks(studentId, classId, currentTermNumber);
  const currentYear = new Date().getFullYear();

  if (existingMarks) {
    saveStudentMarks({
      ...existingMarks,
      classEngagement: (existingMarks.classEngagement || 0) + 1,
      lastUpdated: new Date().toISOString(),
    });
  } else {
    saveStudentMarks({
      studentId,
      classId,
      subjectId,
      teacherId,
      term: currentTermNumber,
      year: currentYear,
      quizMarks: 0,
      quizCount: 0,
      classEngagement: 1,
      lastUpdated: new Date().toISOString(),
    });
  }
};

export const addQuizMarkToStudent = updateQuizMarks;

export const calculateGrade = (marks: number): string => {
  if (marks >= 80) return "A+";
  if (marks >= 70) return "A";
  if (marks >= 60) return "A-";
  if (marks >= 50) return "B";
  if (marks >= 40) return "C";
  if (marks >= 33) return "D";
  return "F";
};

export const getAIToolUsageCount = (teacherId: string, toolName?: string): number => {
  return 0;
};

export const getAllQuizSessions = (): QuizSession[] => {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(QUIZ_SESSIONS_KEY);
  return data ? JSON.parse(data) : [];
};

export const getAttendanceReport = (
  classId: string,
  teacherId: string,
  startDate: string | Date,
  endDate: string | Date
): AttendanceRecord[] => {
  const records = getAttendanceForClass(classId, teacherId);
  const startStr = typeof startDate === 'string' ? startDate : startDate.toISOString().split('T')[0];
  const endStr = typeof endDate === 'string' ? endDate : endDate.toISOString().split('T')[0];
  return records.filter(r => r.date >= startStr && r.date <= endStr);
};

export const getClassMarks = (
  classId: string,
  subjectId?: string,
  term?: 1 | 2 | 3,
  year?: number
): StudentMark[] => {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(MARKS_KEY);
  const marks: StudentMark[] = data ? JSON.parse(data) : [];
  const currentYear = year || new Date().getFullYear();
  const currentTerm = term || getCurrentTerm();

  let filtered = marks.filter(m => m.classId === classId && m.term === currentTerm && m.year === currentYear);
  if (subjectId) {
    filtered = filtered.filter(m => m.subjectId === subjectId);
  }
  return filtered;
};

export const getCurrentYear = (): number => {
  return new Date().getFullYear();
};

export const getTeacherProgress = (teacherId: string): ClassProgress[] => {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(CLASS_PROGRESS_KEY);
  const allProgress: ClassProgress[] = data ? JSON.parse(data) : [];
  return allProgress.filter(p => p.teacherId === teacherId);
};

export const getTermName = (termNumber: 1 | 2 | 3): string => {
  const term = TERM_DATES.find(t => t.termNumber === termNumber);
  return term?.name || "";
};

export const trackAIToolUsage = (teacherId: string, toolName: string): void => {
  // Placeholder for tracking AI tool usage
};

export const getAllMarks = (): StudentMark[] => {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(MARKS_KEY);
  return data ? JSON.parse(data) : [];
};

export const getAllAttendance = (): AttendanceRecord[] => {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(ATTENDANCE_KEY);
  return data ? JSON.parse(data) : [];
};


export const getCurrentTermData = (): TermDates => {
  const termNumber = getCurrentTerm();
  return TERM_DATES.find(t => t.termNumber === termNumber) || TERM_DATES[0];
};
