/**
 * @file env.ts
 * @description Environment variable validation and configuration
 *
 * Validates required environment variables at application startup
 * Provides type-safe access to environment variables
 */

import { logger } from './logger';

// Environment variable configuration
interface EnvConfig {
  GEMINI_API_KEY?: string;
  OPENAI_API_KEY?: string;
  NODE_ENV: string;
  NEXT_PUBLIC_APP_URL?: string;
}

/**
 * Validate environment variables
 * Warns if optional variables are missing in development
 * Throws error if required variables are missing in production
 */
function validateEnv(): EnvConfig {
  const env: EnvConfig = {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    NODE_ENV: process.env.NODE_ENV || 'development',
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  };

  const isDevelopment = env.NODE_ENV === 'development';
  const isProduction = env.NODE_ENV === 'production';

  // Check for AI API keys
  if (!env.GEMINI_API_KEY && !env.OPENAI_API_KEY) {
    const message = 'No AI API keys found (GEMINI_API_KEY or OPENAI_API_KEY). AI features will not work.';

    if (isProduction) {
      // In production, this is a critical error if AI features are used
      logger.error('⚠️ ' + message);
      // Don't throw error to allow app to start, but log prominently
      logger.error('⚠️ Application starting without AI capabilities');
    } else {
      // In development, just warn
      logger.warn('⚠️ ' + message);
      logger.warn('⚠️ AI features will use mock responses');
    }
  }

  // Validate GEMINI_API_KEY format if provided
  if (env.GEMINI_API_KEY) {
    // Gemini API keys start with "AIza" and are typically 39 characters
    if (!env.GEMINI_API_KEY.startsWith('AIza')) {
      logger.warn('⚠️ GEMINI_API_KEY format looks incorrect (should start with "AIza")');
    }
    if (env.GEMINI_API_KEY.length < 35 || env.GEMINI_API_KEY.length > 45) {
      logger.warn('⚠️ GEMINI_API_KEY length looks incorrect (should be ~39 characters)');
    }
  }

  // Validate OPENAI_API_KEY format if provided
  if (env.OPENAI_API_KEY) {
    // OpenAI API keys start with "sk-"
    if (!env.OPENAI_API_KEY.startsWith('sk-')) {
      logger.warn('⚠️ OPENAI_API_KEY format looks incorrect (should start with "sk-")');
    }
  }

  // Log successful validation in development
  if (isDevelopment) {
    logger.info('✅ Environment variables validated');
    if (env.GEMINI_API_KEY) {
      logger.info('✅ Gemini API key found');
    }
    if (env.OPENAI_API_KEY) {
      logger.info('✅ OpenAI API key found');
    }
  }

  return env;
}

// Run validation and export config
export const env = validateEnv();

// Export helper to check if AI is available
export const isAIAvailable = (): boolean => {
  return !!(env.GEMINI_API_KEY || env.OPENAI_API_KEY);
};

// Export helper to get preferred AI provider
export const getPreferredAIProvider = (): 'gemini' | 'openai' | null => {
  if (env.GEMINI_API_KEY) return 'gemini';
  if (env.OPENAI_API_KEY) return 'openai';
  return null;
};
