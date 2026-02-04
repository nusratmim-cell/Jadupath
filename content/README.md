# Content Directory

Place your JSON files here before uploading to Supabase.

## Directory Structure

```
content/
├── class-1/          ← Class 1 content JSON files
│   ├── bangla.json
│   ├── english.json
│   ├── math.json
│   ├── science.json
│   └── bangladesh.json
├── class-2/          ← Class 2 content JSON files
│   └── ...
├── class-3/          ← Class 3 content JSON files
│   └── ...
├── class-4/          ← Class 4 content JSON files
│   └── ...
├── class-5/          ← Class 5 content JSON files
│   └── ...
├── training/         ← Training course JSON files
│   ├── professionalism.json
│   ├── pedagogy.json
│   └── classroom-management.json
└── templates/        ← Example templates (already provided)
    ├── chapter-template.json
    └── training-template.json
```

## How to Use

### 1. Create Your JSON Files

**For Educational Content:**
- Place in the appropriate class folder
- Name: `{subject}.json` (e.g., `math.json`, `bangla.json`)
- Use `templates/chapter-template.json` as a guide

**For Training Modules:**
- Place in the `training/` folder
- Name: `{course-name}.json` (e.g., `professionalism.json`)
- Use `templates/training-template.json` as a guide

### 2. Validate Your JSON

```bash
# For educational content
npm run validate content/class-4/math.json chapters

# For training
npm run validate content/training/professionalism.json training
```

### 3. Upload to Supabase

```bash
# Upload single file
npm run upload:chapters content/class-4/math.json

# Upload entire class folder
npm run upload:chapters content/class-4

# Upload training course
npm run upload:training content/training/professionalism.json
```

## Example: Creating Class 4 Math Content

1. Create file: `content/class-4/math.json`
2. Copy template: `cp content/templates/chapter-template.json content/class-4/math.json`
3. Edit `content/class-4/math.json` with your actual data
4. Validate: `npm run validate content/class-4/math.json chapters`
5. Upload: `npm run upload:chapters content/class-4/math.json`

## Notes

- The `templates/` folder contains example JSON structures
- You can copy these templates and modify them with your actual content
- Always validate before uploading to catch errors early
- You can upload files one at a time or entire directories
