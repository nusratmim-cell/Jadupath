/**
 * @file validation.ts
 * @description Centralized validation functions with enhanced security
 */

import { ERROR_MESSAGES } from "./errorMessages";

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

/**
 * Validate Bangladesh phone number with enhanced checks
 */
export const isValidBangladeshPhone = (phone: string): boolean => {
  if (!phone || typeof phone !== 'string') return false;

  // Remove spaces and dashes
  const cleaned = phone.replace(/[\s-]/g, '');

  // Bangladesh phone: 01XXXXXXXXX (11 digits starting with 01)
  const phoneRegex = /^01[0-9]{9}$/;
  if (!phoneRegex.test(cleaned)) return false;

  // Check for invalid patterns
  const invalidPatterns = [
    /^01([0-9])\1{8}$/, // All same digits (e.g., 01111111111)
    /^01234567890?$/, // Sequential
    /^01000000000$/, // All zeros
  ];

  for (const pattern of invalidPatterns) {
    if (pattern.test(cleaned)) return false;
  }

  // Check for known operator prefixes (Bangladesh)
  const validPrefixes = ['013', '014', '015', '016', '017', '018', '019'];
  const prefix = cleaned.substring(0, 3);

  return validPrefixes.includes(prefix);
};

/**
 * Validate roll number
 */
export const isValidRollNumber = (roll: string | number): boolean => {
  if (roll === undefined || roll === null || roll === '') return false;

  const rollStr = String(roll).trim();
  const rollNum = parseInt(rollStr, 10);

  // Roll number should be a positive integer between 1 and 999
  return !isNaN(rollNum) && rollNum > 0 && rollNum < 1000;
};

/**
 * Validate password strength
 */
export const isValidPassword = (password: string): { valid: boolean; message?: string } => {
  if (!password || typeof password !== 'string') {
    return { valid: false, message: ERROR_MESSAGES.VALIDATION.REQUIRED_FIELD };
  }

  if (password.length < 6) {
    return { valid: false, message: ERROR_MESSAGES.AUTH.WEAK_PASSWORD };
  }

  // For production, consider adding more strength requirements:
  // - At least one uppercase letter
  // - At least one number
  // - At least one special character

  return { valid: true };
};

/**
 * Sanitize user input to prevent XSS
 */
export const sanitizeInput = (input: string): string => {
  if (typeof input !== 'string') return '';

  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Safe JSON parse with fallback
 */
export const safeJSONParse = <T>(jsonString: string | null, fallback: T): T => {
  if (!jsonString) return fallback;

  try {
    return JSON.parse(jsonString) as T;
  } catch (error) {
    console.error('Failed to parse JSON:', error);
    return fallback;
  }
};

/**
 * Validate and sanitize name
 */
export const isValidName = (name: string): boolean => {
  if (!name || typeof name !== 'string') return false;

  const trimmed = name.trim();

  // Name should be between 2 and 100 characters
  if (trimmed.length < 2 || trimmed.length > 100) return false;

  // Name should not contain special characters except spaces, dots, and Bengali characters
  // Allow English letters, Bengali characters, spaces, dots, and hyphens
  const nameRegex = /^[a-zA-Z\u0980-\u09FF\s.\-]+$/;

  return nameRegex.test(trimmed);
};

/**
 * Validate file size
 */
export const isValidFileSize = (file: File, maxSizeMB: number = 5): boolean => {
  const maxBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxBytes;
};

/**
 * Validate image file type
 */
export const isValidImageType = (file: File): boolean => {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  return validTypes.includes(file.type);
};

/**
 * Validate Excel/CSV file type
 */
export const isValidSpreadsheetType = (file: File): boolean => {
  const validTypes = [
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
  ];
  return validTypes.includes(file.type) || file.name.endsWith('.csv') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
};

/**
 * Check if roll number is unique in a list
 */
export const isUniqueRollNumber = (
  rollNumber: string,
  students: Array<{ rollNumber: string }>,
  excludeId?: string
): boolean => {
  return !students.some(
    (s) => s.rollNumber === rollNumber && (!excludeId || (s as any).id !== excludeId)
  );
};

/**
 * Generate next available roll number
 */
export const getNextRollNumber = (students: Array<{ rollNumber: string }>): string => {
  if (!students || students.length === 0) return '1';

  // Get all numeric roll numbers
  const rollNumbers = students
    .map((s) => parseInt(s.rollNumber, 10))
    .filter((n) => !isNaN(n));

  if (rollNumbers.length === 0) return '1';

  // Find the maximum and add 1
  const maxRoll = Math.max(...rollNumbers);
  return String(maxRoll + 1);
};

/**
 * Validate localStorage data with schema version
 */
export interface StorageSchema {
  version: number;
  data: any;
}

export const validateStorageSchema = (data: any, expectedVersion: number): boolean => {
  if (!data) return false;

  // If data doesn't have version, it's legacy format
  if (!data.version) {
    // For backward compatibility, accept legacy format
    return true;
  }

  return data.version === expectedVersion;
};

/**
 * Create versioned storage wrapper
 */
export const createVersionedStorage = (data: any, version: number = 1): StorageSchema => {
  return {
    version,
    data,
  };
};
