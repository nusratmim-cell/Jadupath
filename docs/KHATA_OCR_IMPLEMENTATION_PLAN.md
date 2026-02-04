# Implementation Plan: Handwritten Khata OCR for Reports

## Overview

Add feature to extract student marks from handwritten khata (marks register) images using Google Gemini Vision API. Teachers will upload images of their handwritten marks, review and edit the extracted data, then save it to the system for report generation.

## User Requirements Summary

- **Format**: Simple handwritten khata with Roll Number, Student Name, and Total Marks (out of 100)
- **Upload**: Support multiple images per class (multi-page khata)
- **Review**: Editable preview table to fix OCR errors before saving
- **Protection**: Warning dialog if marks already exist for the term
- **Integration**: Works with existing class/term filters in reports section

## Architecture

```
Image Upload → Base64 Encoding → Gemini Vision API →
Structured JSON → Preview Table (Editable) →
Validation → Overwrite Check → Save to localStorage
```

---

## Implementation Steps

### Step 1: Create API Endpoint for Khata OCR

**New File**: `src/app/api/extract-khata-marks/route.ts`

**Responsibilities**:
- Accept multiple base64-encoded images
- Process each image with Gemini 2.0 Flash Vision API
- Extract student data (roll number, name, total marks)
- Merge results from multiple images
- Handle duplicate roll numbers (keep highest marks)
- Return structured JSON response

**API Request Format**:
```typescript
{
  images: string[],        // Array of base64 images
  classId: string,
  subjectId: string,
  term: 1 | 2 | 3,
  year: number
}
```

**API Response Format**:
```typescript
{
  success: true,
  extractedMarks: [
    {
      rollNumber: "01",
      name: "আব্দুল করিম",
      totalMarks: 85,
      confidence: "high" | "medium" | "low"
    }
  ],
  warnings: string[]
}
```

**Gemini Prompt Requirements**:
- Extract only: Roll Number, Name, Total Marks
- Convert Bengali numerals (০১২) to English (012)
- Validate marks range (0-100)
- Ignore header rows and crossed-out entries
- Return valid JSON array only

**Reference Implementation**: Follow pattern from `src/app/api/extract-students/route.ts` (lines 1-156)
- Use `withTimeout` for 60-second timeout per image
- Rate limiting: 10 requests/min (pattern from existing API routes)
- Input validation with schema
- Error handling with Bengali messages
- Clean JSON extraction (remove markdown code blocks)

---

### Step 2: Create KhataOCRModal Component

**New File**: `src/components/KhataOCRModal.tsx`

**Props Interface**:
```typescript
{
  isOpen: boolean;
  onClose: () => void;
  classId: string;
  subjectId: string;
  term: 1 | 2 | 3;
  year: number;
  existingStudents: Student[];
  onSuccess: () => void;
}
```

**Multi-Step Wizard**:

1. **Upload Step**
   - File input with `multiple` attribute
   - Camera capture option (mobile support)
   - Image preview grid with thumbnails
   - Remove individual images
   - "প্রক্রিয়া করুন" button to proceed

2. **Processing Step**
   - Loading spinner with Gemini branding
   - Progress message: "খাতা থেকে নম্বর উত্তোলন করা হচ্ছে..."
   - Image counter (if multiple)

3. **Preview/Edit Step**
   - **Editable table** with inline editing
   - Columns: Roll Number, Student Name, Total Marks, Status, Actions
   - **Color coding**:
     - Green: Student matched by roll number
     - Yellow: New student (not in system)
     - Red: Invalid/error data
   - Delete row button
   - Add manual row button
   - **Validation warnings** displayed above table
   - **Summary stats**: "X matched, Y new, Z errors"

4. **Confirmation Step** (shown if marks exist for term)
   - Warning: "এই সাময়িকে ইতিমধ্যে X জন শিক্ষার্থীর নম্বর আছে। প্রতিস্থাপন করতে চান?"
   - Show affected students list
   - Buttons: "বাতিল করুন" | "হ্যাঁ, প্রতিস্থাপন করুন"

5. **Success Step**
   - Success icon and message
   - Summary: "X জন শিক্ষার্থীর নম্বর সংরক্ষিত হয়েছে"
   - "সম্পন্ন" button closes modal

