import app from './app';
import { colorTheme } from './types/colorTheme';

const PORT = process.env.PORT || 5001;

const server = app.listen(PORT, () => {
    console.log(
        colorTheme.secondary.bold(`🚀 Server running in ${process.env.NODE_ENV ?? 'development'} mode on port ${PORT}`)
    );
    console.log(colorTheme.info.bold(`📚 API Documentation available at: http://localhost:${PORT}/api-docs`));
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: Error) => {
    console.log(colorTheme.danger.bold(`❌ Unhandled Rejection: ${err.message}`));
    server.close(() => {
        process.exit(1);
    });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err: Error) => {
    console.log(colorTheme.danger.bold(`❌ Uncaught Exception: ${err.message}`));
    process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log(colorTheme.warning.bold('👋 SIGTERM received. Shutting down gracefully...'));
    server.close(() => {
        console.log(colorTheme.info.bold('✅ Process terminated'));
    });
});
