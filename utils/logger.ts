import pino from 'pino';

// Configure the logger with appropriate options
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: process.env.NODE_ENV !== 'production',
      translateTime: 'SYS:standard',
    },
  },
});

// Helper function to create a child logger with a correlation ID
export function createRequestLogger(correlationId: string) {
  return logger.child({ correlationId });
}

// Export a default logger instance
export default logger;
