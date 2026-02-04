"use client";

import { useState, useRef } from "react";
import { toBengaliNumber } from "@/lib/data";

interface OCRAnswerSheetScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onResultsProcessed: (results: OCRResults) => void;
  quizQuestions: Array<{
    id: string;
    question: string;
    correctAnswer: number;
  }>;
  students: Array<{
    id: string;
    name: string;
    rollNumber: string;
  }>;
}

export interface OCRResults {
  studentAnswers: {
    [studentId: string]: {
      answers: number[]; // Array of answer indices (0-3)
      score: number;
      totalQuestions: number;
    };
  };
  scannedImage?: string;
}

export default function OCRAnswerSheetScanner({
  isOpen,
  onClose,
  onResultsProcessed,
  quizQuestions,
  students,
}: OCRAnswerSheetScannerProps) {
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"camera" | "review" | "processing" | "results">("camera");

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  if (!isOpen) return null;

  // Start camera
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }, // Use back camera on mobile
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
      }
    } catch (err) {
      console.error("Camera access failed:", err);
      setError("ক্যামেরা অ্যাক্সেস করতে ব্যর্থ হয়েছে। অনুগ্রহ করে ফাইল আপলোড করুন।");
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  // Capture photo from camera
  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");

      if (context) {
        // Set canvas size to video size
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw video frame to canvas
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convert to base64 image
        const imageData = canvas.toDataURL("image/jpeg", 0.8);
        setCapturedImage(imageData);
        setStep("review");
        stopCamera();
      }
    }
  };

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageData = e.target?.result as string;
        setCapturedImage(imageData);
        setStep("review");
        stopCamera();
      };
      reader.readAsDataURL(file);
    }
  };

  // Process image with OCR API
  const processImage = async () => {
    if (!capturedImage) return;

    setIsProcessing(true);
    setStep("processing");
    setError(null);

    try {
      const response = await fetch("/api/ocr-answer-sheet", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageData: capturedImage,
          questions: quizQuestions,
          students: students.map((s) => ({
            id: s.id,
            name: s.name,
            rollNumber: s.rollNumber,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error("OCR processing failed");
      }

      const data = await response.json();

      if (data.success && data.results) {
        setStep("results");
        onResultsProcessed({
          studentAnswers: data.results.studentAnswers,
          scannedImage: capturedImage,
        });
      } else {
        throw new Error(data.error || "Unknown error");
      }
    } catch (err) {
      console.error("OCR processing error:", err);
      setError("উত্তরপত্র প্রক্রিয়া করতে ব্যর্থ হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।");
      setStep("review");
    } finally {
      setIsProcessing(false);
    }
  };

  // Reset and close
  const handleClose = () => {
    stopCamera();
    setCapturedImage(null);
    setStep("camera");
    setError(null);
    onClose();
  };

  // Retake photo
  const retakePhoto = () => {
    setCapturedImage(null);
    setStep("camera");
    setError(null);
    startCamera();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">উত্তরপত্র স্ক্যান করুন</h2>
              <p className="text-purple-100 text-sm mt-1">
                ক্যামেরা দিয়ে ছবি তুলুন বা ফাইল আপলোড করুন
              </p>
            </div>
            <button
              onClick={handleClose}
              className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step: Camera */}
          {step === "camera" && (
            <div className="space-y-6">
              {/* Camera View */}
              <div className="bg-gray-900 rounded-xl overflow-hidden aspect-[4/3] relative">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                  onLoadedMetadata={startCamera}
                />
                <canvas ref={canvasRef} className="hidden" />

                {/* Camera Guide Overlay */}
                <div className="absolute inset-0 border-4 border-dashed border-white/30 m-8 rounded-lg pointer-events-none flex items-center justify-center">
                  <div className="bg-black/50 text-white px-4 py-2 rounded-lg text-sm">
                    উত্তরপত্রটি এই ফ্রেমের মধ্যে রাখুন
                  </div>
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">নির্দেশনা:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>✓ পর্যাপ্ত আলো নিশ্চিত করুন</li>
                  <li>✓ উত্তরপত্রটি সমতল রাখুন</li>
                  <li>✓ সব রোল নম্বর ও উত্তর স্পষ্ট দেখা যাচ্ছে তা নিশ্চিত করুন</li>
                  <li>✓ ছবিটি ঝাপসা না হওয়া পর্যন্ত ক্যামেরা স্থির রাখুন</li>
                </ul>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
                  {error}
                </div>
              )}

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-4">
                {/* Capture Button */}
                <button
                  onClick={capturePhoto}
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-4 px-6 rounded-xl font-semibold text-lg hover:shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  ছবি তুলুন
                </button>

                {/* Upload Button */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-white border-2 border-purple-600 text-purple-600 py-4 px-6 rounded-xl font-semibold text-lg hover:bg-purple-50 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  ফাইল আপলোড
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            </div>
          )}

          {/* Step: Review */}
          {step === "review" && capturedImage && (
            <div className="space-y-6">
              {/* Preview Image */}
              <div className="bg-gray-100 rounded-xl overflow-hidden">
                <img src={capturedImage} alt="Captured answer sheet" className="w-full h-auto" />
              </div>

              {/* Instructions */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-900 text-sm">
                  ✓ নিশ্চিত করুন যে সব রোল নম্বর এবং উত্তর স্পষ্টভাবে দেখা যাচ্ছে। যদি ছবি ঝাপসা হয়, তাহলে আবার তুলুন।
                </p>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-4">
                {/* Retake Button */}
                <button
                  onClick={retakePhoto}
                  className="bg-white border-2 border-gray-300 text-gray-700 py-4 px-6 rounded-xl font-semibold text-lg hover:bg-gray-50 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  আবার তুলুন
                </button>

                {/* Process Button */}
                <button
                  onClick={processImage}
                  disabled={isProcessing}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 text-white py-4 px-6 rounded-xl font-semibold text-lg hover:shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  প্রক্রিয়া করুন
                </button>
              </div>
            </div>
          )}

          {/* Step: Processing */}
          {step === "processing" && (
            <div className="py-12 text-center">
              <div className="w-20 h-20 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                <svg className="w-10 h-10 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">AI দিয়ে উত্তরপত্র পরীক্ষা করা হচ্ছে...</h3>
              <p className="text-gray-600">অনুগ্রহ করে অপেক্ষা করুন, এতে ১০-২০ সেকেন্ড সময় লাগতে পারে</p>
            </div>
          )}

          {/* Step: Results */}
          {step === "results" && (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">সফলভাবে সম্পন্ন হয়েছে!</h3>
              <p className="text-gray-600 mb-6">
                উত্তরপত্র প্রক্রিয়া সম্পন্ন হয়েছে। নম্বর সংরক্ষিত হয়েছে।
              </p>
              <button
                onClick={handleClose}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 px-8 rounded-xl font-semibold hover:shadow-lg transition-all active:scale-[0.98]"
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
