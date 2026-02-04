/**
 * Validate chapter-topic or training JSON files before uploading
 *
 * Usage: node scripts/validate-data.js <json-file-path> [type]
 * Example: node scripts/validate-data.js content/class-4/math.json chapters
 * Example: node scripts/validate-data.js content/training/professionalism.json training
 *
 * Type defaults to 'chapters' if not specified
 */

const fs = require('fs');
const path = require('path');

/**
 * Validate chapters-topics JSON structure
 */
function validateChaptersJSON(data, filePath) {
  const errors = [];
  const warnings = [];

  // Required fields at root level
  if (!data.classId) {
    errors.push('Missing required field: classId');
  } else if (!['1', '2', '3', '4', '5'].includes(data.classId)) {
    errors.push(`Invalid classId: ${data.classId}. Must be '1', '2', '3', '4', or '5'`);
  }

  if (!data.subjectId) {
    errors.push('Missing required field: subjectId');
  } else if (!['bangla', 'english', 'math', 'science', 'bangladesh'].includes(data.subjectId)) {
    errors.push(`Invalid subjectId: ${data.subjectId}. Must be one of: bangla, english, math, science, bangladesh`);
  }

  if (!data.chapters) {
    errors.push('Missing required field: chapters');
  } else if (!Array.isArray(data.chapters)) {
    errors.push('Field "chapters" must be an array');
  } else if (data.chapters.length === 0) {
    warnings.push('No chapters found in the data');
  } else {
    // Validate each chapter
    data.chapters.forEach((chapter, chapterIndex) => {
      const chapterPath = `chapters[${chapterIndex}]`;

      if (!chapter.id) {
        errors.push(`${chapterPath}: Missing required field: id`);
      }

      if (!chapter.name) {
        errors.push(`${chapterPath}: Missing required field: name`);
      }

      if (chapter.displayOrder === undefined) {
        warnings.push(`${chapterPath}: Missing recommended field: displayOrder`);
      }

      if (!chapter.topics) {
        errors.push(`${chapterPath}: Missing required field: topics`);
      } else if (!Array.isArray(chapter.topics)) {
        errors.push(`${chapterPath}: Field "topics" must be an array`);
      } else if (chapter.topics.length === 0) {
        warnings.push(`${chapterPath}: No topics found`);
      } else {
        // Validate each topic
        chapter.topics.forEach((topic, topicIndex) => {
          const topicPath = `${chapterPath}.topics[${topicIndex}]`;

          if (!topic.id) {
            errors.push(`${topicPath}: Missing required field: id`);
          }

          if (!topic.name) {
            errors.push(`${topicPath}: Missing required field: name`);
          }

          if (topic.displayOrder === undefined) {
            warnings.push(`${topicPath}: Missing recommended field: displayOrder`);
          }

          // Check for page references
          if (topic.pdfStartPage && !topic.pdfEndPage) {
            warnings.push(`${topicPath}: Has pdfStartPage but missing pdfEndPage`);
          }

          if (topic.pdfEndPage && !topic.pdfStartPage) {
            warnings.push(`${topicPath}: Has pdfEndPage but missing pdfStartPage`);
          }

          if (topic.pdfStartPage && topic.pdfEndPage && topic.pdfStartPage > topic.pdfEndPage) {
            errors.push(`${topicPath}: pdfStartPage (${topic.pdfStartPage}) is greater than pdfEndPage (${topic.pdfEndPage})`);
          }

          // Validate nctbBook if present
          if (topic.nctbBook) {
            if (!topic.nctbBook.title) {
              warnings.push(`${topicPath}.nctbBook: Missing title`);
            }
            if (!topic.nctbBook.pdfUrl) {
              warnings.push(`${topicPath}.nctbBook: Missing pdfUrl`);
            }
          }

          // Validate video if present
          if (topic.video) {
            if (!topic.video.url) {
              warnings.push(`${topicPath}.video: Missing url`);
            }
            if (!topic.video.duration) {
              warnings.push(`${topicPath}.video: Missing duration`);
            }
          }
        });
      }
    });
  }

  return { errors, warnings };
}

/**
 * Validate training JSON structure
 */
