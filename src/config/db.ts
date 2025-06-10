import mongoose from 'mongoose';
import { colorTheme } from '../types/colorTheme';
import { DataBaseError } from '../types/Errors';

/**
 * @description Connect to MongoDB database with proper configuration
 * @name connectDB
 * @returns {Promise<void>}
 */
const connectDB = async (): Promise<void> => {
    try {
        // Validate environment variable
        const mongoUri = process.env.MONGODB_URI || process.env.DB;

        if (!mongoUri) {
            throw new Error('MongoDB URI is not defined in environment variables');
        }

        // Connection options for better performance and reliability
        const options: mongoose.ConnectOptions = {
            maxPoolSize: 10, // Maintain up to 10 socket connections
            serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
            socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
            bufferCommands: false, // Disable mongoose buffering
        };

        const conn = await mongoose.connect(mongoUri, options);

        console.log(
            colorTheme.info.bold(
                `MongoDB Connected: ${conn.connection.host}:${conn.connection.port}/${conn.connection.name}`
            )
        );

        // Handle connection events
        mongoose.connection.on('error', err => {
            console.error(colorTheme.danger.bold(`MongoDB connection error: ${err}`));
        });

        mongoose.connection.on('disconnected', () => {
            console.log(colorTheme.warning.bold('MongoDB disconnected'));
        });

        // Graceful shutdown
        process.on('SIGINT', async () => {
            await mongoose.connection.close();
            console.log(colorTheme.info.bold('MongoDB connection closed through app termination'));
            process.exit(0);
        });
    } catch (error: any) {
        console.error(colorTheme.danger.bold(`Database connection error: ${error.message}`));
        throw new DataBaseError(`Error connecting to the database: ${error.message}`);
    }
};

export default connectDB;
