# Architecture Guide

This document explains the codebase structure and helps developers understand which files are responsible for which features.

## Quick Reference

| Feature | Primary Files | Description |
|---------|--------------|-------------|
| Login/Auth | `src/app/page.tsx`, `src/lib/auth.ts` | Phone + PIN authentication |
| Dashboard | `src/app/dashboard/page.tsx` | Main home screen with class cards |
| Students | `src/app/students/page.tsx`, `src/lib/auth.ts` | Student CRUD operations |
| Classroom | `src/app/classroom/[classId]/page.tsx` | Attendance + Teaching session |
| Teaching | `src/app/teach/**/*` | Subject/Chapter/Topic selection & content |
| Shikho AI | `src/app/teach/[...]/[topicId]/page.tsx` | Quiz, Summary, Q&A with AI |
| Training | `src/app/training/**/*` | Teacher training modules |
| Reports | `src/app/reports/page.tsx` | Attendance & performance reports |
| Profile | `src/app/profile/page.tsx` | Teacher profile settings |

---

## Directory Structure

```
src/
├── app/                      #  PAGES (Next.js App Router)
│   ├── page.tsx              # Login page
│   ├── layout.tsx            # Root layout (adds BottomNav, ErrorBoundary)
│   ├── globals.css           # Global styles & animations
│   │
│   ├── onboarding/           # First-time teacher setup
│   │   └── page.tsx          # Class & subject selection
│   │
│   ├── dashboard/            # Main dashboard
│   │   └── page.tsx          # Class cards, quick stats, actions
│   │
│   ├── students/             # Student management
│   │   └── page.tsx          # Add/delete students, bulk import
│   │
│   ├── classroom/            # Classroom sessions
│   │   └── [classId]/
│   │       └── page.tsx      # Attendance → Teaching → Quiz flow
│   │
│   ├── teach/                # Content delivery system
│   │   └── [classId]/
│   │       ├── page.tsx      # Subject selection
│   │       └── [subjectId]/
│   │           └── [chapterId]/
│   │               ├── page.tsx      # Topic selection
│   │               └── [topicId]/
│   │                   └── page.tsx  # Content viewer + Shikho AI
│   │
│   ├── training/             # Teacher training
│   │   ├── page.tsx          # Course list
│   │   └── [courseId]/
│   │       └── [chapterId]/
│   │           └── [topicId]/
│   │               └── page.tsx  # Learning + Quiz
│   │
│   ├── reports/              # Reports & analytics
│   │   └── page.tsx          # Attendance & quiz reports
│   │
│   └── profile/              # Teacher profile
│       └── page.tsx          # Profile info & logout
│
├── components/               # 🧩 REUSABLE UI COMPONENTS
│   ├── BottomNav.tsx         # Bottom navigation bar
│   ├── ErrorBoundary.tsx     # Error handling wrapper
│   ├── LoadingSpinner.tsx    # Loading indicator
│   ├── Skeleton.tsx          # Skeleton loaders
│   ├── Toast.tsx             # Notifications + useToast hook
│   ├── Providers.tsx         # App-level providers
│   ├── ServiceWorkerRegistration.tsx  # PWA service worker
│   └── index.ts              # Barrel exports
│
├── hooks/                    # 🪝 CUSTOM REACT HOOKS
│   ├── useAuth.ts            # Authentication state management
│   └── index.ts              # Barrel exports
│
├── lib/                      #  BUSINESS LOGIC & DATA
│   ├── auth.ts               # Auth functions, user/student management
│   └── data.ts               # Constants, subjects, chapters, training data
│
└── middleware.ts             #  Security headers middleware
```

---

## Feature Details

### 1. Authentication (`src/app/page.tsx` + `src/lib/auth.ts`)

**Files:**
- `src/app/page.tsx` - Login UI with phone/PIN inputs
- `src/lib/auth.ts` - Auth logic, user validation, session management

**Key Functions in `auth.ts`:**
```typescript
loginWithPhone(phone, pin)     // Validate credentials
getCurrentUser()               // Get logged-in user
getProfileByUserId(userId)     // Get teacher profile
saveProfile(profile)           // Save teacher profile
```

