/**
 * Upload training courses, chapters, and topics from JSON files to Supabase
 *
 * Usage: node scripts/upload-training.js <json-file-path>
 * Example: node scripts/upload-training.js content/training/professionalism.json
 *
 * JSON file format:
 * {
 *   "id": "professionalism",
 *   "name": "পেশাদারিত্ব",
 *   "description": "শিক্ষকতায় পেশাদারিত্ব উন্নয়ন",
 *   "icon": "👔",
 *   "color": "from-indigo-500 to-indigo-600",
 *   "chapters": [
 *     {
 *       "id": "professionalism-chapter-1",
 *       "name": "শিক্ষকের দায়িত্ব",
 *       "displayOrder": 1,
 *       "topics": [
 *         {
 *           "id": "professionalism-ch1-topic1",
 *           "name": "শ্রেণিকক্ষ ব্যবস্থাপনা",
 *           "duration": "১৫ মিনিট",
 *           "description": "কার্যকর শ্রেণিকক্ষ ব্যবস্থাপনার কৌশল",
 *           "displayOrder": 1,
 *           "pdfUrl": "https://...",
 *           "pdfStartPage": 1,
 *           "video": {
 *             "url": "https://youtube.com/watch?v=...",
 *             "duration": "১৫ মিনিট"
 *           },
 *           "quiz": [
 *             {
 *               "question": "শ্রেণিকক্ষে শৃঙ্খলা বজায় রাখার প্রধান উপায় কোনটি?",
 *               "options": ["ভয় দেখানো", "নিয়ম মেনে চলা", "শাস্তি দেওয়া", "উপেক্ষা করা"],
 *               "correctAnswer": 1
 *             }
 *           ]
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
 * Upload training course from a JSON file
 */
async function uploadTrainingFromJSON(filePath) {
  try {
    console.log('📄 Reading file:', filePath);

    if (!fs.existsSync(filePath)) {
      console.error('❌ File not found:', filePath);
      process.exit(1);
    }

    const jsonContent = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(jsonContent);

    // Validate required fields
    if (!data.id || !data.name || !data.chapters) {
      console.error('❌ Invalid JSON format. Required fields: id, name, chapters');
      process.exit(1);
    }

    console.log(`\n🎓 Uploading training course: ${data.name}`);
    console.log(`   Found ${data.chapters.length} chapters\n`);

    // Upload course
    console.log('⏳ Uploading course...');
    const { data: courseData, error: courseError } = await supabase
      .from('training_courses')
      .upsert([{
        id: data.id,
        name: data.name,
        description: data.description || null,
        icon: data.icon || '📚',
        color: data.color || 'from-gray-500 to-gray-600'
      }], { onConflict: 'id' })
      .select();

    if (courseError) {
      console.error('❌ Error uploading course:', courseError.message);
      console.error('   Details:', courseError.details || courseError.hint);
      process.exit(1);
    }

    console.log(`✅ Uploaded course: ${courseData[0].name}`);

    // Prepare chapters data
    const chapters = data.chapters.map(ch => ({
      id: ch.id,
      course_id: data.id,
      name: ch.name,
      display_order: ch.displayOrder || 0
    }));

    // Upload chapters
    console.log(`⏳ Uploading ${chapters.length} chapters...`);
    const { data: chaptersData, error: chaptersError } = await supabase
      .from('training_chapters')
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
            duration: t.duration || 'N/A',
            description: t.description || null,
            display_order: t.displayOrder || 0,
            pdf_url: t.pdfUrl || null,
            pdf_start_page: t.pdfStartPage || null,
            video_url: t.video?.url || null,
            video_duration: t.video?.duration || null,
            quiz_data: t.quiz ? JSON.stringify(t.quiz) : null
          });
        });
      }
    });

    // Upload topics
    console.log(`⏳ Uploading ${topics.length} topics...`);
    const { data: topicsData, error: topicsError } = await supabase
      .from('training_topics')
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
    console.log(`   Course: ${data.name}`);
    console.log(`   Chapters: ${chaptersData.length}`);
    console.log(`   Topics: ${topicsData.length}`);

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  }
}

/**
 * Upload all training JSON files in a directory
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
      await uploadTrainingFromJSON(file);
      console.log(''); // Blank line between files
    }

    console.log('🎉 All training courses uploaded successfully!');

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  }
}

// Main execution
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('Usage:');
  console.log('  Upload single file:    node scripts/upload-training.js <json-file-path>');
  console.log('  Upload all in folder:  node scripts/upload-training.js <directory-path>');
  console.log('');
  console.log('Examples:');
  console.log('  node scripts/upload-training.js content/training/professionalism.json');
  console.log('  node scripts/upload-training.js content/training');
  process.exit(1);
}

const targetPath = args[0];
const stats = fs.statSync(targetPath);

if (stats.isDirectory()) {
  uploadAllInDirectory(targetPath);
} else {
  uploadTrainingFromJSON(targetPath);
}
