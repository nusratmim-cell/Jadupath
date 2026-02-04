"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  getCurrentUser,
  updateUserName,
  saveTeacherProfile,
  completeOnboarding,
  getProfileByUserId,
  type TeacherProfile,
} from "@/lib/auth";

// Available classes (Class 1-5)
const PRIMARY_CLASSES = [
  { id: "class-1", label: "১", value: "1" },
  { id: "class-2", label: "২", value: "2" },
  { id: "class-3", label: "৩", value: "3" },
  { id: "class-4", label: "৪", value: "4" },
  { id: "class-5", label: "৫", value: "5" },
];

// Secondary classes (disabled for now)
const SECONDARY_CLASSES: typeof PRIMARY_CLASSES = [];

// Primary subjects for class 4
const PRIMARY_SUBJECTS: { id: string; label: string; value: string }[] = [
  { id: "bangla", label: "বাংলা", value: "bangla" },
  { id: "english", label: "ইংরেজি", value: "english" },
  { id: "math", label: "গণিত", value: "math" },
  { id: "science", label: "বিজ্ঞান", value: "science" },
  { id: "bangladesh", label: "বাংলাদেশ ও বিশ্বপরিচয়", value: "bangladesh" },
];

// Secondary subjects (can be added later)
const SECONDARY_SUBJECTS: { id: string; label: string; value: string }[] = [];

