import { Logger } from '@/utils/logger';

/**
 * Maximum length for response body text in logs
 * Truncated to avoid excessive log size while still providing useful context
 */
export const MAX_RESPONSE_BODY_LOG_LENGTH = 500;

/**
 * Sanitizes a URL for logging to remove sensitive information
 * This enhanced version provides more detailed sanitization while protecting sensitive data
 *
 * @param url The URL to sanitize
 * @returns A sanitized version of the URL suitable for logging
 */
export function sanitizeUrlForLogging(url: string): string {
  try {
    // Try to parse as URL
    const parsedUrl = new URL(url);

    // List of parameter names that should be completely redacted
    const sensitiveParams = [
      'key',
      'token',
      'auth',
      'password',
      'secret',
      'apikey',
      'api_key',
      'jwt',
    ];

    // Create a safe version with hostname and pathname
    let safeUrl = `${parsedUrl.protocol}//${parsedUrl.host}${parsedUrl.pathname}`;

    // If there are search parameters, selectively redact sensitive ones
    if (parsedUrl.search) {
      const params = new URLSearchParams(parsedUrl.search);
      const safeParams = new URLSearchParams();

      // Iterate through all parameters and redact sensitive ones
      params.forEach((value, key) => {
        if (sensitiveParams.includes(key.toLowerCase())) {
          // Completely redact sensitive parameters
          safeParams.append(key, '[REDACTED]');
        } else if (value.length > 20) {
          // Truncate long values which might contain encoded sensitive data
          safeParams.append(key, value.substring(0, 10) + '...[truncated]');
        } else {
          // Keep other parameters as is
          safeParams.append(key, value);
        }
      });

      // Only add the search string if there are parameters after filtering
      const safeSearch = safeParams.toString();
      if (safeSearch) {
        safeUrl += `?${safeSearch}`;
      }
    }

    return safeUrl;
  } catch {
    // If URL parsing fails, redact the whole thing to be safe
    return '[unparseable-url]';
  }
}

/**
 * Safely logs errors to prevent logger crashes
 * 
 * @param logger Logger instance to use
 * @param level Log level to use
 * @param data Data to log
 */
export function safeLog(
  logger: Logger,
  level: 'info' | 'warn' | 'error' | 'debug',
  data: Record<string, unknown>,
): void {
  try {
    logger[level](data);
  } catch {
    // Fallback to console if logger fails
    console.error(`[${level.toUpperCase()}]`, data);
  }
}