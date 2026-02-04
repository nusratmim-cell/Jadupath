"use client";

export function NoticeBar() {
  return (
    <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 shadow-lg border-y-2 border-amber-600/30 overflow-hidden">
      <div className="relative flex items-center h-12">
        {/* Notice Icon */}
        <div className="absolute left-0 z-10 flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 pl-4 pr-6 h-full">
          <div className="bg-white/20 backdrop-blur-sm rounded-full p-1.5 animate-pulse">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
            </svg>
          </div>
          <span className="text-white font-bold text-sm whitespace-nowrap">বিজ্ঞপ্তি:</span>
        </div>

        {/* Scrolling Notice Text */}
        <div className="absolute left-32 right-0 overflow-hidden h-full">
          <div className="notice-scroll flex items-center h-full">
            <span className="text-white font-medium text-sm whitespace-nowrap px-8">
              জাতীয় নির্বাচন উপলক্ষে আগামী ১১ ও ১২ ফেব্রুয়ারি বিদ্যালয় বন্ধ থাকবে
            </span>
            <span className="text-white font-medium text-sm whitespace-nowrap px-8">
              জাতীয় নির্বাচন উপলক্ষে আগামী ১১ ও ১২ ফেব্রুয়ারি বিদ্যালয় বন্ধ থাকবে
            </span>
            <span className="text-white font-medium text-sm whitespace-nowrap px-8">
              জাতীয় নির্বাচন উপলক্ষে আগামী ১১ ও ১২ ফেব্রুয়ারি বিদ্যালয় বন্ধ থাকবে
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
