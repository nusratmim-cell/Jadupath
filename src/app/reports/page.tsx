"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getCurrentUser,
  getProfileByUserId,
  getStudentsForClass,
  type SessionUser,
  type TeacherProfile,
  type Student,
} from "@/lib/auth";
import {
  CLASS_LABELS,
  SUBJECTS,
  TERM_DATES,
  toBengaliNumber,
  getCurrentTerm,
  getCurrentYear,
  getTermName,
  getAllMarks,
  getClassMarks,
  getAllAttendance,
  getAttendanceReport,
  calculateGrade,
  type StudentMark,
  type AttendanceRecord,
  type ReportCard,
} from "@/lib/data";
import { ShikhoHeader, Toast, useToast, NoticeBar } from "@/components";
import KhataOCRModal from "@/components/KhataOCRModal";

type ViewMode = "overview" | "attendance" | "results" | "reportCard";
type SelectedTerm = 1 | 2 | 3;

export default function ReportsPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [viewMode, setViewMode] = useState<ViewMode>("overview");
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<string>("math");
  const [selectedTerm, setSelectedTerm] = useState<SelectedTerm>(getCurrentTerm());
  const [selectedYear, setSelectedYear] = useState<number>(getCurrentYear());

  const [students, setStudents] = useState<Student[]>([]);
  const [marks, setMarks] = useState<StudentMark[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);

  // Toast notifications
  const { toasts, removeToast, error, info } = useToast();
  
  // Edit marks modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editMarks, setEditMarks] = useState({ quiz: 0, written: 0 });

  // Report card generation
  const [generatingReportCard, setGeneratingReportCard] = useState(false);
  const [reportCard, setReportCard] = useState<ReportCard | null>(null);
  const [selectedStudentForReport, setSelectedStudentForReport] = useState<Student | null>(null);

  // Khata OCR Modal
  const [showKhataOCRModal, setShowKhataOCRModal] = useState(false);

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
    
    setIsLoading(false);
  }, [router]);

  // Load data when class changes
  useEffect(() => {
    if (!user || !selectedClass) return;
    
    const classStudents = getStudentsForClass(user.id, selectedClass);
    setStudents(classStudents);
    
    // Load marks for selected term
    const classMarks = getClassMarks(selectedClass, selectedSubject, selectedTerm, selectedYear);
    setMarks(classMarks);
    
    // Load attendance for selected term
    const termData = TERM_DATES.find(t => t.termNumber === selectedTerm);
    if (termData) {
      const startDate = new Date(selectedYear, termData.startMonth, termData.startDay);
      const endDate = new Date(selectedYear, termData.endMonth, termData.endDay);
      const attendanceRecords = getAttendanceReport(selectedClass, user.id, startDate, endDate);
      setAttendance(attendanceRecords);
    }
  }, [user, selectedClass, selectedSubject, selectedTerm, selectedYear]);

  const getStudentMark = (studentId: string): StudentMark | undefined => {
    return marks.find(m => m.studentId === studentId);
  };

  const getStudentAttendance = (studentId: string): { present: number; total: number; percentage: number } => {
    let present = 0;
    const total = attendance.length;
    
    attendance.forEach(record => {
      if (record.presentStudentIds.includes(studentId)) {
        present++;
      }
    });
    
    return {
      present,
      total,
      percentage: total > 0 ? Math.round((present / total) * 100) : 0
    };
  };

  const handleEditMarks = (student: Student) => {
    const studentMark = getStudentMark(student.id);
    setEditingStudent(student);
    setEditMarks({
      quiz: (studentMark?.quizMarks && !isNaN(studentMark.quizMarks)) ? studentMark.quizMarks : 0,
      written: (studentMark?.writtenMarks && !isNaN(studentMark.writtenMarks)) ? studentMark.writtenMarks : 0,
    });
    setShowEditModal(true);
  };

  const handleSaveMarks = () => {
    // In production, save to storage
    setShowEditModal(false);
    setEditingStudent(null);
  };

  const generateReportCard = (student: Student) => {
    setSelectedStudentForReport(student);
    setGeneratingReportCard(true);
    
    // Simulate report generation
    setTimeout(() => {
      const studentMark = getStudentMark(student.id);
      const studentAttendance = getStudentAttendance(student.id);
      
      const quizMarks = studentMark?.quizMarks || 0;
      const writtenMarks = studentMark?.writtenMarks || 0;
      const totalMarks = (quizMarks * 20) + writtenMarks; // Quiz out of 20, written out of 80
      const percentage = totalMarks;
      
      const card: ReportCard = {
        studentId: student.id,
        studentName: student.name,
        studentRoll: student.rollNumber,
        classId: selectedClass,
        term: selectedTerm,
        year: selectedYear,
        subjects: [{
          subjectId: "math",
          subjectName: "গণিত",
          quizMarks: Math.round(quizMarks * 20),
          writtenMarks: writtenMarks,
          totalMarks: totalMarks,
          grade: calculateGrade(percentage),
        }],
        totalMarks: totalMarks,
        averageMarks: totalMarks,
        overallGrade: calculateGrade(percentage),
        attendance: {
          totalDays: studentAttendance.total,
          presentDays: studentAttendance.present,
          percentage: studentAttendance.percentage,
        },
        generatedAt: new Date().toISOString(),
      };
      
      setReportCard(card);
      setGeneratingReportCard(false);
      setViewMode("reportCard");
    }, 1500);
  };

  const handlePrintReportCard = () => {
    window.print();
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
    <div className="min-h-screen bg-slate-100 pb-24">
      {/* Header */}
      <ShikhoHeader
        variant="light"
        showBackButton={true}
        onBack={() => {
          if (viewMode === "reportCard") {
            setViewMode("results");
            setReportCard(null);
          } else if (viewMode !== "overview") {
            setViewMode("overview");
          } else {
            router.push("/dashboard");
          }
        }}
        rightContent={
          <div className="text-right">
            <h1 className="text-base font-semibold text-slate-800">রিপোর্ট</h1>
            <p className="text-xs text-slate-500">
              {viewMode === "overview" && "হাজিরা ও ফলাফল"}
              {viewMode === "attendance" && "হাজিরা রিপোর্ট"}
              {viewMode === "results" && "ফলাফল রিপোর্ট"}
              {viewMode === "reportCard" && "রিপোর্ট কার্ড"}
            </p>
          </div>
        }
      />

      {/* Notice Ticker Bar */}
      <NoticeBar />

      <main className="max-w-4xl mx-auto px-4 py-6">
        
        {/* ==================== OVERVIEW ==================== */}
        {viewMode === "overview" && (
          <div className="space-y-6 animate-fadeIn">
            {/* Term & Class Selection */}
            <div className="bg-white rounded-2xl p-4 shadow-md">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-600 mb-1 block">ক্লাস</label>
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-[#cf278d] outline-none"
                  >
                    {profile?.classes.map(c => (
                      <option key={c} value={c}>{CLASS_LABELS[c]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600 mb-1 block">সাময়িক</label>
                  <select
                    value={selectedTerm}
                    onChange={(e) => setSelectedTerm(parseInt(e.target.value) as SelectedTerm)}
                    className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-[#cf278d] outline-none"
                  >
                    {TERM_DATES.map(t => (
                      <option key={t.termNumber} value={t.termNumber}>
                        {t.name} {selectedYear}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Current Term Info */}
            <div className="gradient-blue-pink rounded-2xl p-5 text-white shadow-lg">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-white/80 text-sm">বর্তমান সাময়িক</p>
                  <h2 className="text-xl font-bold">{getTermName(getCurrentTerm())} {getCurrentYear()}</h2>
                  <p className="text-white/80 text-sm mt-1">
                    {students.length} জন শিক্ষার্থী • {CLASS_LABELS[selectedClass]}
                  </p>
                </div>
              </div>
            </div>

            {/* Report Cards */}
            <div className="grid grid-cols-2 gap-4">
              {/* Attendance Report */}
              <button
                onClick={() => setViewMode("attendance")}
                className="bg-white rounded-2xl p-5 shadow-md hover:shadow-lg transition-all text-left hover:scale-[1.02] active:scale-[0.98]"
              >
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
                <p className="font-bold text-slate-800">হাজিরা রিপোর্ট</p>
                <p className="text-sm text-slate-500 mt-1">{attendance.length} দিন রেকর্ড</p>
              </button>

              {/* Results Report */}
              <button
                onClick={() => setViewMode("results")}
                className="bg-white rounded-2xl p-5 shadow-md hover:shadow-lg transition-all text-left hover:scale-[1.02] active:scale-[0.98]"
              >
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <p className="font-bold text-slate-800">ফলাফল রিপোর্ট</p>
                <p className="text-sm text-slate-500 mt-1">{getTermName(selectedTerm)}</p>
              </button>
            </div>

            {/* Quick Stats */}
            <div className="bg-white rounded-2xl p-5 shadow-md">
              <h3 className="font-bold text-slate-800 mb-4">দ্রুত পরিসংখ্যান</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-3xl font-bold text-[#cf278d]">{toBengaliNumber(students.length)}</p>
                  <p className="text-sm text-slate-500">শিক্ষার্থী</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-green-600">{toBengaliNumber(attendance.length)}</p>
                  <p className="text-sm text-slate-500">হাজিরা দিন</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-purple-600">{toBengaliNumber(marks.length)}</p>
                  <p className="text-sm text-slate-500">নম্বর রেকর্ড</p>
                </div>
              </div>
            </div>

            {/* High-Level Analytics */}
            <div className="bg-white rounded-2xl p-5 shadow-md">
              <h3 className="font-bold text-slate-800 mb-4">বিস্তারিত বিশ্লেষণ</h3>
              
              {/* Grade Distribution */}
              <div className="mb-6">
                <p className="text-sm font-medium text-slate-600 mb-3">গ্রেড ভিত্তিক বিতরণ</p>
                <div className="space-y-2">
                  {["A+", "A", "A-", "B", "C", "D", "F"].map((grade) => {
                    const count = students.filter(s => {
                      const mark = getStudentMark(s.id);
                      const quizScore = Math.round((mark?.quizMarks || 0) * 20);
                      const writtenScore = mark?.writtenMarks || 0;
                      return calculateGrade(quizScore + writtenScore) === grade;
                    }).length;
                    const percentage = students.length > 0 ? (count / students.length) * 100 : 0;
                    
                    return (
                      <div key={grade} className="flex items-center gap-3">
                        <span className={`w-10 text-center text-sm font-bold rounded px-2 py-0.5 ${
                          grade === "A+" ? "bg-green-100 text-green-700" :
                          grade === "A" || grade === "A-" ? "bg-blue-100 text-blue-700" :
                          grade === "B" ? "bg-yellow-100 text-yellow-700" :
                          grade === "C" ? "bg-orange-100 text-orange-700" :
                          "bg-red-100 text-red-700"
                        }`}>{grade}</span>
                        <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all ${
                              grade === "A+" ? "bg-green-500" :
                              grade === "A" || grade === "A-" ? "bg-blue-500" :
                              grade === "B" ? "bg-yellow-500" :
                              grade === "C" ? "bg-orange-500" :
                              "bg-red-500"
                            }`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-sm text-slate-600 w-16 text-right">{toBengaliNumber(count)} জন</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Class Performance */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 text-center">
                  <p className="text-sm text-green-700 mb-1">সর্বোচ্চ নম্বর</p>
                  <p className="text-3xl font-bold text-green-600">
                    {toBengaliNumber(Math.max(...students.map(s => {
                      const mark = getStudentMark(s.id);
                      return Math.round((mark?.quizMarks || 0) * 20) + (mark?.writtenMarks || 0);
                    }), 0))}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 text-center">
                  <p className="text-sm text-blue-700 mb-1">ক্লাস গড়</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {toBengaliNumber(Math.round(students.reduce((acc, s) => {
                      const mark = getStudentMark(s.id);
                      return acc + Math.round((mark?.quizMarks || 0) * 20) + (mark?.writtenMarks || 0);
                    }, 0) / (students.length || 1)))}
                  </p>
                </div>
              </div>
            </div>

            {/* Bulk Report Card Generation */}
            <button
              onClick={() => {
                if (students.length === 0) {
                  error("কোনো শিক্ষার্থী নেই");
                  return;
                }
                setViewMode("results");
              }}
              className="w-full gradient-blue-pink text-white rounded-2xl p-5 shadow-lg flex items-center justify-between"
            >
              <div className="text-left">
                <p className="font-bold text-lg">সকলের রিপোর্ট কার্ড তৈরি করুন</p>
                <p className="text-white/80 text-sm">{students.length} জন শিক্ষার্থীর জন্য</p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </button>
          </div>
        )}

        {/* ==================== ATTENDANCE VIEW ==================== */}
        {viewMode === "attendance" && (
          <div className="space-y-4 animate-fadeIn">
            <div className="bg-white rounded-2xl p-4 shadow-md">
              <h3 className="font-bold text-slate-800 mb-4">
                হাজিরা রিপোর্ট - {getTermName(selectedTerm)} {selectedYear}
              </h3>
              
              {students.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <p>কোনো শিক্ষার্থী নেই</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {students.map((student) => {
                    const att = getStudentAttendance(student.id);
                    return (
                      <div key={student.id} className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl">
                        <div className="w-10 h-10 bg-[#cf278d] rounded-full flex items-center justify-center text-white font-bold">
                          {student.name.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-slate-800">{student.name}</p>
                          <p className="text-sm text-slate-500">রোল: {student.rollNumber}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-slate-800">
                            {toBengaliNumber(att.present)}/{toBengaliNumber(att.total)} দিন
                          </p>
                          <p className={`text-sm font-medium ${
                            att.percentage >= 80 ? "text-green-600" :
                            att.percentage >= 60 ? "text-yellow-600" : "text-red-600"
                          }`}>
                            {toBengaliNumber(att.percentage)}%
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Attendance Summary */}
            <div className="bg-gradient-to-br from-green-500 to-green-700 rounded-2xl p-5 text-white shadow-lg">
              <h4 className="font-bold mb-3">সারাংশ</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold">{toBengaliNumber(attendance.length)}</p>
                  <p className="text-white/80 text-sm">মোট দিন</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">
                    {toBengaliNumber(Math.round(students.reduce((acc, s) => acc + getStudentAttendance(s.id).percentage, 0) / (students.length || 1)))}%
                  </p>
                  <p className="text-white/80 text-sm">গড় উপস্থিতি</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{toBengaliNumber(students.filter(s => getStudentAttendance(s.id).percentage >= 80).length)}</p>
                  <p className="text-white/80 text-sm">৮০%+ উপস্থিতি</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== RESULTS VIEW ==================== */}
        {viewMode === "results" && (
          <div className="space-y-4 animate-fadeIn">
            {/* Term tabs */}
            <div className="bg-white rounded-2xl p-2 shadow-md">
              <div className="flex gap-1">
                {TERM_DATES.map((term) => (
                  <button
                    key={term.termNumber}
                    onClick={() => setSelectedTerm(term.termNumber)}
                    className={`flex-1 py-3 px-4 rounded-xl font-medium text-sm transition-all ${
                      selectedTerm === term.termNumber
                        ? "gradient-blue-pink text-white"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {term.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Subject Filter - Dynamic Selection */}
            <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-200">
              <label className="text-xs font-medium text-slate-600 mb-2 block">
                বিষয়
              </label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg focus:border-[#cf278d] focus:outline-none appearance-none bg-white"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                  backgroundPosition: 'right 0.5rem center',
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: '1.5em 1.5em',
                  paddingRight: '2.5rem',
                }}
              >
                {SUBJECTS.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>

            {/* OCR Upload Button */}
            <button
              onClick={() => setShowKhataOCRModal(true)}
              className="w-full bg-gradient-to-r from-[#4285f4] to-[#cf278d] text-white rounded-xl p-4 shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-3"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="font-bold">খাতা থেকে নম্বর আপলোড করুন</span>
            </button>

            {/* Results Table */}
            <div className="bg-white rounded-2xl shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left p-4 font-medium text-slate-600">নাম</th>
                      <th className="text-center p-4 font-medium text-slate-600">কুইজ<br/><span className="text-xs">(২০)</span></th>
                      <th className="text-center p-4 font-medium text-slate-600">লিখিত<br/><span className="text-xs">(৮০)</span></th>
                      <th className="text-center p-4 font-medium text-slate-600">মোট<br/><span className="text-xs">(১০০)</span></th>
                      <th className="text-center p-4 font-medium text-slate-600">গ্রেড</th>
                      <th className="text-center p-4 font-medium text-slate-600"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {students.map((student) => {
                      const mark = getStudentMark(student.id);
                      const quizScore = Math.round((mark?.quizMarks || 0) * 20);
                      const writtenScore = mark?.writtenMarks || 0;
                      const total = quizScore + writtenScore;
                      const grade = calculateGrade(total);
                      
                      return (
                        <tr key={student.id} className="hover:bg-slate-50">
                          <td className="p-4">
                            <p className="font-medium text-slate-800">{student.name}</p>
                            <p className="text-xs text-slate-500">রোল: {student.rollNumber}</p>
                          </td>
                          <td className="text-center p-4 font-medium">{toBengaliNumber(quizScore)}</td>
                          <td className="text-center p-4 font-medium">{toBengaliNumber(writtenScore)}</td>
                          <td className="text-center p-4 font-bold text-[#cf278d]">{toBengaliNumber(total)}</td>
                          <td className="text-center p-4">
                            <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                              grade === "A+" ? "bg-green-100 text-green-700" :
                              grade === "A" || grade === "A-" ? "bg-blue-100 text-blue-700" :
                              grade === "B" ? "bg-yellow-100 text-yellow-700" :
                              grade === "C" ? "bg-orange-100 text-orange-700" :
                              "bg-red-100 text-red-700"
                            }`}>
                              {grade}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleEditMarks(student)}
                                className="p-2 text-slate-400 hover:text-[#cf278d] hover:bg-slate-100 rounded-lg transition-colors"
                                title="নম্বর সম্পাদনা"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => generateReportCard(student)}
                                className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="রিপোর্ট কার্ড"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {students.length === 0 && (
              <div className="text-center py-8 text-slate-500">
                <p>কোনো শিক্ষার্থী নেই</p>
              </div>
            )}
          </div>
        )}

        {/* ==================== REPORT CARD VIEW ==================== */}
        {viewMode === "reportCard" && reportCard && (
          <div className="space-y-4 animate-fadeIn print:m-0 print:p-0">
            {/* Print-friendly Report Card */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden print:shadow-none print:rounded-none">
              {/* Header with School Logo */}
              <div className="gradient-blue-pink p-6 text-white print:bg-[#cf278d] print:text-black print:bg-none">
                <div className="flex items-center justify-center gap-4 mb-3">
                  <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center print:border-2 print:border-gray-400">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                    </svg>
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-center print:text-black">শিখো একাডেমি</h2>
                <p className="text-center text-white/90 text-lg mt-1 print:text-gray-700">প্রগতি প্রতিবেদন</p>
                <p className="text-center text-white/70 mt-2 print:text-gray-500">{getTermName(reportCard.term)} - {reportCard.year}</p>
              </div>

              {/* Student Info Card */}
              <div className="p-6 bg-gradient-to-r from-slate-50 to-blue-50 print:bg-white">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-slate-400 uppercase tracking-wider">শিক্ষার্থীর নাম</p>
                      <p className="font-bold text-slate-800 text-lg">{reportCard.studentName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 uppercase tracking-wider">ক্লাস</p>
                      <p className="font-bold text-slate-800">{CLASS_LABELS[reportCard.classId]}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-slate-400 uppercase tracking-wider">রোল নম্বর</p>
                      <p className="font-bold text-slate-800 text-lg">{reportCard.studentRoll}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 uppercase tracking-wider">সাময়িক</p>
                      <p className="font-bold text-slate-800">{getTermName(reportCard.term)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Overall Performance Badge */}
              <div className="p-6 flex items-center justify-center">
                <div className={`text-center px-8 py-4 rounded-2xl ${
                  reportCard.overallGrade === "A+" ? "bg-gradient-to-r from-green-500 to-emerald-500" :
                  reportCard.overallGrade === "A" || reportCard.overallGrade === "A-" ? "bg-gradient-to-r from-blue-500 to-indigo-500" :
                  reportCard.overallGrade === "B" ? "bg-gradient-to-r from-yellow-500 to-orange-500" :
                  "bg-gradient-to-r from-orange-500 to-red-500"
                } text-white shadow-lg`}>
                  <p className="text-sm text-white/80">সামগ্রিক গ্রেড</p>
                  <p className="text-4xl font-bold mt-1">{reportCard.overallGrade}</p>
                  <p className="text-lg mt-1">{toBengaliNumber(reportCard.totalMarks || 0)}/১০০</p>
                </div>
              </div>

              {/* Marks Table */}
              <div className="p-6">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-[#cf278d]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  বিষয়ভিত্তিক নম্বর
                </h3>
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <table className="w-full">
                    <thead className="gradient-blue-pink text-white">
                      <tr>
                        <th className="text-left p-4">বিষয়</th>
                        <th className="text-center p-4">কুইজ (২০)</th>
                        <th className="text-center p-4">লিখিত (৮০)</th>
                        <th className="text-center p-4">মোট (১০০)</th>
                        <th className="text-center p-4">গ্রেড</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportCard.subjects.map((subject, idx) => (
                        <tr key={subject.subjectId} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                          <td className="p-4 font-medium text-slate-800">{subject.subjectName}</td>
                          <td className="text-center p-4 text-slate-700">{toBengaliNumber(subject.quizMarks)}</td>
                          <td className="text-center p-4 text-slate-700">{toBengaliNumber(subject.writtenMarks || 0)}</td>
                          <td className="text-center p-4 font-bold text-[#cf278d]">{toBengaliNumber(subject.totalMarks || 0)}</td>
                          <td className="text-center p-4">
                            <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                              subject.grade === "A+" ? "bg-green-100 text-green-700" :
                              subject.grade === "A" || subject.grade === "A-" ? "bg-blue-100 text-blue-700" :
                              subject.grade === "B" ? "bg-yellow-100 text-yellow-700" :
                              subject.grade === "C" ? "bg-orange-100 text-orange-700" :
                              "bg-red-100 text-red-700"
                            }`}>
                              {subject.grade}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Attendance Section */}
              <div className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 print:bg-white">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  উপস্থিতি রেকর্ড
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  {typeof reportCard.attendance === 'object' ? (
                    <>
                      <div className="bg-white rounded-xl p-4 text-center shadow-sm">
                        <p className="text-sm text-slate-500">মোট দিন</p>
                        <p className="text-3xl font-bold text-slate-800">{toBengaliNumber(reportCard.attendance.totalDays)}</p>
                      </div>
                      <div className="bg-white rounded-xl p-4 text-center shadow-sm">
                        <p className="text-sm text-slate-500">উপস্থিত</p>
                        <p className="text-3xl font-bold text-green-600">{toBengaliNumber(reportCard.attendance.presentDays)}</p>
                      </div>
                      <div className="bg-white rounded-xl p-4 text-center shadow-sm">
                        <p className="text-sm text-slate-500">শতাংশ</p>
                        <p className={`text-3xl font-bold ${
                          reportCard.attendance.percentage >= 80 ? "text-green-600" :
                          reportCard.attendance.percentage >= 60 ? "text-yellow-600" :
                          "text-red-600"
                        }`}>{toBengaliNumber(reportCard.attendance.percentage)}%</p>
                      </div>
                    </>
                  ) : (
                    <div className="bg-white rounded-xl p-4 text-center shadow-sm col-span-3">
                      <p className="text-sm text-slate-500">উপস্থিতি</p>
                      <p className="text-3xl font-bold text-slate-800">{toBengaliNumber(reportCard.attendance)}%</p>
                    </div>
                  )}
                </div>
                {/* Attendance bar */}
                <div className="mt-4 h-4 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      (typeof reportCard.attendance === 'object' ? reportCard.attendance.percentage : reportCard.attendance) >= 80 ? "bg-gradient-to-r from-green-500 to-emerald-500" :
                      (typeof reportCard.attendance === 'object' ? reportCard.attendance.percentage : reportCard.attendance) >= 60 ? "bg-gradient-to-r from-yellow-500 to-orange-500" :
                      "bg-gradient-to-r from-red-500 to-red-400"
                    }`}
                    style={{ width: `${typeof reportCard.attendance === 'object' ? reportCard.attendance.percentage : reportCard.attendance}%` }}
                  />
                </div>
              </div>

              {/* AI Insights - Only show if marks are available */}
              {(reportCard.totalMarks || 0) > 0 && (
                <div className="p-6 print:hidden">
                  <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                    AI বিশ্লেষণ
                  </h3>
                  <div className="space-y-3">
                    {(reportCard.totalMarks || 0) >= 80 && (
                      <div className="flex items-start gap-3 p-3 bg-green-50 rounded-xl">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium text-green-800">চমৎকার ফলাফল!</p>
                          <p className="text-sm text-green-600">{reportCard.studentName} এই সাময়িকে অত্যন্ত ভালো করেছে।</p>
                        </div>
                      </div>
                    )}
                    {(reportCard.totalMarks || 0) >= 60 && (reportCard.totalMarks || 0) < 80 && (
                      <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium text-blue-800">ভালো অগ্রগতি!</p>
                          <p className="text-sm text-blue-600">আরেকটু চেষ্টা করলেই আরও ভালো ফলাফল করতে পারবে।</p>
                        </div>
                      </div>
                    )}
                    {(reportCard.totalMarks || 0) < 60 && (
                      <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-xl">
                        <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium text-orange-800">উন্নতির সুযোগ আছে</p>
                          <p className="text-sm text-orange-600">নিয়মিত অধ্যয়ন এবং অনুশীলন করলে পরবর্তী সাময়িকে আরও ভালো করতে পারবে।</p>
                        </div>
                      </div>
                    )}
                    {(typeof reportCard.attendance === 'object' ? reportCard.attendance.percentage : reportCard.attendance) < 75 && (
                      <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-xl">
                        <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium text-yellow-800">উপস্থিতি বাড়ানো দরকার</p>
                          <p className="text-sm text-yellow-600">নিয়মিত ক্লাসে আসলে পড়াশোনায় আরও ভালো করতে পারবে।</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Footer with Signatures */}
              <div className="p-6 border-t border-slate-200 bg-slate-50 print:bg-white">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="w-full border-b-2 border-slate-400 mb-2 h-10"></div>
                    <p className="text-xs text-slate-500">শিক্ষকের স্বাক্ষর</p>
                  </div>
                  <div className="text-center">
                    <div className="w-full border-b-2 border-slate-400 mb-2 h-10"></div>
                    <p className="text-xs text-slate-500">প্রধান শিক্ষকের স্বাক্ষর</p>
                  </div>
                  <div className="text-center">
                    <div className="w-full border-b-2 border-slate-400 mb-2 h-10"></div>
                    <p className="text-xs text-slate-500">অভিভাবকের স্বাক্ষর</p>
                  </div>
                </div>
                <div className="mt-6 flex justify-between items-center text-sm text-slate-500">
                  <p>তৈরির তারিখ: {reportCard.generatedAt ? new Date(reportCard.generatedAt).toLocaleDateString('bn-BD') : new Date().toLocaleDateString('bn-BD')}</p>
                  <p>শিখো একাডেমি © {new Date().getFullYear()}</p>
                </div>
              </div>
            </div>

            {/* Action Buttons - Hide on print */}
            <div className="grid grid-cols-2 gap-3 print:hidden">
              <button
                onClick={handlePrintReportCard}
                className="bg-white py-4 rounded-xl font-medium shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                প্রিন্ট
              </button>
              <button
                onClick={() => {
                  info("PDF ডাউনলোড হচ্ছে...");
                }}
                className="gradient-blue-pink text-white py-4 rounded-xl font-medium shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                PDF ডাউনলোড
              </button>
            </div>

            {/* Share Options */}
            <div className="bg-white rounded-xl p-4 shadow-md print:hidden">
              <p className="text-sm font-medium text-slate-600 mb-3">অভিভাবকের সাথে শেয়ার করুন</p>
              <div className="flex gap-3">
                <button className="flex-1 py-3 bg-green-500 text-white rounded-lg flex items-center justify-center gap-2 hover:bg-green-600 transition-colors">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  WhatsApp
                </button>
                <button className="flex-1 py-3 bg-blue-600 text-white rounded-lg flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Email
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Generating Report Card Overlay */}
        {generatingReportCard && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
            <div className="bg-white rounded-2xl p-8 text-center">
              <div className="w-16 h-16 border-4 border-[#cf278d] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="font-medium text-slate-800">রিপোর্ট কার্ড তৈরি হচ্ছে...</p>
              <p className="text-sm text-slate-500 mt-1">{selectedStudentForReport?.name}</p>
            </div>
          </div>
        )}
      </main>

      {/* ==================== EDIT MARKS MODAL ==================== */}
      {showEditModal && editingStudent && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-md overflow-hidden animate-slideUp">
            <div className="gradient-blue-pink p-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold">নম্বর সম্পাদনা</h3>
                  <p className="text-white/80 text-sm">{editingStudent.name}</p>
                </div>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-600 mb-1 block">
                  কুইজ নম্বর (২০ এর মধ্যে)
                </label>
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={isNaN(editMarks.quiz) || !editMarks.quiz ? 0 : Math.round(editMarks.quiz * 20)}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 0;
                    setEditMarks({ ...editMarks, quiz: val / 20 });
                  }}
                  className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-[#cf278d] outline-none"
                />
                <p className="text-xs text-slate-400 mt-1">গড় কুইজ স্কোর থেকে গণনা করা হয়েছে</p>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-600 mb-1 block">
                  লিখিত পরীক্ষার নম্বর (৮০ এর মধ্যে)
                </label>
                <input
                  type="number"
                  min="0"
                  max="80"
                  value={isNaN(editMarks.written) || editMarks.written === undefined ? 0 : editMarks.written}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 0;
                    setEditMarks({ ...editMarks, written: val });
                  }}
                  className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-[#cf278d] outline-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between text-lg">
                  <span className="font-medium text-slate-600">মোট নম্বর:</span>
                  <span className="font-bold text-[#cf278d]">
                    {toBengaliNumber(Math.round(editMarks.quiz * 20) + editMarks.written)} / ১০০
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200">
              <button
                onClick={handleSaveMarks}
                className="w-full py-3 bg-[#cf278d] text-white rounded-xl font-bold hover:bg-[#2d3a7c] transition-colors"
              >
                সংরক্ষণ করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Khata OCR Modal */}
      {showKhataOCRModal && (
        <KhataOCRModal
          isOpen={showKhataOCRModal}
          onClose={() => setShowKhataOCRModal(false)}
          classId={selectedClass}
          subjectId={selectedSubject}
          term={selectedTerm}
          year={selectedYear}
          existingStudents={students}
          onSuccess={() => {
            setShowKhataOCRModal(false);
            // Refresh marks data after successful upload
            const classMarks = getClassMarks(selectedClass, selectedSubject, selectedTerm, selectedYear);
            setMarks(classMarks);
            info(`নম্বর সফলভাবে সংরক্ষিত হয়েছে`);
          }}
        />
      )}

      {/* Toast Notifications */}
      <Toast toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
