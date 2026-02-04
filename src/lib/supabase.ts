/**
 * @file supabase.ts
 * @description Supabase client initialization for database and storage access
 */

import { createClient } from '@supabase/supabase-js';
import { logger } from './logger';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  logger.error('⚠️ Supabase credentials missing. Please check .env.local file.');
  throw new Error('Supabase configuration is missing. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local');
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false, // We're handling our own session management for now
    autoRefreshToken: false,
  },
});

/**
 * Helper to get public URL for storage files
 * @param bucket - Storage bucket name
 * @param path - File path within bucket
 * @returns Public URL to access the file
 */
export const getStorageUrl = (bucket: string, path: string): string => {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
};

/**
 * Check if Supabase connection is working
 */
export async function testSupabaseConnection(): Promise<boolean> {
  try {
    const { error } = await supabase.from('subjects').select('count').limit(1);
    if (error) {
      logger.error('Supabase connection test failed:', error);
      return false;
    }
    logger.info('✅ Supabase connected successfully');
    return true;
  } catch (error) {
    logger.error('Supabase connection error:', error);
    return false;
  }
}

export default supabase;
