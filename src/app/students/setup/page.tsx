"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import AIThinking from "@/components/AIThinking";
import {
  getCurrentUser,
  getProfileByUserId,
  addMultipleStudents,
  getStudentsForClass,
  type TeacherProfile,
} from "@/lib/auth";
import { CLASS_LABELS } from "@/lib/data";
import ERROR_MESSAGES from "@/lib/errorMessages";

// Subject labels mapping
const SUBJECT_LABELS: { [key: string]: string } = {
  bangla: "বাংলা",
  english: "ইংরেজি",
  math: "গণিত",
  "gonit": "গণিত",
  science: "বিজ্ঞান",
  "social-science": "সমাজ বিজ্ঞান",
  religion: "ধর্ম শিক্ষা",
  art: "চারু ও কারুকলা",
  "physical-ed": "শারীরিক শিক্ষা",
};

type UploadMethod = "excel" | "image" | "camera" | null;

interface ExtractedStudent {
  name: string;
  rollNumber: string;
  guardianName?: string;
  guardianPhone?: string;
}

export default function StudentSetupPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [userId, setUserId] = useState("");
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  
  // Track completed classes
  const [completedClasses, setCompletedClasses] = useState<string[]>([]);

  // Selected class
  const [selectedClass, setSelectedClass] = useState<string>("");

  // Upload method
  const [uploadMethod, setUploadMethod] = useState<UploadMethod>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  const [cameraImage, setCameraImage] = useState<string | null>(null);

  // Extracted students data
  const [extractedStudents, setExtractedStudents] = useState<ExtractedStudent[]>([]);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Edit student modal
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<ExtractedStudent>({
    name: "",
    rollNumber: "",
    guardianName: "",
    guardianPhone: "",
  });

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

    // Check which classes already have students
    const alreadyCompleted: string[] = [];
    teacherProfile.classes.forEach((classId) => {
      const students = getStudentsForClass(user.id, classId);
      if (students.length > 0) {
        alreadyCompleted.push(classId);
      }
    });
    setCompletedClasses(alreadyCompleted);

    // Auto-select first incomplete class
    const firstIncomplete = teacherProfile.classes.find(c => !alreadyCompleted.includes(c));
    if (firstIncomplete) {
      setSelectedClass(firstIncomplete);
    } else if (teacherProfile.classes.length > 0) {
      setSelectedClass(teacherProfile.classes[0]);
    }

    setIsLoading(false);
  }, [router]);

  // Parse Excel file using SheetJS
  const parseExcel = async (file: File): Promise<ExtractedStudent[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: "array" });
          
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];
          
          if (jsonData.length === 0) {
            resolve([]);
            return;
          }

          // Get existing students to determine next roll number
          const existingStudents = selectedClass && userId
            ? getStudentsForClass(userId, selectedClass)
            : [];

          // Find max roll number from existing students
          const existingRolls = existingStudents
            .map(s => parseInt(s.rollNumber || '0', 10))
            .filter(n => !isNaN(n));

          let nextAutoRoll = existingRolls.length > 0
            ? Math.max(...existingRolls) + 1
            : 1;

          const students: ExtractedStudent[] = [];
          const headerRow = jsonData[0] as string[];
          let nameCol = -1;
          let rollCol = -1;
          let guardianCol = -1;
          let phoneCol = -1;
          
          headerRow.forEach((header, index) => {
            const h = String(header || "").toLowerCase();
            if (h.includes("নাম") || h.includes("name")) {
              if (nameCol === -1) nameCol = index;
            }
            if (h.includes("রোল") || h.includes("roll")) {
              rollCol = index;
            }
            if (h.includes("অভিভাবক") || h.includes("guardian")) {
              if (h.includes("নম্বর") || h.includes("phone") || h.includes("number") || h.includes("নাম্বার")) {
                phoneCol = index;
              } else {
                guardianCol = index;
              }
            }
            if (h.includes("ফোন") || h.includes("phone") || h.includes("মোবাইল") || h.includes("mobile") || h.includes("নম্বর")) {
              if (phoneCol === -1) phoneCol = index;
            }
          });

          if (nameCol === -1) {
            nameCol = 0;
            rollCol = 1;
            phoneCol = 2;
          }

          for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i] as (string | number | undefined)[];
            if (!row || row.length === 0) continue;
            
            const name = row[nameCol] !== undefined ? String(row[nameCol]).trim() : "";
            let rollNumber = rollCol >= 0 && row[rollCol] !== undefined ? String(row[rollCol]).trim() : "";
            const guardianName = guardianCol >= 0 && row[guardianCol] !== undefined ? String(row[guardianCol]).trim() : "";
            const guardianPhone = phoneCol >= 0 && row[phoneCol] !== undefined ? String(row[phoneCol]).trim() : "";

            if (!name) continue;

            // If roll number provided, validate and format it
            if (rollNumber && !isNaN(Number(rollNumber))) {
              rollNumber = String(parseInt(rollNumber, 10)).padStart(2, "0");
            } else {
              // Auto-assign next available roll number
              rollNumber = String(nextAutoRoll).padStart(2, "0");
              nextAutoRoll++;
            }

            students.push({
              name,
              rollNumber,
              guardianName: guardianName || undefined,
              guardianPhone: guardianPhone || undefined,
            });
          }

          resolve(students);
        } catch (err) {
          console.error("Excel parsing error:", err);
          reject(err);
        }
      };

      reader.onerror = () => reject(new Error("File reading failed"));
      reader.readAsArrayBuffer(file);
    });
  };

  // Parse CSV content (with proper roll number assignment)
  const parseCSV = (content: string): ExtractedStudent[] => {
    const lines = content.split(/\r?\n/).filter(line => line.trim() !== "");
    const students: ExtractedStudent[] = [];

    if (lines.length === 0) return students;

    // Get existing students to determine next roll number
    const existingStudents = selectedClass && userId
      ? getStudentsForClass(userId, selectedClass)
      : [];

    // Find max roll number from existing students
    const existingRolls = existingStudents
      .map(s => parseInt(s.rollNumber || '0', 10))
      .filter(n => !isNaN(n));

    let nextAutoRoll = existingRolls.length > 0
      ? Math.max(...existingRolls) + 1
      : 1;

    const firstLine = lines[0].toLowerCase();
    const hasHeader =
      firstLine.includes("name") ||
      firstLine.includes("নাম") ||
      firstLine.includes("roll") ||
      firstLine.includes("রোল") ||
      firstLine.includes("guardian") ||
      firstLine.includes("অভিভাবক");

    const startIndex = hasHeader ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const parts = line.split(/[,\t]/).map(p => p.trim()).filter(p => p !== "");

      if (parts.length >= 1) {
        const name = parts[0] || "";
        let rollNumber = parts[1] || "";
        const guardianPhone = parts[2] || "";

        // If roll number provided, validate and format it
        if (rollNumber && !isNaN(Number(rollNumber))) {
          rollNumber = String(parseInt(rollNumber, 10)).padStart(2, "0");
        } else {
          // Auto-assign next available roll number
          rollNumber = String(nextAutoRoll).padStart(2, "0");
          nextAutoRoll++;
        }

        if (name) {
          students.push({
            name: name.trim(),
            rollNumber: rollNumber,
            guardianPhone: guardianPhone.trim() || undefined,
          });
        }
      }
    }

    return students;
  };

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    setError("");
    setSuccessMessage("");
    setIsProcessing(true);
    setExtractedStudents([]);

    try {
      let students: ExtractedStudent[] = [];
      const fileName = file.name.toLowerCase();
      
      if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
        try {
          students = await parseExcel(file);
        } catch (excelError) {
          console.error("Excel parsing failed:", excelError);
          throw new Error(ERROR_MESSAGES.FILE.PARSE_EXCEL_FAILED);
        }
      } else if (fileName.endsWith(".csv") || fileName.endsWith(".txt")) {
        try {
          const content = await file.text();
          students = parseCSV(content);
        } catch (csvError) {
          console.error("CSV parsing failed:", csvError);
          throw new Error(ERROR_MESSAGES.FILE.PARSE_CSV_FAILED);
        }
      } else {
        // Unknown file type, try both with specific error messages
        let excelError: Error | null = null;
        let csvError: Error | null = null;

        try {
          students = await parseExcel(file);
        } catch (err) {
          excelError = err as Error;

          try {
            const content = await file.text();
            students = parseCSV(content);
          } catch (err2) {
            csvError = err2 as Error;
            throw new Error(
              `Excel এবং CSV উভয় ফরম্যাটেই পার্স করতে ব্যর্থ। ` +
              `এক্সেল: ${excelError?.message || 'ত্রুটি'}। ` +
              `CSV: ${csvError?.message || 'ত্রুটি'}`
            );
          }
        }
      }

      if (students.length === 0) {
        setError(ERROR_MESSAGES.FILE.NO_DATA_FOUND);
      } else {
        setExtractedStudents(students);
      }
    } catch (err) {
      console.error("File parsing error:", err);
      const errorMessage = err instanceof Error ? err.message : ERROR_MESSAGES.FILE.UPLOAD_FAILED;
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };


  // Handle image/camera capture with Gemini AI Vision
  const handleImageCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const imageData = reader.result as string;
      setCameraImage(imageData);
      setError("");
      setIsProcessing(true);
      setExtractedStudents([]);

      try {
        // Call Gemini API for vision-based student extraction
        const response = await fetch("/api/extract-students", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ imageData }),
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "AI প্রসেসিং এ সমস্যা হয়েছে।");
          setIsProcessing(false);
          return;
        }

        if (data.students && data.students.length > 0) {
          setExtractedStudents(data.students);
        } else {
          setError(data.error || "ছবি থেকে শিক্ষার্থীর তথ্য পাওয়া যায়নি। স্পষ্ট ছবি তুলুন।");
        }
      } catch (err) {
        console.error("Student extraction error:", err);
        setError("AI প্রসেসিং এ সমস্যা হয়েছে। আবার চেষ্টা করুন।");
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsDataURL(file);

    if (cameraInputRef.current) {
      cameraInputRef.current.value = "";
    }
  };

  // Remove a student
  const removeStudent = (index: number) => {
    setExtractedStudents(prev => prev.filter((_, i) => i !== index));
  };

  // Start editing a student
  const startEdit = (index: number) => {
    setEditingIndex(index);
    setEditForm({ ...extractedStudents[index] });
  };

  // Save edited student
  const saveEdit = () => {
    if (editingIndex === null) return;

    const updatedStudents = [...extractedStudents];
    updatedStudents[editingIndex] = {
      ...editForm,
      name: editForm.name.trim(),
      rollNumber: editForm.rollNumber.trim(),
      guardianName: editForm.guardianName?.trim(),
      guardianPhone: editForm.guardianPhone?.trim(),
    };

    setExtractedStudents(updatedStudents);
    setEditingIndex(null);
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingIndex(null);
    setEditForm({ name: "", rollNumber: "", guardianName: "", guardianPhone: "" });
  };

  // Get remaining classes
  const getRemainingClasses = () => {
    if (!profile) return [];
    return profile.classes.filter(c => !completedClasses.includes(c));
  };

  // Save and continue to next class
  const handleSaveAndContinue = async () => {
    if (!selectedClass) {
      setError("ক্লাস নির্বাচন করুন");
      return;
    }

    if (extractedStudents.length === 0) {
      setError("কোন শিক্ষার্থী পাওয়া যায়নি");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      const studentsToSave = extractedStudents.map(s => ({
        name: s.name,
        rollNumber: s.rollNumber,
        guardianName: s.guardianName,
        guardianPhone: s.guardianPhone,
      }));
      
      addMultipleStudents(userId, selectedClass, studentsToSave);
      
      // Mark this class as completed
      const newCompletedClasses = [...completedClasses, selectedClass];
      setCompletedClasses(newCompletedClasses);

      // Find next incomplete class
      const remaining = profile!.classes.filter(c => !newCompletedClasses.includes(c));
      
      if (remaining.length > 0) {
        // Move to next class
        const nextClass = remaining[0];
        setSelectedClass(nextClass);
        setExtractedStudents([]);
        setUploadedFileName("");
        setUploadMethod(null);
        setCameraImage(null);
        setSuccessMessage(`${CLASS_LABELS[selectedClass]} এর ${studentsToSave.length} জন শিক্ষার্থী সেভ হয়েছে!`);
        setTimeout(() => setSuccessMessage(""), 3000);
      } else {
        // All classes done, go to dashboard
        router.push("/dashboard");
      }
    } catch {
      setError("কিছু সমস্যা হয়েছে। আবার চেষ্টা করুন।");
    } finally {
      setIsSaving(false);
    }
  };

  // Skip current class
  const handleSkipClass = () => {
    if (!profile) return;

    const remaining = getRemainingClasses().filter(c => c !== selectedClass);

    if (remaining.length > 0) {
      // Move to next class
      const nextClass = remaining[0];
      setSelectedClass(nextClass);
      setExtractedStudents([]);
      setUploadedFileName("");
      setUploadMethod(null);
      setCameraImage(null);
      setError("");
    } else {
      // No more classes, go to dashboard
      router.push("/dashboard");
    }
  };

  // Skip all and go to dashboard
  const handleSkipAll = () => {
    // Mark that user has skipped student setup so dashboard doesn't redirect back
    localStorage.setItem("shikho_student_setup_skipped", "true");
    router.push("/dashboard");
  };

  const totalClasses = profile?.classes.length || 0;
  const completedCount = completedClasses.length;
  const remainingCount = getRemainingClasses().length;

  if (isLoading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#cf278d]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-xl text-white">লোড হচ্ছে...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#cf278d]">
      {/* Header - Clean Gradient */}
      <header className="w-full h-16 relative">
        {/* Clean gradient header - background handled by parent div */}
      </header>

      {/* Main Content */}
      <main className="px-4 pb-8">
        <div className="max-w-lg mx-auto">
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
            {/* Header Section */}
            <div className="gradient-blue-pink px-8 py-7 text-center">
              <h1 className="text-2xl font-bold text-white mb-2">
                শিক্ষার্থী তালিকা যোগ করুন
              </h1>

              {/* Progress Indicator */}
              {totalClasses > 1 && (
                <div className="mt-4">
                  <div className="flex items-center justify-center gap-3 mb-3">
                    {profile.classes.map((classId) => (
                      <div
                        key={classId}
                        className={`w-4 h-4 rounded-full transition-all ${
                          completedClasses.includes(classId)
                            ? "bg-green-400"
                            : classId === selectedClass
                            ? "bg-white"
                            : "bg-white/30"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-blue-100 text-base font-medium">
                    {completedCount}/{totalClasses} ক্লাস সম্পন্ন • বাকি {remainingCount} টি
                  </p>
                </div>
              )}
            </div>

            {/* Success Message */}
            {successMessage && (
              <div className="mx-8 mt-6 bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-300 text-emerald-800 px-6 py-5 rounded-2xl text-center font-semibold text-base shadow-md animate-fadeIn">
                {successMessage}
              </div>
            )}

            {/* Form Section */}
            <div className="p-8 space-y-6">
              {/* Current Class Display */}
              <div className="bg-gradient-to-br from-[#cf278d]/10 to-[#cf278d]/10 rounded-2xl p-6 border-2 border-[#cf278d]/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-base text-slate-600 mb-2 font-medium">বর্তমান ক্লাস</p>
                    <p className="text-2xl font-bold text-[#cf278d]">
                      {CLASS_LABELS[selectedClass] || `ক্লাস ${selectedClass}`}
                    </p>
                  </div>
                  {totalClasses > 1 && remainingCount > 1 && (
                    <button
                      onClick={handleSkipClass}
                      className="px-5 py-3 text-sm font-semibold text-slate-600 hover:text-white bg-slate-100 hover:bg-slate-600 rounded-xl transition-all duration-200 min-h-[48px]"
                    >
                      এই ক্লাস বাদ দিন
                    </button>
                  )}
                </div>
              </div>

              {/* Subject Display (if applicable) */}
              {profile.subjects.length > 0 && (
                <div className="bg-gradient-to-r from-slate-50 to-gray-50 rounded-2xl px-6 py-4 border-2 border-slate-200 shadow-sm">
                  <div className="text-sm text-slate-600 mb-2 font-bold uppercase tracking-wider">বিষয়সমূহ</div>
                  <div className="text-base font-bold text-slate-800 leading-relaxed">
                    {profile.subjects.map(s => SUBJECT_LABELS[s] || s).join(" • ")}
                  </div>
                </div>
              )}

              {/* Help Text */}
              <div className="relative bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50 rounded-2xl p-7 border-2 border-indigo-200 shadow-md">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-indigo-500 to-purple-500 rounded-l-2xl"></div>
                <p className="text-lg font-bold text-slate-800 mb-5 pl-2">কিভাবে যোগ করবেন</p>
                <div className="space-y-4 text-base text-slate-700 leading-relaxed">
                  <div className="flex items-start gap-4">
                    <span className="font-bold min-w-[90px] text-indigo-700 text-base">Excel</span>
                    <span className="leading-relaxed">নাম, রোল নম্বর, অভিভাবকের নম্বর সহ ফাইল আপলোড করুন</span>
                  </div>
                  <div className="flex items-start gap-4">
                    <span className="font-bold min-w-[90px] text-blue-700 text-base">ছবি</span>
                    <span className="leading-relaxed">শিক্ষার্থী তালিকার ছবি তুলে আপলোড করুন (AI স্বয়ংক্রিয়ভাবে ডেটা বের করবে)</span>
                  </div>
                  <div className="flex items-start gap-4">
                    <span className="font-bold min-w-[90px] text-purple-700 text-base">ক্যামেরা</span>
                    <span className="leading-relaxed">সরাসরি ক্যামেরা দিয়ে তালিকার ছবি তুলুন</span>
                  </div>
                </div>
              </div>

              {/* Upload Method Selection */}
              <div>
                <label className="block text-lg font-bold text-slate-800 mb-5">
                  কিভাবে তথ্য দিবেন?
                </label>
                <div className="grid grid-cols-3 gap-5">
                  {/* Excel Upload */}
                  <button
                    type="button"
                    onClick={() => {
                      setUploadMethod("excel");
                      setExtractedStudents([]);
                      setCameraImage(null);
                      setError("");
                      if (fileInputRef.current) {
                        fileInputRef.current.accept = ".xlsx,.xls";
                        fileInputRef.current.click();
                      }
                    }}
                    className={`group relative py-8 px-5 rounded-2xl text-center transition-all duration-300 transform hover:scale-105 min-h-[120px] flex flex-col items-center justify-center ${
                      uploadMethod === "excel"
                        ? "bg-gradient-to-br from-indigo-600 to-indigo-700 text-white shadow-2xl"
                        : "bg-white text-slate-700 hover:shadow-xl border-2 border-indigo-100 hover:border-indigo-400"
                    }`}
                  >
                    <div className="text-xl font-bold mb-2">Excel</div>
                    <div className={`text-sm font-medium ${uploadMethod === "excel" ? "text-indigo-100" : "text-slate-500"}`}>
                      ফাইল
                    </div>
                  </button>

                  {/* Image Upload */}
                  <button
                    type="button"
                    onClick={() => {
                      setUploadMethod("image");
                      setExtractedStudents([]);
                      setCameraImage(null);
                      setError("");
                      imageInputRef.current?.click();
                    }}
                    className={`group relative py-8 px-5 rounded-2xl text-center transition-all duration-300 transform hover:scale-105 min-h-[120px] flex flex-col items-center justify-center ${
                      uploadMethod === "image"
                        ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-2xl"
                        : "bg-white text-slate-700 hover:shadow-xl border-2 border-blue-100 hover:border-blue-400"
                    }`}
                  >
                    <div className="text-xl font-bold mb-2">ছবি</div>
                    <div className={`text-sm font-medium ${uploadMethod === "image" ? "text-blue-100" : "text-slate-500"}`}>
                      আপলোড
                    </div>
                  </button>

                  {/* Camera */}
                  <button
                    type="button"
                    onClick={() => {
                      setUploadMethod("camera");
                      setExtractedStudents([]);
                      setError("");
                      cameraInputRef.current?.click();
                    }}
                    className={`group relative py-8 px-5 rounded-2xl text-center transition-all duration-300 transform hover:scale-105 min-h-[120px] flex flex-col items-center justify-center ${
                      uploadMethod === "camera"
                        ? "bg-gradient-to-br from-purple-600 to-purple-700 text-white shadow-2xl"
                        : "bg-white text-slate-700 hover:shadow-xl border-2 border-purple-100 hover:border-purple-400"
                    }`}
                  >
                    <div className="text-xl font-bold mb-2">ক্যামেরা</div>
                    <div className={`text-sm font-medium ${uploadMethod === "camera" ? "text-purple-100" : "text-slate-500"}`}>
                      তুলুন
                    </div>
                  </button>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                />
                <input
                  type="file"
                  ref={imageInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageCapture}
                />
                <input
                  type="file"
                  ref={cameraInputRef}
                  className="hidden"
                  accept="image/*"
                  capture="environment"
                  onChange={handleImageCapture}
                />
              </div>

              {/* Uploaded file name */}
              {uploadedFileName && !isProcessing && (
                <div className="flex items-center gap-3 text-base text-slate-700 bg-gradient-to-r from-slate-50 to-gray-50 p-5 rounded-2xl border-2 border-slate-200 shadow-sm">
                  <svg className="w-6 h-6 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-semibold">ফাইল: {uploadedFileName}</span>
                </div>
              )}

              {/* Processing Indicator */}
              {isProcessing && (
                <div className="bg-white border-2 border-blue-300 rounded-2xl p-8 shadow-md">
                  <AIThinking type="extract" />
                </div>
              )}

              {/* Camera Preview */}
              {cameraImage && !isProcessing && (
                <div className="bg-gradient-to-br from-slate-50 to-gray-50 rounded-2xl p-6 border-2 border-slate-200 shadow-md">
                  <p className="text-base font-bold text-slate-700 mb-4">তোলা ছবি:</p>
                  <div className="relative w-full h-64 rounded-xl overflow-hidden border-2 border-slate-300 shadow-sm">
                    <Image
                      src={cameraImage}
                      alt="ক্যামেরা ছবি"
                      fill
                      className="object-contain"
                    />
                  </div>
                </div>
              )}

              {/* Extracted Students List */}
              {extractedStudents.length > 0 && !isProcessing && (
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 rounded-2xl p-6 shadow-md">
                  <div className="flex items-center justify-between mb-5">
                    <p className="text-lg font-bold text-green-800">
                      পাওয়া শিক্ষার্থী: {extractedStudents.length} জন
                    </p>
                    <button
                      type="button"
                      onClick={() => setExtractedStudents([])}
                      className="px-5 py-3 text-sm font-bold text-red-600 hover:text-white bg-red-100 hover:bg-red-600 rounded-xl transition-all duration-200 min-h-[48px]"
                    >
                      সব মুছুন
                    </button>
                  </div>

                  {/* Student List */}
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {extractedStudents.map((student, index) => (
                      <div key={index} className="bg-white rounded-2xl p-5 shadow-md border-2 border-green-100 hover:border-green-300 transition-all duration-200">
                        <div className="flex items-start gap-4">
                          <div className="w-14 h-14 bg-gradient-to-br from-[#cf278d] to-[#cf278d] text-white rounded-2xl flex items-center justify-center font-bold text-lg flex-shrink-0 shadow-md">
                            {student.rollNumber}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-800 text-base mb-1.5">{student.name}</p>
                            {student.guardianPhone && (
                              <p className="text-sm text-slate-600 font-medium">
                                অভিভাবক: {student.guardianPhone}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-3 flex-shrink-0">
                            <button
                              type="button"
                              onClick={() => startEdit(index)}
                              className="px-5 py-3 text-sm font-bold text-blue-700 hover:text-white bg-blue-100 hover:bg-blue-600 rounded-xl transition-all duration-200 min-h-[48px] shadow-sm hover:shadow-md"
                              title="সম্পাদনা করুন"
                            >
                              সম্পাদনা
                            </button>
                            <button
                              type="button"
                              onClick={() => removeStudent(index)}
                              className="px-5 py-3 text-sm font-bold text-red-600 hover:text-white bg-red-100 hover:bg-red-600 rounded-xl transition-all duration-200 min-h-[48px] shadow-sm hover:shadow-md"
                              title="মুছুন"
                            >
                              মুছুন
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-400 text-red-800 px-6 py-5 rounded-2xl text-center text-base font-bold shadow-lg animate-fadeIn">
                  {error}
                </div>
              )}

              {/* Edit Student Modal */}
              {editingIndex !== null && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-6">
                  <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                    {/* Modal Header */}
                    <div className="gradient-blue-pink px-8 py-6 rounded-t-3xl">
                      <h3 className="text-xl font-bold text-white">শিক্ষার্থী সম্পাদনা করুন</h3>
                    </div>

                    {/* Modal Body */}
                    <div className="p-8 space-y-6">
                      {/* Name */}
                      <div>
                        <label className="block text-base font-bold text-slate-700 mb-3">
                          নাম <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          className="w-full px-5 py-4 border-2 border-slate-200 rounded-xl focus:border-[#cf278d] focus:outline-none text-base"
                          placeholder="শিক্ষার্থীর নাম লিখুন"
                        />
                      </div>

                      {/* Roll Number */}
                      <div>
                        <label className="block text-base font-bold text-slate-700 mb-3">
                          রোল নম্বর <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={editForm.rollNumber}
                          onChange={(e) => setEditForm({ ...editForm, rollNumber: e.target.value })}
                          className="w-full px-5 py-4 border-2 border-slate-200 rounded-xl focus:border-[#cf278d] focus:outline-none text-base"
                          placeholder="রোল নম্বর (যেমন: ০১)"
                        />
                      </div>

                      {/* Guardian Name */}
                      <div>
                        <label className="block text-base font-bold text-slate-700 mb-3">
                          অভিভাবকের নাম (ঐচ্ছিক)
                        </label>
                        <input
                          type="text"
                          value={editForm.guardianName || ""}
                          onChange={(e) => setEditForm({ ...editForm, guardianName: e.target.value })}
                          className="w-full px-5 py-4 border-2 border-slate-200 rounded-xl focus:border-[#cf278d] focus:outline-none text-base"
                          placeholder="অভিভাবকের নাম"
                        />
                      </div>

                      {/* Guardian Phone */}
                      <div>
                        <label className="block text-base font-bold text-slate-700 mb-3">
                          অভিভাবকের মোবাইল (ঐচ্ছিক)
                        </label>
                        <input
                          type="tel"
                          value={editForm.guardianPhone || ""}
                          onChange={(e) => setEditForm({ ...editForm, guardianPhone: e.target.value })}
                          className="w-full px-5 py-4 border-2 border-slate-200 rounded-xl focus:border-[#cf278d] focus:outline-none text-base"
                          placeholder="০১৭১২৩৪৫৬৭৮"
                        />
                      </div>
                    </div>

                    {/* Modal Footer */}
                    <div className="px-8 pb-8 flex gap-4">
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="flex-1 py-4 bg-slate-100 text-slate-700 rounded-xl text-base font-bold hover:bg-slate-200 transition-colors min-h-[56px]"
                      >
                        বাতিল
                      </button>
                      <button
                        type="button"
                        onClick={saveEdit}
                        disabled={!editForm.name.trim() || !editForm.rollNumber.trim()}
                        className="flex-1 py-4 gradient-blue-pink text-white rounded-xl text-base font-bold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed min-h-[56px]"
                      >
                        সংরক্ষণ করুন
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-4 pt-4">
                {extractedStudents.length > 0 && (
                  <button
                    type="button"
                    onClick={handleSaveAndContinue}
                    disabled={isSaving}
                    className="group relative w-full py-5 bg-gradient-to-r from-indigo-600 via-blue-600 to-purple-600 text-white text-lg font-bold rounded-2xl hover:shadow-2xl transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden min-h-[60px]"
                  >
                    <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                    <div className="relative">
                      {isSaving ? (
                        "সেভ হচ্ছে..."
                      ) : remainingCount > 1 ? (
                        `সেভ করুন ও পরের ক্লাসে যান (${extractedStudents.length} জন)`
                      ) : (
                        `সেভ করুন ও শেষ করুন (${extractedStudents.length} জন)`
                      )}
                    </div>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleSkipAll}
                  disabled={isSaving}
                  className="w-full py-4 bg-gradient-to-r from-slate-100 to-gray-100 text-slate-700 text-base font-bold rounded-2xl hover:from-slate-200 hover:to-gray-200 transition-all duration-200 border-2 border-slate-300 hover:border-slate-400 hover:shadow-md min-h-[56px]"
                >
                  {completedCount > 0 ? "বাকিগুলো পরে করব" : "পরে করব"}
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-blue-200 text-base mt-8 font-medium">
            © ২০২৬ শিখো টেকনোলজিস লিমিটেড
          </p>
        </div>
      </main>
    </div>
  );
}