**Data Storage:**
- `localStorage: shikho_teacher_user` - Current session
- `localStorage: shikho_teacher_profile` - Teacher profile

---

### 2. Dashboard (`src/app/dashboard/page.tsx`)

**Purpose:** Main home screen after login

**Features:**
- Class cards with student count
- Quick stats (total students, sessions)
- Quick action buttons (Start Class, Add Students)
- Today's schedule

**Navigation:**
- Click class → `/classroom/[classId]`
- Add Students → `/students`
- Reports → `/reports`

---

### 3. Student Management (`src/app/students/page.tsx`)

**Purpose:** Add, view, and manage students per class

**Features:**
- Class tab selector
- Single student add (quick mode)
- Bulk add (paste names)
- Delete students

**Key Functions in `auth.ts`:**
```typescript
getStudentsForClass(userId, classId)
addMultipleStudents(userId, classId, students)
deleteStudent(userId, classId, studentId)
```

---

### 4. Classroom Session (`src/app/classroom/[classId]/page.tsx`)

**Purpose:** Complete teaching session flow

**Phases:**
1. **Attendance** - Mark present/absent for each student
2. **Teaching** - Navigate to content
3. **Quiz** - Quick class quiz
4. **Summary** - Session completion

**Features:**
- Real-time attendance tracking
- Add students during session
- Timer for session duration

---

### 5. Teaching & Content (`src/app/teach/`)

**File Structure:**
```
teach/
├── [classId]/
│   ├── page.tsx                    # Subject selection
│   └── [subjectId]/
│       └── [chapterId]/
│           ├── page.tsx            # Topic selection (with modal)
│           └── [topicId]/
│               └── page.tsx        # Content viewer + Shikho AI
```

**Content Viewer Features:**
- NCTB Book PDF viewer
- Video player
- TV casting (Chromecast/Smart TV)
- **Shikho AI** integration

---

### 6. Shikho AI (`src/app/teach/[...]/[topicId]/page.tsx`)

**Location:** Inside the topic content page

**AI Modes (line ~545-880):**

| Mode | Function | Description |
|------|----------|-------------|
| Quiz | `generateQuiz()` | AI generates MCQ questions from content |
| Summary | `generateSummary()` | AI summarizes the topic |
| Ask | `handleAsk()` | Teacher asks any question about topic |

**Key Code Sections:**
```typescript
// Line ~150-198: Quiz generation (mock - replace with Claude API)
const generateQuiz = async () => { ... }

// Line ~222-253: Summary generation (mock - replace with Claude API)
const generateSummary = async () => { ... }

// Line ~255-276: Ask anything (mock - replace with Claude API)
const handleAsk = async () => { ... }
```

**To integrate real AI:**
1. Add `ANTHROPIC_API_KEY` to `.env.local`
2. Replace mock functions with actual API calls
3. See `docs/AI_INTEGRATION.md` for details

---

### 7. Teacher Training (`src/app/training/`)

**File Structure:**
```
training/
├── page.tsx                        # Course list with progress
└── [courseId]/
    └── [chapterId]/
        └── [topicId]/
            └── page.tsx            # Learning materials + Quiz
```

**Features:**
- Course progress tracking
- Sequential topic unlocking
- Quiz with pass/fail
- Certificate on completion (future)

**Data in `data.ts`:**
```typescript
TRAINING_COURSES[]  // Course definitions
// Functions for progress tracking
isTopicCompleted(userId, courseId, chapterId, topicId)
completeTrainingTopic(userId, ...)
```

---

### 8. Reports (`src/app/reports/page.tsx`)

**Purpose:** View and print attendance/performance reports

**Report Types:**
- Daily attendance
- Weekly summary
- Monthly overview
- Quiz performance

**Features:**
- Date range selector
- Class filter
- Print-friendly view
- Export (future: PDF/Excel)

---

### 9. Profile (`src/app/profile/page.tsx`)

**Purpose:** View/edit teacher profile

**Features:**
- Display name, phone, school
- Assigned classes
- Logout functionality

---

## Components Guide

### BottomNav (`src/components/BottomNav.tsx`)

**Purpose:** Fixed bottom navigation bar

