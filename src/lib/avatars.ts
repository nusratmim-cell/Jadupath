/**
 * @file avatars.ts
 * @description Avatar system for teacher profiles
 *
 * Provides cool avatar options for teachers without profile pictures.
 * Includes 8 pre-designed avatar types with different colors and themes.
 */

import { TeacherProfile } from "./auth";

// Avatar type definitions
export type AvatarType =
  | "letter"
  | "book"
  | "chalkboard"
  | "students"
  | "globe"
  | "pattern1"
  | "pattern2"
  | "school";

export interface CoolAvatar {
  id: AvatarType;
  name: string;
  nameBengali: string;
  gradient: string;
  iconColor: string;
  description: string;
}

// Pre-defined cool avatar options
export const COOL_AVATARS: CoolAvatar[] = [
  {
    id: "letter",
    name: "Letter Circle",
    nameBengali: "অক্ষর বৃত্ত",
    gradient: "from-purple-500 to-pink-500",
    iconColor: "text-white",
    description: "আপনার নামের প্রথম অক্ষর দিয়ে",
  },
  {
    id: "book",
    name: "Book",
    nameBengali: "বই",
    gradient: "from-blue-500 to-cyan-500",
    iconColor: "text-white",
    description: "শিক্ষা ও জ্ঞানের প্রতীক",
  },
  {
    id: "chalkboard",
    name: "Chalkboard",
    nameBengali: "ব্ল্যাকবোর্ড",
    gradient: "from-green-500 to-emerald-500",
    iconColor: "text-white",
    description: "শিক্ষকতার ঐতিহ্য",
  },
  {
    id: "students",
    name: "Students",
    nameBengali: "শিক্ষার্থী",
    gradient: "from-orange-500 to-amber-500",
    iconColor: "text-white",
    description: "শিক্ষার্থীদের সাথে",
  },
  {
    id: "globe",
    name: "Globe",
    nameBengali: "বিশ্ব",
    gradient: "from-indigo-500 to-purple-500",
    iconColor: "text-white",
    description: "বিশ্বব্যাপী শিক্ষা",
  },
  {
    id: "pattern1",
    name: "Geometric Pattern",
    nameBengali: "জ্যামিতিক নকশা",
    gradient: "from-pink-500 to-rose-500",
    iconColor: "text-white",
    description: "আধুনিক ডিজাইন",
  },
  {
    id: "pattern2",
    name: "Circular Pattern",
    nameBengali: "বৃত্তাকার নকশা",
    gradient: "from-teal-500 to-cyan-500",
    iconColor: "text-white",
    description: "সৃজনশীল প্যাটার্ন",
  },
  {
    id: "school",
    name: "School Building",
    nameBengali: "বিদ্যালয়",
    gradient: "from-violet-500 to-purple-500",
    iconColor: "text-white",
    description: "শিক্ষা প্রতিষ্ঠান",
  },
];

/**
 * Get avatar URL or type for a profile
 * Returns profile picture if exists, otherwise returns selected avatar type or default
 */
export function getAvatarData(profile: TeacherProfile | null): {
  type: "image" | "avatar";
  value: string | AvatarType;
} {
  // If profile has a picture, use it
  if (profile?.profilePicture) {
    return { type: "image", value: profile.profilePicture };
  }

  // Check if profile has a selected avatar type in localStorage
  if (profile?.userId) {
    const selectedAvatar = localStorage.getItem(`avatar_${profile.userId}`);
    if (selectedAvatar && isValidAvatarType(selectedAvatar)) {
      return { type: "avatar", value: selectedAvatar as AvatarType };
    }
  }

  // Default to letter avatar
  return { type: "avatar", value: "letter" };
}

/**
 * Save selected avatar type for a user
 */
export function saveSelectedAvatar(userId: string, avatarType: AvatarType): void {
  localStorage.setItem(`avatar_${userId}`, avatarType);
}

/**
 * Get selected avatar type for a user
 */
export function getSelectedAvatar(userId: string): AvatarType {
  const selected = localStorage.getItem(`avatar_${userId}`);
  return (selected && isValidAvatarType(selected)) ? selected as AvatarType : "letter";
}

/**
 * Check if a string is a valid avatar type
 */
function isValidAvatarType(value: string): boolean {
  return COOL_AVATARS.some(avatar => avatar.id === value);
}

/**
 * Get avatar data by type
 */
export function getAvatarByType(type: AvatarType): CoolAvatar | undefined {
  return COOL_AVATARS.find(avatar => avatar.id === type);
}

/**
 * Get first letter from name for letter avatar
 */
export function getFirstLetter(name?: string): string {
  if (!name || name.trim().length === 0) return "T";

  // Get first character, handling Bengali and English
  const firstChar = name.trim()[0].toUpperCase();
  return firstChar;
}

/**
 * Generate inline SVG for avatar icon
 * This keeps components lightweight without needing separate icon files
 */
export function getAvatarIconSVG(type: AvatarType): string {
  switch (type) {
    case "book":
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M12 6v6m-3-3h6" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`;

    case "chalkboard":
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="4" width="18" height="12" rx="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M7 20h10M9 16v4m6-4v4" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M7 8h6m-6 3h4" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`;

    case "students":
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="9" cy="7" r="4" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`;

    case "globe":
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`;

    case "school":
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M3 21h18M5 21V7l8-4 8 4v14" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M9 21v-6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v6" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M9 9h.01M9 12h.01M15 9h.01M15 12h.01" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`;

    case "pattern1":
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="3" width="7" height="7" stroke-linecap="round" stroke-linejoin="round"/>
        <rect x="14" y="3" width="7" height="7" stroke-linecap="round" stroke-linejoin="round"/>
        <rect x="14" y="14" width="7" height="7" stroke-linecap="round" stroke-linejoin="round"/>
        <rect x="3" y="14" width="7" height="7" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`;

    case "pattern2":
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="3" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="12" cy="12" r="8" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M12 2v2m0 16v2M2 12h2m16 0h2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`;

    case "letter":
    default:
      // Letter avatar doesn't use an icon
      return "";
  }
}
