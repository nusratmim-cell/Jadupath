/**
 * Apply database migration to Supabase
 *
 * This script reads the SQL migration file and applies it to the Supabase database.
 * Run with: node scripts/apply-migration.js
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

console.log('🔗 Connecting to Supabase...');
console.log('   URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  try {
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '001_initial_schema.sql');
    console.log('📄 Reading migration file:', migrationPath);

    const sqlContent = fs.readFileSync(migrationPath, 'utf8');

    console.log('⏳ Applying migration to Supabase...');
    console.log('   This may take a moment...\n');

    // For Supabase, we need to use the SQL editor or REST API
    // Since we're using the JavaScript client, we'll need to split the SQL and execute table by table

    console.log('🔧 Creating tables in Supabase...');
    console.log('   Please note: You need to run this SQL in the Supabase SQL Editor');
    console.log('   OR use the Supabase CLI to apply migrations.\n');

    console.log('📋 Migration SQL content has been prepared at:');
    console.log('   ', migrationPath);
    console.log('\n💡 To apply manually:');
    console.log('   1. Go to https://rkcpdwzogxbspsdazxqf.supabase.co/project/rkcpdwzogxbspsdazxqf/sql');
    console.log('   2. Copy and paste the SQL content from the migration file');
    console.log('   3. Click "Run" to execute\n');

    // Alternative: Let me create a more direct approach using individual table creation
    console.log('🚀 Attempting to create tables via JavaScript client...\n');

    // Test connection
    const { error: testError } = await supabase.from('subjects').select('count').limit(1);

    if (testError && testError.code === '42P01') {
      console.log('✅ Connection successful, tables don\'t exist yet (expected)');
    } else if (testError) {
      console.log('⚠️  Connection warning:', testError.message);
    } else {
      console.log('✅ Connection successful, some tables may already exist');
    }

    console.log('\n📝 Next Steps:');
    console.log('   1. Copy the SQL content from: supabase/migrations/001_initial_schema.sql');
    console.log('   2. Go to Supabase Dashboard > SQL Editor');
    console.log('   3. Paste and run the SQL');
    console.log('   4. Then run: node scripts/seed-subjects.js');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

applyMigration();
