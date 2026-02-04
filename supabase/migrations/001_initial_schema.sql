-- ============================================================================
-- Teacher Portal Database Schema
-- Version: 1.0
-- Description: Complete database schema for Bangladesh Teacher Portal
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- CONTENT TABLES (Educational Material)
-- ============================================================================

-- Subjects table
CREATE TABLE IF NOT EXISTS subjects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  bg_color TEXT NOT NULL,
  text_color TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE subjects IS 'Academic subjects (bangla, english, math, science, bangladesh)';

-- Chapters table
CREATE TABLE IF NOT EXISTS chapters (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL,
  subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chapters_class_subject ON chapters(class_id, subject_id);
CREATE INDEX IF NOT EXISTS idx_chapters_order ON chapters(class_id, subject_id, display_order);

COMMENT ON TABLE chapters IS 'Textbook chapters organized by class and subject';

-- Topics table
CREATE TABLE IF NOT EXISTS topics (
  id TEXT PRIMARY KEY,
  chapter_id TEXT NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,

  -- Textbook reference
  pdf_start_page INTEGER,
  pdf_end_page INTEGER,
  nctb_book_title TEXT,
  nctb_book_pdf_url TEXT,
  nctb_book_total_pages INTEGER,

  -- Video reference
  video_title TEXT,
  video_url TEXT,
  video_duration TEXT,
  video_thumbnail_url TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_topics_chapter ON topics(chapter_id);
CREATE INDEX IF NOT EXISTS idx_topics_order ON topics(chapter_id, display_order);

COMMENT ON TABLE topics IS 'Individual topics within chapters with textbook pages and video links';

-- ============================================================================
-- TRAINING TABLES (Teacher Professional Development)
-- ============================================================================

-- Training courses table
CREATE TABLE IF NOT EXISTS training_courses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE training_courses IS 'Teacher training courses (professionalism, pedagogy, etc.)';

-- Training chapters table
CREATE TABLE IF NOT EXISTS training_chapters (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL REFERENCES training_courses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_training_chapters_course ON training_chapters(course_id);
CREATE INDEX IF NOT EXISTS idx_training_chapters_order ON training_chapters(course_id, display_order);

COMMENT ON TABLE training_chapters IS 'Chapters within training courses';

-- Training topics table
CREATE TABLE IF NOT EXISTS training_topics (
  id TEXT PRIMARY KEY,
  chapter_id TEXT NOT NULL REFERENCES training_chapters(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  duration TEXT NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,

  -- Content references
  pdf_url TEXT,
  pdf_start_page INTEGER,
  video_url TEXT,
  video_duration TEXT,
  quiz_data JSONB,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_training_topics_chapter ON training_topics(chapter_id);
CREATE INDEX IF NOT EXISTS idx_training_topics_order ON training_topics(chapter_id, display_order);

COMMENT ON TABLE training_topics IS 'Individual topics within training chapters';

-- ============================================================================
-- USER MANAGEMENT TABLES
-- ============================================================================

-- Users table (Authentication)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  teaching_type TEXT NOT NULL CHECK (teaching_type IN ('primary', 'secondary')),
  onboarding_completed BOOLEAN DEFAULT FALSE,
  student_listing_completed BOOLEAN DEFAULT FALSE,
  is_new_user BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

COMMENT ON TABLE users IS 'User authentication and basic profile';

-- Teacher profiles table
CREATE TABLE IF NOT EXISTS teacher_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  school_name TEXT,
  location TEXT,
  teaching_experience INTEGER,
  classes TEXT[] NOT NULL DEFAULT '{}',
  subjects TEXT[] NOT NULL DEFAULT '{}',
  phone_number TEXT,
  avatar_seed TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teacher_profiles_user ON teacher_profiles(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_teacher_profiles_unique_user ON teacher_profiles(user_id);

COMMENT ON TABLE teacher_profiles IS 'Extended teacher profile information';

-- ============================================================================
-- STUDENT MANAGEMENT TABLES
-- ============================================================================

-- Students table
CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  class_id TEXT NOT NULL,
  name TEXT NOT NULL,
  roll_number TEXT NOT NULL,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  guardian_name TEXT,
  guardian_phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_students_teacher_class ON students(teacher_id, class_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_students_unique_roll ON students(teacher_id, class_id, roll_number);

COMMENT ON TABLE students IS 'Student records organized by teacher and class';

-- Attendance table
CREATE TABLE IF NOT EXISTS attendance (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  class_id TEXT NOT NULL,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attendance_teacher_date ON attendance(teacher_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_class_date ON attendance(class_id, date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_unique ON attendance(student_id, date);

COMMENT ON TABLE attendance IS 'Daily student attendance records';

-- Student marks table
CREATE TABLE IF NOT EXISTS student_marks (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  teacher_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  marks NUMERIC NOT NULL CHECK (marks >= 0),
  total_marks NUMERIC NOT NULL CHECK (total_marks > 0),
  exam_type TEXT,
  date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_marks_student ON student_marks(student_id);
CREATE INDEX IF NOT EXISTS idx_student_marks_subject ON student_marks(student_id, subject_id);
CREATE INDEX IF NOT EXISTS idx_student_marks_date ON student_marks(date);

COMMENT ON TABLE student_marks IS 'Student examination marks and grades';

-- Quiz sessions table
CREATE TABLE IF NOT EXISTS quiz_sessions (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  class_id TEXT NOT NULL,
  quiz_id TEXT NOT NULL,
  date DATE NOT NULL,
  total_questions INTEGER NOT NULL CHECK (total_questions > 0),
  is_optional BOOLEAN DEFAULT FALSE,
  topic_name TEXT,
  chapter_name TEXT,
  responses JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quiz_sessions_teacher ON quiz_sessions(teacher_id, date);
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_class ON quiz_sessions(class_id, date);

COMMENT ON TABLE quiz_sessions IS 'Quiz session records with student responses';

-- ============================================================================
-- TEACHER TRAINING PROGRESS
-- ============================================================================

-- Teacher training progress table
CREATE TABLE IF NOT EXISTS teacher_training_progress (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL,
  chapter_id TEXT NOT NULL,
  topic_id TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  quiz_score NUMERIC CHECK (quiz_score >= 0 AND quiz_score <= 100),
  completed_at TIMESTAMP WITH TIME ZONE,
  attempts INTEGER DEFAULT 0 CHECK (attempts >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_training_progress_teacher ON teacher_training_progress(teacher_id);
CREATE INDEX IF NOT EXISTS idx_training_progress_course ON teacher_training_progress(teacher_id, course_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_training_progress_unique ON teacher_training_progress(teacher_id, course_id, chapter_id, topic_id);

COMMENT ON TABLE teacher_training_progress IS 'Teacher progress through training modules';

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_chapters_updated_at BEFORE UPDATE ON chapters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_topics_updated_at BEFORE UPDATE ON topics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_training_topics_updated_at BEFORE UPDATE ON training_topics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teacher_profiles_updated_at BEFORE UPDATE ON teacher_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_student_marks_updated_at BEFORE UPDATE ON student_marks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_training_progress_updated_at BEFORE UPDATE ON teacher_training_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Database schema created successfully!';
  RAISE NOTICE '📊 Tables created:';
  RAISE NOTICE '   - Content: subjects, chapters, topics';
  RAISE NOTICE '   - Training: training_courses, training_chapters, training_topics';
  RAISE NOTICE '   - Users: users, teacher_profiles';
  RAISE NOTICE '   - Students: students, attendance, student_marks, quiz_sessions';
  RAISE NOTICE '   - Progress: teacher_training_progress';
END $$;
