/**
 * Correlation ID utilities for request tracing
 * Part of Microservice Architecture (Phase 3)
 */

/**
 * Generate a unique correlation ID for request tracing
 */
export function generateCorrelationId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 10);
  return `${timestamp}-${randomPart}`;
}

/**
 * Extract correlation ID from request headers or generate new one
 */
export function getCorrelationId(req: Request): string {
  return req.headers.get('x-correlation-id') || 
         req.headers.get('x-request-id') || 
         generateCorrelationId();
}

/**
 * Logger with correlation ID support
 */
export interface CorrelatedLogger {
  info: (message: string, data?: Record<string, unknown>) => void;
  warn: (message: string, data?: Record<string, unknown>) => void;
  error: (message: string, data?: Record<string, unknown>) => void;
  debug: (message: string, data?: Record<string, unknown>) => void;
}

/**
 * Create a logger instance with correlation ID
 */
export function createLogger(correlationId: string, functionName: string): CorrelatedLogger {
  const log = (level: string, message: string, data?: Record<string, unknown>) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      correlationId,
      function: functionName,
      level,
      message,
      ...(data && { data }),
    };
    
    if (level === 'error') {
      console.error(JSON.stringify(logEntry));
    } else if (level === 'warn') {
      console.warn(JSON.stringify(logEntry));
    } else {
      console.log(JSON.stringify(logEntry));
    }
  };

  return {
    info: (message, data) => log('info', message, data),
    warn: (message, data) => log('warn', message, data),
    error: (message, data) => log('error', message, data),
    debug: (message, data) => log('debug', message, data),
  };
}

/**
 * Add correlation ID to response headers
 */
export function withCorrelationHeaders(
  headers: Record<string, string>,
  correlationId: string
): Record<string, string> {
  return {
    ...headers,
    'x-correlation-id': correlationId,
  };
}
