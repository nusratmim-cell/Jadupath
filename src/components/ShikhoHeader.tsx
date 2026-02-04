"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";

interface ShikhoHeaderProps {
  variant?: "light" | "dark";
  showBackButton?: boolean;
  onBack?: () => void;
  rightContent?: React.ReactNode;
}

export default function ShikhoHeader({
  variant = "dark",
  showBackButton = false,
  onBack,
  rightContent,
}: ShikhoHeaderProps) {
  const router = useRouter();

  const handleLogoClick = () => {
    router.push("/dashboard");
  };

  return (
    <header
      className="sticky top-0 z-50 bg-white border-b-2 border-gray-200"
    >
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Left Side - Back Button and Logo */}
        <div className="flex items-center gap-3">
          {showBackButton && (
            <button
              onClick={onBack}
              className="p-2 rounded-lg transition-colors hover:bg-gray-100 text-gray-700"
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
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
          )}

          {/* Jaadupath Logo */}
          <button
            onClick={handleLogoClick}
            className="flex items-center transition-opacity hover:opacity-80"
          >
            <Image
              src="/jaadupath-logo-color.svg"
              alt="Jaadupath"
              width={140}
              height={56}
              priority
            />
          </button>
        </div>

        {/* Right Side - Custom Content */}
        {rightContent && <div className="flex items-center">{rightContent}</div>}
      </div>
    </header>
  );
}
