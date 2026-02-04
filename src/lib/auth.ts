/**
 * @file auth.ts
 * @description Authentication and user management module
 *
 * This file handles:
 * - User authentication (login/logout)
 * - User session management
 * - Teacher profile CRUD
 * - Student management per class
 *
 * Data Storage: localStorage (demo purposes)
 * In production: Replace with API calls to backend
 *
 * Key Functions:
 * - loginWithPhone(phone, pin) - Authenticate user
 * - getCurrentUser() - Get logged-in user
 * - getProfileByUserId(id) - Get teacher profile
 * - getStudentsForClass(userId, classId) - Get students
 * - addMultipleStudents(userId, classId, students) - Add students
 *
 * @see ARCHITECTURE.md for usage details
 */

// ==================== TYPES ====================

export interface User {
  id: string;
  name: string;
  email: string;
  password: string; // Hashed password using PBKDF2 (salt:hash format)
  teachingType: "primary" | "secondary";
  createdAt: string;
  onboardingCompleted: boolean;
  studentListingCompleted: boolean;
  isNewUser: boolean; // Track if user just registered
}

// Session user (stored in localStorage) - WITHOUT password for security
export interface SessionUser {
  id: string;
  name: string;
  email: string;
  teachingType: "primary" | "secondary";
  onboardingCompleted: boolean;
  studentListingCompleted: boolean;
  isNewUser: boolean;
}

export interface TeacherProfile {
  userId: string;
  name: string;
  email: string;
  phone?: string;
  profilePicture?: string; // Base64 string
  schoolName: string;
  district?: string;
  classes: string[];
  subjects: string[];
  teachingExperience?: string;
  quizDisplayMax?: 5 | 10 | 20; // Quiz marks display configuration (out of 5, 10, or 20)
  updatedAt: string;
}

export interface Student {
  id: string;
  name: string;
  rollNumber: string;
  guardianName?: string;
  guardianPhone?: string;
  contactNumber?: string;
  guardianContact?: string;
  classId: string;
  teacherId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClassStudents {
  classId: string;
  teacherId: string;
  students: Student[];
}

// Storage keys
const USERS_KEY = "shikho_teachers_users";
const CURRENT_USER_KEY = "shikho_current_user";
const PROFILES_KEY = "shikho_teacher_profiles";
const STUDENTS_KEY = "shikho_class_students";

import { generateSecureId, hashPassword, verifyPassword } from "./crypto";
import { safeJSONParse } from "./validation";
import { logger } from "./logger";
import ERROR_MESSAGES from "./errorMessages";

// Helper to generate unique ID (now uses crypto-secure method)
export const generateId = (): string => {
  return generateSecureId();
};

// Get all users from localStorage
export const getUsers = (): User[] => {
  if (typeof window === "undefined") return [];
  const users = localStorage.getItem(USERS_KEY);
  return safeJSONParse<User[]>(users, []);
};

// Save users to localStorage
const saveUsers = (users: User[]): void => {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

// Register a new user
export const registerUser = async (
  name: string,
  email: string,
  password: string,
  teachingType: "primary" | "secondary"
): Promise<{ success: boolean; message: string; user?: User }> => {
  const users = getUsers();

  // Check if email already exists
  const existingUser = users.find(
    (u) => u.email.toLowerCase() === email.toLowerCase()
  );
  if (existingUser) {
    return { success: false, message: "এই ইমেইল দিয়ে আগেই রেজিস্ট্রেশন করা হয়েছে" };
  }

  // Hash password before storing
  const hashedPassword = await hashPassword(password);

  // Create new user
  const newUser: User = {
    id: generateId(),
    name,
    email: email.toLowerCase(),
    password: hashedPassword,
    teachingType,
    createdAt: new Date().toISOString(),
    onboardingCompleted: false,
    studentListingCompleted: false,
    isNewUser: true,
  };

  users.push(newUser);
  saveUsers(users);

  // Set as current user
  setCurrentUser(newUser);

  return { success: true, message: "রেজিস্ট্রেশন সফল হয়েছে!", user: newUser };
};

// Login user
export const loginUser = async (
  email: string,
  password: string
): Promise<{ success: boolean; message: string; user?: User }> => {
  const users = getUsers();

  // Find user by email
  const user = users.find(
    (u) => u.email.toLowerCase() === email.toLowerCase()
  );

  if (!user) {
    return { success: false, message: "ইমেইল বা পাসওয়ার্ড ভুল হয়েছে" };
  }

  // Verify password and migrate legacy formats if needed
  let isPasswordValid = false;

  try {
    // Try to verify with new or legacy hash format
    isPasswordValid = await verifyPassword(password, user.password);

    // If valid and using legacy format, migrate to new format
    if (isPasswordValid && !user.password.includes(':')) {
      // Legacy format detected, migrate to new PBKDF2 format
      const hashedPassword = await hashPassword(password);
      const userIndex = users.findIndex(u => u.id === user.id);
      if (userIndex !== -1) {
        users[userIndex].password = hashedPassword;
        saveUsers(users);
        user.password = hashedPassword; // Update the user object too
      }
    }
  } catch (error) {
    // If hashing fails, check plaintext as last resort (for very old accounts)
    isPasswordValid = user.password === password;

    // If plaintext matches, migrate to new hashed password
    if (isPasswordValid) {
      const hashedPassword = await hashPassword(password);
      const userIndex = users.findIndex(u => u.id === user.id);
      if (userIndex !== -1) {
        users[userIndex].password = hashedPassword;
        saveUsers(users);
        user.password = hashedPassword;
      }
    }
  }

  if (!isPasswordValid) {
    return { success: false, message: "ইমেইল বা পাসওয়ার্ড ভুল হয়েছে" };
  }

  setCurrentUser(user);
  return { success: true, message: "লগইন সফল হয়েছে!", user };
};

// Set current logged in user (WITHOUT password for security)
export const setCurrentUser = (user: User | null): void => {
  if (user) {
    // Store session without password hash
    const sessionUser: SessionUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      teachingType: user.teachingType,
      onboardingCompleted: user.onboardingCompleted,
      studentListingCompleted: user.studentListingCompleted,
      isNewUser: user.isNewUser,
    };
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(sessionUser));
  } else {
    localStorage.removeItem(CURRENT_USER_KEY);
  }
};

