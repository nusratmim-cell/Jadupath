/**
 * @file logger.ts
 * @description Production-safe logging utility
 *
 * Only logs to console in development mode
 * In production, logs are suppressed to prevent info leakage
 */

const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = {
  log: (...args: any[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },

  info: (...args: any[]) => {
    if (isDevelopment) {
      console.info(...args);
    }
  },

  warn: (...args: any[]) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },

  error: (...args: any[]) => {
    // Always log errors, even in production (for error tracking services)
    console.error(...args);
    // In production, you would send to error tracking service like Sentry
    // if (!isDevelopment) {
    //   // Send to Sentry or other error tracking service
    // }
  },

  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.debug(...args);
    }
  },
};

export default logger;
