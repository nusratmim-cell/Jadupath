# Feature Documentation

Complete guide to all features in the Shikho Teacher Portal.

---

## Feature Map

```
┌─────────────────────────────────────────────────────────────┐
│                        LOGIN                                │
│                    src/app/page.tsx                         │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                      ONBOARDING                             │
│                src/app/onboarding/page.tsx                  │
│           (First-time: Select classes & subjects)           │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                      DASHBOARD                              │
│                src/app/dashboard/page.tsx                   │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Class 6  │  │ Class 7  │  │ Class 8  │  │   ...    │   │
│  │  Card    │  │  Card    │  │  Card    │  │          │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────────┘   │
└───────┼─────────────┼─────────────┼─────────────────────────┘
        │             │             │
        ▼             ▼             ▼
┌─────────────────────────────────────────────────────────────┐
│                    CLASSROOM SESSION                        │
│             src/app/classroom/[classId]/page.tsx            │
│                                                             │
│   Phase 1: ATTENDANCE ──▶ Phase 2: TEACHING ──▶ Phase 3    │
└─────────────────────────────────┬───────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    TEACH (Content)                          │
│                   src/app/teach/                            │
│                                                             │
│   Subject ──▶ Chapter ──▶ Topic ──▶ Content Viewer         │
│                                        │                    │
│                                        ├── NCTB PDF         │
│                                        ├── Video            │
│                                        └── Shikho AI        │
│                                             ├── Quiz        │
│                                             ├── Summary     │
│                                             └── Ask         │
└─────────────────────────────────────────────────────────────┘
```

---

## 1. Login (`src/app/page.tsx`)

### Description
Phone number + PIN authentication for teachers.

### UI Components
- Phone input with Bengali placeholder
- PIN input (4 digits)
- Login button
- Demo credentials display

### Demo Users
| Phone | PIN | Name |
|-------|-----|------|
| 01712345678 | 1234 | রহিম উদ্দিন |
| 01812345678 | 1234 | করিম আহমেদ |
| 01912345678 | 1234 | সালমা বেগম |

### Data Flow
```
User Input → loginWithPhone() → localStorage → Redirect to Dashboard
```

---

## 2. Onboarding (`src/app/onboarding/page.tsx`)

### Description
First-time setup for new teachers.

### Steps
1. Enter name
2. Enter school name
3. Select classes (6-10)
4. Select subjects (Math only for now)

### Data Saved
```typescript
{
  userId: string,
  name: string,
  school: string,
  classes: ["class-6", "class-7"],
  subjects: ["math"]
}
```

---

## 3. Dashboard (`src/app/dashboard/page.tsx`)

### Description
Main home screen with class overview and quick actions.

### Sections
1. **Header** - Greeting with teacher name
2. **Class Cards** - Each assigned class as a card
3. **Quick Stats** - Total students, sessions
4. **Quick Actions** - Start Class, Add Students, Reports

### Navigation
| Action | Destination |
|--------|-------------|
| Click Class Card | `/classroom/[classId]` |
| Add Students | `/students` |
| View Reports | `/reports` |
| Training | `/training` |

---

## 4. Student Management (`src/app/students/page.tsx`)

### Description
Add, view, and delete students for each class.

### Features
- **Class Tabs** - Switch between classes
- **Quick Add** - Add one student at a time
- **Bulk Add** - Paste multiple names (one per line)
- **Student List** - View all students with roll numbers
- **Delete** - Remove students

### Data Functions
```typescript
getStudentsForClass(userId, classId)
addMultipleStudents(userId, classId, students[])
deleteStudent(userId, classId, studentId)
```

---

## 5. Classroom Session (`src/app/classroom/[classId]/page.tsx`)

### Description
Complete teaching session with attendance and content delivery.

### Phases

#### Phase 1: Attendance
- List all students
- Toggle present/absent
- Add new students during session
- Save attendance

#### Phase 2: Teaching
- Navigate to content selection
- Link to `/teach/[classId]`

#### Phase 3: Quiz (optional)
- Quick quiz for the class
- Record student answers

#### Phase 4: Summary
- Session duration
- Attendance summary
- Topics covered

### Data Saved
```typescript
{
  classId: string,
  date: string,
  presentStudents: string[],
  absentStudents: string[],
  topics: string[],
  duration: number
}
```

---