function validateTrainingJSON(data, filePath) {
  const errors = [];
  const warnings = [];

  // Required fields at root level
  if (!data.id) {
    errors.push('Missing required field: id');
  }

  if (!data.name) {
    errors.push('Missing required field: name');
  }

  if (!data.icon) {
    warnings.push('Missing recommended field: icon');
  }

  if (!data.color) {
    warnings.push('Missing recommended field: color');
  }

  if (!data.chapters) {
    errors.push('Missing required field: chapters');
  } else if (!Array.isArray(data.chapters)) {
    errors.push('Field "chapters" must be an array');
  } else if (data.chapters.length === 0) {
    warnings.push('No chapters found in the data');
  } else {
    // Validate each chapter
    data.chapters.forEach((chapter, chapterIndex) => {
      const chapterPath = `chapters[${chapterIndex}]`;

      if (!chapter.id) {
        errors.push(`${chapterPath}: Missing required field: id`);
      }

      if (!chapter.name) {
        errors.push(`${chapterPath}: Missing required field: name`);
      }

      if (chapter.displayOrder === undefined) {
        warnings.push(`${chapterPath}: Missing recommended field: displayOrder`);
      }

      if (!chapter.topics) {
        errors.push(`${chapterPath}: Missing required field: topics`);
      } else if (!Array.isArray(chapter.topics)) {
        errors.push(`${chapterPath}: Field "topics" must be an array`);
      } else if (chapter.topics.length === 0) {
        warnings.push(`${chapterPath}: No topics found`);
      } else {
        // Validate each topic
        chapter.topics.forEach((topic, topicIndex) => {
          const topicPath = `${chapterPath}.topics[${topicIndex}]`;

          if (!topic.id) {
            errors.push(`${topicPath}: Missing required field: id`);
          }

          if (!topic.name) {
            errors.push(`${topicPath}: Missing required field: name`);
          }

          if (!topic.duration) {
            errors.push(`${topicPath}: Missing required field: duration`);
          }

          if (topic.displayOrder === undefined) {
            warnings.push(`${topicPath}: Missing recommended field: displayOrder`);
          }

          // Validate video if present
          if (topic.video) {
            if (!topic.video.url) {
              warnings.push(`${topicPath}.video: Missing url`);
            }
          }

          // Validate quiz if present
          if (topic.quiz) {
            if (!Array.isArray(topic.quiz)) {
              errors.push(`${topicPath}.quiz: Must be an array`);
            } else {
              topic.quiz.forEach((question, qIndex) => {
                const qPath = `${topicPath}.quiz[${qIndex}]`;

                if (!question.question) {
                  errors.push(`${qPath}: Missing question text`);
                }

                if (!question.options || !Array.isArray(question.options)) {
                  errors.push(`${qPath}: Missing or invalid options array`);
                } else if (question.options.length < 2) {
                  errors.push(`${qPath}: Must have at least 2 options`);
                }

                if (question.correctAnswer === undefined) {
                  errors.push(`${qPath}: Missing correctAnswer`);
                } else if (typeof question.correctAnswer !== 'number') {
                  errors.push(`${qPath}: correctAnswer must be a number (index)`);
                } else if (question.options && (question.correctAnswer < 0 || question.correctAnswer >= question.options.length)) {
                  errors.push(`${qPath}: correctAnswer index out of bounds`);
                }
              });
            }
          }
        });
      }
    });
  }

  return { errors, warnings };
}

/**
 * Main validation function
 */
function validateJSON(filePath, type = 'chapters') {
  try {
    console.log('📄 Validating file:', filePath);
    console.log('   Type:', type);
    console.log('');

    if (!fs.existsSync(filePath)) {
      console.error('❌ File not found:', filePath);
      process.exit(1);
    }

    const jsonContent = fs.readFileSync(filePath, 'utf8');
    let data;

    try {
      data = JSON.parse(jsonContent);
    } catch (parseError) {
      console.error('❌ JSON Parse Error:', parseError.message);
      process.exit(1);
    }

    let result;
    if (type === 'training') {
      result = validateTrainingJSON(data, filePath);
    } else {
      result = validateChaptersJSON(data, filePath);
    }

    const { errors, warnings } = result;

    // Display results
    if (errors.length === 0 && warnings.length === 0) {
      console.log('✅ Validation passed! No issues found.');
      console.log('');

      // Show summary
      if (type === 'training') {
        const chapterCount = data.chapters?.length || 0;
        const topicCount = data.chapters?.reduce((sum, ch) => sum + (ch.topics?.length || 0), 0) || 0;
        console.log('📊 Summary:');
        console.log(`   Course: ${data.name || 'N/A'}`);
        console.log(`   Chapters: ${chapterCount}`);
        console.log(`   Topics: ${topicCount}`);
      } else {
        const chapterCount = data.chapters?.length || 0;
        const topicCount = data.chapters?.reduce((sum, ch) => sum + (ch.topics?.length || 0), 0) || 0;
        console.log('📊 Summary:');
        console.log(`   Class: ${data.classId || 'N/A'}`);
        console.log(`   Subject: ${data.subjectId || 'N/A'}`);
        console.log(`   Chapters: ${chapterCount}`);
        console.log(`   Topics: ${topicCount}`);
      }

      process.exit(0);
    }

    if (errors.length > 0) {
      console.error('❌ Validation failed with errors:');
      console.error('');
      errors.forEach((error, index) => {
        console.error(`   ${index + 1}. ${error}`);
      });
      console.error('');
    }

    if (warnings.length > 0) {
      console.warn('⚠️  Warnings:');
      console.warn('');
      warnings.forEach((warning, index) => {
        console.warn(`   ${index + 1}. ${warning}`);
      });
      console.warn('');
    }

    if (errors.length > 0) {
      console.error('❌ Fix errors before uploading to Supabase');
      process.exit(1);
    } else {
      console.log('✅ Validation passed with warnings');
      console.log('   You can proceed with upload, but consider addressing warnings');
      process.exit(0);
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  }
}

// Main execution
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('Usage:');
  console.log('  node scripts/validate-data.js <json-file-path> [type]');
  console.log('');
  console.log('Type:');
  console.log('  chapters  - Validate chapter-topic JSON (default)');
  console.log('  training  - Validate training course JSON');
  console.log('');
  console.log('Examples:');
  console.log('  node scripts/validate-data.js content/class-4/math.json');
  console.log('  node scripts/validate-data.js content/class-4/math.json chapters');
  console.log('  node scripts/validate-data.js content/training/professionalism.json training');
  process.exit(1);
}

const filePath = args[0];
const type = args[1] || 'chapters';

if (!['chapters', 'training'].includes(type)) {
  console.error('❌ Invalid type. Must be "chapters" or "training"');
  process.exit(1);
}

validateJSON(filePath, type);
