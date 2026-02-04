"use client";

import { usePathname, useRouter } from "next/navigation";

interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: "home" | "ai" | "reports" | "training" | "profile";
}

const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "হোম", path: "/dashboard", icon: "home" },
  { id: "ai", label: "AI টুলস", path: "/ai", icon: "ai" },
  { id: "reports", label: "রিপোর্ট", path: "/reports", icon: "reports" },
  { id: "training", label: "প্রশিক্ষণ", path: "/training", icon: "training" },
  { id: "profile", label: "প্রোফাইল", path: "/profile", icon: "profile" },
];

function NavIcon({ name, isActive }: { name: NavItem["icon"]; isActive: boolean }) {
  const color = isActive ? "text-[#354894]" : "text-slate-400";
  const strokeWidth = isActive ? 2.5 : 2;
  const size = "w-8 h-8"; // Larger for tablet

  switch (name) {
    case "home":
      return (
        <svg className={`${size} ${color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      );
    case "ai":
      return (
        <svg className={`${size} ${color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      );
    case "reports":
      return (
        <svg className={`${size} ${color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      );
    case "training":
      return (
        <svg className={`${size} ${color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      );
    case "profile":
      return (
        <svg className={`${size} ${color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      );
    default:
      return null;
  }
}

interface BottomNavProps {
  active?: string;
}

export default function BottomNav({ active }: BottomNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const _ = active; // Allow override but use pathname by default

  // Don't show on login, onboarding, classroom, teach, or student setup pages
  const hiddenPaths = ["/", "/onboarding", "/classroom", "/teach", "/students/setup"];
  const shouldHide = hiddenPaths.some(path =>
    pathname === path || pathname.startsWith("/classroom/") || pathname.startsWith("/teach/")
  );

  if (shouldHide) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-slate-200 z-50 safe-area-bottom">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center justify-around py-2">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.path || pathname.startsWith(item.path + "/");

            return (
              <button
                key={item.id}
                onClick={() => router.push(item.path)}
                className={`flex flex-col items-center gap-1.5 py-2 px-3 rounded-2xl transition-all active:scale-95 ${
                  isActive
                    ? "bg-[#354894]/10"
                    : ""
                }`}
              >
                <NavIcon name={item.icon} isActive={isActive} />
                <span className={`text-sm font-semibold ${
                  isActive ? "text-[#354894]" : "text-slate-500"
                }`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
