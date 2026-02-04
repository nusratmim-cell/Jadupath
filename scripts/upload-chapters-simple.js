/**
 * Upload chapters from simplified JSON format
 *
 * Handles this format:
 * {
 *   "book_name": "bangla",
 *   "total_chapters": 23,
 *   "chapters": [
 *     {
 *       "name": "01_রূপময়_বাংলাদেশ",
 *       "start_page": 1,
 *       "end_page": 6
 *     }
 *   ]
 * }
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    const value = match[2].trim();
    envVars[key] = value;
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials not found in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Convert simplified format to Supabase format and upload
 */
async function uploadSimpleFormat(filePath, classId) {
  try {
    console.log('📄 Reading file:', filePath);

    if (!fs.existsSync(filePath)) {
      console.error('❌ File not found:', filePath);
      process.exit(1);
    }

    const jsonContent = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(jsonContent);

    if (!data.book_name || !data.chapters) {
      console.error('❌ Invalid format. Expected: book_name, chapters');
      process.exit(1);
    }

    const subjectId = data.book_name;
    console.log(`\n📚 Uploading: Class ${classId} - ${subjectId}`);
    console.log(`   Found ${data.chapters.length} chapters\n`);

    // Convert chapters to Supabase format
    const chaptersToUpload = data.chapters.map((ch, index) => {
      // Clean chapter name (remove number prefix)
      const cleanName = ch.name.replace(/^\d+_/, '').replace(/_/g, ' ');

      return {
        id: `class-${classId}-${subjectId}-chapter-${index + 1}`,
        class_id: classId,
        subject_id: subjectId,
        name: cleanName,
        display_order: index + 1
      };
    });

    // Upload chapters
    console.log(`⏳ Uploading ${chaptersToUpload.length} chapters...`);
    const { data: chaptersData, error: chaptersError } = await supabase
      .from('chapters')
      .upsert(chaptersToUpload, { onConflict: 'id' })
      .select();

    if (chaptersError) {
      console.error('❌ Error uploading chapters:', chaptersError.message);
      console.error('   Details:', chaptersError.details || chaptersError.hint);
      process.exit(1);
    }

    console.log(`✅ Uploaded ${chaptersData.length} chapters`);

    // Convert to topics (each chapter becomes one topic with page range)
    const topicsToUpload = data.chapters.map((ch, index) => {
      const cleanName = ch.name.replace(/^\d+_/, '').replace(/_/g, ' ');
      const chapterId = `class-${classId}-${subjectId}-chapter-${index + 1}`;

      return {
        id: `${chapterId}-topic-1`,
        chapter_id: chapterId,
        name: cleanName,
        display_order: 1,
        pdf_start_page: ch.start_page,
        pdf_end_page: ch.end_page,
        nctb_book_title: `${subjectId} - Class ${classId}`,
        nctb_book_pdf_url: `https://cdn.example.com/textbooks/class-${classId}-${subjectId}.pdf`,
        nctb_book_total_pages: Math.max(...data.chapters.map(c => c.end_page))
      };
    });

    // Upload topics
    console.log(`⏳ Uploading ${topicsToUpload.length} topics...`);
    const { data: topicsData, error: topicsError } = await supabase
      .from('topics')
      .upsert(topicsToUpload, { onConflict: 'id' })
      .select();

    if (topicsError) {
      console.error('❌ Error uploading topics:', topicsError.message);
      console.error('   Details:', topicsError.details || topicsError.hint);
      process.exit(1);
    }

    console.log(`✅ Uploaded ${topicsData.length} topics`);

    console.log('\n🎉 Upload complete!');
    console.log(`   Class: ${classId}`);
    console.log(`   Subject: ${subjectId}`);
    console.log(`   Chapters: ${chaptersData.length}`);
    console.log(`   Topics: ${topicsData.length}`);

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  }
}

/**
 * Upload all files in a directory
 */
async function uploadDirectory(directoryPath, classId) {
  try {
    console.log('📁 Scanning directory:', directoryPath);

    if (!fs.existsSync(directoryPath)) {
      console.error('❌ Directory not found:', directoryPath);
      process.exit(1);
    }

    const files = fs.readdirSync(directoryPath)
      .filter(file => file.endsWith('.json'))
      .map(file => path.join(directoryPath, file));

    if (files.length === 0) {
      console.log('⚠️  No JSON files found');
      process.exit(0);
    }

    console.log(`   Found ${files.length} JSON files\n`);

    for (const file of files) {
      await uploadSimpleFormat(file, classId);
      console.log('');
    }

    console.log('🎉 All files uploaded successfully!');

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  }
}

// Main execution
const args = process.argv.slice(2);

if (args.length < 2) {
  console.log('Usage:');
  console.log('  Upload single file:    node scripts/upload-chapters-simple.js <classId> <json-file>');
  console.log('  Upload directory:      node scripts/upload-chapters-simple.js <classId> <directory>');
  console.log('');
  console.log('Examples:');
  console.log('  node scripts/upload-chapters-simple.js 4 content/class-4/bangla.json');
  console.log('  node scripts/upload-chapters-simple.js 4 content/class-4');
  process.exit(1);
}

const classId = args[0];
const targetPath = args[1];

// Validate classId
if (!['1', '2', '3', '4', '5'].includes(classId)) {
  console.error('❌ Invalid classId. Must be 1, 2, 3, 4, or 5');
  process.exit(1);
}

const stats = fs.statSync(targetPath);

if (stats.isDirectory()) {
  uploadDirectory(targetPath, classId);
} else {
  uploadSimpleFormat(targetPath, classId);
}
