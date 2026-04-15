/**
 * Simple Logger Utility
 * Can be replaced with Winston or Pino for production
 */
type LogLevel = 'info' | 'error' | 'warn' | 'debug';

class Logger {
  log(level: LogLevel, message: string, ...args: unknown[]) {
    const timestamp = new Date().toISOString();
    console[level](`[${timestamp}] [${level.toUpperCase()}]:`, message, ...args);
  }

  info(message: string, ...args: unknown[]) {
    this.log('info', message, ...args);
  }

  error(message: string, ...args: unknown[]) {
    this.log('error', message, ...args);
  }

  warn(message: string, ...args: unknown[]) {
    this.log('warn', message, ...args);
  }

  debug(message: string, ...args: unknown[]) {
    if (process.env.NODE_ENV === 'development') {
      this.log('debug', message, ...args);
    }
  }
}

export const logger = new Logger();