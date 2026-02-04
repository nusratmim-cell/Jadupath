"use client";

import { useState, useRef } from "react";
import { toBengaliNumber } from "@/lib/data";
import { saveStudentMarks, getClassMarks } from "@/lib/data";
import { addStudent, getCurrentUser } from "@/lib/auth";
import {
  matchExtractedStudents,
  validateExtractedData,
  getSummaryStats,
  type ExtractedMark,
  type MatchedMark,
} from "@/lib/khataOCRHelpers";

interface KhataOCRModalProps {
  isOpen: boolean;
  onClose: () => void;
  classId: string;
  subjectId: string;
  term: 1 | 2 | 3;
  year: number;
  existingStudents: Array<{
    id: string;
    name: string;
    rollNumber: string;
  }>;
  onSuccess: () => void;
}

type Step = "upload" | "processing" | "preview" | "confirm" | "success";

export default function KhataOCRModal({
  isOpen,
  onClose,
  classId,
  subjectId,
  term,
  year,
  existingStudents,
  onSuccess,
}: KhataOCRModalProps) {
  const [step, setStep] = useState<Step>("upload");
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [extractedData, setExtractedData] = useState<ExtractedMark[]>([]);
  const [editedData, setEditedData] = useState<MatchedMark[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiWarnings, setApiWarnings] = useState<string[]>([]);
  const [existingMarksConflict, setExistingMarksConflict] = useState(false);
  const [conflictingStudentIds, setConflictingStudentIds] = useState<string[]>([]);
  const [savedCount, setSavedCount] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (files.length > 5) {
      setError("সর্বোচ্চ ৫টি ছবি আপলোড করতে পারবেন");
      return;
    }

    const imagePromises = Array.from(files).map((file) => {
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    });

    Promise.all(imagePromises)
      .then((images) => {
        setSelectedImages(images);
        setError(null);
      })
      .catch(() => {
        setError("ছবি পড়তে সমস্যা হয়েছে");
      });
  };

  // Remove individual image
  const handleRemoveImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Process images with API
  const handleProcessImages = async () => {
    if (selectedImages.length === 0) {
      setError("কমপক্ষে একটি ছবি নির্বাচন করুন");
      return;
    }

    setStep("processing");
    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch("/api/extract-khata-marks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          images: selectedImages,
          classId,
          subjectId,
          term,
          year,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "API request failed");
      }

      if (!data.success) {
        throw new Error(data.error || "No data extracted");
      }

      // Store extracted data
      setExtractedData(data.extractedMarks);
      setApiWarnings(data.warnings || []);

      // Match with existing students
      const matched = matchExtractedStudents(
        data.extractedMarks,
        existingStudents
      );
      setEditedData(matched);

      // Move to preview step
      setStep("preview");
    } catch (err: any) {
      console.error("OCR processing error:", err);
      setError(err.message || "প্রসেসিং এ সমস্যা হয়েছে। আবার চেষ্টা করুন।");
      setStep("upload");
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle inline editing
  const handleEditRow = (
    index: number,
    field: keyof MatchedMark,
    value: any
  ) => {
    setEditedData((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };

      // Re-validate on edit
      if (field === "rollNumber" || field === "name" || field === "totalMarks") {
        // Re-match if roll number changed
        if (field === "rollNumber") {
          const match = existingStudents.find(
            (s) => s.rollNumber === value
          );
          updated[index].matchedStudent = match;
          updated[index].studentId = match?.id;
          updated[index].matchStatus = match ? "found" : "new";
        }
      }

      return updated;
    });
  };

  // Delete row
  const handleDeleteRow = (index: number) => {
    setEditedData((prev) => prev.filter((_, i) => i !== index));
  };

  // Add manual row
  const handleAddRow = () => {
    const newRow: MatchedMark = {
      rollNumber: "",
      name: "",
      totalMarks: 0,
      matchStatus: "new",
      validationErrors: [],
    };
    setEditedData((prev) => [...prev, newRow]);
  };

  // Proceed to save (check for conflicts first)
  const handleProceedToSave = () => {
    // Validate data
    const validation = validateExtractedData(editedData);
    if (!validation.valid) {
      setError(validation.errors.join(", "));
      return;
    }

    // Check for existing marks
    const validStudentIds = editedData
      .filter((d) => d.studentId)
      .map((d) => d.studentId!);

    const existingMarks = getClassMarks(classId, subjectId, term, year);
    const conflicts = existingMarks.filter((m) =>
      validStudentIds.includes(m.studentId)
    );

    if (conflicts.length > 0) {
      setExistingMarksConflict(true);
      setConflictingStudentIds(conflicts.map((c) => c.studentId));
      setStep("confirm");
    } else {
      // No conflicts, save directly
      handleSaveMarks();
    }
  };

  // Save marks to localStorage
  const handleSaveMarks = () => {
    const user = getCurrentUser();
    if (!user) {
      setError("লগইন করুন");
      return;
    }

    let count = 0;

    for (const mark of editedData) {
      let studentId = mark.studentId;

      // Create new student if needed
      if (!studentId && mark.matchStatus === "new") {
        try {
          const newStudent = addStudent(user.id, classId, {
            name: mark.name,
            rollNumber: mark.rollNumber,
          });
          studentId = newStudent.id;
        } catch (err) {
          console.error("Error creating student:", err);
          continue;
        }
      }

      // Save marks
      if (studentId) {
        try {
          saveStudentMarks({
            studentId,
            classId,
            subjectId,
            teacherId: user.id,
            term,
            year,
            quizMarks: 0,
            quizCount: 0,
            classEngagement: 0,
            totalMarks: mark.totalMarks,
            lastUpdated: new Date().toISOString(),
          });
          count++;
        } catch (err) {
          console.error("Error saving marks:", err);
        }
      }
    }

    setSavedCount(count);
    setStep("success");
  };

  // Close and reset modal
  const handleCloseModal = () => {
    setStep("upload");
    setSelectedImages([]);
    setExtractedData([]);
    setEditedData([]);
    setError(null);
    setApiWarnings([]);
    setExistingMarksConflict(false);
    setConflictingStudentIds([]);
    setSavedCount(0);
    onClose();
  };

  // Handle success completion
  const handleSuccessComplete = () => {
    onSuccess();
    handleCloseModal();
  };

  const stats = getSummaryStats(editedData);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-[#4285f4] to-[#cf278d] text-white p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">খাতা থেকে নম্বর আপলোড</h2>
            <button
              onClick={handleCloseModal}
              className="text-white hover:bg-white/20 rounded-full p-2 transition"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Upload */}
          {step === "upload" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">
                  খাতার ছবি আপলোড করুন
                </h3>
                <p className="text-sm text-slate-600 mb-4">
                  সর্বোচ্চ ৫টি ছবি আপলোড করতে পারবেন। ছবিতে রোল নম্বর, নাম এবং মোট
                  নম্বর স্পষ্টভাবে দেখা যাওয়া উচিত।
                </p>
              </div>

              {/* File Input */}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-slate-300 rounded-xl p-8 hover:border-[#cf278d] hover:bg-[#cf278d]/5 transition flex flex-col items-center gap-3"
                >
                  <svg
                    className="w-12 h-12 text-slate-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <span className="text-slate-700 font-medium">
                    ছবি নির্বাচন করুন বা ক্যামেরা ব্যবহার করুন
                  </span>
                  <span className="text-xs text-slate-500">
                    (সর্বোচ্চ ৫টি ছবি)
                  </span>
                </button>
              </div>

              {/* Image Previews */}
              {selectedImages.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-3">
                    নির্বাচিত ছবি ({selectedImages.length})
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    {selectedImages.map((image, index) => (
                      <div key={index} className="relative">
                        <img
                          src={image}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg border-2 border-slate-200"
                        />
                        <button
                          onClick={() => handleRemoveImage(index)}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">
                  {error}
                </div>
              )}

              {/* Process Button */}
              <button
                onClick={handleProcessImages}
                disabled={selectedImages.length === 0}
                className="w-full bg-gradient-to-r from-[#4285f4] to-[#cf278d] text-white rounded-xl p-4 font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition"
              >
                প্রক্রিয়া করুন
              </button>
            </div>
          )}

          {/* Step 2: Processing */}
          {step === "processing" && (
            <div className="py-12 flex flex-col items-center gap-6">
              <div className="w-16 h-16 border-4 border-[#cf278d] border-t-transparent rounded-full animate-spin"></div>
              <p className="text-lg font-medium text-slate-700">
                খাতা থেকে নম্বর উত্তোলন করা হচ্ছে...
              </p>
              <p className="text-sm text-slate-500">
                এটি কয়েক সেকেন্ড সময় নিতে পারে
              </p>
            </div>
          )}

          {/* Step 3: Preview/Edit */}
          {step === "preview" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">
                  উত্তোলিত তথ্য পর্যালোচনা করুন
                </h3>
                <p className="text-sm text-slate-600">
                  প্রয়োজনে সংশোধন করুন। সংরক্ষণ করার আগে সকল তথ্য যাচাই করুন।
                </p>
              </div>

              {/* API Warnings */}
              {apiWarnings.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg p-4 space-y-1">
                  {apiWarnings.map((warning, index) => (
                    <p key={index} className="text-sm">
                      ⚠️ {warning}
                    </p>
                  ))}
                </div>
              )}

              {/* Summary Stats */}
              <div className="flex gap-3">
                <div className="flex-1 bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-xs text-green-600 mb-1">পাওয়া গেছে</p>
                  <p className="text-2xl font-bold text-green-700">
                    {toBengaliNumber(stats.matched)}
                  </p>
                </div>
                <div className="flex-1 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-xs text-yellow-600 mb-1">নতুন</p>
                  <p className="text-2xl font-bold text-yellow-700">
                    {toBengaliNumber(stats.new)}
                  </p>
                </div>
                {stats.errors > 0 && (
                  <div className="flex-1 bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-xs text-red-600 mb-1">ত্রুটি</p>
                    <p className="text-2xl font-bold text-red-700">
                      {toBengaliNumber(stats.errors)}
                    </p>
                  </div>
                )}
              </div>

              {/* Editable Table */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr>
                        <th className="p-3 text-left text-sm font-medium text-slate-600">
                          রোল
                        </th>
                        <th className="p-3 text-left text-sm font-medium text-slate-600">
                          নাম
                        </th>
                        <th className="p-3 text-left text-sm font-medium text-slate-600">
                          মোট নম্বর
                        </th>
                        <th className="p-3 text-left text-sm font-medium text-slate-600">
                          স্ট্যাটাস
                        </th>
                        <th className="p-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {editedData.map((row, idx) => (
                        <tr
                          key={idx}
                          className={`
                            ${row.matchStatus === "found" ? "bg-green-50" : ""}
                            ${row.matchStatus === "new" ? "bg-yellow-50" : ""}
                            ${row.matchStatus === "error" ? "bg-red-50" : ""}
                          `}
                        >
                          <td className="p-2">
                            <input
                              type="text"
                              value={row.rollNumber}
                              onChange={(e) =>
                                handleEditRow(idx, "rollNumber", e.target.value)
                              }
                              className="w-20 p-2 border border-slate-300 rounded focus:border-[#cf278d] focus:outline-none"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={row.name}
                              onChange={(e) =>
                                handleEditRow(idx, "name", e.target.value)
                              }
                              className="w-full p-2 border border-slate-300 rounded focus:border-[#cf278d] focus:outline-none"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              value={row.totalMarks}
                              onChange={(e) =>
                                handleEditRow(
                                  idx,
                                  "totalMarks",
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              min="0"
                              max="100"
                              className="w-24 p-2 border border-slate-300 rounded focus:border-[#cf278d] focus:outline-none"
                            />
                          </td>
                          <td className="p-2">
                            <span
                              className={`
                              px-2 py-1 rounded text-xs font-medium
                              ${
                                row.matchStatus === "found"
                                  ? "bg-green-100 text-green-800"
                                  : ""
                              }
                              ${
                                row.matchStatus === "new"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : ""
                              }
                              ${
                                row.matchStatus === "error"
                                  ? "bg-red-100 text-red-800"
                                  : ""
                              }
                            `}
                            >
                              {row.matchStatus === "found" && "পাওয়া গেছে"}
                              {row.matchStatus === "new" && "নতুন"}
                              {row.matchStatus === "error" && "ত্রুটি"}
                            </span>
                          </td>
                          <td className="p-2">
                            <button
                              onClick={() => handleDeleteRow(idx)}
                              className="text-red-500 hover:text-red-700 p-1"
                            >
                              <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Add Row Button */}
              <button
                onClick={handleAddRow}
                className="text-[#cf278d] font-medium flex items-center gap-2 hover:underline"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                নতুন সারি যোগ করুন
              </button>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">
                  {error}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setStep("upload")}
                  className="flex-1 border-2 border-slate-300 text-slate-700 rounded-xl p-3 font-bold hover:bg-slate-50 transition"
                >
                  পূর্ববর্তী
                </button>
                <button
                  onClick={handleProceedToSave}
                  disabled={editedData.length === 0}
                  className="flex-1 bg-gradient-to-r from-[#4285f4] to-[#cf278d] text-white rounded-xl p-3 font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition"
                >
                  সংরক্ষণ করুন
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Confirmation */}
          {step === "confirm" && (
            <div className="space-y-6">
              <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-6 text-center">
                <svg
                  className="w-16 h-16 text-yellow-600 mx-auto mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <h3 className="text-xl font-bold text-yellow-800 mb-2">
                  সতর্কতা!
                </h3>
                <p className="text-yellow-700">
                  এই সাময়িকে ইতিমধ্যে{" "}
                  {toBengaliNumber(conflictingStudentIds.length)} জন শিক্ষার্থীর
                  নম্বর আছে।
                </p>
                <p className="text-yellow-700 mt-2">
                  প্রতিস্থাপন করতে চান?
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep("preview")}
                  className="flex-1 border-2 border-slate-300 text-slate-700 rounded-xl p-3 font-bold hover:bg-slate-50 transition"
                >
                  বাতিল করুন
                </button>
                <button
                  onClick={handleSaveMarks}
                  className="flex-1 bg-red-500 text-white rounded-xl p-3 font-bold hover:bg-red-600 transition"
                >
                  হ্যাঁ, প্রতিস্থাপন করুন
                </button>
              </div>
            </div>
          )}

          {/* Step 5: Success */}
          {step === "success" && (
            <div className="py-12 flex flex-col items-center gap-6">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-12 h-12 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-slate-800">সফল!</h3>
              <p className="text-lg text-slate-600 text-center">
                {toBengaliNumber(savedCount)} জন শিক্ষার্থীর নম্বর সংরক্ষিত হয়েছে
              </p>
              <button
                onClick={handleSuccessComplete}
                className="bg-gradient-to-r from-[#4285f4] to-[#cf278d] text-white rounded-xl px-8 py-3 font-bold hover:shadow-lg transition"
              >
                সম্পন্ন
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