**Design Reference**: Follow pattern from `src/components/OCRAnswerSheetScanner.tsx` (lines 1-100)
- Similar file upload and camera capture logic
- Base64 encoding pattern
- Step-based state management
- Error handling and user feedback

**Data Processing Functions**:
- `matchExtractedStudents()` - Match by roll number, fuzzy match by name
- `validateData()` - Validate roll numbers, names, marks range
- `checkExistingMarks()` - Detect conflicts with existing term data
- `saveExtractedMarks()` - Save to localStorage, create new students if needed

---

### Step 3: Modify Reports Page

**File**: `src/app/reports/page.tsx`

**Changes**:

1. **Add Subject Filter** (Line 522-528)
   - Replace hardcoded "গণিত" display with dropdown selector
   - Add state: `const [selectedSubject, setSelectedSubject] = useState<string>("math")`
   - Use `SUBJECTS` array from `src/lib/data.ts` to populate options
   - Update `useEffect` to use `selectedSubject` instead of hardcoded "math"

2. **Add OCR Upload Button** (After line 528, before results table)
   ```tsx
   <button
     onClick={() => setShowKhataOCRModal(true)}
     className="w-full gradient-blue-pink text-white rounded-xl p-4 shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-3"
   >
     <CameraIcon />
     <span className="font-bold">খাতা থেকে নম্বর আপলোড করুন</span>
   </button>
   ```

3. **Add Modal Integration**
   - Import `KhataOCRModal` component
   - Add state: `const [showKhataOCRModal, setShowKhataOCRModal] = useState(false)`
   - Render modal with props (classId, subjectId, term, year, students)
   - `onSuccess` callback refreshes marks data

4. **Update Data Loading**
   - Modify `useEffect` (around line 86-105) to include `selectedSubject` in dependency array
   - Change `getClassMarks(selectedClass, "math", ...)` to `getClassMarks(selectedClass, selectedSubject, ...)`

**Current State** (Line 94):
```typescript
const classMarks = getClassMarks(selectedClass, "math", selectedTerm, selectedYear);
```

**After Changes**:
```typescript
const classMarks = getClassMarks(selectedClass, selectedSubject, selectedTerm, selectedYear);
```

---

### Step 4: Data Persistence Logic

**Functions to Use** (from `src/lib/data.ts` and `src/lib/auth.ts`):

1. **Check for Existing Marks**:
   - Use `getClassMarks(classId, subjectId, term, year)` to retrieve existing marks
   - Filter by studentIds to find conflicts

2. **Save Student Marks**:
   - Use existing `saveStudentMarks(mark: StudentMark)` function (line 732 in data.ts)
   - Create `StudentMark` object with:
     - `studentId`, `classId`, `subjectId`, `teacherId`, `term`, `year`
     - `totalMarks`: from OCR extraction
     - `quizMarks`: 0 (default, since khata only has total)
     - `writtenMarks`: undefined
     - `lastUpdated`: current timestamp

3. **Create New Students** (if needed):
   - Use `addStudent(teacherId, classId, studentData)` from `src/lib/auth.ts`
   - Only for students marked as "new" in preview table
   - Extract studentId from returned object

4. **Calculate Grade**:
   - Use existing `calculateGrade(marks: number)` function (line 1188 in data.ts)
   - Grades: A+ (≥80), A (≥70), A- (≥60), B (≥50), C (≥40), D (≥33), F (<33)

**Save Flow**:
```typescript
for (const extractedMark of validatedData) {
  let studentId = extractedMark.studentId;

  // Create new student if not found
  if (!studentId && extractedMark.matchStatus === 'new') {
    const newStudent = addStudent(teacherId, classId, {
      name: extractedMark.name,
      rollNumber: extractedMark.rollNumber
    });
    studentId = newStudent.id;
  }

  // Save marks
  if (studentId) {
    const mark: StudentMark = {
      studentId,
      classId,
      subjectId,
      teacherId,
      term,
      year,
      quizMarks: 0,
      quizCount: 0,
      classEngagement: 0,
      totalMarks: extractedMark.totalMarks,
      lastUpdated: new Date().toISOString()
    };

    saveStudentMarks(mark);
  }
}
```

---

