"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  registerUser,
  loginUser,
  getCurrentUser,
} from "@/lib/auth";

export default function AuthPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // Form states - simplified
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [teachingType, setTeachingType] = useState<"primary" | "secondary" | "">("");
  const [error, setError] = useState("");

  // Check if user is already logged in
  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      if (user.onboardingCompleted) {
        router.push("/dashboard");
      } else {
        router.push("/onboarding");
      }
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    // Validate
    if (!email || !password) {
      setError("সব তথ্য দিন");
      setIsLoading(false);
      return;
    }

    if (!isLogin && !name) {
      setError("আপনার নাম দিন");
      setIsLoading(false);
      return;
    }

    if (!isLogin && !teachingType) {
      setError("আপনি কোন স্তরে পড়ান তা নির্বাচন করুন");
      setIsLoading(false);
      return;
    }

    if (!isLogin && password.length < 4) {
      setError("পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের হতে হবে");
      setIsLoading(false);
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 300));

    if (isLogin) {
      // Login
      const result = await loginUser(email, password);
      if (result.success && result.user) {
        if (result.user.onboardingCompleted) {
          router.push("/dashboard");
        } else {
          router.push("/onboarding");
        }
      } else {
        setError(result.message);
      }
    } else {
      // Register
      const result = await registerUser(name, email, password, teachingType as "primary" | "secondary");
      if (result.success) {
        router.push("/onboarding");
      } else {
        setError(result.message);
      }
    }

    setIsLoading(false);
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setError("");
    setName("");
    setEmail("");
    setPassword("");
    setTeachingType("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#354894] via-[#cf278d] to-[#F7BBE9] flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Decorative circles */}
      <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
      <div className="absolute bottom-20 right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
      <div className="absolute top-1/3 right-1/4 w-24 h-24 bg-white/5 rounded-full blur-xl"></div>

      <div className="max-w-md w-full relative z-10">
        {/* Logo Section */}
        <div className="text-center mb-10">
          <div className="inline-block mb-6">
            <Image
              src="/jaadupath-logo-white.svg"
              alt="Jaadupath"
              width={180}
              height={71}
              priority
              className="drop-shadow-lg"
            />
          </div>
        </div>

        {/* Auth Card */}
        <div className="bg-white rounded-3xl shadow-lg border-2 border-gray-100 overflow-hidden">
            {/* Tab Switcher */}
            <div className="flex bg-gray-50 p-2 gap-2">
              <button
                onClick={() => !isLoading && setIsLogin(true)}
                className={`flex-1 py-3 text-lg font-semibold rounded-xl transition-all ${
                  isLogin
                    ? "bg-[#cf278d] text-white shadow-md"
                    : "text-gray-600 hover:bg-white hover:text-gray-900"
                }`}
              >
                লগইন
              </button>
              <button
                onClick={() => !isLoading && setIsLogin(false)}
                className={`flex-1 py-3 text-lg font-semibold rounded-xl transition-all ${
                  !isLogin
                    ? "bg-[#cf278d] text-white shadow-md"
                    : "text-gray-600 hover:bg-white hover:text-gray-900"
                }`}
              >
                নতুন অ্যাকাউন্ট
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Name field - only for registration */}
              {!isLogin && (
                <div>
                  <label className="block text-base font-semibold text-gray-700 mb-2">
                    আপনার নাম
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 text-base border-2 border-gray-200 rounded-xl
                      focus:border-[#cf278d] focus:ring-2 focus:ring-[#cf278d]/20 outline-none transition-all
                      placeholder-gray-400 text-gray-800 bg-gray-50"
                    placeholder="নাম লিখুন"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isLoading}
                    autoComplete="name"
                  />
                </div>
              )}

              {/* Teaching Level - only for registration */}
              {!isLogin && (
                <div>
                  <label className="block text-base font-semibold text-gray-700 mb-2">
                    আপনি কোন স্তরে পড়ান?
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setTeachingType("primary")}
                      disabled={isLoading}
                      className={`py-4 px-4 rounded-xl text-base font-semibold transition-all ${
                        teachingType === "primary"
                          ? "bg-[#cf278d] text-white shadow-lg"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200 border-2 border-gray-200"
                      }`}
                    >
                      <div className="text-center">
                        <p className="font-bold text-lg">প্রাথমিক</p>
                        <p className="text-sm opacity-90 mt-1">ক্লাস ১-৫</p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTeachingType("secondary")}
                      disabled={isLoading}
                      className={`py-4 px-4 rounded-xl text-base font-semibold transition-all ${
                        teachingType === "secondary"
                          ? "bg-[#cf278d] text-white shadow-lg"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200 border-2 border-gray-200"
                      }`}
                    >
                      <div className="text-center">
                        <p className="font-bold text-lg">মাধ্যমিক</p>
                        <p className="text-sm opacity-90 mt-1">ক্লাস ৬-১০</p>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* Email */}
              <div>
                <label className="block text-base font-semibold text-gray-700 mb-2">
                  ইমেইল
                </label>
                <input
                  type="email"
                  className="w-full px-4 py-3 text-base border-2 border-gray-200 rounded-xl
                    focus:border-[#cf278d] focus:ring-2 focus:ring-[#cf278d]/20 outline-none transition-all
                    placeholder-gray-400 text-gray-800 bg-gray-50"
                  placeholder="example@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  autoComplete="email"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-base font-semibold text-gray-700 mb-2">
                  পাসওয়ার্ড
                </label>
                <input
                  type="password"
                  className="w-full px-4 py-3 text-base border-2 border-gray-200 rounded-xl
                    focus:border-[#cf278d] focus:ring-2 focus:ring-[#cf278d]/20 outline-none transition-all
                    placeholder-gray-400 text-gray-800 bg-gray-50"
                  placeholder={isLogin ? "পাসওয়ার্ড" : "কমপক্ষে ৪ অক্ষর"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  autoComplete={isLogin ? "current-password" : "new-password"}
                />
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-xl text-center text-base font-semibold">
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 bg-[#cf278d] text-white text-xl font-bold rounded-xl
                  hover:bg-[#b8226f] shadow-md hover:shadow-xl hover:scale-[1.02] transition-all
                  disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    অপেক্ষা করুন...
                  </span>
                ) : isLogin ? (
                  "লগইন করুন"
                ) : (
                  "অ্যাকাউন্ট তৈরি করুন"
                )}
              </button>

              {/* Switch mode link */}
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={switchMode}
                  disabled={isLoading}
                  className="text-[#cf278d] text-base font-medium hover:text-[#b8226f] transition-colors"
                >
                  {isLogin ? "নতুন অ্যাকাউন্ট তৈরি করুন" : "আগে থেকে অ্যাকাউন্ট আছে? লগইন করুন"}
                </button>
              </div>
            </form>
          </div>

        {/* Footer */}
        <p className="text-center text-white/80 text-sm mt-6 drop-shadow">
          © ২০২৬ জাদুপাথ টেকনোলজিস লিমিটেড
        </p>
      </div>
    </div>
  );
}
