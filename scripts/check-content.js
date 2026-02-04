/**
 * Check what content has been uploaded to Supabase
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
  console.error('❌ Supabase credentials not found');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkContent() {
  console.log('📊 Checking uploaded content...\n');

  // Check subjects
  const { data: subjects, error: subjectsError } = await supabase
    .from('subjects')
    .select('*')
    .order('id');

  if (subjectsError) {
    console.error('❌ Error fetching subjects:', subjectsError.message);
  } else {
    console.log('✅ Subjects:', subjects.length);
    subjects.forEach(s => console.log(`   ${s.icon} ${s.name} (${s.id})`));
  }

  console.log('');

  // Check chapters by class and subject
  const { data: chapters, error: chaptersError } = await supabase
    .from('chapters')
    .select('class_id, subject_id, id, name')
    .order('class_id')
    .order('subject_id')
    .order('display_order');

  if (chaptersError) {
    console.error('❌ Error fetching chapters:', chaptersError.message);
  } else {
    console.log('✅ Total Chapters:', chapters.length);
    
    // Group by class and subject
    const grouped = {};
    chapters.forEach(ch => {
      const key = `Class ${ch.class_id} - ${ch.subject_id}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(ch);
    });

    Object.keys(grouped).forEach(key => {
      console.log(`\n   ${key}: ${grouped[key].length} chapters`);
      grouped[key].forEach(ch => {
        console.log(`      - ${ch.name}`);
      });
    });
  }

  console.log('');

  // Check topics
  const { data: topics, error: topicsError } = await supabase
    .from('topics')
    .select('id, name, chapter_id')
    .order('chapter_id')
    .order('display_order');

  if (topicsError) {
    console.error('❌ Error fetching topics:', topicsError.message);
  } else {
    console.log('✅ Total Topics:', topics.length);
  }

  console.log('');

  // Check training courses
  const { data: courses, error: coursesError } = await supabase
    .from('training_courses')
    .select('*')
    .order('id');

  if (coursesError) {
    console.error('❌ Error fetching training courses:', coursesError.message);
  } else {
    console.log('✅ Training Courses:', courses.length);
    if (courses.length > 0) {
      courses.forEach(c => console.log(`   ${c.icon} ${c.name} (${c.id})`));
    } else {
      console.log('   (No training courses uploaded yet)');
    }
  }

  console.log('\n📈 Summary:');
  console.log('   Subjects:', subjects?.length || 0);
  console.log('   Chapters:', chapters?.length || 0);
  console.log('   Topics:', topics?.length || 0);
  console.log('   Training Courses:', courses?.length || 0);
}

checkContent();
