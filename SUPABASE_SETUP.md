# Supabase Content Management Setup

This guide explains how to use Supabase for managing educational content, training modules, and user data in the Teacher Portal.

## Table of Contents

1. [Database Setup](#database-setup)
2. [Uploading Content](#uploading-content)
3. [Data Format](#data-format)
4. [Scripts Reference](#scripts-reference)
5. [Troubleshooting](#troubleshooting)

---

## Database Setup

### Step 1: Database Migration (Already Completed ✅)

The database schema has been created with these tables:
- **Content Tables**: `subjects`, `chapters`, `topics`
- **Training Tables**: `training_courses`, `training_chapters`, `training_topics`
- **User Tables**: `users`, `teacher_profiles`
- **Student Tables**: `students`, `attendance`, `student_marks`, `quiz_sessions`
- **Progress Table**: `teacher_training_progress`

### Step 2: Seed Subjects (Already Completed ✅)

The 5 subjects have been added:
- 📖 বাংলা (Bangla)
- 🔤 ইংরেজি (English)
- 🔢 গণিত (Math)
- 🔬 বিজ্ঞান (Science)
- 🌍 বাংলাদেশ ও বিশ্বপরিচয় (Bangladesh Studies)

---

## Uploading Content

### Educational Content (Chapters & Topics)

**Step 1: Prepare JSON Files**

Create JSON files for each class and subject. Use the template at `content/templates/chapter-template.json` as a guide.

Directory structure:
```
content/
├── class-1/
│   ├── bangla.json
│   ├── english.json
│   ├── math.json
│   ├── science.json
│   └── bangladesh.json
├── class-2/
│   └── ...
├── class-3/
│   └── ...
├── class-4/
│   └── ...
└── class-5/
    └── ...
```

**Step 2: Validate JSON**

Before uploading, validate your JSON files:

```bash
# Validate a single file
npm run validate content/class-4/math.json chapters

# Or use node directly
node scripts/validate-data.js content/class-4/math.json chapters
```

**Step 3: Upload to Supabase**

```bash
# Upload a single file
npm run upload:chapters content/class-4/math.json

# Upload all files in a directory
npm run upload:chapters content/class-4
```

The script will:
- ✅ Read your JSON file
- ✅ Upload chapters to the `chapters` table
- ✅ Upload topics to the `topics` table
- ✅ Show progress and summary

### Training Modules

**Step 1: Prepare Training JSON**

Use the template at `content/templates/training-template.json` as a guide.

Directory structure:
```
content/training/
├── professionalism.json
├── pedagogy.json
├── classroom-management.json
└── assessment.json
```

**Step 2: Validate**

```bash
npm run validate content/training/professionalism.json training
```

**Step 3: Upload**

```bash
# Upload a single course
npm run upload:training content/training/professionalism.json

# Upload all courses
npm run upload:training content/training
```

---

## Data Format

### Chapter-Topic JSON Format

```json
{
  "classId": "4",
  "subjectId": "math",
  "chapters": [
    {
      "id": "class-4-math-chapter-1",
      "name": "স্বাভাবিক সংখ্যা",
      "displayOrder": 1,
      "topics": [
        {
          "id": "class-4-math-ch1-topic1",
          "name": "যোগ ও বিয়োগ",
          "description": "যোগ ও বিয়োগের মৌলিক ধারণা",
          "displayOrder": 1,
          "pdfStartPage": 5,
          "pdfEndPage": 12,
          "nctbBook": {
            "title": "গণিত - চতুর্থ শ্রেণী",
            "pdfUrl": "https://your-cdn.com/textbook.pdf",
            "pages": 150
          },
          "video": {
            "title": "যোগ ও বিয়োগ শিখি",
            "url": "https://youtube.com/watch?v=...",
            "duration": "১৫ মিনিট",
            "thumbnail": "https://img.youtube.com/..."
          }
        }
      ]
    }
  ]
}
```

**Required Fields:**
- `classId`: "1", "2", "3", "4", or "5"
- `subjectId`: "bangla", "english", "math", "science", or "bangladesh"
- `chapters`: Array of chapters
  - `id`: Unique chapter ID (e.g., "class-4-math-chapter-1")
  - `name`: Chapter name in Bengali
  - `displayOrder`: Number for ordering (1, 2, 3, ...)
  - `topics`: Array of topics
    - `id`: Unique topic ID
    - `name`: Topic name in Bengali

**Optional Fields:**
- `description`: Topic description
- `pdfStartPage`, `pdfEndPage`: Page references in textbook
- `nctbBook`: Textbook information
- `video`: Video URL and metadata

### Training JSON Format

```json
{
  "id": "professionalism",
  "name": "পেশাদারিত্ব",
  "description": "শিক্ষকতায় পেশাদারিত্ব উন্নয়ন",
  "icon": "👔",
  "color": "from-indigo-500 to-indigo-600",
  "chapters": [
    {
      "id": "professionalism-chapter-1",
      "name": "শিক্ষকের দায়িত্ব",
      "displayOrder": 1,
      "topics": [
        {
          "id": "professionalism-ch1-topic1",
          "name": "শ্রেণিকক্ষ ব্যবস্থাপনা",
          "duration": "১৫ মিনিট",
          "description": "কার্যকর শ্রেণিকক্ষ ব্যবস্থাপনার কৌশল",
          "displayOrder": 1,
          "pdfUrl": "https://your-cdn.com/guide.pdf",
          "pdfStartPage": 1,
          "video": {
            "url": "https://youtube.com/watch?v=...",
            "duration": "১৫ মিনিট"
          },
          "quiz": [
            {
              "question": "প্রশ্ন এখানে লিখুন",
              "options": ["বিকল্প ১", "বিকল্প ২", "বিকল্প ৩", "বিকল্প ৪"],
              "correctAnswer": 1
            }
          ]
        }
      ]
    }
  ]
}
```

**Required Fields:**
- `id`: Unique course ID
- `name`: Course name
- `chapters`: Array of chapters
  - `id`, `name`, `displayOrder`
  - `topics`: Array of topics
    - `id`, `name`, `duration`: Required for each topic

**Quiz Format:**
- `question`: Question text
- `options`: Array of answer options (minimum 2)
- `correctAnswer`: Index of correct answer (0-based)

---

## Scripts Reference

### Available NPM Scripts

```bash
# Database management
npm run db:migrate      # Apply database migration (instructions only)
npm run db:seed         # Seed subjects table

# Content upload
npm run upload:chapters <path>   # Upload chapters/topics
npm run upload:training <path>   # Upload training courses

# Validation
npm run validate <path> <type>   # Validate JSON files
```

### Direct Script Usage

```bash
# Validation
node scripts/validate-data.js <json-file> [chapters|training]

# Upload chapters
node scripts/upload-chapters.js <json-file-or-directory>

# Upload training
node scripts/upload-training.js <json-file-or-directory>

# Seed subjects
node scripts/seed-subjects.js
```

---

## Content Management Workflow

### Recommended Workflow

1. **Prepare Content**
   - Create JSON files following the templates
   - Organize in `content/` directory

2. **Validate**
   ```bash
   npm run validate content/class-4/math.json chapters
   ```

3. **Upload**
   ```bash
   npm run upload:chapters content/class-4/math.json
   ```

4. **Verify**
   - Check Supabase dashboard → Table Editor
   - Verify data appears correctly

5. **Test in Application**
   - Navigate to relevant pages
   - Confirm data loads correctly

### Bulk Upload All Content

To upload all content at once:

```bash
# Upload all chapters for all classes
for class in 1 2 3 4 5; do
  npm run upload:chapters content/class-$class
done

# Upload all training courses
npm run upload:training content/training
```

---

## Troubleshooting

### Validation Errors

**Error: "Missing required field: classId"**
- Ensure your JSON has `classId` at the root level
- Valid values: "1", "2", "3", "4", "5"

**Error: "Invalid subjectId"**
- Use one of: `bangla`, `english`, `math`, `science`, `bangladesh`

**Error: "correctAnswer index out of bounds"**
- Quiz `correctAnswer` should be 0-based index
- For 4 options, use 0, 1, 2, or 3

### Upload Errors

**Error: "Supabase credentials not found"**
- Check `.env.local` file exists
- Verify `NEXT_PUBLIC_SUPABASE_URL` is set
- Verify `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set

**Error: "insert or update on table violates foreign key constraint"**
- Make sure subjects are seeded first: `npm run db:seed`
- Use valid subject IDs: bangla, english, math, science, bangladesh

**Error: "duplicate key value violates unique constraint"**
- You're trying to insert duplicate IDs
- Use `upsert` (already enabled) to update existing records
- Or change the ID in your JSON file

### Database Issues

**Tables not found**
- Run migration in Supabase SQL Editor
- Copy SQL from `supabase/migrations/001_initial_schema.sql`
- Paste and execute in dashboard

**Connection timeout**
- Check internet connection
- Verify Supabase project is active
- Check if Supabase is experiencing downtime

---

## Data Management Best Practices

### 1. ID Naming Convention

Use consistent ID patterns:
- **Chapters**: `class-{classId}-{subjectId}-chapter-{number}`
  - Example: `class-4-math-chapter-1`
- **Topics**: `class-{classId}-{subjectId}-ch{number}-topic{number}`
  - Example: `class-4-math-ch1-topic1`
- **Training Courses**: `{course-name}`
  - Example: `professionalism`
- **Training Chapters**: `{course-id}-chapter-{number}`
  - Example: `professionalism-chapter-1`

### 2. Display Order

Always set `displayOrder` starting from 1:
- Chapter 1: `displayOrder: 1`
- Chapter 2: `displayOrder: 2`
- Topic 1: `displayOrder: 1`
- Topic 2: `displayOrder: 2`

### 3. External URLs

For free hosting of 3GB content:
- **Videos**: Use YouTube URLs
- **PDFs**: Use Google Drive, GitHub, or archive.org
- **Images**: Use GitHub, Imgur, or Cloudinary free tier

### 4. Version Control

- Keep JSON files in git repository
- Track changes to content
- Easy rollback if needed

---

## Next Steps

Once your educational content is uploaded:

1. **Upload Training Modules** (if not done)
2. **Migrate User Data** (upcoming script)
3. **Update Application Code** to use Supabase
4. **Test All Features** thoroughly
5. **Deploy to Production**

---

## Support

If you encounter issues:

1. Check validation output for specific errors
2. Review this documentation
3. Check Supabase dashboard logs
4. Verify JSON format matches templates
5. Ensure all required fields are present

---

## Summary

✅ Database schema created (13 tables)
✅ Subjects seeded (5 subjects)
✅ Upload scripts ready
✅ Validation tools available
✅ Templates provided
✅ NPM scripts configured

**You're ready to start uploading your content!**

Start with:
```bash
npm run validate content/templates/chapter-template.json chapters
npm run upload:chapters content/templates/chapter-template.json
```

Then create your own JSON files and upload them following the same process.
