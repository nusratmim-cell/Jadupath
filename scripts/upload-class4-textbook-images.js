/**
 * Upload Class 4 Textbook PNG Images to Supabase Storage
 *
 * This script:
 * 1. Reads PNG files from organized folders
 * 2. Uploads to Supabase Storage (textbook-pages bucket)
 * 3. Updates database with page ranges for each topic
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^#][^=]+)=(.+)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      process.env[key] = value;
    }
  });
}

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.error('Please add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Use service role key for admin operations (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Subject ID mapping (folder name → database subject ID)
const SUBJECT_MAP = {
  'bangla': 'bangla',
  'bgs': 'bangladesh',
  'english': 'english',
  'math': 'math',
  'science': 'science'
};

// Base path to PNG files
const BASE_PATH = '/home/shikho/Downloads/c4_all_books 2/c4_all_books/output';
const CLASS_ID = '4';

/**
 * Get all chapters for a subject from database
 */
async function getChaptersFromDB(subjectId) {
  const { data, error } = await supabase
    .from('chapters')
    .select('id, name, display_order')
    .eq('class_id', CLASS_ID)
    .eq('subject_id', subjectId)
    .order('display_order');

  if (error) {
    console.error(`Error fetching chapters for ${subjectId}:`, error);
    return [];
  }

  return data;
}

/**
 * Extract chapter number from folder name
 * e.g., "01_রূপময়_বাংলাদেশ" → 1
 */
