import winston from 'winston';
import path from 'path';
import fs from 'fs';

// Crear directorio de logs si no existe
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * @description Logger configuration with Winston
 * Supports multiple transports:
 * - Console (development)
 * - File (rotativo, production)
 * - Error file (solo errores)
 */

// Define los niveles de log
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

// Formato personalizado
const customFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.ms(),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
);

// Formato para consola (desarrollo)
const consoleFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
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
const transports: winston.transport[] = [
    // Console transport (siempre activo excepto en tests)
    new winston.transports.Console({
        format: consoleFormat,
        level: process.env.LOG_LEVEL || 'debug',
        silent: process.env.NODE_ENV === 'test' && !process.env.DEBUG_TESTS,
    }),
];

// Agregar file transports en production
if (process.env.NODE_ENV !== 'development' && process.env.NODE_ENV !== 'test') {
    transports.push(
        // File transport - todos los logs
        new winston.transports.File({
            filename: path.join(logsDir, 'application.log'),
            format: customFormat,
            level: process.env.LOG_LEVEL || 'debug',
            maxsize: 20 * 1024 * 1024, // 20MB
            maxFiles: 14, // 14 archivos
        }),

        // File transport - solo errores
        new winston.transports.File({
            filename: path.join(logsDir, 'error.log'),
            format: customFormat,
            level: 'error',
            maxsize: 20 * 1024 * 1024,
            maxFiles: 30,
        })
    );
}

// Crear logger
const logger = winston.createLogger({
    levels: logLevels,
    format: customFormat,
    defaultMeta: {
        service: 'api-guide-typescript',
        environment: process.env.NODE_ENV || 'development',
    },
    transports,
    exceptionHandlers:
        process.env.NODE_ENV !== 'test'
            ? [
                  new winston.transports.File({
                      filename: path.join(logsDir, 'exceptions.log'),
                      format: customFormat,
                  }),
              ]
            : [],
    rejectionHandlers:
        process.env.NODE_ENV !== 'test'
            ? [
                  new winston.transports.File({
                      filename: path.join(logsDir, 'rejections.log'),
                      format: customFormat,
                  }),
              ]
            : [],
});

// Exportar como default y también métodos individuales
export default logger;

// Exportar métodos de conveniencia tipados
export const logInfo = (message: string, meta?: any) => logger.info(message, meta);
export const logError = (message: string, error?: Error | string, meta?: any) => {
    if (error instanceof Error) {
        logger.error(message, { error: error.message, stack: error.stack, ...meta });
    } else {
        logger.error(message, { error, ...meta });
    }
};
export const logWarn = (message: string, meta?: any) => logger.warn(message, meta);
export const logDebug = (message: string, meta?: any) => logger.debug(message, meta);
export const logFatal = (message: string, error?: Error, meta?: any) => {
    if (error instanceof Error) {
        logger.error(message, { error: error.message, stack: error.stack, ...meta });
    } else {
        logger.error(message, { error, ...meta });
    }
    if (process.env.NODE_ENV !== 'test') {
        process.exit(1);
    }
};

export { logger };
