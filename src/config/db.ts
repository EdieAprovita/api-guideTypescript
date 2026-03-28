import mongoose from 'mongoose';
import { DataBaseError } from '../types/Errors.js';
import logger from '../utils/logger.js';

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
            logger.error(error.message);
            logger.warn('MONGODB_URI is not set — database connection will not be established.');
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

        logger.info('Attempting to connect to MongoDB...');
        const conn = await mongoose.connect(mongoUri, options);

        logger.info('MongoDB connected', {
            host: conn.connection.host,
            port: conn.connection.port,
            name: conn.connection.name,
        });

        // Handle connection events
        mongoose.connection.on('error', err => {
            logger.error('MongoDB connection error', { error: String(err) });
        });

        mongoose.connection.on('disconnected', () => {
            logger.warn('MongoDB disconnected');
        });

        mongoose.connection.on('reconnected', () => {
            logger.info('MongoDB reconnected');
        });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
        logger.error('Database connection error', { error: errorMessage });
        // Re-throw to let the caller handle it
        throw new DataBaseError(`Error connecting to the database: ${errorMessage}`);
    }
};

export default connectDB;
