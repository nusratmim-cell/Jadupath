/**
 * Helper utilities for Khata OCR feature
 * Handles Bengali numeral conversion, data validation, fuzzy matching, and deduplication
 */

export interface ExtractedMark {
  rollNumber: string;
  name: string;
  totalMarks: number;
  confidence?: "high" | "medium" | "low";
}

export interface MatchedMark extends ExtractedMark {
  studentId?: string;
  matchedStudent?: {
    id: string;
    name: string;
    rollNumber: string;
  };
  matchStatus: "found" | "new" | "error";
  matchConfidence?: number;
  validationErrors?: string[];
}

/**
 * Convert Bengali numerals to English numerals
 * Example: "০১২৩" → "0123"
 */
export function convertBengaliToEnglish(text: string): string {
  const bengaliNumerals = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
  const englishNumerals = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

  return text
    .split("")
    .map((char) => {
      const index = bengaliNumerals.indexOf(char);
      return index !== -1 ? englishNumerals[index] : char;
    })
    .join("");
}

/**
 * Format roll number to 2-digit format
 * Example: "1" → "01", "০১" → "01"
 */
export function formatRollNumber(roll: string): string {
  // Convert Bengali to English first
  const englishRoll = convertBengaliToEnglish(roll);

  // Extract only numbers
  const numbersOnly = englishRoll.replace(/\D/g, "");

  // Pad with leading zero if needed
  return numbersOnly.padStart(2, "0");
}

/**
 * Validate roll number format
 * Must be 2-digit format between 01-99
 */
export function validateRollNumber(roll: string): {
  valid: boolean;
  error?: string;
} {
  const formatted = formatRollNumber(roll);

  if (formatted.length !== 2) {
    return { valid: false, error: "রোল নম্বর ২ সংখ্যার হতে হবে" };
  }

  const num = parseInt(formatted);
  if (isNaN(num) || num < 1 || num > 99) {
    return { valid: false, error: "রোল নম্বর ০১-৯৯ এর মধ্যে হতে হবে" };
  }

  return { valid: true };
}

/**
 * Validate student name
 * Must have at least 2 characters
 */
export function validateStudentName(name: string): {
  valid: boolean;
  error?: string;
} {
  const trimmed = name.trim();

  if (trimmed.length < 2) {
    return { valid: false, error: "নাম কমপক্ষে ২ অক্ষরের হতে হবে" };
  }

  return { valid: true };
}

/**
 * Validate marks value
 * Must be between 0-100
 */
export function validateMarks(marks: number): {
  valid: boolean;
  error?: string;
} {
  if (isNaN(marks)) {
    return { valid: false, error: "নম্বর একটি সংখ্যা হতে হবে" };
  }

  if (marks < 0 || marks > 100) {
    return { valid: false, error: "নম্বর ০-১০০ এর মধ্যে হতে হবে" };
  }

  return { valid: true };
}

/**
 * Calculate Levenshtein distance between two strings
 * Used for fuzzy name matching
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];

  // Initialize matrix
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[len1][len2];
}

/**
 * Calculate similarity between two strings (0-1 scale)
 */
function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) {
    return 1.0;
  }

  const distance = levenshteinDistance(
    longer.toLowerCase(),
    shorter.toLowerCase()
  );
  return (longer.length - distance) / longer.length;
}

/**
 * Find fuzzy name match among existing students
 * Returns student with highest similarity score above threshold
 */
export function findFuzzyNameMatch(
  name: string,
  existingStudents: Array<{ id: string; name: string; rollNumber: string }>,
  threshold: number = 0.8
): { student: any; confidence: number } | null {
  let bestMatch: { student: any; confidence: number } | null = null;

  for (const student of existingStudents) {
    const similarity = calculateSimilarity(name, student.name);

    if (similarity >= threshold) {
      if (!bestMatch || similarity > bestMatch.confidence) {
        bestMatch = { student, confidence: similarity };
      }
    }
  }

  return bestMatch;
}

/**
 * Match extracted students with existing students in the system
 */