// Get current logged in user (returns SessionUser, not full User with password)
export const getCurrentUser = (): SessionUser | null => {
  if (typeof window === "undefined") return null;
  const user = localStorage.getItem(CURRENT_USER_KEY);
  return safeJSONParse<SessionUser | null>(user, null);
};

// Get full user data (with password) - USE SPARINGLY, only for auth operations
export const getUserById = (userId: string): User | null => {
  const users = getUsers();
  return users.find((u) => u.id === userId) || null;
};

// Logout user
export const logoutUser = (): void => {
  localStorage.removeItem(CURRENT_USER_KEY);
};

// Update user's onboarding status
export const completeOnboarding = (userId: string): void => {
  const users = getUsers();
  const userIndex = users.findIndex((u) => u.id === userId);

  if (userIndex !== -1) {
    users[userIndex].onboardingCompleted = true;
    saveUsers(users);

    // Update current user session
    const currentUser = getCurrentUser();
    if (currentUser && currentUser.id === userId) {
      const sessionUser: SessionUser = {
        ...currentUser,
        onboardingCompleted: true,
      };
      setCurrentUser(users[userIndex]); // Pass full user, setCurrentUser will extract session data
    }
  }
};

// Update user's student listing status
export const completeStudentListing = (userId: string): void => {
  const users = getUsers();
  const userIndex = users.findIndex((u) => u.id === userId);

  if (userIndex !== -1) {
    users[userIndex].studentListingCompleted = true;
    users[userIndex].isNewUser = false;
    saveUsers(users);

    // Update current user session
    const currentUser = getCurrentUser();
    if (currentUser && currentUser.id === userId) {
      setCurrentUser(users[userIndex]); // Pass full user, setCurrentUser will extract session data
    }
  }
};

// Skip student listing (mark as not new user but not completed)
export const skipStudentListing = (userId: string): void => {
  const users = getUsers();
  const userIndex = users.findIndex((u) => u.id === userId);

  if (userIndex !== -1) {
    users[userIndex].isNewUser = false;
    saveUsers(users);

    // Update current user session
    const currentUser = getCurrentUser();
    if (currentUser && currentUser.id === userId) {
      setCurrentUser(users[userIndex]); // Pass full user, setCurrentUser will extract session data
    }
  }
};

// Update user name
export const updateUserName = (userId: string, newName: string): void => {
  const users = getUsers();
  const userIndex = users.findIndex((u) => u.id === userId);

  if (userIndex !== -1) {
    users[userIndex].name = newName;
    saveUsers(users);

    // Update current user session
    const currentUser = getCurrentUser();
    if (currentUser && currentUser.id === userId) {
      setCurrentUser(users[userIndex]); // Pass full user, setCurrentUser will extract session data
    }
  }
};

// Save teacher profile
export const saveTeacherProfile = (profile: TeacherProfile): void => {
  const profiles = getProfiles();
  const existingIndex = profiles.findIndex((p) => p.userId === profile.userId);

  if (existingIndex !== -1) {
    profiles[existingIndex] = profile;
  } else {
    profiles.push(profile);
  }

  localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
};

