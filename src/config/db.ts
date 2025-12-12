import mongoose from 'mongoose';
import { colorTheme } from '../types/colorTheme.js';
import { DataBaseError } from '../types/Errors.js';

/**
 * @description Connect to MongoDB database with proper configuration
 * @name connectDB
 * @returns {Promise<void>}
 */
const connectDB = async (): Promise<void> => {
    try {
        // Validate environment variable
        const mongoUri = process.env.MONGODB_URI;

        if (!mongoUri) {
            const error = new Error('MONGODB_URI is not defined in environment variables');
            console.error(colorTheme.danger.bold(error.message));
            console.log(
                colorTheme.warning.bold('⚠️  Continuing without database connection. Some features may be unavailable.')
            );
            throw error;
        }

        // Connection options for better performance and reliability in Cloud Run
        const options: mongoose.ConnectOptions = {
            maxPoolSize: 10, // Maintain up to 10 socket connections
            serverSelectionTimeoutMS: 10000, // Increased timeout for Cloud Run (10 seconds)
            socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
            connectTimeoutMS: 10000, // Timeout for initial connection (10 seconds)
            bufferCommands: false, // Disable mongoose buffering
            retryWrites: true, // Retry write operations
        };

        console.log(colorTheme.info.bold('🔄 Attempting to connect to MongoDB...'));
        const conn = await mongoose.connect(mongoUri, options);

        console.log(
            colorTheme.info.bold(
                `✅ MongoDB Connected: ${conn.connection.host}:${conn.connection.port}/${conn.connection.name}`
            )
        );

        // Handle connection events
        mongoose.connection.on('error', err => {
            console.error(colorTheme.danger.bold(`❌ MongoDB connection error: ${err}`));
        });

        mongoose.connection.on('disconnected', () => {
            console.log(colorTheme.warning.bold('⚠️  MongoDB disconnected'));
        });

        mongoose.connection.on('reconnected', () => {
            console.log(colorTheme.info.bold('✅ MongoDB reconnected'));
        });

        // Graceful shutdown
        process.on('SIGINT', async () => {
            await mongoose.connection.close();
            console.log(colorTheme.info.bold('👋 MongoDB connection closed through app termination'));
            process.exit(0);
        });

        // SIGTERM handler for Cloud Run graceful shutdown
        process.on('SIGTERM', async () => {
            console.log(colorTheme.warning.bold('👋 SIGTERM received, closing MongoDB connection...'));
            await mongoose.connection.close();
            console.log(colorTheme.info.bold('✅ MongoDB connection closed'));
        });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
        console.error(colorTheme.danger.bold(`❌ Database connection error: ${errorMessage}`));
        // Re-throw to let the caller handle it
        throw new DataBaseError(`Error connecting to the database: ${errorMessage}`);
    }
};

export default connectDB;
