import dotenv from 'dotenv';
dotenv.config();
import app from './app';
import { colorTheme } from './types/colorTheme';

// Cloud Run provides PORT via environment variable, default to 8080 for production compatibility
const PORT = process.env.PORT ?? 8080;
// Listen on all network interfaces (0.0.0.0) - required for Cloud Run
const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';

const server = app.listen(Number(PORT), HOST, () => {
    console.log(
        colorTheme.secondary.bold(
            `🚀 Server running in ${process.env.NODE_ENV ?? 'development'} mode on ${HOST}:${PORT}`
        )
    );
    console.log(colorTheme.info.bold(`📚 API Documentation available at: http://localhost:${PORT}/api-docs`));
});

// Prevent recursive shutdown handling and keep tests stable when process.exit is mocked by Vitest
let isShuttingDown = false;

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: Error) => {
    console.log(colorTheme.danger.bold(`❌ Unhandled Rejection: ${err.message}`));
    if (isShuttingDown) return;
    isShuttingDown = true;
    server.close(() => {
        try {
            process.exit(1);
        } catch (_e) {
            // In test environments, process.exit is mocked to throw. Swallow to avoid crashing the test runner.
        }
    });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err: Error) => {
    console.log(colorTheme.danger.bold(`❌ Uncaught Exception: ${err.message}`));
    // Avoid infinite loops when process.exit is mocked by test runner
    if (isShuttingDown || /process\.exit unexpectedly called/i.test(err.message ?? '')) return;
    try {
        process.exit(1);
    } catch (_e) {
        // In test environments, process.exit is mocked to throw. Swallow to avoid crashing the test runner.
    }
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log(colorTheme.warning.bold('👋 SIGTERM received. Shutting down gracefully...'));
    server.close(() => {
        console.log(colorTheme.info.bold('✅ Process terminated'));
    });
});

export { app, server };
