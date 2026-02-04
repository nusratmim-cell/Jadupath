/**
 * @file crypto.ts
 * @description Cryptographic utilities for secure data handling
 */

/**
 * Generate a cryptographically secure unique ID
 */
export const generateSecureId = (): string => {
  // Use crypto.randomUUID if available (modern browsers)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback: Use crypto.getRandomValues
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  // Last resort fallback (should not happen in modern browsers)
  console.warn('crypto API not available, using timestamp-based ID');
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
};

/**
 * Generate a random salt for password hashing
 */
const generateSalt = (): string => {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

/**
 * Secure password hashing using PBKDF2 with unique salt per user
 * Format: salt:hash
 */
export const hashPassword = async (password: string, providedSalt?: string): Promise<string> => {
  if (!password || typeof password !== 'string') {
    throw new Error('Password must be a non-empty string');
  }

  if (typeof crypto === 'undefined' || !crypto.subtle) {
    throw new Error('Web Crypto API not available - secure password hashing not possible');
  }

  // Generate or use provided salt
  const salt = providedSalt || generateSalt();

  // Convert password and salt to buffers
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);
  const saltBuffer = encoder.encode(salt);

  // Import password as key
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  // Derive bits using PBKDF2
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: 100000, // 100k iterations for security
      hash: 'SHA-256'
    },
    keyMaterial,
    256 // 256-bit key
  );

  // Convert to hex
  const hashArray = Array.from(new Uint8Array(derivedBits));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  // Return salt:hash format
  return `${salt}:${hashHex}`;
};

/**
 * Verify password against hash
 * Supports both new format (salt:hash) and legacy SHA-256 format
 */
export const verifyPassword = async (password: string, storedHash: string): Promise<boolean> => {
  if (!password || !storedHash) return false;

  // Check if it's new format (contains colon)
  if (storedHash.includes(':')) {
    // Extract salt from stored hash
    const [salt] = storedHash.split(':');
    // Hash password with the same salt
    const passwordHash = await hashPassword(password, salt);
    return passwordHash === storedHash;
  }

  // Legacy format - SHA-256 with hardcoded salt (for backward compatibility)
  // This code will be removed after all users migrate
  const legacySalt = 'shikho_teacher_portal_salt_v1';
  const textToHash = legacySalt + password;

  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(textToHash);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex === storedHash;
  }

  return false;
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
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate phone number (Bangladesh format)
 * @deprecated Use isValidBangladeshPhone from validation.ts instead
 */
export const isValidBangladeshPhone = (phone: string): boolean => {
  // Bangladesh phone: 01XXXXXXXXX (11 digits starting with 01)
  const phoneRegex = /^01[0-9]{9}$/;
  return phoneRegex.test(phone.replace(/[\s-]/g, ''));
};
