"use client";

import Image from "next/image";
import { TeacherProfile } from "@/lib/auth";
import {
  getAvatarData,
  getAvatarByType,
  getFirstLetter,
  getAvatarIconSVG,
  type AvatarType,
} from "@/lib/avatars";

interface AvatarDisplayProps {
  profile: TeacherProfile | null;
  size?: "small" | "medium" | "large" | "xlarge";
  className?: string;
  showBorder?: boolean;
}

/**
 * AvatarDisplay Component
 *
 * Displays teacher avatar - either uploaded photo or cool avatar design
 *
 * Sizes:
 * - small: 48px (w-12 h-12) - for small UI elements
 * - medium: 80px (w-20 h-20) - for cards and lists
 * - large: 96px (w-24 h-24) - for dashboard header
 * - xlarge: 140px (w-35 h-35) - for profile page (Facebook style)
 */
export default function AvatarDisplay({
  profile,
  size = "medium",
  className = "",
  showBorder = false,
}: AvatarDisplayProps) {
  const avatarData = getAvatarData(profile);

  // Size mappings - optimized for tablet
  const sizeClasses = {
    small: "w-12 h-12 text-lg", // 48px
    medium: "w-20 h-20 text-2xl", // 80px
    large: "w-24 h-24 text-3xl", // 96px
    xlarge: "w-35 h-35 text-5xl", // 140px
  };

  const iconSizes = {
    small: "w-6 h-6",
    medium: "w-10 h-10",
    large: "w-12 h-12",
    xlarge: "w-16 h-16",
  };

  const borderClass = showBorder
    ? "border-4 border-white shadow-xl"
    : "";

  // If profile has uploaded picture
  if (avatarData.type === "image") {
    return (
      <div
        className={`${sizeClasses[size]} rounded-full overflow-hidden ${borderClass} ${className} bg-white`}
      >
        <Image
          src={avatarData.value as string}
          alt={profile?.name || "Profile"}
          width={size === "xlarge" ? 140 : size === "large" ? 96 : size === "medium" ? 80 : 48}
          height={size === "xlarge" ? 140 : size === "large" ? 96 : size === "medium" ? 80 : 48}
          className="object-cover w-full h-full"
        />
      </div>
    );
  }

  // Cool avatar display
  const avatarType = avatarData.value as AvatarType;
  const avatarInfo = getAvatarByType(avatarType);

  if (!avatarInfo) {
    // Fallback to letter avatar
    return <LetterAvatar profile={profile} size={size} className={className} showBorder={showBorder} />;
  }

  // Letter avatar (special case)
  if (avatarType === "letter") {
    return <LetterAvatar profile={profile} size={size} className={className} showBorder={showBorder} />;
  }

  // Icon-based avatar
  return (
    <div
      className={`${sizeClasses[size]} rounded-full bg-gradient-to-br ${avatarInfo.gradient} ${borderClass} ${className} flex items-center justify-center overflow-hidden`}
    >
      <div
        className={`${iconSizes[size]} ${avatarInfo.iconColor}`}
        dangerouslySetInnerHTML={{ __html: getAvatarIconSVG(avatarType) }}
      />
    </div>
  );
}

/**
 * Letter Avatar Component (internal)
 * Shows first letter of name with gradient background
 */
function LetterAvatar({
  profile,
  size,
  className,
  showBorder,
}: {
  profile: TeacherProfile | null;
  size: "small" | "medium" | "large" | "xlarge";
  className: string;
  showBorder: boolean;
}) {
  const sizeClasses = {
    small: "w-12 h-12 text-lg",
    medium: "w-20 h-20 text-2xl",
    large: "w-24 h-24 text-3xl",
    xlarge: "w-35 h-35 text-5xl",
  };

  const borderClass = showBorder ? "border-4 border-white shadow-xl" : "";
  const letter = getFirstLetter(profile?.name);

  return (
    <div
      className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-purple-500 to-pink-500 ${borderClass} ${className} flex items-center justify-center`}
    >
      <span className="font-bold text-white drop-shadow-md">{letter}</span>
    </div>
  );
}
