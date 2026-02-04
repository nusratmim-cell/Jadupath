// Training types - separated to avoid circular dependencies

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
}

export interface TrainingTopic {
  id: string;
  name: string;
  duration: string;
  description?: string;
  displayOrder?: number;
  images?: string[];  // Array of image paths for shikkhok shohayika
  pdfUrl?: string;
  pdfStartPage?: number;
  videoUrl?: string | null;  // YouTube embed URL
  video?: {
    url: string;
    duration: string;
  };
  quiz?: QuizQuestion[];
}

export interface TrainingChapter {
  id: string;
  name: string;
  displayOrder?: number;
  topics: TrainingTopic[];
}

export interface TrainingCourse {
  id: string;
  name: string;
  description?: string;
  icon: string;
  color: string;
  chapters: TrainingChapter[];
}

export interface TeacherTrainingProgress {
  teacherId: string;
  courseId: string;
  chapterId: string;
  topicId: string;
  completed: boolean;
  quizScore?: number;
  completedAt?: string;
  attempts: number;
}
