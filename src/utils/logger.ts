import winston from 'winston';
import path from 'path';
import fs from 'node:fs';

/**
 * @description Logger configuration with Winston
 * Supports multiple transports:
 * - Console (all environments)
 * - File (only in development with write permissions)
 *
 * Cloud Run optimized: Uses console-only logging in production
 */

// Define log levels
const logLevels = {
    fatal: 0,
    error: 1,
    warn: 2,
    info: 3,
    debug: 4,
    trace: 5,
};

// Colors for console output
const logColors = {
    fatal: 'red',
    error: 'red',
    warn: 'yellow',
    info: 'green',
    debug: 'blue',
    trace: 'magenta',
};

winston.addColors(logColors);

// Shared base format
const baseFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.ms(),
    winston.format.errors({ stack: true }),
    winston.format.splat()
);

// Custom format for files
const customFormat = winston.format.combine(baseFormat, winston.format.json());

// Console format for production (JSON for Cloud Logging)
const productionConsoleFormat = winston.format.combine(
    baseFormat,
    winston.format.json()
);

// Console format for development (human-readable)
const developmentConsoleFormat = winston.format.combine(
    baseFormat,
    winston.format.colorize(),
    winston.format.printf(({ level, message, timestamp, ...meta }) => {
        let metaStr = '';
        if (Object.keys(meta).length > 0) {
            metaStr = ` ${JSON.stringify(meta, null, 2)}`;
        }
        return `${timestamp} [${level}]: ${message}${metaStr}`;
    })
);

// Determine if we should use file logging (only in development)
const shouldUseFileLogging = process.env.NODE_ENV === 'development';

// Create logs directory only if needed and possible
let logsDir = '';
let canWriteLogs = false;

if (shouldUseFileLogging) {
    logsDir = path.join(process.cwd(), 'logs');
    try {
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
        }
        canWriteLogs = true;
    } catch (error) {
        console.warn('⚠️  Unable to create logs directory, using console-only logging');
        canWriteLogs = false;
    }
}

// Create transports
const baseTransports: winston.transport[] = [
    // Console transport (always active except in tests)
    new winston.transports.Console({
        format: process.env.NODE_ENV === 'production' ? productionConsoleFormat : developmentConsoleFormat,
        level: process.env.LOG_LEVEL || 'info',
        silent: process.env.NODE_ENV === 'test' && !process.env.DEBUG_TESTS,
    }),
];

// File transports configuration (only in development with write permissions)
const fileTransports: winston.transport[] =
    canWriteLogs && shouldUseFileLogging
        ? [
              new winston.transports.File({
                  filename: path.join(logsDir, 'application.log'),
                  format: customFormat,
                  level: process.env.LOG_LEVEL || 'debug',
                  maxsize: 20 * 1024 * 1024, // 20MB
                  maxFiles: 14, // 14 files
              }),
              new winston.transports.File({
                  filename: path.join(logsDir, 'error.log'),
                  format: customFormat,
                  level: 'error',
                  maxsize: 20 * 1024 * 1024,
                  maxFiles: 30,
              }),
          ]
        : [];

const transports: winston.transport[] = [...baseTransports, ...fileTransports];

// Create generic handler for log files (only if we can write)
const createFileHandler = (filename: string): winston.transport[] =>
    canWriteLogs && process.env.NODE_ENV !== 'test'
        ? [
              new winston.transports.File({
                  filename: path.join(logsDir, filename),
                  format: customFormat,
              }),
          ]
        : [];

const createExceptionHandler = (): winston.transport[] => createFileHandler('exceptions.log');
const createRejectionHandler = (): winston.transport[] => createFileHandler('rejections.log');

// Create logger
const logger = winston.createLogger({
    levels: logLevels,
    format: customFormat,
    defaultMeta: {
        service: 'api-guide-typescript',
        environment: process.env.NODE_ENV || 'development',
    },
    transports,
    exceptionHandlers: createExceptionHandler(),
    rejectionHandlers: createRejectionHandler(),
});

// Export as default and also individual methods
export default logger;

// Export typed convenience methods
export const logInfo = (message: string, meta?: any) => logger.info(message, meta);

// Helper function to process errors
const processError = (message: string, error?: Error | string, meta?: any) => {
    if (error instanceof Error) {
        logger.error(message, { error: error.message, stack: error.stack, ...meta });
    } else {
        logger.error(message, { error, ...meta });
    }
};

export const logError = (message: string, error?: Error | string, meta?: any) => processError(message, error, meta);

export const logWarn = (message: string, meta?: any) => logger.warn(message, meta);
export const logDebug = (message: string, meta?: any) => logger.debug(message, meta);

/**
 * Logs a fatal error. By default, exits the process unless in 'test' environment or shouldExit is false.
 * @param message The error message
 * @param error Optional error object
 * @param meta Optional metadata
 * @param shouldExit Whether to exit the process (default: true)
 */
export const logFatal = (message: string, error?: Error, meta?: any, shouldExit: boolean = true) => {
    processError(message, error, meta);
    if (shouldExit && process.env.NODE_ENV !== 'test') {
        process.exit(1);
    }
};

export { logger };
