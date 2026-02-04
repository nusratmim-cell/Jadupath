/**
 * Upload chapters and topics from JSON files to Supabase
 *
 * Usage: node scripts/upload-chapters.js <json-file-path>
 * Example: node scripts/upload-chapters.js content/class-4/math.json
 *
 * JSON file format:
 * {
 *   "classId": "4",
 *   "subjectId": "math",
 *   "chapters": [
 *     {
 *       "id": "class-4-math-chapter-1",
 *       "name": "স্বাভাবিক সংখ্যা",
 *       "displayOrder": 1,
 *       "topics": [
 *         {
 *           "id": "class-4-math-ch1-topic1",
 *           "name": "যোগ ও বিয়োগ",
 *           "description": "যোগ ও বিয়োগের মৌলিক ধারণা",
 *           "displayOrder": 1,
 *           "pdfStartPage": 5,
 *           "pdfEndPage": 12,
 *           "nctbBook": {
 *             "title": "গণিত - চতুর্থ শ্রেণী",
 *             "pdfUrl": "https://...",
 *             "pages": 150
 *           },
 *           "video": {
 *             "title": "যোগ ও বিয়োগ শিখি",
 *             "url": "https://youtube.com/watch?v=...",
 *             "duration": "১৫ মিনিট",
 *             "thumbnail": "https://..."
 *           }
 *         }
 *       ]
 *     }
 *   ]
 * }
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables from .env.local
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
 * Upload chapters and topics from a JSON file
 */
async function uploadChaptersFromJSON(filePath) {
  try {
    console.log('📄 Reading file:', filePath);

    if (!fs.existsSync(filePath)) {
      console.error('❌ File not found:', filePath);
      process.exit(1);
    }

    const jsonContent = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(jsonContent);

    // Validate required fields
    if (!data.classId || !data.subjectId || !data.chapters) {
      console.error('❌ Invalid JSON format. Required fields: classId, subjectId, chapters');
      process.exit(1);
    }

    console.log(`\n📚 Uploading content for Class ${data.classId} - ${data.subjectId}`);
    console.log(`   Found ${data.chapters.length} chapters\n`);

    // Prepare chapters data
    const chapters = data.chapters.map(ch => ({
      id: ch.id,
      class_id: data.classId,
      subject_id: data.subjectId,
      name: ch.name,
      display_order: ch.displayOrder || 0
    }));

    // Upload chapters
    console.log('⏳ Uploading chapters...');
    const { data: chaptersData, error: chaptersError } = await supabase
      .from('chapters')
      .upsert(chapters, { onConflict: 'id' })
      .select();

    if (chaptersError) {
      console.error('❌ Error uploading chapters:', chaptersError.message);
      console.error('   Details:', chaptersError.details || chaptersError.hint);
      process.exit(1);
    }

    console.log(`✅ Uploaded ${chaptersData.length} chapters`);

    // Prepare topics data
    const topics = [];
    data.chapters.forEach(ch => {
      if (ch.topics && Array.isArray(ch.topics)) {
        ch.topics.forEach(t => {
          topics.push({
            id: t.id,
            chapter_id: ch.id,
            name: t.name,
            description: t.description || null,
            display_order: t.displayOrder || 0,
            pdf_start_page: t.pdfStartPage || null,
            pdf_end_page: t.pdfEndPage || null,
            nctb_book_title: t.nctbBook?.title || null,
            nctb_book_pdf_url: t.nctbBook?.pdfUrl || null,
            nctb_book_total_pages: t.nctbBook?.pages || null,
            video_title: t.video?.title || null,
            video_url: t.video?.url || null,
            video_duration: t.video?.duration || null,
            video_thumbnail_url: t.video?.thumbnail || null
          });
        });
      }
    });

    // Upload topics
    console.log(`⏳ Uploading ${topics.length} topics...`);
    const { data: topicsData, error: topicsError } = await supabase
      .from('topics')
      .upsert(topics, { onConflict: 'id' })
      .select();

    if (topicsError) {
      console.error('❌ Error uploading topics:', topicsError.message);
      console.error('   Details:', topicsError.details || topicsError.hint);
      process.exit(1);
    }

    console.log(`✅ Uploaded ${topicsData.length} topics`);

    // Summary
    console.log('\n🎉 Upload complete!');
    console.log(`   Class: ${data.classId}`);
    console.log(`   Subject: ${data.subjectId}`);
    console.log(`   Chapters: ${chaptersData.length}`);
    console.log(`   Topics: ${topicsData.length}`);

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  }
}

/**
 * Upload all JSON files in a directory
 */
async function uploadAllInDirectory(directoryPath) {
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
      console.log('⚠️  No JSON files found in directory');
      process.exit(0);
    }

    console.log(`   Found ${files.length} JSON files\n`);

    for (const file of files) {
      await uploadChaptersFromJSON(file);
      console.log(''); // Blank line between files
    }

    console.log('🎉 All files uploaded successfully!');

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  }
}

// Main execution
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('Usage:');
  console.log('  Upload single file:    node scripts/upload-chapters.js <json-file-path>');
  console.log('  Upload all in folder:  node scripts/upload-chapters.js <directory-path>');
  console.log('');
  console.log('Examples:');
  console.log('  node scripts/upload-chapters.js content/class-4/math.json');
  console.log('  node scripts/upload-chapters.js content/class-4');
  process.exit(1);
}

const targetPath = args[0];
const stats = fs.statSync(targetPath);

if (stats.isDirectory()) {
  uploadAllInDirectory(targetPath);
} else {
  uploadChaptersFromJSON(targetPath);
}