// Get all profiles
export const getProfiles = (): TeacherProfile[] => {
  if (typeof window === "undefined") return [];
  const profiles = localStorage.getItem(PROFILES_KEY);
  return safeJSONParse<TeacherProfile[]>(profiles, []);
};

// Get profile by user ID
export const getProfileByUserId = (userId: string): TeacherProfile | null => {
  const profiles = getProfiles();
  return profiles.find((p) => p.userId === userId) || null;
};

// Check if user exists by email (for forgot password)
export const checkUserExists = (email: string): boolean => {
  const users = getUsers();
  return users.some((u) => u.email.toLowerCase() === email.toLowerCase());
};

// Reset password (simplified - in real app, this would be email-based)
export const resetPassword = async (
  email: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> => {
  const users = getUsers();
  const userIndex = users.findIndex(
    (u) => u.email.toLowerCase() === email.toLowerCase()
  );

  if (userIndex === -1) {
    return { success: false, message: "এই ইমেইল দিয়ে কোনো অ্যাকাউন্ট নেই" };
  }

  // Hash the new password before storing
  const hashedPassword = await hashPassword(newPassword);
  users[userIndex].password = hashedPassword;
  saveUsers(users);

  return { success: true, message: "পাসওয়ার্ড পরিবর্তন হয়েছে!" };
};

// ============ Student Management Functions ============

// Get all class students data
export const getAllClassStudents = (): ClassStudents[] => {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(STUDENTS_KEY);
  return safeJSONParse<ClassStudents[]>(data, []);
};

// Save all class students data
const saveAllClassStudents = (data: ClassStudents[]): void => {
  localStorage.setItem(STUDENTS_KEY, JSON.stringify(data));
};

// Get students for a specific class and teacher
export const getStudentsForClass = (
  teacherId: string,
  classId: string
): Student[] => {
  const allData = getAllClassStudents();
  const classData = allData.find(
    (d) => d.teacherId === teacherId && d.classId === classId
  );
  return classData ? classData.students : [];
};

// Get all students for a teacher
export const getAllStudentsForTeacher = (teacherId: string): ClassStudents[] => {
  const allData = getAllClassStudents();
  return allData.filter((d) => d.teacherId === teacherId);
};

// Save students for a specific class
export const saveStudentsForClass = (
  teacherId: string,
  classId: string,
  students: Student[]
): void => {
  const allData = getAllClassStudents();
  const existingIndex = allData.findIndex(
    (d) => d.teacherId === teacherId && d.classId === classId
  );

  if (existingIndex !== -1) {
    allData[existingIndex].students = students;
  } else {
    allData.push({
      classId,
      teacherId,
      students,
    });
  }

  saveAllClassStudents(allData);
};

// Add a single student to a class
export const addStudent = (
  teacherId: string,
  classId: string,
  studentData: Omit<Student, "id" | "classId" | "teacherId" | "createdAt" | "updatedAt">
): Student => {
  const students = getStudentsForClass(teacherId, classId);
  const newStudent: Student = {
    ...studentData,
    id: generateId(),
    classId,
    teacherId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  students.push(newStudent);
  saveStudentsForClass(teacherId, classId, students);
  return newStudent;
};

// Update a student
export const updateStudent = (
  teacherId: string,
  classId: string,
  studentId: string,
  updates: Partial<Omit<Student, "id" | "classId" | "teacherId" | "createdAt">>
): void => {
  const students = getStudentsForClass(teacherId, classId);
  const studentIndex = students.findIndex((s) => s.id === studentId);

  if (studentIndex !== -1) {
    students[studentIndex] = {
      ...students[studentIndex],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    saveStudentsForClass(teacherId, classId, students);
  }
};

// Delete a student
export const deleteStudent = (
  teacherId: string,
  classId: string,
  studentId: string
): void => {
  const students = getStudentsForClass(teacherId, classId);
  const filteredStudents = students.filter((s) => s.id !== studentId);
  saveStudentsForClass(teacherId, classId, filteredStudents);
};

// Add multiple students at once (for bulk import)
export const addMultipleStudents = (
  teacherId: string,
  classId: string,
  studentsData: Array<Omit<Student, "id" | "classId" | "teacherId" | "createdAt" | "updatedAt">>
): Student[] => {
  const existingStudents = getStudentsForClass(teacherId, classId);
  const newStudents: Student[] = studentsData.map((data) => ({
    ...data,
    id: generateId(),
    classId,
    teacherId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));

  const allStudents = [...existingStudents, ...newStudents];
  saveStudentsForClass(teacherId, classId, allStudents);
  return newStudents;
};

// Get total student count for a teacher
export const getTotalStudentCount = (teacherId: string): number => {
  const allData = getAllStudentsForTeacher(teacherId);
  return allData.reduce((total, classData) => total + classData.students.length, 0);
};