export default function OnboardingPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // User data
  const [userId, setUserId] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [teachingType, setTeachingType] = useState<"primary" | "secondary">("primary");
  const [userName, setUserName] = useState("");

  // Form data
  const [profilePicture, setProfilePicture] = useState<string>("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [teachingExperience, setTeachingExperience] = useState("");
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);

  // Error state
  const [error, setError] = useState("");

  // Check auth and load existing data
  useEffect(() => {
    const user = getCurrentUser();
    if (!user) {
      router.push("/");
      return;
    }

    setUserId(user.id);
    setUserEmail(user.email);
    setUserName(user.name);
    setName(user.name);
    setTeachingType(user.teachingType);

    // Load existing profile if any
    const existingProfile = getProfileByUserId(user.id);
    if (existingProfile) {
      setProfilePicture(existingProfile.profilePicture || "");
      setName(existingProfile.name);
      setPhone(existingProfile.phone || "");
      setSchoolName(existingProfile.schoolName);
      setTeachingExperience(existingProfile.teachingExperience || "");
      setSelectedClasses(existingProfile.classes);
      setSelectedSubjects(existingProfile.subjects);
    }

    setIsLoading(false);
  }, [router]);

  // Handle profile picture upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("ছবির সাইজ ৫MB এর কম হতে হবে");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicture(reader.result as string);
        setError("");
      };
      reader.readAsDataURL(file);
    }
  };

  // Toggle class selection
  const toggleClass = (classValue: string) => {
    setSelectedClasses((prev) =>
      prev.includes(classValue)
        ? prev.filter((c) => c !== classValue)
        : [...prev, classValue]
    );
  };

  // Toggle subject selection
  const toggleSubject = (subjectValue: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(subjectValue)
        ? prev.filter((s) => s !== subjectValue)
        : [...prev, subjectValue]
    );
  };

  // Handle form submission
  const handleSubmit = async () => {
    setError("");

    if (!name.trim()) {
      setError("আপনার নাম লিখুন");
      return;
    }
    if (!schoolName.trim()) {
      setError("বিদ্যালয়ের নাম লিখুন");
      return;
    }
    if (selectedClasses.length === 0) {
      setError("কমপক্ষে একটি ক্লাস নির্বাচন করুন");
      return;
    }
    if (selectedSubjects.length === 0) {
      setError("কমপক্ষে একটি বিষয় নির্বাচন করুন");
      return;
    }

    setIsSaving(true);

    try {
      updateUserName(userId, name);

      const profile: TeacherProfile = {
        userId,
        name,
        email: userEmail,
        phone: phone.trim() || undefined,
        profilePicture: profilePicture || undefined,
        schoolName,
        teachingExperience: teachingExperience.trim() || undefined,
        classes: selectedClasses,
        subjects: selectedSubjects,
        updatedAt: new Date().toISOString(),
      };

      saveTeacherProfile(profile);
      completeOnboarding(userId);

      await new Promise((resolve) => setTimeout(resolve, 300));
      router.push("/students/setup");
    } catch {
      setError("কিছু সমস্যা হয়েছে। আবার চেষ্টা করুন।");
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#354894] via-[#cf278d] to-[#F7BBE9]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-xl text-white drop-shadow">লোড হচ্ছে...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#354894] via-[#cf278d] to-[#F7BBE9] py-12 px-4 relative overflow-hidden">
      {/* Decorative circles */}
      <div className="absolute top-10 right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
      <div className="absolute bottom-20 left-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
      <div className="absolute top-2/3 right-1/4 w-24 h-24 bg-white/5 rounded-full blur-xl"></div>

      {/* Main Card */}
      <div className="max-w-lg mx-auto relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-block mb-4">
            <Image
              src="/jaadupath-logo-white.svg"
              alt="Jaadupath"
              width={160}
              height={63}
              priority
              className="drop-shadow-lg"
            />
          </div>
        </div>

        {/* Welcome Header */}
        <div className="bg-white px-6 py-6 text-center mb-6 rounded-2xl shadow-md border-2 border-gray-100">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            স্বাগতম, {userName || "শিক্ষক"}!
          </h1>
          <p className="text-gray-600 text-base">
            আপনার প্রোফাইল সম্পূর্ণ করুন
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-100">
            {/* Profile Picture */}
            <div className="flex justify-center items-center pt-6 mb-6">
              <div
                className="relative aspect-square rounded-full border-4 border-white shadow-xl flex items-center justify-center cursor-pointer hover:scale-105 transition-transform overflow-hidden bg-white"
                style={{ width: 'clamp(96px, 15vw, 128px)', height: 'clamp(96px, 15vw, 128px)' }}
                onClick={() => fileInputRef.current?.click()}
              >
                {profilePicture ? (
                  <Image
                    src={profilePicture}
                    alt="প্রোফাইল"
                    fill
                    className="object-cover"
                  />
                ) : (
                  <svg className="w-12 h-12 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                )}
                <div className="absolute bottom-0 right-0 aspect-square rounded-full flex items-center justify-center border-2 border-white bg-[#cf278d]" style={{ width: 'clamp(24px, 4vw, 32px)', height: 'clamp(24px, 4vw, 32px)' }}>
                  <svg className="text-white flex-shrink-0" style={{ width: 'clamp(14px, 2.5vw, 18px)', height: 'clamp(14px, 2.5vw, 18px)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleImageUpload}
              />
            </div>

            {/* Form Section */}
            <div className="px-6 pb-6 space-y-5">
              {/* Name Input */}
              <div>
                <label className="block text-base font-semibold text-slate-700 mb-2">
                  আপনার নাম
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-3 text-base border-2 border-slate-200 rounded-xl focus:border-[#cf278d] focus:ring-2 focus:ring-[#cf278d]/20 outline-none transition-all bg-slate-50"
                  placeholder="পুরো নাম লিখুন"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              {/* School Name Input */}
              <div>
                <label className="block text-base font-semibold text-slate-700 mb-2">
                  বিদ্যালয়ের নাম
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-3 text-base border-2 border-slate-200 rounded-xl focus:border-[#cf278d] focus:ring-2 focus:ring-[#cf278d]/20 outline-none transition-all bg-slate-50"
                  placeholder="বিদ্যালয়ের নাম লিখুন"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                />
              </div>

              {/* Phone Number Input */}
              <div>
                <label className="block text-base font-semibold text-slate-700 mb-2 flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  মোবাইল নম্বর
                  <span className="text-sm text-gray-500 font-normal">(ঐচ্ছিক)</span>
                </label>
                <input
                  type="tel"
                  className="w-full px-4 py-3 text-base border-2 border-slate-200 rounded-xl focus:border-[#cf278d] focus:ring-2 focus:ring-[#cf278d]/20 outline-none transition-all bg-slate-50"
                  placeholder="০১৭XXXXXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              {/* Teaching Experience Dropdown */}
              <div>
                <label className="block text-base font-semibold text-slate-700 mb-2 flex items-center gap-2">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  শিক্ষকতার অভিজ্ঞতা
                  <span className="text-sm text-gray-500 font-normal">(ঐচ্ছিক)</span>
                </label>
                <select
                  className="w-full px-4 py-3 text-base border-2 border-slate-200 rounded-xl focus:border-[#cf278d] focus:ring-2 focus:ring-[#cf278d]/20 outline-none transition-all bg-slate-50 appearance-none cursor-pointer"
                  value={teachingExperience}
                  onChange={(e) => setTeachingExperience(e.target.value)}
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23475569' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 12px center',
                    backgroundSize: '20px',
                    paddingRight: '40px',
                  }}
                >
                  <option value="">নির্বাচন করুন</option>
                  <option value="১ বছর">১ বছর</option>
                  <option value="২-৫ বছর">২-৫ বছর</option>
                  <option value="৬-১০ বছর">৬-১০ বছর</option>
                  <option value="১১-১৫ বছর">১১-১৫ বছর</option>
                  <option value="১৬-২০ বছর">১৬-২০ বছর</option>
                  <option value="২০+ বছর">২০+ বছর</option>
                </select>
              </div>

              {/* Class Selection */}
              <div>
                <label className="block text-base font-semibold text-slate-700 mb-3">
                  আপনি কোন ক্লাসে পড়ান?
                </label>
                <div className="flex gap-2.5 justify-center flex-wrap">
                  {(teachingType === "primary" ? PRIMARY_CLASSES : SECONDARY_CLASSES).map((cls) => (
                    <button
                      key={cls.id}
                      type="button"
                      onClick={() => toggleClass(cls.value)}
                      className={`w-14 h-14 rounded-xl text-xl font-bold transition-all ${
                        selectedClasses.includes(cls.value)
                          ? "bg-[#cf278d] text-white shadow-lg scale-105"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {cls.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Subject Selection */}
              <div>
                <label className="block text-base font-semibold text-slate-700 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  আপনি কোন বিষয় পড়ান?
                </label>
                <div className="grid grid-cols-2 gap-4">
                  {(teachingType === "primary" ? PRIMARY_SUBJECTS : SECONDARY_SUBJECTS).map((subject, index) => {
                    const isSelected = selectedSubjects.includes(subject.value);
                    const colors = [
                      { from: 'from-blue-500', to: 'to-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', icon: '📖' },
                      { from: 'from-purple-500', to: 'to-purple-600', bg: 'bg-purple-50', border: 'border-purple-200', icon: '🔤' },
                      { from: 'from-green-500', to: 'to-green-600', bg: 'bg-green-50', border: 'border-green-200', icon: '🔢' },
                      { from: 'from-orange-500', to: 'to-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', icon: '🔬' },
                      { from: 'from-teal-500', to: 'to-teal-600', bg: 'bg-teal-50', border: 'border-teal-200', icon: '🌍' },
                    ];
                    const color = colors[index % colors.length];

                    return (
                      <button
                        key={subject.id}
                        type="button"
                        onClick={() => toggleSubject(subject.value)}
                        className={`group relative py-5 px-4 rounded-2xl text-base font-semibold transition-all duration-300 transform hover:scale-105 ${
                          isSelected
                            ? `bg-gradient-to-br ${color.from} ${color.to} text-white shadow-xl`
                            : `${color.bg} text-slate-700 hover:shadow-lg border-2 ${color.border}`
                        }`}
                      >
                        <div className="flex flex-col items-center gap-2">
                          <span className="text-3xl">{color.icon}</span>
                          <span className="text-center leading-tight">{subject.label}</span>
                        </div>
                        {isSelected && (
                          <div className="absolute -top-2 -right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-md">
                            <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
                {selectedSubjects.length > 0 && (
                  <p className="mt-3 text-sm text-center text-gray-600 flex items-center justify-center gap-1.5">
                    <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    {selectedSubjects.length} টি বিষয় নির্বাচিত
                  </p>
                )}
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200 text-red-700 px-4 py-3.5 rounded-2xl text-center text-base font-semibold shadow-md flex items-center justify-center gap-2 animate-fadeIn">
                  <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSaving}
                className="w-full py-5 bg-[#cf278d] text-white text-xl font-bold rounded-2xl hover:bg-[#b8226f] shadow-md hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
              >
                <div className="flex items-center justify-center gap-2">
                  {isSaving ? (
                    <>
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      সেভ হচ্ছে...
                    </>
                  ) : (
                    <>
                      শুরু করুন
                      <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </>
                  )}
                </div>
              </button>
            </div>
          </div>

        {/* Footer */}
        <p className="text-center text-white/80 text-sm mt-6 drop-shadow">
          © ২০২৬ জাদুপাথ টেকনোলজিস লিমিটেড
        </p>
      </div>
    </div>
  );
}