### Step 5: Helper Utilities (Optional)

**New File** (if needed): `src/lib/khataOCRHelpers.ts`

**Functions**:

1. **Bengali to English Numeral Conversion**:
   ```typescript
   export function convertBengaliToEnglish(text: string): string {
     const bengaliNumerals = ['০','১','২','৩','৪','৫','৬','৭','৮','৯'];
     const englishNumerals = ['0','1','2','3','4','5','6','7','8','9'];

     return text.split('').map(char => {
       const index = bengaliNumerals.indexOf(char);
       return index !== -1 ? englishNumerals[index] : char;
     }).join('');
   }
   ```

2. **Fuzzy Name Matching** (Levenshtein distance):
   - Match extracted names with existing students
   - Confidence threshold for auto-matching

3. **Merge Duplicate Roll Numbers**:
   - When multiple images have same roll number
   - Keep entry with highest marks
   - Add warning message

4. **Validate Marks Data**:
   - Roll number format (2-digit)
   - Marks range (0-100)
   - Name minimum length
   - No duplicate rolls in final data

---

## Critical Files Reference

### Files to Create:
1. `src/app/api/extract-khata-marks/route.ts` - API endpoint (~250 lines)
2. `src/components/KhataOCRModal.tsx` - Main component (~600 lines)
3. `src/lib/khataOCRHelpers.ts` - Helper functions (optional, ~150 lines)

### Files to Modify:
1. `src/app/reports/page.tsx` - Add subject filter and upload button
   - Line 86: Add `selectedSubject` state
   - Line 94: Change to use `selectedSubject` instead of "math"
   - Line 522-528: Replace hardcoded subject display with dropdown
   - After line 528: Add upload button and modal

### Files to Reference (Don't Modify):
1. `src/lib/data.ts` - Use existing functions:
   - `getClassMarks()` - Retrieve marks
   - `saveStudentMarks()` - Save marks (line 732)
   - `calculateGrade()` - Calculate grade (line 1188)
   - `SUBJECTS` array - Subject list (lines 210-251)
2. `src/lib/auth.ts` - Use existing functions:
   - `addStudent()` - Create new student
   - `getStudentsForClass()` - Get student list
3. `src/app/api/extract-students/route.ts` - Reference for API pattern
4. `src/components/OCRAnswerSheetScanner.tsx` - Reference for UI pattern

---

## Edge Cases to Handle

1. **OCR Quality Issues**:
   - Low confidence extraction → Show warning, allow manual correction
   - No data extracted → Error message with retry option
   - Partial data (missing marks) → Mark as incomplete in preview

2. **Student Matching**:
   - Student in khata but not in system → Mark as "new", auto-create on save
   - Multiple students with same roll → Show error, require manual fix
   - Roll number mismatch → Fuzzy name matching as fallback

3. **Data Validation**:
   - Marks > 100 or < 0 → Highlight in red, prevent save
   - Invalid roll format → Auto-format if possible, else show error
   - Empty name/roll → Mark as error, require fix

4. **Multiple Images**:
   - Duplicate students across images → Merge, keep highest marks
   - Different students per image → Combine all into one list

5. **Conflicts**:
   - Marks already exist for term → Show warning dialog, require confirmation
   - Save failure → Show error, allow retry

6. **API Errors**:
   - Timeout (>60s) → Show error, allow retry
   - Rate limit exceeded → Disable button with countdown
   - Network error → Show offline message

---

## Verification & Testing

### Manual Testing Checklist:

**Phase 1: Upload Flow**
- [ ] Single image upload works
- [ ] Multiple images upload works (2-3 images)
- [ ] Camera capture works on mobile devices
- [ ] Image preview displays correctly
- [ ] Remove individual image works
- [ ] Upload button disabled without images

**Phase 2: OCR Processing**
- [ ] API endpoint processes single image successfully
- [ ] API endpoint processes multiple images successfully
- [ ] Processing animation shows during API call
- [ ] Timeout handling works (test with very large image)
- [ ] Error messages display correctly in Bengali

**Phase 3: Preview Table**
- [ ] Extracted data populates table correctly
- [ ] Inline editing works for all fields (roll, name, marks)
- [ ] Color coding shows correct match status (green/yellow/red)
- [ ] Delete row removes entry from table
- [ ] Add manual row creates new editable row
- [ ] Validation warnings appear for invalid data
- [ ] Summary stats show correct counts

