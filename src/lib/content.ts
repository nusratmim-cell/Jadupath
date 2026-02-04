/**
 * @file content.ts
 * @description Functions to fetch educational content and training data from Supabase
 */

import { supabase } from './supabase';
import { logger } from './logger';
import type { Chapter, Topic, TrainingCourse, TrainingChapter, TrainingTopic } from './data';

// Cache for frequently accessed data
const chaptersCache = new Map<string, { data: Chapter[]; timestamp: number }>();
const trainingCache = new Map<string, { data: TrainingCourse[]; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch chapters and topics for a specific class and subject from Supabase
 */
export async function getChaptersForClassAndSubject(
  classId: string,
  subjectId: string
): Promise<Chapter[]> {
  try {
    logger.info(`Fetching chapters for class ${classId}, subject ${subjectId}`);

    const { data: chaptersData, error } = await supabase
      .from('chapters')
      .select(`
        id,
        name,
        display_order,
        topics (
          id,
          name,
          description,
          display_order,
          pdf_start_page,
          pdf_end_page,
          nctb_book_title,
          nctb_book_pdf_url,
          nctb_book_total_pages,
          video_title,
          video_url,
          video_duration,
          video_thumbnail_url
        )
      `)
      .eq('class_id', classId)
      .eq('subject_id', subjectId)
      .order('display_order', { ascending: true });

    if (error) {
      logger.error('Error fetching chapters:', error);
      throw new Error(`Failed to fetch chapters: ${error.message}`);
    }

    if (!chaptersData || chaptersData.length === 0) {
      logger.warn(`No chapters found for class ${classId}, subject ${subjectId}`);
      return [];
    }

    // Transform database format to application format
    const chapters: Chapter[] = chaptersData.map((ch: any) => ({
      id: ch.id,
      name: ch.name,
      topics: (ch.topics || [])
        .map((t: any) => ({
          id: t.id,
          name: t.name,
          description: t.description || undefined,
          pdfStartPage: t.pdf_start_page || undefined,
          pdfEndPage: t.pdf_end_page || undefined,
          nctbBook: t.nctb_book_title ? {
            title: t.nctb_book_title,
            pdfUrl: t.nctb_book_pdf_url || '',
            pages: t.nctb_book_total_pages || 0
          } : undefined,
          video: t.video_url ? {
            title: t.video_title || '',
            url: t.video_url,
            duration: t.video_duration || '',
            thumbnail: t.video_thumbnail_url || undefined
          } : undefined
        }))
        .sort((a: any, b: any) => {
          const aOrder = chaptersData.find((ch: any) =>
            ch.topics?.some((topic: any) => topic.id === a.id)
          )?.topics?.find((topic: any) => topic.id === a.id)?.display_order || 0;

          const bOrder = chaptersData.find((ch: any) =>
            ch.topics?.some((topic: any) => topic.id === b.id)
          )?.topics?.find((topic: any) => topic.id === b.id)?.display_order || 0;

          return aOrder - bOrder;
        })
    }));

    logger.info(`Successfully fetched ${chapters.length} chapters with topics`);
    return chapters;

  } catch (error: any) {
    logger.error('Error in getChaptersForClassAndSubject:', error);
    return []; // Return empty array instead of throwing to prevent app crashes
  }
}

/**
 * Fetch chapters with caching
 */
export async function getCachedChapters(
  classId: string,
  subjectId: string
): Promise<Chapter[]> {
  const key = `${classId}-${subjectId}`;
  const cached = chaptersCache.get(key);

  // Return cached data if fresh
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    logger.info(`Using cached chapters for ${key}`);
    return cached.data;
  }

  // Fetch fresh data
  const data = await getChaptersForClassAndSubject(classId, subjectId);

  // Update cache
  chaptersCache.set(key, { data, timestamp: Date.now() });

  return data;
}

/**
 * Fetch all training courses from Supabase
 */
