/**
 * @file circuitBreaker.ts
 * @description Circuit breaker pattern implementation for AI API resilience
 *
 * Prevents cascading failures when AI services are down by:
 * - Opening circuit after threshold failures
 * - Providing fallback responses
 * - Automatically attempting recovery after timeout
 */

import { logger } from './logger';
import ERROR_MESSAGES from './errorMessages';

enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Too many failures, reject requests
  HALF_OPEN = 'HALF_OPEN' // Testing if service recovered
}

interface CircuitBreakerOptions {
  failureThreshold?: number;  // Number of failures before opening (default: 5)
  successThreshold?: number;  // Number of successes in half-open to close (default: 2)
  timeout?: number;           // Time to wait before half-open attempt (ms, default: 60000)
}

class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private nextAttempt: number = Date.now();

  private failureThreshold: number;
  private successThreshold: number;
  private timeout: number;

  private serviceName: string;

  constructor(serviceName: string, options: CircuitBreakerOptions = {}) {
    this.serviceName = serviceName;
    this.failureThreshold = options.failureThreshold || 5;
    this.successThreshold = options.successThreshold || 2;
    this.timeout = options.timeout || 60000; // 1 minute
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(
    fn: () => Promise<T>,
    fallback?: () => T | Promise<T>
  ): Promise<T> {
    // Check if circuit is open
    if (this.state === CircuitState.OPEN) {
      if (Date.now() < this.nextAttempt) {
        logger.warn(`Circuit breaker OPEN for ${this.serviceName}, using fallback`);

        if (fallback) {
          return await fallback();
        }

        throw new Error(ERROR_MESSAGES.AI.SERVICE_UNAVAILABLE);
      }

      // Time to try again
      this.state = CircuitState.HALF_OPEN;
      this.successCount = 0;
      logger.info(`Circuit breaker entering HALF_OPEN state for ${this.serviceName}`);
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();

      if (fallback) {
        logger.warn(`${this.serviceName} failed, using fallback`);
        return await fallback();
      }

      throw error;
    }
  }

  /**
   * Handle successful execution
   */
  private onSuccess(): void {
    this.failureCount = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;

      if (this.successCount >= this.successThreshold) {
        this.state = CircuitState.CLOSED;
        logger.info(`Circuit breaker CLOSED for ${this.serviceName}`);
      }
    }
  }

  /**
   * Handle failed execution
   */
  private onFailure(): void {
    this.failureCount++;

    if (this.failureCount >= this.failureThreshold) {
      this.state = CircuitState.OPEN;
      this.nextAttempt = Date.now() + this.timeout;
      logger.error(
        `Circuit breaker OPEN for ${this.serviceName} after ${this.failureCount} failures. ` +
        `Will retry at ${new Date(this.nextAttempt).toISOString()}`
      );
    }
  }

  /**
   * Get current circuit state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Manually reset the circuit breaker
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    logger.info(`Circuit breaker manually reset for ${this.serviceName}`);
  }
}

// Create singleton circuit breakers for different AI services
export const geminiCircuitBreaker = new CircuitBreaker('Gemini AI', {
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 60000, // 1 minute
});

export const openaiCircuitBreaker = new CircuitBreaker('OpenAI', {
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 60000,
});

/**
 * Helper to execute AI request with circuit breaker and fallback
 */
export async function executeWithCircuitBreaker<T>(
  circuitBreaker: CircuitBreaker,
  fn: () => Promise<T>,
  mockFallback?: T
): Promise<T> {
  return circuitBreaker.execute(
    fn,
    mockFallback
      ? async () => {
          logger.warn('Using mock fallback response');
          return mockFallback;
        }
      : undefined
  );
}

export { CircuitBreaker, CircuitState };
