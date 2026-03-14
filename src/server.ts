import dotenv from 'dotenv';
dotenv.config();
import app from './app.js';
import { colorTheme } from './types/colorTheme.js';
import logger, { logWarn } from './utils/logger.js';

// Cloud Run provides PORT via environment variable, default to 8080 for production compatibility
const PORT = process.env.PORT ?? 8080;
// Listen on all network interfaces (0.0.0.0) - REQUIRED for Cloud Run
const HOST = '0.0.0.0';

if (process.env.NODE_ENV === 'production') {
    logger.info(`Starting server in production mode on ${HOST}:${PORT}`);
} else {
    logger.info(colorTheme.info.bold(`🔧 Starting server in ${process.env.NODE_ENV ?? 'development'} mode`));
    logger.info(colorTheme.info.bold(`🔧 Binding to ${HOST}:${PORT}`));
    logger.info(colorTheme.info.bold(`🔧 Node version: ${process.version}`));
}

// Security: warn if JWT_RESET_SECRET is not configured — reset tokens will
// share the same signing key as access tokens, reducing defense-in-depth.
if (!process.env.JWT_RESET_SECRET) {
    logWarn(
        '⚠️  JWT_RESET_SECRET is not set — password-reset tokens will use JWT_SECRET. Set JWT_RESET_SECRET for defense-in-depth.'
    );
}

if (process.env.BYPASS_AUTH_FOR_TESTING === 'true' && process.env.NODE_ENV === 'production') {
    logger.warn('⚠️  BYPASS_AUTH_FOR_TESTING is enabled in production — this is a critical security risk!');
}

const server = app.listen(Number(PORT), HOST, () => {
    if (process.env.NODE_ENV === 'production') {
        logger.info(`🚀 Server is ready and accepting connections on ${HOST}:${PORT}`);
    } else {
        logger.info(
            colorTheme.secondary.bold(
                `🚀 Server running in ${process.env.NODE_ENV ?? 'development'} mode on ${HOST}:${PORT}`
            )
        );
        logger.info(colorTheme.info.bold(`📚 API Documentation available at: http://localhost:${PORT}/api-docs`));
        logger.info(colorTheme.info.bold(`❤️  Health check available at: http://localhost:${PORT}/health`));
        logger.info(colorTheme.success.bold(`✅ Server is ready to accept connections`));
    }
});

// Prevent recursive shutdown handling and keep tests stable when process.exit is mocked by Vitest
let isShuttingDown = false;

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: Error) => {
    logger.error(`Unhandled Rejection: ${err.message}`, { stack: err.stack });
    if (isShuttingDown) return;
    isShuttingDown = true;
    server.close(() => {
        try {
            process.exit(1);
        } catch {
            // In test environments, process.exit is mocked to throw. Swallow to avoid crashing the test runner.
        }
    });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err: Error) => {
    logger.error(`Uncaught Exception: ${err.message}`, { stack: err.stack });
    // Avoid infinite loops when process.exit is mocked by test runner
    if (isShuttingDown || /process\.exit unexpectedly called/i.test(err.message ?? '')) return;
    try {
        process.exit(1);
    } catch {
        // In test environments, process.exit is mocked to throw. Swallow to avoid crashing the test runner.
    }
});

// Graceful shutdown
process.on('SIGTERM', () => {
    logWarn('SIGTERM received. Shutting down gracefully...');
    server.close(() => {
        logger.info('Process terminated');
    });
});

export { server, app };
