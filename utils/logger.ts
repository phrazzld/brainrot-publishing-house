import pino from 'pino';

// Define type for log data
type LogData = Record<string, unknown>;

// Create a browser-compatible logger for client-side
const createClientLogger = () => {
  return {
    info: (obj: LogData) => console.warn('[INFO]', obj),
    debug: (obj: LogData) => console.warn('[DEBUG]', obj),
    warn: (obj: LogData) => console.warn('[WARN]', obj),
    error: (obj: LogData) => console.error('[ERROR]', obj),
    child: (_bindings: LogData) => createClientLogger(),
  };
};

// Configure the logger with appropriate options for server-side
const createServerLogger = () => {
  // Use default export for pino in Node.js environments
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (pino as any)({
    level: process.env.LOG_LEVEL || 'info',
    browser: {
      asObject: true,
    },
  });
};

// Determine if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

// Create the appropriate logger based on environment
export const logger = isBrowser ? createClientLogger() : createServerLogger();

// Helper function to create a child logger with a correlation ID
export function createRequestLogger(correlationId: string) {
  return logger.child({ correlationId });
}

// Type definition for consistent logger interface
export interface Logger {
  info: (obj: LogData) => void;
  debug: (obj: LogData) => void;
  warn: (obj: LogData) => void;
  error: (obj: LogData) => void;
  child: (bindings: LogData) => Logger;
}

// Export a default logger instance
export default logger;
