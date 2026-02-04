"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  getCurrentUser,
  getProfileByUserId,
  getStudentsForClass,
  addMultipleStudents,
  deleteStudent,
  updateStudent,
  type Student,
  type TeacherProfile,
} from "@/lib/auth";
import { CLASS_LABELS, toBengaliNumber } from "@/lib/data";
import { ShikhoHeader, Toast, useToast, useConfirm, NoticeBar } from "@/components";

export default function StudentListingPage() {
  const router = useRouter();
  const nameInputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState("");
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [classStudents, setClassStudents] = useState<{ [classId: string]: Student[] }>({});

  // Quick add mode
  const [quickAddMode, setQuickAddMode] = useState<"single" | null>(null);
  const [singleName, setSingleName] = useState("");

  const [successMessage, setSuccessMessage] = useState("");

  // Edit mode
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    rollNumber: "",
    guardianName: "",
    guardianPhone: "",
  });

  // Toast and confirm dialog hooks
  const { toasts, removeToast, success } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) {
      router.push("/");
      return;
    }

    if (!user.onboardingCompleted) {
      router.push("/onboarding");
      return;
    }

    setUserId(user.id);
    const teacherProfile = getProfileByUserId(user.id);

    if (!teacherProfile) {
      router.push("/onboarding");
      return;
    }

    setProfile(teacherProfile);

    if (teacherProfile.classes.length > 0) {
      setSelectedClass(teacherProfile.classes[0]);
    }

    // Load existing students
    const studentsData: { [classId: string]: Student[] } = {};
    teacherProfile.classes.forEach((classId) => {
      studentsData[classId] = getStudentsForClass(user.id, classId);
    });
    setClassStudents(studentsData);

    setIsLoading(false);
  }, [router]);

  // Focus input when mode changes
  useEffect(() => {
    if (quickAddMode === "single" && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [quickAddMode]);

  const currentStudents = classStudents[selectedClass] || [];

  // Get next roll number
  const getNextRoll = () => {
    const rolls = currentStudents
      .map(s => parseInt(s.rollNumber || '0', 10))
      .filter(n => !isNaN(n));
    const maxRoll = rolls.length > 0 ? Math.max(...rolls) : 0;
    return String(maxRoll + 1).padStart(2, "0");
  };

  // Add single student (quick add)
  const handleQuickAdd = () => {
    if (!singleName.trim()) return;

    const nextRoll = getNextRoll();
    addMultipleStudents(userId, selectedClass, [{
      name: singleName.trim(),
      rollNumber: nextRoll,
    }]);

    // Refresh list
    const updatedStudents = getStudentsForClass(userId, selectedClass);
    setClassStudents(prev => ({ ...prev, [selectedClass]: updatedStudents }));

    setSingleName("");
    success(`${singleName.trim()} যোগ হয়েছে (রোল ${nextRoll})`);

    // Keep focus for continuous adding
    nameInputRef.current?.focus();
  };

  // Delete student
  const handleDelete = async (studentId: string, studentName: string) => {
    const confirmed = await confirm({
      message: `${studentName} কে মুছে ফেলতে চান?`,
      confirmText: "মুছে ফেলুন",
      type: "danger",
    });

    if (confirmed) {
      deleteStudent(userId, selectedClass, studentId);
      const updatedStudents = getStudentsForClass(userId, selectedClass);
      setClassStudents(prev => ({ ...prev, [selectedClass]: updatedStudents }));
      success(`${studentName} মুছে ফেলা হয়েছে`);
    }
  };

  // Edit student
  const handleEdit = (student: Student) => {
    setEditingStudent(student);
    setEditForm({
      name: student.name,
      rollNumber: student.rollNumber,
      guardianName: student.guardianName || "",
      guardianPhone: student.guardianPhone || "",
    });
  };

  // Save edited student
  const handleSaveEdit = () => {
    if (!editingStudent || !editForm.name.trim()) return;

    // Check for duplicate roll number (excluding current student)
    const isDuplicateRoll = currentStudents.some(
      s => s.id !== editingStudent.id && s.rollNumber === editForm.rollNumber.trim()
    );

    if (isDuplicateRoll) {
      setSuccessMessage(`⚠️ রোল নম্বর ${editForm.rollNumber} ইতিমধ্যে ব্যবহৃত হয়েছে`);
      setTimeout(() => setSuccessMessage(""), 3000);
      return;
    }

    updateStudent(userId, selectedClass, editingStudent.id, {
      name: editForm.name.trim(),
      rollNumber: editForm.rollNumber.trim(),
      guardianName: editForm.guardianName.trim() || undefined,
      guardianPhone: editForm.guardianPhone.trim() || undefined,
    });

    const updatedStudents = getStudentsForClass(userId, selectedClass);
    setClassStudents(prev => ({ ...prev, [selectedClass]: updatedStudents }));
    success(`${editForm.name} এর তথ্য আপডেট হয়েছে`);
    setEditingStudent(null);
  };

  // Cancel edit
  const handleCancelEdit = () => {
    setEditingStudent(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="w-12 h-12 border-4 border-[#cf278d] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 pb-6">
      {/* Header */}
      <ShikhoHeader
        variant="light"
        showBackButton={true}
        onBack={() => router.push("/dashboard")}
        rightContent={
          <h1 className="text-base font-semibold text-slate-800">শিক্ষার্থী তালিকা</h1>
        }
      />

      {/* Notice Ticker Bar */}
      <NoticeBar />

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {/* Summary Card */}
        <div className="bg-gradient-to-r from-[#10b981] to-[#059669] rounded-2xl p-5 text-white">
          <p className="text-white/80 text-sm font-medium mb-4">সারাংশ</p>
          <div className="flex items-center justify-between">
            <div className="text-center">
              <p className="text-3xl font-bold">{toBengaliNumber(Object.values(classStudents).reduce((sum, students) => sum + students.length, 0))}</p>
              <p className="text-white/70 text-sm">মোট শিক্ষার্থী</p>
            </div>
            <div className="w-px h-12 bg-white/20"></div>
            <div className="text-center">
              <p className="text-3xl font-bold">{toBengaliNumber(profile?.classes.length || 0)}</p>
              <p className="text-white/70 text-sm">মোট ক্লাস</p>
            </div>
            <div className="w-px h-12 bg-white/20"></div>
            <div className="text-center">
              <p className="text-3xl font-bold">{toBengaliNumber(currentStudents.length)}</p>
              <p className="text-white/70 text-sm">এই ক্লাসে</p>
            </div>
          </div>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="bg-green-100 border border-green-300 text-green-700 px-4 py-3 rounded-xl text-center font-medium animate-fadeIn flex items-center justify-center gap-2">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {successMessage}
          </div>
        )}

        {/* Class Selector */}
        {profile && profile.classes.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {profile.classes.map((classId) => (
              <button
                key={classId}
                onClick={() => {
                  setSelectedClass(classId);
                  setQuickAddMode(null);
                }}
                className={`px-5 py-3 rounded-xl font-semibold whitespace-nowrap transition-all ${
                  selectedClass === classId
                    ? "bg-[#cf278d] text-white shadow-lg"
                    : "bg-white text-slate-700 shadow-md hover:shadow-lg"
                }`}
              >
                {CLASS_LABELS[classId]}
                <span className={`ml-2 px-2 py-0.5 rounded-full text-sm ${
                  selectedClass === classId ? "bg-white/20" : "bg-slate-100"
                }`}>
                  {classStudents[classId]?.length || 0}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Quick Add Section */}
        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
          {/* Header */}
          <div className="gradient-blue-pink p-4 text-white">
            <h2 className="font-bold text-lg">{CLASS_LABELS[selectedClass]}</h2>
            <p className="text-white/80 text-sm">{currentStudents.length} জন শিক্ষার্থী</p>
          </div>

          {/* Add Options */}
          {!quickAddMode && (
            <div className="p-5">
              <p className="text-center text-slate-600 font-semibold mb-4">শিক্ষার্থী যোগ করুন</p>
              <button
                onClick={() => setQuickAddMode("single")}
                className="group w-full bg-white border-2 border-slate-200 hover:border-green-400 rounded-2xl p-5 text-left transition-all hover:shadow-lg active:scale-[0.98]"
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
            </div>
          )}

          {/* Single Add Mode */}
          {quickAddMode === "single" && (
            <div className="p-4">
              <div className="flex gap-2">
                <input
                  ref={nameInputRef}
                  type="text"
                  value={singleName}
                  onChange={(e) => setSingleName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleQuickAdd()}
                  placeholder="শিক্ষার্থীর নাম লিখুন"
                  className="flex-1 p-4 border-2 border-slate-200 rounded-xl focus:border-[#cf278d] outline-none text-lg"
                />
                <button
                  onClick={handleQuickAdd}
                  disabled={!singleName.trim()}
                  className="px-6 bg-green-500 text-white rounded-xl font-bold text-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  +
                </button>
              </div>
              <p className="text-sm text-slate-500 mt-2 text-center">
                রোল নম্বর স্বয়ংক্রিয়ভাবে যোগ হবে • Enter চাপুন অথবা + ক্লিক করুন
              </p>
              <button
                onClick={() => setQuickAddMode(null)}
                className="w-full mt-3 py-2 text-slate-500 hover:text-slate-700"
              >
                বাতিল
              </button>
            </div>
          )}

        </div>

        {/* Student List */}
        {currentStudents.length > 0 && (
          <div className="bg-white rounded-2xl shadow-md overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">শিক্ষার্থীদের তালিকা</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {currentStudents.map((student) => (
                <div key={student.id} className="flex items-center gap-4 p-4 hover:bg-slate-50">
                  <div className="w-10 h-10 bg-[#cf278d] rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                    {student.rollNumber}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 truncate">{student.name}</p>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
                      <span>রোল: {student.rollNumber}</span>
                      {student.guardianPhone && (
                        <>
                          <span>•</span>
                          <span>অভিভাবক: {student.guardianPhone}</span>
                        </>
                      )}
                      {student.guardianName && !student.guardianPhone && (
                        <>
                          <span>•</span>
                          <span>অভিভাবক: {student.guardianName}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEdit(student)}
                      className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                      title="সম্পাদনা করুন"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(student.id, student.name)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="মুছে ফেলুন"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {currentStudents.length === 0 && !quickAddMode && (
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-8 text-center border border-slate-200">
            <div className="w-16 h-16 bg-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <p className="text-slate-700 font-semibold text-lg mb-2">এই ক্লাসে কোনো শিক্ষার্থী নেই</p>
            <p className="text-slate-500 text-sm">উপরের &quot;নাম টাইপ করুন&quot; বাটনে ক্লিক করে শিক্ষার্থী যোগ করুন</p>
          </div>
        )}

      </main>

      {/* Edit Modal */}
      {editingStudent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="gradient-blue-pink p-5 text-white">
              <h2 className="text-xl font-bold">শিক্ষার্থীর তথ্য সম্পাদনা</h2>
              <p className="text-white/80 text-sm mt-1">তথ্য আপডেট করুন</p>
            </div>

            {/* Form */}
            <div className="p-6 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  নাম <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#cf278d] outline-none"
                  placeholder="শিক্ষার্থীর নাম"
                />
              </div>

              {/* Roll Number */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  রোল নম্বর <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editForm.rollNumber}
                  onChange={(e) => setEditForm(prev => ({ ...prev, rollNumber: e.target.value }))}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#cf278d] outline-none"
                  placeholder="রোল নম্বর"
                />
              </div>

              {/* Guardian Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  অভিভাবকের নাম
                </label>
                <input
                  type="text"
                  value={editForm.guardianName}
                  onChange={(e) => setEditForm(prev => ({ ...prev, guardianName: e.target.value }))}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#cf278d] outline-none"
                  placeholder="অভিভাবকের নাম (ঐচ্ছিক)"
                />
              </div>

              {/* Guardian Phone */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  অভিভাবকের ফোন নম্বর
                </label>
                <input
                  type="tel"
                  value={editForm.guardianPhone}
                  onChange={(e) => setEditForm(prev => ({ ...prev, guardianPhone: e.target.value }))}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#cf278d] outline-none"
                  placeholder="০১xxxxxxxxx (ঐচ্ছিক)"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="p-6 pt-0 flex gap-3">
              <button
                onClick={handleCancelEdit}
                className="flex-1 px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-colors"
              >
                বাতিল
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={!editForm.name.trim()}
                className="flex-1 px-6 py-3 gradient-blue-pink text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                সংরক্ষণ করুন
              </button>
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
