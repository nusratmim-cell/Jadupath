/**
 * Generate training JSON files from folder_id_mapping.json
 *
 * This script reads the folder_id_mapping.json and generates
 * individual JSON files for each training module with proper structure.
 *
 * Usage: node scripts/generate-training-json.js
 */

const fs = require('fs');
const path = require('path');

// Paths
const mappingPath = path.join(__dirname, '..', 'content', 'training', 'folder_id_mapping.json');
const imagesBasePath = path.join(__dirname, '..', 'content', 'training', 'topic_segmented_output', 'topic_segmented_output');
const outputDir = path.join(__dirname, '..', 'content', 'training', 'modules');

// Module icons and colors
const MODULE_CONFIG = {
  'M01': {
    id: 'm01-leadership',
    icon: '👔',
    color: 'from-indigo-500 to-blue-600'
  },
  'M02': {
    id: 'm02-professionalism',
    icon: '📚',
    color: 'from-purple-500 to-pink-600'
  },
  'M03': {
    id: 'm03-student-development',
    icon: '👶',
    color: 'from-green-500 to-teal-600'
  },
  'M04': {
    id: 'm04-curriculum',
    icon: '📖',
    color: 'from-orange-500 to-red-600'
  },
  'M05': {
    id: 'm05-bangla',
    icon: '🔤',
    color: 'from-blue-500 to-cyan-600'
  },
  'M06': {
    id: 'm06-english',
    icon: '🇬🇧',
    color: 'from-rose-500 to-amber-600'
  }
};

// Bengali number conversion
function toBengaliNumber(num) {
  const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return num.toString().split('').map(d => bengaliDigits[parseInt(d)] || d).join('');
}

// Get images for a topic from the filesystem
function getTopicImages(moduleId, chapterId, topicId) {
  const topicPath = path.join(imagesBasePath, moduleId, chapterId, topicId);
  const images = [];

  if (fs.existsSync(topicPath)) {
    const files = fs.readdirSync(topicPath);
    for (const file of files) {
      if (/\.(jpg|jpeg|png|gif)$/i.test(file) && !file.startsWith('._')) {
        images.push({
          filename: file,
          relativePath: `content/training/topic_segmented_output/topic_segmented_output/${moduleId}/${chapterId}/${topicId}/${file}`
        });
      }
    }
    // Sort by filename to maintain order (1_9.jpg, 2_10.jpg, etc.)
    images.sort((a, b) => {
      const numA = parseInt(a.filename.split('_')[0]) || 0;
      const numB = parseInt(b.filename.split('_')[0]) || 0;
      return numA - numB;
    });
  }

  return images;
}

// Clean up topic name (remove numbering prefix)
function cleanTopicName(originalName) {
  // Remove leading number and underscore like "01_", "02_", etc.
  return originalName.replace(/^\d+_/, '').replace(/_/g, ' ').trim();
}

// Clean up chapter name
function cleanChapterName(originalName) {
  // Remove leading number patterns like "01_১._", "02_২._", etc.
  return originalName
    .replace(/^\d+_[০-৯]+\._/, '')
    .replace(/^\d+_\d+\._/, '')
    .replace(/^\d+_/, '')
    .replace(/অধ্যায়_\d+_/, '')
    .replace(/_/g, ' ')
    .trim();
}

// Clean up module name
function cleanModuleName(originalName) {
  return originalName.replace(/^\d+_/, '').replace(/_/g, ' ').trim();
}

// Main function
async function generateTrainingJSON() {
  console.log('📄 Reading folder_id_mapping.json...');

  if (!fs.existsSync(mappingPath)) {
    console.error('❌ folder_id_mapping.json not found at:', mappingPath);
    process.exit(1);
  }

  const mapping = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));

  console.log(`📦 Found ${mapping.metadata.total_modules} modules, ${mapping.metadata.total_chapters} chapters, ${mapping.metadata.total_topics} topics`);

  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const allModules = [];

  // Process each module
  for (const module of mapping.modules) {
    const config = MODULE_CONFIG[module.id] || {
      id: module.id.toLowerCase(),
      icon: '📚',
      color: 'from-gray-500 to-gray-600'
    };

    console.log(`\n🎓 Processing: ${module.original_name}`);

    const moduleData = {
      id: config.id,
      name: cleanModuleName(module.original_name),
      description: `${cleanModuleName(module.original_name)} প্রশিক্ষণ মডিউল`,
      icon: config.icon,
      color: config.color,
      chapters: []
    };

    let totalImages = 0;

    // Process chapters
    for (let chapterIndex = 0; chapterIndex < module.chapters.length; chapterIndex++) {
      const chapter = module.chapters[chapterIndex];

      const chapterData = {
        id: chapter.id,
        name: cleanChapterName(chapter.original_name),
        displayOrder: chapterIndex + 1,
        topics: []
      };

      // Process topics
      for (let topicIndex = 0; topicIndex < chapter.topics.length; topicIndex++) {
        const topic = chapter.topics[topicIndex];
        const images = getTopicImages(module.id, chapter.id, topic.id);
        totalImages += images.length;

        const topicData = {
          id: topic.id,
          name: cleanTopicName(topic.original_name),
          duration: `${toBengaliNumber(15 + (topicIndex % 3) * 5)} মিনিট`,
          displayOrder: topicIndex + 1,
          images: images.map(img => img.relativePath),
          videoUrl: null // To be added later
        };

        chapterData.topics.push(topicData);
      }

      moduleData.chapters.push(chapterData);
    }

    allModules.push(moduleData);

    // Write individual module file
    const outputPath = path.join(outputDir, `${config.id}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(moduleData, null, 2), 'utf8');
    console.log(`   ✅ Written: ${config.id}.json (${moduleData.chapters.length} chapters, ${totalImages} images)`);
  }

  // Write combined file
  const combinedPath = path.join(outputDir, 'all-modules.json');
  fs.writeFileSync(combinedPath, JSON.stringify(allModules, null, 2), 'utf8');
  console.log(`\n📦 Combined file written: all-modules.json`);

  // Generate TypeScript content for data.ts
  console.log('\n📝 Generating TypeScript content...');
  const tsContent = generateTypeScriptContent(allModules);
  const tsOutputPath = path.join(outputDir, 'training-data.ts');
  fs.writeFileSync(tsOutputPath, tsContent, 'utf8');
  console.log(`   ✅ Written: training-data.ts`);

  console.log('\n🎉 Done! Generated files:');
  console.log(`   - ${allModules.length} individual module JSON files`);
  console.log('   - all-modules.json (combined)');
  console.log('   - training-data.ts (TypeScript export)');
}

// Generate TypeScript content
function generateTypeScriptContent(modules) {
  let content = `// Auto-generated training data from folder_id_mapping.json
// Generated on: ${new Date().toISOString()}

import type { TrainingCourse, TrainingChapter, TrainingTopic } from './data';

`;

  // Generate each module
  for (const module of modules) {
    const varName = module.id.replace(/-/g, '_').toUpperCase() + '_TRAINING';
    content += `export const ${varName}: TrainingCourse = ${JSON.stringify(module, null, 2)};\n\n`;
  }

  // Generate TRAINING_COURSES array
  content += `export const TRAINING_COURSES: TrainingCourse[] = [\n`;
  for (const module of modules) {
    const varName = module.id.replace(/-/g, '_').toUpperCase() + '_TRAINING';
    content += `  ${varName},\n`;
  }
  content += `];\n`;

  return content;
}

// Run
generateTrainingJSON().catch(console.error);