export function matchExtractedStudents(
  extractedData: ExtractedMark[],
  existingStudents: Array<{ id: string; name: string; rollNumber: string }>
): MatchedMark[] {
  return extractedData.map((extracted) => {
    const validationErrors: string[] = [];

    // Validate data
    const rollValidation = validateRollNumber(extracted.rollNumber);
    if (!rollValidation.valid) {
      validationErrors.push(rollValidation.error!);
    }

    const nameValidation = validateStudentName(extracted.name);
    if (!nameValidation.valid) {
      validationErrors.push(nameValidation.error!);
    }

    const marksValidation = validateMarks(extracted.totalMarks);
    if (!marksValidation.valid) {
      validationErrors.push(marksValidation.error!);
    }

    // If validation failed, mark as error
    if (validationErrors.length > 0) {
      return {
        ...extracted,
        rollNumber: formatRollNumber(extracted.rollNumber),
        matchStatus: "error" as const,
        validationErrors,
      };
    }

    // Format roll number
    const formattedRoll = formatRollNumber(extracted.rollNumber);

    // Try exact roll number match first
    let match = existingStudents.find((s) => s.rollNumber === formattedRoll);
    let matchConfidence = 1.0;

    // If no exact match, try fuzzy name matching
    if (!match) {
      const fuzzyMatch = findFuzzyNameMatch(extracted.name, existingStudents);
      if (fuzzyMatch) {
        match = fuzzyMatch.student;
        matchConfidence = fuzzyMatch.confidence;
      }
    }

    return {
      ...extracted,
      rollNumber: formattedRoll,
      studentId: match?.id,
      matchedStudent: match,
      matchStatus: match ? ("found" as const) : ("new" as const),
      matchConfidence,
      validationErrors: [],
    };
  });
}

/**
 * Merge duplicate roll numbers from multiple images
 * Keeps the entry with highest marks for each roll number
 */
export function mergeDuplicateRollNumbers(
  extractedData: ExtractedMark[]
): { merged: ExtractedMark[]; warnings: string[] } {
  const rollNumberMap = new Map<string, ExtractedMark>();
  const warnings: string[] = [];

  for (const entry of extractedData) {
    const formattedRoll = formatRollNumber(entry.rollNumber);

    if (rollNumberMap.has(formattedRoll)) {
      const existing = rollNumberMap.get(formattedRoll)!;

      // Keep the one with higher marks
      if (entry.totalMarks > existing.totalMarks) {
        rollNumberMap.set(formattedRoll, {
          ...entry,
          rollNumber: formattedRoll,
        });
        warnings.push(
          `রোল ${formattedRoll} একাধিক ছবিতে পাওয়া গেছে। সর্বোচ্চ নম্বর (${entry.totalMarks}) রাখা হয়েছে।`
        );
      } else {
        warnings.push(
          `রোল ${formattedRoll} একাধিক ছবিতে পাওয়া গেছে। সর্বোচ্চ নম্বর (${existing.totalMarks}) রাখা হয়েছে।`
        );
      }
    } else {
      rollNumberMap.set(formattedRoll, {
        ...entry,
        rollNumber: formattedRoll,
      });
    }
  }

  return {
    merged: Array.from(rollNumberMap.values()),
    warnings,
  };
}

/**
 * Validate complete extracted data
 * Returns validation errors if any
 */
export function validateExtractedData(
  data: MatchedMark[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check for empty data
  if (data.length === 0) {
    errors.push("কোন তথ্য পাওয়া যায়নি");
    return { valid: false, errors };
  }

  // Check for duplicate roll numbers in final data
  const rollNumbers = data.map((d) => d.rollNumber);
  const duplicates = rollNumbers.filter(
    (roll, index) => rollNumbers.indexOf(roll) !== index
  );

  if (duplicates.length > 0) {
    const uniqueDuplicates = [...new Set(duplicates)];
    uniqueDuplicates.forEach((roll) => {
      errors.push(`রোল নম্বর ${roll} একাধিকবার আছে`);
    });
  }

  // Check for validation errors in individual entries
  const entriesWithErrors = data.filter(
    (d) => d.validationErrors && d.validationErrors.length > 0
  );

  if (entriesWithErrors.length > 0) {
    errors.push(
      `${entriesWithErrors.length} টি সারিতে ত্রুটি আছে। সংশোধন করুন।`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get summary statistics for matched data
 */
export function getSummaryStats(data: MatchedMark[]): {
  total: number;
  matched: number;
  new: number;
  errors: number;
} {
  return {
    total: data.length,
    matched: data.filter((d) => d.matchStatus === "found").length,
    new: data.filter((d) => d.matchStatus === "new").length,
    errors: data.filter((d) => d.matchStatus === "error").length,
  };
}