export async function getAllTrainingCourses(): Promise<TrainingCourse[]> {
  try {
    logger.info('Fetching all training courses');

    const { data, error } = await supabase
      .from('training_courses')
      .select(`
        id,
        name,
        description,
        icon,
        color,
        training_chapters (
          id,
          name,
          display_order,
          training_topics (
            id,
            name,
            duration,
            description,
            display_order,
            pdf_url,
            pdf_start_page,
            video_url,
            video_duration,
            quiz_data
          )
        )
      `)
      .order('id', { ascending: true });

    if (error) {
      logger.error('Error fetching training courses:', error);
      throw new Error(`Failed to fetch training courses: ${error.message}`);
    }

    if (!data || data.length === 0) {
      logger.warn('No training courses found');
      return [];
    }

    // Transform database format to application format
    const courses: TrainingCourse[] = data.map((course: any) => ({
      id: course.id,
      name: course.name,
      description: course.description || undefined,
      icon: course.icon || '📚',
      color: course.color || 'from-gray-500 to-gray-600',
      chapters: (course.training_chapters || [])
        .map((ch: any) => ({
          id: ch.id,
          name: ch.name,
          topics: (ch.training_topics || [])
            .map((t: any) => ({
              id: t.id,
              name: t.name,
              duration: t.duration || '',
              description: t.description || undefined,
              pdfUrl: t.pdf_url || undefined,
              pdfStartPage: t.pdf_start_page || undefined,
              video: t.video_url ? {
                url: t.video_url,
                duration: t.video_duration || ''
              } : undefined,
              quiz: t.quiz_data ? (typeof t.quiz_data === 'string' ? JSON.parse(t.quiz_data) : t.quiz_data) : undefined
            }))
            .sort((a: any, b: any) => {
              const aOrder = ch.training_topics?.find((topic: any) => topic.id === a.id)?.display_order || 0;
              const bOrder = ch.training_topics?.find((topic: any) => topic.id === b.id)?.display_order || 0;
              return aOrder - bOrder;
            })
        }))
        .sort((a: any, b: any) => {
          const aOrder = course.training_chapters?.find((chapter: any) => chapter.id === a.id)?.display_order || 0;
          const bOrder = course.training_chapters?.find((chapter: any) => chapter.id === b.id)?.display_order || 0;
          return aOrder - bOrder;
        })
    }));

    logger.info(`Successfully fetched ${courses.length} training courses`);
    return courses;

  } catch (error: any) {
    logger.error('Error in getAllTrainingCourses:', error);
    return []; // Return empty array instead of throwing
  }
}

/**
 * Fetch training courses with caching
 */
export async function getCachedTrainingCourses(): Promise<TrainingCourse[]> {
  const key = 'all-training';
  const cached = trainingCache.get(key);

  // Return cached data if fresh
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    logger.info('Using cached training courses');
    return cached.data;
  }

  // Fetch fresh data
  const data = await getAllTrainingCourses();

  // Update cache
  trainingCache.set(key, { data, timestamp: Date.now() });

  return data;
}

/**
 * Fetch a single training course by ID
 */
export async function getTrainingCourseById(courseId: string): Promise<TrainingCourse | null> {
  try {
    const courses = await getCachedTrainingCourses();
    return courses.find(c => c.id === courseId) || null;
  } catch (error: any) {
    logger.error('Error in getTrainingCourseById:', error);
    return null;
  }
}

/**
 * Fetch a specific topic from a chapter
 */
export async function getTopicById(
  classId: string,
  subjectId: string,
  chapterId: string,
  topicId: string
): Promise<Topic | null> {
  try {
    const chapters = await getCachedChapters(classId, subjectId);
    const chapter = chapters.find(ch => ch.id === chapterId);

    if (!chapter) return null;

    return chapter.topics.find(t => t.id === topicId) || null;
  } catch (error: any) {
    logger.error('Error in getTopicById:', error);
    return null;
  }
}

/**
 * Clear all content caches (useful after data updates)
 */
export function clearContentCache(): void {
  chaptersCache.clear();
  trainingCache.clear();
  logger.info('Content cache cleared');
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  return {
    chaptersCount: chaptersCache.size,
    trainingCount: trainingCache.size,
    cacheTTL: CACHE_TTL
  };
}