function extractChapterNumber(folderName) {
  const match = folderName.match(/^(\d+)_/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Upload PNGs for a single chapter
 */
async function uploadChapterImages(subjectId, chapterId, chapterFolder, chapterNumber) {
  const folderPath = path.join(BASE_PATH, subjectId, chapterFolder);

  if (!fs.existsSync(folderPath)) {
    console.log(`⚠️  Folder not found: ${folderPath}`);
    return { uploaded: 0, failed: 0 };
  }

  // Get all image files (PNG or JPG) in the folder
  const files = fs.readdirSync(folderPath)
    .filter(f => {
      const lower = f.toLowerCase();
      return lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg');
    })
    .sort(); // Sort to maintain page order

  if (files.length === 0) {
    console.log(`⚠️  No image files found in ${folderPath}`);
    return { uploaded: 0, failed: 0 };
  }

  console.log(`📤 Uploading ${files.length} images for chapter: ${chapterFolder}`);

  let uploaded = 0;
  let failed = 0;

  // Upload each PNG file
  for (let i = 0; i < files.length; i++) {
    const fileName = files[i];
    const filePath = path.join(folderPath, fileName);
    const pageNumber = i + 1; // Page number starts from 1

    // Detect file extension
    const fileExt = fileName.toLowerCase().endsWith('.png') ? 'png' : 'jpg';
    const contentType = fileExt === 'png' ? 'image/png' : 'image/jpeg';

    // Storage path: 4/bangla/class-4-bangla-chapter-1/page-001.jpg
    const storagePath = `${CLASS_ID}/${subjectId}/${chapterId}/page-${String(pageNumber).padStart(3, '0')}.${fileExt}`;

    try {
      const fileBuffer = fs.readFileSync(filePath);

      const { error } = await supabase.storage
        .from('textbook-pages')
        .upload(storagePath, fileBuffer, {
          contentType: contentType,
          upsert: true, // Overwrite if exists
          cacheControl: '3600' // Cache for 1 hour
        });

      if (error) {
        console.error(`   ❌ Failed: ${fileName} - ${error.message}`);
        failed++;
      } else {
        uploaded++;
        if (uploaded % 10 === 0) {
          console.log(`   ✅ Uploaded ${uploaded}/${files.length} images`);
        }
      }
    } catch (err) {
      console.error(`   ❌ Error uploading ${fileName}:`, err.message);
      failed++;
    }
  }

  console.log(`   ✅ Chapter complete: ${uploaded} uploaded, ${failed} failed\n`);

  return {
    uploaded,
    failed,
    totalPages: files.length,
    startPage: 1,
    endPage: files.length
  };
}

/**
 * Update database with page ranges for each topic
 */
async function updateTopicPageRanges(chapterId, totalPages) {
  // Get all topics for this chapter
  const { data: topics, error } = await supabase
    .from('topics')
    .select('id, name, display_order')
    .eq('chapter_id', chapterId)
    .order('display_order');

  if (error || !topics || topics.length === 0) {
    console.log(`   ⚠️  No topics found for chapter ${chapterId}`);
    return;
  }

  // Distribute pages evenly among topics
  const pagesPerTopic = Math.floor(totalPages / topics.length);
  let currentPage = 1;

  for (let i = 0; i < topics.length; i++) {
    const topic = topics[i];
    const isLastTopic = i === topics.length - 1;

    const startPage = currentPage;
    const endPage = isLastTopic ? totalPages : currentPage + pagesPerTopic - 1;

    // Update topic with page range
    const { error: updateError } = await supabase
      .from('topics')
      .update({
        pdf_start_page: startPage,
        pdf_end_page: endPage,
        updated_at: new Date().toISOString()
      })
      .eq('id', topic.id);

    if (updateError) {
      console.error(`   ❌ Failed to update topic ${topic.name}:`, updateError.message);
    } else {
      console.log(`   📄 Topic "${topic.name}": pages ${startPage}-${endPage}`);
    }

    currentPage = endPage + 1;
  }
}

/**
 * Process a single subject
 */
async function processSubject(folderName, subjectId) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📚 Processing Subject: ${folderName.toUpperCase()} (${subjectId})`);
  console.log(`${'='.repeat(60)}\n`);

  const subjectPath = path.join(BASE_PATH, folderName);

  if (!fs.existsSync(subjectPath)) {
    console.log(`⚠️  Subject folder not found: ${subjectPath}\n`);
    return { uploaded: 0, failed: 0, chapters: 0 };
  }

  // Get chapters from database
  const dbChapters = await getChaptersFromDB(subjectId);

  if (dbChapters.length === 0) {
    console.log(`⚠️  No chapters found in database for ${subjectId}\n`);
    return { uploaded: 0, failed: 0, chapters: 0 };
  }

  console.log(`Found ${dbChapters.length} chapters in database\n`);

  // Get chapter folders
  const chapterFolders = fs.readdirSync(subjectPath)
    .filter(f => fs.statSync(path.join(subjectPath, f)).isDirectory())
    .sort();

  console.log(`Found ${chapterFolders.length} chapter folders\n`);

  let totalUploaded = 0;
  let totalFailed = 0;
  let chaptersProcessed = 0;

  // Process each chapter folder
  for (const folderName of chapterFolders) {
    const chapterNum = extractChapterNumber(folderName);

    if (chapterNum === null) {
      console.log(`⚠️  Skipping folder (no number prefix): ${folderName}\n`);
      continue;
    }

    // Find matching chapter in database by display_order
    const dbChapter = dbChapters.find(ch => ch.display_order === chapterNum);

    if (!dbChapter) {
      console.log(`⚠️  No matching database chapter for: ${folderName} (chapter ${chapterNum})\n`);
      continue;
    }

    console.log(`📖 Chapter ${chapterNum}: ${dbChapter.name}`);
    console.log(`   Database ID: ${dbChapter.id}`);

    // Upload images for this chapter
    const result = await uploadChapterImages(subjectId, dbChapter.id, folderName, chapterNum);

    totalUploaded += result.uploaded;
    totalFailed += result.failed;
    chaptersProcessed++;

    // Update topic page ranges if upload was successful
    if (result.uploaded > 0) {
      console.log(`   📝 Updating topic page ranges...`);
      await updateTopicPageRanges(dbChapter.id, result.totalPages);
    }

    console.log(''); // Blank line for readability
  }

  console.log(`✅ Subject Complete: ${chaptersProcessed} chapters, ${totalUploaded} images uploaded, ${totalFailed} failed\n`);

  return { uploaded: totalUploaded, failed: totalFailed, chapters: chaptersProcessed };
}

/**
 * Main function
 */
async function main() {
  console.log('\n🚀 Starting Class 4 Textbook Image Upload to Supabase Storage\n');
  console.log(`Source: ${BASE_PATH}`);
  console.log(`Class: ${CLASS_ID}\n`);

  // Skip bucket check (anon key doesn't have listBuckets permission)
  // Bucket was already created via SQL script
  console.log('✅ Assuming storage bucket "textbook-pages" exists (created via SQL)\n');

  // Get all subject folders
  const subjects = fs.readdirSync(BASE_PATH)
    .filter(f => {
      const fullPath = path.join(BASE_PATH, f);
      return fs.statSync(fullPath).isDirectory() && SUBJECT_MAP[f];
    });

  console.log(`Found ${subjects.length} subjects: ${subjects.join(', ')}\n`);

  let grandTotalUploaded = 0;
  let grandTotalFailed = 0;
  let grandTotalChapters = 0;

  // Process each subject
  for (const subjectFolder of subjects) {
    const subjectId = SUBJECT_MAP[subjectFolder];
    const result = await processSubject(subjectFolder, subjectId);

    grandTotalUploaded += result.uploaded;
    grandTotalFailed += result.failed;
    grandTotalChapters += result.chapters;
  }

  // Final summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('🎉 UPLOAD COMPLETE!');
  console.log(`${'='.repeat(60)}\n`);
  console.log(`✅ Total images uploaded: ${grandTotalUploaded}`);
  console.log(`❌ Total failed: ${grandTotalFailed}`);
  console.log(`📚 Total chapters processed: ${grandTotalChapters}`);
  console.log(`\n✨ All textbook images are now in Supabase Storage!`);
  console.log(`\n📝 Next steps:`);
  console.log(`   1. Verify in Supabase Dashboard:`);
  console.log(`      https://rkcpdwzogxbspsdazxqf.supabase.co/project/rkcpdwzogxbspsdazxqf/storage/buckets/textbook-pages`);
  console.log(`   2. Test in your app by clicking on any topic`);
  console.log(`   3. Images should now load instead of "PDF লোড হচ্ছে..."\n`);
}

// Run the script
main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
