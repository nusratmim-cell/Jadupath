/**
 * @file errorMessages.ts
 * @description Centralized Bengali error messages for consistent UI
 */

export const ERROR_MESSAGES = {
  // Authentication errors
  AUTH: {
    INVALID_CREDENTIALS: "ইমেইল বা পাসওয়ার্ড ভুল হয়েছে",
    EMAIL_EXISTS: "এই ইমেইল দিয়ে আগেই রেজিস্ট্রেশন করা হয়েছে",
    EMAIL_NOT_FOUND: "এই ইমেইল দিয়ে কোনো অ্যাকাউন্ট নেই",
    WEAK_PASSWORD: "পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে",
    SESSION_EXPIRED: "আপনার সেশন শেষ হয়ে গেছে, আবার লগইন করুন",
  },

  // Data errors
  DATA: {
    CORRUPTED_DATA: "ডেটা নষ্ট হয়ে গেছে, দয়া করে রিফ্রেশ করুন",
    SAVE_FAILED: "ডেটা সেভ করতে ব্যর্থ হয়েছে",
    LOAD_FAILED: "ডেটা লোড করতে ব্যর্থ হয়েছে",
    INVALID_FORMAT: "ডেটার ফরম্যাট সঠিক নয়",
    PARSE_ERROR: "ডেটা পার্স করতে ব্যর্থ হয়েছে",
  },

  // Student management errors
  STUDENT: {
    ADD_FAILED: "ছাত্র/ছাত্রী যোগ করতে ব্যর্থ হয়েছে",
    UPDATE_FAILED: "তথ্য আপডেট করতে ব্যর্থ হয়েছে",
    DELETE_FAILED: "মুছে ফেলতে ব্যর্থ হয়েছে",
    NOT_FOUND: "ছাত্র/ছাত্রী খুঁজে পাওয়া যায়নি",
    DUPLICATE_ROLL: "এই রোল নম্বর আগেই ব্যবহার হয়েছে",
    INVALID_ROLL: "রোল নম্বর সঠিক নয়",
  },

  // File upload errors
  FILE: {
    TOO_LARGE: "ফাইল সাইজ বড় (সর্বোচ্চ ৫ MB)",
    INVALID_TYPE: "ফাইল টাইপ সমর্থিত নয়",
    UPLOAD_FAILED: "ফাইল আপলোড ব্যর্থ হয়েছে",
    PARSE_EXCEL_FAILED: "এক্সেল ফাইল পার্স করতে ব্যর্থ হয়েছে",
    PARSE_CSV_FAILED: "CSV ফাইল পার্স করতে ব্যর্থ হয়েছে",
    NO_DATA_FOUND: "ফাইলে কোনো ডেটা পাওয়া যায়নি",
  },

  // AI errors
  AI: {
    QUIZ_GENERATION_FAILED: "কুইজ তৈরি করতে ব্যর্থ হয়েছে",
    SUMMARY_GENERATION_FAILED: "সারাংশ তৈরি করতে ব্যর্থ হয়েছে",
    QUESTION_FAILED: "প্রশ্নের উত্তর দিতে ব্যর্থ হয়েছে",
    LESSON_PLAN_FAILED: "পাঠ পরিকল্পনা তৈরি করতে ব্যর্থ হয়েছে",
    OCR_FAILED: "ছবি থেকে টেক্সট বের করতে ব্যর্থ হয়েছে",
    RATE_LIMIT: "অনেক বেশি রিকুয়েস্ট, কিছুক্ষণ পরে চেষ্টা করুন",
    API_KEY_MISSING: "AI API কী পাওয়া যায়নি",
    API_KEY_INVALID: "AI API কী সঠিক নয়",
    TIMEOUT: "সময় শেষ হয়ে গেছে, আবার চেষ্টা করুন",
    SERVICE_UNAVAILABLE: "AI সেবা এই মুহূর্তে উপলব্ধ নয়",
  },

  // Chromecast errors
  CAST: {
    SDK_NOT_FOUND: "কাস্ট SDK পাওয়া যায়নি",
    SDK_INIT_FAILED: "কাস্ট SDK শুরু করতে ব্যর্থ হয়েছে",
    NO_DEVICES: "কোনো কাস্ট ডিভাইস পাওয়া যায়নি",
    CONNECTION_FAILED: "কাস্ট ডিভাইস এ সংযোগ ব্যর্থ হয়েছে",
    SESSION_FAILED: "কাস্ট সেশন তৈরি করতে ব্যর্থ হয়েছে",
    MEDIA_LOAD_FAILED: "মিডিয়া লোড ব্যর্থ হয়েছে",
    DISCONNECT_FAILED: "সংযোগ বিচ্ছিন্ন করতে ব্যর্থ হয়েছে",
    TIMEOUT: "সংযোগ সময়সীমা শেষ হয়েছে",
  },

  // Network errors
  NETWORK: {
    OFFLINE: "ইন্টারনেট সংযোগ নেই",
    TIMEOUT: "নেটওয়ার্ক টাইমআউট",
    SERVER_ERROR: "সার্ভার ত্রুটি",
    REQUEST_FAILED: "রিকুয়েস্ট ব্যর্থ হয়েছে",
  },

  // Validation errors
  VALIDATION: {
    REQUIRED_FIELD: "এই ফিল্ডটি আবশ্যক",
    INVALID_EMAIL: "ইমেইল ঠিকানা সঠিক নয়",
    INVALID_PHONE: "ফোন নম্বর সঠিক নয়",
    INVALID_NAME: "নাম সঠিক নয়",
    INVALID_NUMBER: "সংখ্যা সঠিক নয়",
    MIN_LENGTH: (min: number) => `কমপক্ষে ${min} অক্ষর হতে হবে`,
    MAX_LENGTH: (max: number) => `সর্বোচ্চ ${max} অক্ষর হতে পারবে`,
  },

  // Generic errors
  GENERIC: {
    UNKNOWN_ERROR: "একটি অজানা ত্রুটি ঘটেছে",
    TRY_AGAIN: "আবার চেষ্টা করুন",
    CONTACT_SUPPORT: "সমস্যা থাকলে সাপোর্টে যোগাযোগ করুন",
  },
};

export default ERROR_MESSAGES;