## 6. Teaching Content (`src/app/teach/`)

### File Structure
```
teach/
├── [classId]/
│   ├── page.tsx                    # Subject selection
│   └── [subjectId]/
│       └── [chapterId]/
│           ├── page.tsx            # Topic selection
│           └── [topicId]/
│               └── page.tsx        # Content viewer
```

### Flow
1. **Subject Selection** - Choose Math (more subjects coming)
2. **Chapter Selection** - List of chapters with topic count
3. **Topic Selection** - Modal with topics and content indicators
4. **Content Viewer** - PDF, Video, or AI features

---

## 7. Content Viewer (`src/app/teach/[...]/[topicId]/page.tsx`)

### Description
View and interact with educational content.

### Content Types

#### NCTB Book (PDF)
- PDF viewer
- Download option
- Cast to TV

#### Video
- Video player with controls
- Progress bar
- Cast to TV

#### Shikho AI
See `docs/AI_INTEGRATION.md` for details.

| Mode | Description |
|------|-------------|
| Quiz | Generate MCQ questions from content |
| Summary | AI-generated summary of topic |
| Ask | Ask any question about the topic |

### TV Casting
- Chromecast support
- Smart TV (Miracast)
- Device discovery

---

## 8. Teacher Training (`src/app/training/`)

### Description
Training modules for teachers with progress tracking.

### Structure
```
training/
├── page.tsx                    # Course list
└── [courseId]/
    └── [chapterId]/
        └── [topicId]/
            └── page.tsx        # Learning + Quiz
```

### Features
- **Course List** - Available training courses
- **Progress Bar** - Completion percentage
- **Sequential Unlocking** - Complete topics in order
- **Materials** - Text, video, PDF content
- **Quiz** - Must pass to unlock next topic

### Data
```typescript
TRAINING_COURSES = [
  {
    id: "digital-classroom",
    name: "ডিজিটাল ক্লাসরুম পরিচালনা",
    chapters: [
      {
        id: "ch1",
        name: "প্রাথমিক ধারণা",
        topics: [...]
      }
    ]
  }
]
```

---

## 9. Reports (`src/app/reports/page.tsx`)

### Description
Attendance and performance reports.

### Report Types
- **Daily Attendance** - Single day view
- **Weekly Summary** - 7-day overview
- **Monthly Report** - Full month statistics
- **Quiz Performance** - Student scores

### Features
- Date picker
- Class filter
- Print-friendly view
- (Future) PDF/Excel export

### Data Sources
```typescript
// Attendance records
localStorage: shikho_attendance_[userId]_[classId]_[date]

// Quiz records
localStorage: shikho_quiz_[studentId]_[subjectId]
```

---

## 10. Profile (`src/app/profile/page.tsx`)

### Description
Teacher profile and settings.

### Displayed Info
- Name
- Phone number
- School
- Assigned classes
- Teaching subjects

### Actions
- Edit profile (future)
- Change PIN (future)
- Logout

---

## 11. Bottom Navigation (`src/components/BottomNav.tsx`)

### Tabs
| Icon | Label | Route | Active When |
|------|-------|-------|-------------|
| 🏠 | হোম | `/dashboard` | Dashboard |
|  | শিক্ষার্থী | `/students` | Student pages |
|  | রিপোর্ট | `/reports` | Report pages |
|  | প্রশিক্ষণ | `/training` | Training pages |
| 👤 | প্রোফাইল | `/profile` | Profile page |

### Hidden On
- Login page (`/`)
- Onboarding (`/onboarding`)
- Classroom session (`/classroom/*`)
- Teaching content (`/teach/*`)

---

## Feature Dependencies

```
┌────────────────┐
│     auth.ts    │◄──── All features depend on auth
└───────┬────────┘
        │
        ▼
┌────────────────┐
│    data.ts     │◄──── Course data, constants
└───────┬────────┘
        │
        ▼
┌────────────────┐
│   components   │◄──── Shared UI components
└───────┬────────┘
        │
        ▼
┌────────────────┐
│     pages      │◄──── Feature pages
└────────────────┘
```

---

## Adding New Features

### Checklist
- [ ] Create page in `src/app/`
- [ ] Use `useAuth()` hook for authentication
- [ ] Add to bottom navigation if needed
- [ ] Update `ARCHITECTURE.md`
- [ ] Update this document
- [ ] Add tests (future)
