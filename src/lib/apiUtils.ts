/**
 * @file apiUtils.ts
 * @description API utilities for validation, rate limiting, and error handling
 */

import { NextRequest, NextResponse } from "next/server";

// ============= RATE LIMITING =============

interface RateLimitEntry {
  count: number;
  resetTime: number;
  lastAccess: number; // For LRU eviction
}

const MAX_RATE_LIMIT_ENTRIES = 10000; // Prevent unbounded growth
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Clean up expired entries and enforce max size (LRU eviction)
 */
function cleanupRateLimitStore() {
  const now = Date.now();

  // Remove expired entries
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }

  // If still too large, remove oldest accessed entries (LRU)
  if (rateLimitStore.size > MAX_RATE_LIMIT_ENTRIES) {
    const entries = Array.from(rateLimitStore.entries())
      .sort((a, b) => a[1].lastAccess - b[1].lastAccess);

    // Remove oldest 10% of entries
    const toRemove = Math.floor(MAX_RATE_LIMIT_ENTRIES * 0.1);
    for (let i = 0; i < toRemove && i < entries.length; i++) {
      rateLimitStore.delete(entries[i][0]);
    }
  }
}

// Clean up old entries every 5 minutes (with fallback for environments without setInterval)
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupRateLimitStore, 5 * 60 * 1000);
}

interface RateLimitOptions {
  maxRequests?: number; // Default: 10
  windowMs?: number; // Default: 60000 (1 minute)
}

/**
 * Rate limiter middleware
 * @param identifier - Unique identifier (e.g., IP address, user ID)
 * @param options - Rate limit configuration
 */
export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions = {}
): { allowed: boolean; remaining: number; resetTime: number } {
  const { maxRequests = 10, windowMs = 60000 } = options;
  const now = Date.now();

  // Periodically cleanup if store gets too large (manual trigger as backup)
  if (rateLimitStore.size > MAX_RATE_LIMIT_ENTRIES * 1.2) {
    cleanupRateLimitStore();
  }

  const entry = rateLimitStore.get(identifier);

  if (!entry || now > entry.resetTime) {
    // New window or expired entry
    const resetTime = now + windowMs;
    rateLimitStore.set(identifier, { count: 1, resetTime, lastAccess: now });
    return { allowed: true, remaining: maxRequests - 1, resetTime };
  }

  if (entry.count >= maxRequests) {
    // Rate limit exceeded (update lastAccess for LRU)
    entry.lastAccess = now;
    rateLimitStore.set(identifier, entry);
    return { allowed: false, remaining: 0, resetTime: entry.resetTime };
  }

  // Increment count and update lastAccess
  entry.count++;
  entry.lastAccess = now;
  rateLimitStore.set(identifier, entry);
  return { allowed: true, remaining: maxRequests - entry.count, resetTime: entry.resetTime };
}

/**
 * Get client identifier from request (IP address)
 */
export function getClientIdentifier(request: NextRequest): string {
  // Try to get real IP from headers (for proxies/load balancers)
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');

  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  if (realIp) {
    return realIp;
  }

  // Fallback to a generic identifier
  return 'unknown';
}

// ============= API KEY VALIDATION =============

/**
 * Validate Gemini API key format
 */
export function isValidGeminiApiKey(apiKey: string | undefined): boolean {
  if (!apiKey) return false;

  // Gemini API keys typically start with "AIza" and are 39 characters long
  if (!apiKey.startsWith('AIza')) return false;
  if (apiKey.length < 35 || apiKey.length > 45) return false;

  // Should only contain alphanumeric characters, dashes, and underscores
  if (!/^[A-Za-z0-9_-]+$/.test(apiKey)) return false;

  return true;
}

// ============= INPUT VALIDATION =============

/**
 * Validate and sanitize request body
 */
export async function validateRequestBody<T>(
  request: NextRequest,
  schema: {
    [K in keyof T]?: {
      required?: boolean;
      type?: 'string' | 'number' | 'boolean' | 'array' | 'object';
      maxLength?: number;
      minLength?: number;
      pattern?: RegExp;
    };
  }
): Promise<{ valid: boolean; data?: T; error?: string }> {
  try {
    const body = await request.json();

    for (const [key, rules] of Object.entries(schema)) {
      const value = body[key];

      // Type guard for rules
      type RulesType = {
        required?: boolean;
        type?: 'string' | 'number' | 'boolean' | 'array' | 'object';
        maxLength?: number;
        minLength?: number;
        pattern?: RegExp;
      };
      const typedRules = rules as RulesType | undefined;

      // Check required
      if (typedRules?.required && (value === undefined || value === null || value === '')) {
        return { valid: false, error: `${key} is required` };
      }

      // Skip validation if value is not present and not required
      if (value === undefined || value === null) {
        continue;
      }

      // Check type
      if (typedRules?.type) {
        const actualType = Array.isArray(value) ? 'array' : typeof value;
        if (actualType !== typedRules.type) {
          return { valid: false, error: `${key} must be of type ${typedRules.type}` };
        }
      }

      // Check string validations
      if (typeof value === 'string') {
        if (typedRules?.maxLength && value.length > typedRules.maxLength) {
          return { valid: false, error: `${key} exceeds maximum length of ${typedRules.maxLength}` };
        }

        if (typedRules?.minLength && value.length < typedRules.minLength) {
          return { valid: false, error: `${key} must be at least ${typedRules.minLength} characters` };
        }

        if (typedRules?.pattern && !typedRules.pattern.test(value)) {
          return { valid: false, error: `${key} format is invalid` };
        }
      }

      // Check array validations
      if (Array.isArray(value)) {
        if (typedRules?.maxLength && value.length > typedRules.maxLength) {
          return { valid: false, error: `${key} array exceeds maximum length of ${typedRules.maxLength}` };
        }
      }
    }

    return { valid: true, data: body as T };
  } catch (error) {
    return { valid: false, error: 'Invalid JSON in request body' };
  }
}

