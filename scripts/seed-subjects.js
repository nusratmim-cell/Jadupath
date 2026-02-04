/**
 * Seed subjects data into Supabase
 *
 * This script adds the 5 primary school subjects to the database.
 * Run with: node scripts/seed-subjects.js
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

// Subject data from your application
const subjects = [
  {
    id: 'bangla',
    name: 'বাংলা',
    icon: '📖',
    color: 'from-blue-500 to-blue-600',
    bg_color: 'bg-blue-50',
    text_color: 'text-blue-600',
  },
  {
    id: 'english',
    name: 'ইংরেজি',
    icon: '🔤',
    color: 'from-purple-500 to-purple-600',
    bg_color: 'bg-purple-50',
    text_color: 'text-purple-600',
  },
  {
    id: 'math',
    name: 'গণিত',
    icon: '🔢',
    color: 'from-green-500 to-green-600',
    bg_color: 'bg-green-50',
    text_color: 'text-green-600',
  },
  {
    id: 'science',
    name: 'বিজ্ঞান',
    icon: '🔬',
    color: 'from-orange-500 to-orange-600',
    bg_color: 'bg-orange-50',
    text_color: 'text-orange-600',
  },
  {
    id: 'bangladesh',
    name: 'বাংলাদেশ ও বিশ্বপরিচয়',
    icon: '🌍',
    color: 'from-teal-500 to-teal-600',
    bg_color: 'bg-teal-50',
    text_color: 'text-teal-600',
  },
];

async function seedSubjects() {
  try {
    console.log('🌱 Seeding subjects to Supabase...\n');

    const { data, error } = await supabase
      .from('subjects')
      .upsert(subjects, { onConflict: 'id' })
      .select();

    if (error) {
      console.error('❌ Error seeding subjects:', error.message);
      console.error('   Details:', error.details || error.hint);
      process.exit(1);
    }

    console.log('✅ Successfully seeded', data.length, 'subjects:');
    data.forEach(subject => {
      console.log(`   ${subject.icon} ${subject.name} (${subject.id})`);
    });

    console.log('\n🎉 Seed complete! Your database now has all 5 subjects.');

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  }
}

seedSubjects();
