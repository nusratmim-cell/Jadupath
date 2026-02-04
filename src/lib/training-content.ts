// Training content data - Auto-generated from folder_id_mapping.json
// This file contains all 6 training modules with 177 topics

import type { TrainingCourse } from './training-types';

// Import the JSON data
import allModulesData from '../../content/training/modules/all-modules.json';

// Type assertion and export
export const ALL_TRAINING_MODULES: TrainingCourse[] = allModulesData as TrainingCourse[];

// Export individual modules for direct access
export const M01_LEADERSHIP = ALL_TRAINING_MODULES.find(m => m.id === 'm01-leadership')!;
export const M02_PROFESSIONALISM = ALL_TRAINING_MODULES.find(m => m.id === 'm02-professionalism')!;
export const M03_STUDENT_DEVELOPMENT = ALL_TRAINING_MODULES.find(m => m.id === 'm03-student-development')!;
export const M04_CURRICULUM = ALL_TRAINING_MODULES.find(m => m.id === 'm04-curriculum')!;
export const M05_BANGLA = ALL_TRAINING_MODULES.find(m => m.id === 'm05-bangla')!;
export const M06_ENGLISH = ALL_TRAINING_MODULES.find(m => m.id === 'm06-english')!;

// Helper function to get a course by ID
export function getTrainingCourse(courseId: string): TrainingCourse | undefined {
  return ALL_TRAINING_MODULES.find(m => m.id === courseId);
}

// Helper function to get chapter by course and chapter ID
export function getTrainingChapter(courseId: string, chapterId: string) {
  const course = getTrainingCourse(courseId);
  return course?.chapters.find(ch => ch.id === chapterId);
}

// Helper function to get topic by course, chapter and topic ID
export function getTrainingTopic(courseId: string, chapterId: string, topicId: string) {
  const chapter = getTrainingChapter(courseId, chapterId);
  return chapter?.topics.find(t => t.id === topicId);
}
