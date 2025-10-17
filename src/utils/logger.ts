import winston from 'winston';
import path from 'path';
import fs from 'node:fs';

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * @description Logger configuration with Winston
 * Supports multiple transports:
 * - Console (development)
 * - File (rotating, production)
 * - Error file (errors only)
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

// Colores para console output
const logColors = {
    fatal: 'red',
    error: 'red',
    warn: 'yellow',
    info: 'green',
    debug: 'blue',
    trace: 'magenta',
};

winston.addColors(logColors);

// Formato base compartido
const baseFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.ms(),
    winston.format.errors({ stack: true }),
    winston.format.splat()
);

// Formato personalizado para archivos
const customFormat = winston.format.combine(baseFormat, winston.format.json());

// Formato para consola (desarrollo)
const consoleFormat = winston.format.combine(
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

// Crear transports
const baseTransports: winston.transport[] = [
    // Console transport (siempre activo excepto en tests)
    new winston.transports.Console({
        format: consoleFormat,
        level: process.env.LOG_LEVEL || 'debug',
        silent: process.env.NODE_ENV === 'test' && !process.env.DEBUG_TESTS,
    }),
];

// Configuración de file transports
const fileTransports: winston.transport[] =
    process.env.NODE_ENV !== 'development' && process.env.NODE_ENV !== 'test'
        ? [
              new winston.transports.File({
                  filename: path.join(logsDir, 'application.log'),
                  format: customFormat,
                  level: process.env.LOG_LEVEL || 'debug',
                  maxsize: 20 * 1024 * 1024, // 20MB
                  maxFiles: 14, // 14 archivos
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

// Crear handler genérico para archivos de log
const createFileHandler = (filename: string): winston.transport[] =>
    process.env.NODE_ENV !== 'test'
        ? [
              new winston.transports.File({
                  filename: path.join(logsDir, filename),
                  format: customFormat,
              }),
          ]
        : [];

const createExceptionHandler = (): winston.transport[] => createFileHandler('exceptions.log');
const createRejectionHandler = (): winston.transport[] => createFileHandler('rejections.log');

// Crear logger
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

// Exportar como default y también métodos individuales
export default logger;

// Exportar métodos de conveniencia tipados
export const logInfo = (message: string, meta?: any) => logger.info(message, meta);

// Función auxiliar para procesar errores
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

export const logFatal = (message: string, error?: Error, meta?: any) => {
    processError(message, error, meta);
    if (process.env.NODE_ENV !== 'test') {
        process.exit(1);
    }
};

export { logger };