/**
 * Sanitize string to prevent XSS
 */
export function sanitizeString(str: string): string {
  if (typeof str !== 'string') return '';

  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim()
    .slice(0, 10000); // Max 10k characters
}

// ============= ERROR HANDLING =============

/**
 * Safe JSON parse with error handling
 */
export function safeJsonParse<T>(jsonString: string): { success: boolean; data?: T; error?: string } {
  try {
    const data = JSON.parse(jsonString);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'JSON parse failed' };
  }
}

/**
 * Extract JSON from AI response text with multiple fallback strategies
 * Handles cases where AI includes extra text before/after JSON
 */
export function extractJSONFromAIResponse<T>(text: string): { success: boolean; data?: T; error?: string } {
  if (!text || typeof text !== 'string') {
    return { success: false, error: 'Empty or invalid input' };
  }

  // Strategy 1: Try direct parse (cleanest response)
  try {
    const data = JSON.parse(text.trim());
    return { success: true, data };
  } catch {
    // Continue to next strategy
  }

  // Strategy 2: Extract JSON array [...]
  const arrayMatch = text.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try {
      const data = JSON.parse(arrayMatch[0]);
      return { success: true, data };
    } catch {
      // Continue to next strategy
    }
  }

  // Strategy 3: Extract JSON object {...}
  const objectMatch = text.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    try {
      const data = JSON.parse(objectMatch[0]);
      return { success: true, data };
    } catch {
      // Continue to next strategy
    }
  }

  // Strategy 4: Look for JSON between code blocks (```json ... ```)
  const codeBlockMatch = text.match(/```(?:json)?\s*(\[[\s\S]*?\]|\{[\s\S]*?\})\s*```/);
  if (codeBlockMatch && codeBlockMatch[1]) {
    try {
      const data = JSON.parse(codeBlockMatch[1]);
      return { success: true, data };
    } catch {
      // Continue to next strategy
    }
  }

  // Strategy 5: Find first { or [ and last } or ]
  const firstBrace = Math.min(
    text.indexOf('{') >= 0 ? text.indexOf('{') : Infinity,
    text.indexOf('[') >= 0 ? text.indexOf('[') : Infinity
  );

  const lastBrace = Math.max(
    text.lastIndexOf('}'),
    text.lastIndexOf(']')
  );

  if (firstBrace !== Infinity && lastBrace > firstBrace) {
    const extracted = text.substring(firstBrace, lastBrace + 1);
    try {
      const data = JSON.parse(extracted);
      return { success: true, data };
    } catch {
      // All strategies failed
    }
  }

  return {
    success: false,
    error: 'Could not extract valid JSON from response'
  };
}

/**
 * Create standardized error response
 */
export function createErrorResponse(
  message: string,
  status: number = 500,
  details?: Record<string, unknown>
): NextResponse {
  return NextResponse.json(
    {
      error: message,
      ...(details && { details }),
    },
    { status }
  );
}

/**
 * Create standardized success response
 */
export function createSuccessResponse<T>(
  data: T,
  status: number = 200
): NextResponse {
  return NextResponse.json(
    {
      success: true,
      ...data,
    },
    { status }
  );
}

// ============= TIMEOUT HELPERS =============

/**
 * Add timeout to a promise
 * @param promise - The promise to wrap
 * @param timeoutMs - Timeout in milliseconds (default: 30000 = 30 seconds)
 * @param errorMessage - Custom timeout error message
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 30000,
  errorMessage: string = "Request timeout"
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    ),
  ]);
}

/**
 * Create an AbortController with timeout
 * Returns controller and a promise that rejects on timeout
 */
export function createTimeoutController(timeoutMs: number = 30000): {
  controller: AbortController;
  timeoutPromise: Promise<never>;
} {
  const controller = new AbortController();

  const timeoutPromise = new Promise<never>((_, reject) => {
    const timeout = setTimeout(() => {
      controller.abort();
      reject(new Error('Request timeout'));
    }, timeoutMs);

    // Clear timeout if the controller is manually aborted
    controller.signal.addEventListener('abort', () => {
      clearTimeout(timeout);
    });
  });

  return { controller, timeoutPromise };
}

// ============= STREAMING HELPERS =============

/**
 * Create a streaming response with cleanup
 */
export function createStreamingResponse(
  text: string,
  options: {
    chunkDelay?: number;
    onAbort?: () => void;
  } = {}
): Response {
  const { chunkDelay = 5, onAbort } = options;
  const encoder = new TextEncoder();
  let aborted = false;

  const readableStream = new ReadableStream({
    async start(controller) {
      try {
        const chars = text.split("");
        for (let i = 0; i < chars.length; i++) {
          // Check if stream was aborted
          if (aborted) {
            controller.close();
            onAbort?.();
            return;
          }

          controller.enqueue(encoder.encode(chars[i]));

          // Add delay for smooth streaming
          if (i < chars.length - 1) {
            await new Promise(resolve => setTimeout(resolve, chunkDelay + Math.random() * 5));
          }
        }
        controller.close();
      } catch (error) {
        controller.error(error);
        onAbort?.();
      }
    },
    cancel() {
      // Called when client disconnects
      aborted = true;
      onAbort?.();
    }
  });

  return new Response(readableStream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
      "Cache-Control": "no-cache, no-transform",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