**Phase 4: Student Matching**
- [ ] Exact roll number match works (existing student → green)
- [ ] New student marked correctly (not in system → yellow)
- [ ] Fuzzy name matching works (typo in name but same roll)
- [ ] Match confidence displayed

**Phase 5: Data Validation**
- [ ] Invalid marks (>100, negative) rejected
- [ ] Invalid roll numbers flagged
- [ ] Duplicate rolls within extracted data detected
- [ ] Empty names/rolls prevented from saving
- [ ] Bengali numerals converted to English correctly

**Phase 6: Save Flow**
- [ ] Check for existing marks works correctly
- [ ] Confirmation dialog shows when marks exist
- [ ] Overwrite confirms and replaces data correctly
- [ ] New students are created in the system
- [ ] Marks saved to localStorage successfully
- [ ] UI refreshes and shows new marks immediately
- [ ] Report cards can be generated with new marks

**Phase 7: Subject Filter**
- [ ] Subject dropdown shows all 5 subjects (Bangla, English, Math, Science, Bangladesh)
- [ ] Changing subject loads correct marks for that subject
- [ ] OCR upload saves to correct subject
- [ ] Report cards show correct subject name

### Test Data Scenarios:

1. **Clear Handwritten Khata** - Good handwriting, clear numerals
2. **Poor Handwriting** - Test OCR accuracy with difficult handwriting
3. **Mixed Numerals** - Bengali and English numerals in same image
4. **Multi-Page Khata** - Upload 3 images with different students
5. **Duplicate Students** - Same student in multiple images with different marks
6. **New Students** - Students in khata but not in system
7. **Existing Marks** - Upload when marks already exist for the term
8. **Invalid Data** - Crossed-out entries, marks >100, missing data
9. **Large Image** - Test timeout with 5MB+ image
10. **Poor Lighting** - Test OCR with dark/blurry image

### Performance Metrics:
- Single image processing: < 10 seconds
- 3 images processing: < 30 seconds
- Preview table loads instantly for 50+ students
- UI remains responsive during processing
- No memory leaks or crashes

### Integration Testing:
- [ ] OCR → Save → Report Card generation works end-to-end
- [ ] OCR → Save → Print report works
- [ ] Multiple terms don't interfere (term 1 marks don't affect term 2)
- [ ] Multiple subjects work independently
- [ ] Multiple classes work independently

---

## Implementation Timeline

**Phase 1** (Day 1-2): API & Utilities
- Create API endpoint
- Create helper functions
- Test API with sample images

**Phase 2** (Day 3-5): UI Component
- Create KhataOCRModal component
- Implement all 5 steps (upload → process → preview → confirm → success)
- Style with Tailwind matching existing design

**Phase 3** (Day 6-7): Integration
- Modify reports page (subject filter + upload button)
- Connect modal to API
- Implement save logic

**Phase 4** (Day 8-10): Testing & Polish
- Manual testing with all scenarios
- Bug fixes
- Edge case handling
- UI polish and animations

**Total Estimated Time**: 10 days (for solo developer)

---

## Success Criteria

✅ Teachers can upload handwritten khata images (single or multiple)
✅ Gemini API extracts roll number, name, and total marks accurately
✅ Teachers can review and edit extracted data before saving
✅ System warns before overwriting existing marks
✅ New students are automatically created if not in system
✅ Marks are saved correctly to localStorage with proper term/subject/class
✅ Subject filter works for all 5 subjects
✅ Report cards can be generated and printed with extracted marks
✅ All error cases handled gracefully with Bengali messages
✅ Mobile-friendly with camera capture support

---

## Notes

- **Data Storage**: Currently using localStorage (migration to Supabase planned for future)
- **OCR Accuracy**: Gemini 2.0 Flash has good Bengali text recognition, but review step is critical for accuracy
- **Subject Limitation**: Current system hardcoded to "math" - this implementation will make it dynamic
- **Print/PDF**: Print functionality exists, PDF download is placeholder (future enhancement)
- **Grading**: Auto-calculated from total marks using existing `calculateGrade()` function
