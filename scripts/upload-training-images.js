/**
 * Upload Training Images to Supabase Storage
 *
 * This script uploads all training images from content/training/topic_segmented_output/
 * to Supabase Storage and updates the JSON files with public URLs.
 *
 * Usage: node scripts/upload-training-images.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET_NAME = 'training-images';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.log('Required:');
  console.log('  - NEXT_PUBLIC_SUPABASE_URL');
  console.log('  - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Create Supabase client with service role key (has full access)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const CONTENT_DIR = path.join(__dirname, '..', 'content', 'training', 'topic_segmented_output', 'topic_segmented_output');
const MODULES_DIR = path.join(__dirname, '..', 'content', 'training', 'modules');

async function createBucket() {
  console.log('📦 Creating storage bucket...');

  // Check if bucket exists
  const { data: buckets } = await supabase.storage.listBuckets();
  const bucketExists = buckets?.some(b => b.name === BUCKET_NAME);

  if (bucketExists) {
    console.log(`   Bucket "${BUCKET_NAME}" already exists`);
    return true;
  }

  // Create bucket with public access
  const { error } = await supabase.storage.createBucket(BUCKET_NAME, {
    public: true,
    fileSizeLimit: 10485760, // 10MB max file size
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg']
  });

  if (error) {
    console.error('❌ Failed to create bucket:', error.message);
    return false;
  }

  console.log(`   ✅ Created bucket "${BUCKET_NAME}"`);
  return true;
}

async function uploadImage(localPath, storagePath) {
  const fileBuffer = fs.readFileSync(localPath);
  const contentType = localPath.endsWith('.png') ? 'image/png' : 'image/jpeg';

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, fileBuffer, {
      contentType,
      upsert: true // Overwrite if exists
    });

  if (error) {
    console.error(`   ❌ Failed to upload ${storagePath}:`, error.message);
    return null;
  }

  // Get public URL
  const { data } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(storagePath);

  return data.publicUrl;
}

async function uploadAllImages() {
  console.log('\n📤 Uploading images to Supabase Storage...\n');

  if (!fs.existsSync(CONTENT_DIR)) {
    console.error(`❌ Content directory not found: ${CONTENT_DIR}`);
    return {};
  }

  const imageUrlMap = {}; // Maps local path to public URL
  let totalImages = 0;
  let uploadedImages = 0;

  // Get all module folders (M01, M02, etc.)
  const modules = fs.readdirSync(CONTENT_DIR).filter(f =>
    fs.statSync(path.join(CONTENT_DIR, f)).isDirectory()
  );

  console.log(`Found ${modules.length} modules to process\n`);

  for (const moduleId of modules) {
    const modulePath = path.join(CONTENT_DIR, moduleId);
    console.log(`📂 Processing ${moduleId}...`);

    // Get all chapter folders
    const chapters = fs.readdirSync(modulePath).filter(f =>
      fs.statSync(path.join(modulePath, f)).isDirectory()
    );

    for (const chapterId of chapters) {
      const chapterPath = path.join(modulePath, chapterId);

      // Get all topic folders
      const topics = fs.readdirSync(chapterPath).filter(f =>
        fs.statSync(path.join(chapterPath, f)).isDirectory()
      );

      for (const topicId of topics) {
        const topicPath = path.join(chapterPath, topicId);

        // Get all image files
        const images = fs.readdirSync(topicPath).filter(f =>
          /\.(png|jpg|jpeg)$/i.test(f)
        );

        totalImages += images.length;

        for (const imageName of images) {
          const localImagePath = path.join(topicPath, imageName);
          const relativePath = `content/training/topic_segmented_output/topic_segmented_output/${moduleId}/${chapterId}/${topicId}/${imageName}`;
          const storagePath = `${moduleId}/${chapterId}/${topicId}/${imageName}`;

          const publicUrl = await uploadImage(localImagePath, storagePath);

          if (publicUrl) {
            imageUrlMap[relativePath] = publicUrl;
            uploadedImages++;

            // Progress indicator
            if (uploadedImages % 50 === 0) {
              console.log(`   Uploaded ${uploadedImages}/${totalImages} images...`);
            }
          }
        }
      }
    }

    console.log(`   ✅ ${moduleId} complete`);
  }

  console.log(`\n✅ Uploaded ${uploadedImages}/${totalImages} images`);
  return imageUrlMap;
}

async function updateModuleJsonFiles(imageUrlMap) {
  console.log('\n📝 Updating module JSON files with public URLs...\n');

  if (!fs.existsSync(MODULES_DIR)) {
    console.error(`❌ Modules directory not found: ${MODULES_DIR}`);
    return;
  }

  // Read all-modules.json
  const allModulesPath = path.join(MODULES_DIR, 'all-modules.json');
  if (!fs.existsSync(allModulesPath)) {
    console.error('❌ all-modules.json not found');
    return;
  }

  const modules = JSON.parse(fs.readFileSync(allModulesPath, 'utf8'));

  let updatedCount = 0;

  for (const module of modules) {
    for (const chapter of module.chapters) {
      for (const topic of chapter.topics) {
        if (topic.images && topic.images.length > 0) {
          // Convert local paths to public URLs
          topic.images = topic.images.map(localPath => {
            if (imageUrlMap[localPath]) {
              updatedCount++;
              return imageUrlMap[localPath];
            }
            return localPath;
          });
        }
      }
    }
  }

  // Save updated all-modules.json
  fs.writeFileSync(allModulesPath, JSON.stringify(modules, null, 2));
  console.log(`   ✅ Updated all-modules.json (${updatedCount} image URLs)`);

  // Also update individual module files
  for (const module of modules) {
    const moduleFileName = `${module.id}.json`;
    const modulePath = path.join(MODULES_DIR, moduleFileName);
    fs.writeFileSync(modulePath, JSON.stringify(module, null, 2));
    console.log(`   ✅ Updated ${moduleFileName}`);
  }

  console.log('\n✅ All JSON files updated with Supabase URLs');
}

async function main() {
  console.log('🚀 Training Images Upload Script\n');
  console.log(`Supabase URL: ${SUPABASE_URL}`);
  console.log(`Bucket: ${BUCKET_NAME}\n`);

  // Step 1: Create bucket
  const bucketCreated = await createBucket();
  if (!bucketCreated) {
    process.exit(1);
  }

  // Step 2: Upload all images
  const imageUrlMap = await uploadAllImages();

  // Step 3: Update JSON files with public URLs
  if (Object.keys(imageUrlMap).length > 0) {
    await updateModuleJsonFiles(imageUrlMap);
  }

  console.log('\n🎉 Done! Your training images are now hosted on Supabase.');
  console.log('\nNext steps:');
  console.log('1. Commit the updated JSON files');
  console.log('2. Push to GitHub');
  console.log('3. Deploy to Vercel');
  console.log('\nThe quiz generation will now use images from Supabase in production!');
}

main().catch(console.error);