**Tabs:**
| Icon | Label | Route |
|------|-------|-------|
| Home | হোম | `/dashboard` |
| Students | শিক্ষার্থী | `/students` |
| Reports | রিপোর্ট | `/reports` |
| Training | প্রশিক্ষণ | `/training` |
| Profile | প্রোফাইল | `/profile` |

**Hidden on:** Login, Onboarding, Classroom, Teach pages

---

### LoadingSpinner (`src/components/LoadingSpinner.tsx`)

```tsx
<LoadingSpinner />                    // Default
<LoadingSpinner size="lg" />          // Large
<LoadingSpinner fullScreen />         // Full page
<LoadingSpinner message="কাস্টম..." /> // Custom message
```

---

### Toast (`src/components/Toast.tsx`)

```tsx
import { useToast, Toast } from "@/components";

function MyComponent() {
  const { toasts, removeToast, success, error } = useToast();

  const handleSave = () => {
    success("সফলভাবে সংরক্ষণ হয়েছে!");
  };

  return (
    <>
      <Toast toasts={toasts} onRemove={removeToast} />
      <button onClick={handleSave}>Save</button>
    </>
  );
}
```

---

### Skeleton (`src/components/Skeleton.tsx`)

```tsx
import { Skeleton, CardSkeleton, DashboardSkeleton } from "@/components";

// Basic usage
<Skeleton width={200} height={20} />

// Pre-built patterns
<CardSkeleton />
<DashboardSkeleton />
```

---

## Data Models (`src/lib/`)

### auth.ts - Types

```typescript
interface User {
  id: string;
  phone: string;
  name: string;
  onboardingCompleted: boolean;
}

interface TeacherProfile {
  userId: string;
  name: string;
  school: string;
  classes: string[];        // ["class-6", "class-7"]
  subjects: string[];       // ["math"]
}

interface Student {
  id: string;
  name: string;
  rollNumber: string;
}
```

### data.ts - Constants

```typescript
CLASS_LABELS = {
  "class-6": "৬ষ্ঠ শ্রেণি",
  "class-7": "৭ম শ্রেণি",
  // ...
}

SUBJECTS = [
  { id: "math", name: "গণিত", icon: "calculator", color: "..." }
]

CHAPTERS_DATA = {
  "class-6": {
    "math": [
      { id: "ch1", name: "স্বাভাবিক সংখ্যা", topics: [...] }
    ]
  }
}

TRAINING_COURSES = [...]
```

---

## Styling Guide

### CSS Variables (`globals.css`)

```css
:root {
  --brand-blue: #354894;    /* Primary brand color */
  --brand-yellow: #efad1e;
  --brand-red: #ee3d5e;
  --brand-pink: #cf278d;   /* Shikho Pink */
}
```

### Common Patterns

```tsx
// Card
className="bg-white rounded-2xl shadow-md p-5"

// Primary Button
className="bg-[#354894] text-white py-3 px-6 rounded-xl font-medium"

// Or use global class
className="btn-primary"

// Animations
className="animate-fadeIn"
className="animate-slideUp"
```

---

## Adding New Features

### Adding a New Page

1. Create folder: `src/app/my-feature/`
2. Create page: `src/app/my-feature/page.tsx`
3. Use template:

```tsx
"use client";

import { useAuth } from "@/hooks";
import { LoadingSpinner } from "@/components";

export default function MyFeaturePage() {
  const { user, profile, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <div className="min-h-screen bg-slate-100 pb-20">
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <h1 className="text-lg font-semibold">পেজ টাইটেল</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Content */}
      </main>
    </div>
  );
}
```

### Adding a New Component

1. Create: `src/components/MyComponent.tsx`
2. Export from: `src/components/index.ts`
3. Use in pages: `import { MyComponent } from "@/components"`

### Adding a New Hook

1. Create: `src/hooks/useMyHook.ts`
2. Export from: `src/hooks/index.ts`
3. Use in pages: `import { useMyHook } from "@/hooks"`

---

## Testing Locally

```bash
# Development
npm run dev

# Build check
npm run build

# Lint
npm run lint
```

---

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Connect to Vercel
3. Deploy automatically

### Self-hosted

```bash
npm run build
npm run start
```

---

## Questions?

- Check `CONTRIBUTING.md` for contribution guidelines
- Open an issue for bugs or feature requests
