import winston from 'winston';

// Configure log level based on environment
const getLogLevel = () => {
    if (process.env.NODE_ENV === 'test') {
        return process.env.DEBUG_TESTS ? 'debug' : 'error'; // Only show errors in tests unless debug is enabled
    }
    return process.env.LOG_LEVEL || 'info';
};

const logger = winston.createLogger({
    level: getLogLevel(),
    format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
            silent: process.env.NODE_ENV === 'test' && !process.env.DEBUG_TESTS, // Silent in tests unless debug is enabled
        }),
    ],
});

export default logger;
