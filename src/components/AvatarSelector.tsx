"use client";

import { useState } from "react";
import {
  COOL_AVATARS,
  getAvatarIconSVG,
  getFirstLetter,
  type AvatarType,
} from "@/lib/avatars";

interface AvatarSelectorProps {
  userName?: string;
  selectedAvatar?: AvatarType;
  onSelect: (avatarType: AvatarType) => void;
  onUploadPhoto?: (file: File) => void;
}

/**
 * AvatarSelector Component
 *
 * Allows users to choose from cool avatar options or upload their own photo
 * Optimized for tablet with larger touch targets
 */
export default function AvatarSelector({
  userName,
  selectedAvatar = "letter",
  onSelect,
  onUploadPhoto,
}: AvatarSelectorProps) {
  const [activeTab, setActiveTab] = useState<"choose" | "upload">("choose");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUploadPhoto) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        alert("অনুগ্রহ করে একটি ছবি ফাইল নির্বাচন করুন");
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert("ছবির আকার ৫ এমবি এর কম হতে হবে");
        return;
      }

      onUploadPhoto(file);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-6 py-4 border-b border-gray-100">
        <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          আপনার অবতার নির্বাচন করুন
        </h3>
        <p className="text-sm text-gray-600 mt-1">সুন্দর ডিজাইন বেছে নিন অথবা নিজের ছবি আপলোড করুন</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab("choose")}
          className={`flex-1 px-6 py-4 font-semibold transition-all ${
            activeTab === "choose"
              ? "text-purple-600 border-b-3 border-purple-600 bg-purple-50"
              : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-base">ডিজাইন বেছে নিন</span>
          </div>
        </button>
        {onUploadPhoto && (
          <button
            onClick={() => setActiveTab("upload")}
            className={`flex-1 px-6 py-4 font-semibold transition-all ${
              activeTab === "upload"
                ? "text-purple-600 border-b-3 border-purple-600 bg-purple-50"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <span className="text-base">ছবি আপলোড করুন</span>
            </div>
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === "choose" ? (
          /* Avatar Grid */
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {COOL_AVATARS.map((avatar) => (
              <button
                key={avatar.id}
                onClick={() => onSelect(avatar.id)}
                className={`group relative bg-gradient-to-br ${avatar.gradient} rounded-2xl p-6 transition-all hover:scale-105 ${
                  selectedAvatar === avatar.id
                    ? "ring-4 ring-purple-500 ring-offset-2 shadow-xl"
                    : "shadow-md hover:shadow-lg"
                }`}
              >
                {/* Avatar Preview */}
                <div className="aspect-square flex items-center justify-center mb-3">
                  {avatar.id === "letter" ? (
                    <span className="text-4xl font-bold text-white drop-shadow-md">
                      {getFirstLetter(userName)}
                    </span>
                  ) : (
                    <div
                      className="w-16 h-16 text-white"
                      dangerouslySetInnerHTML={{ __html: getAvatarIconSVG(avatar.id) }}
                    />
                  )}
                </div>

                {/* Avatar Name */}
                <div className="text-center">
                  <p className="font-bold text-white text-sm drop-shadow">
                    {avatar.nameBengali}
                  </p>
                  <p className="text-xs text-white/90 mt-1 drop-shadow">
                    {avatar.description}
                  </p>
                </div>

                {/* Selected Indicator */}
                {selectedAvatar === avatar.id && (
                  <div className="absolute top-2 right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>
        ) : (
          /* Upload Section */
          <div className="max-w-md mx-auto">
            <label className="block">
              <div className="border-3 border-dashed border-gray-300 rounded-2xl p-8 text-center cursor-pointer hover:border-purple-400 hover:bg-purple-50 transition-all">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-lg font-semibold text-gray-900 mb-2">
                  ছবি নির্বাচন করুন
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  JPG, PNG বা GIF ফরম্যাট (সর্বোচ্চ ৫ এমবি)
                </p>
                <div className="inline-block bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-xl font-semibold hover:from-purple-600 hover:to-pink-600 transition-all">
                  ফাইল নির্বাচন করুন
                </div>
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>

            {/* Upload Guidelines */}
            <div className="mt-6 bg-blue-50 rounded-xl p-4 border border-blue-100">
              <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                ছবির নির্দেশনা
              </h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• স্পষ্ট মুখের ছবি ব্যবহার করুন</li>
                <li>• বর্গাকার (১:১) ছবি সবচেয়ে ভালো দেখায়</li>
                <li>• ছবির আকার ৫ এমবি এর কম হতে হবে</li>
                <li>• পেশাদার ছবি ব্যবহার করুন</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
