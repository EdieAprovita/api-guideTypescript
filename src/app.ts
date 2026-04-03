import dotenv from 'dotenv';
import express from 'express';
import compression from 'compression';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import requestLogger from './middleware/requestLogger.js';
import mongoSanitize from 'express-mongo-sanitize';
import { xssSanitizer } from './middleware/xssSanitizer.js';
import { responseWrapper } from './middleware/responseWrapper.js';
import fs from 'node:fs';

import connectDB from './config/db.js';
import { logInfo, logWarn } from './utils/logger.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import corsMiddleware from './middleware/corsOptions.js';
import {
    configureHelmet,
    enforceHTTPS,
    detectSuspiciousActivity,
    limitRequestSize,
    validateUserAgent,
    requireAPIVersion,
    addCorrelationId,
} from './middleware/security.js';
import { sanitizeInput } from './middleware/validation.js';

import userRoutes from './routes/userRoutes.js';
import businessRoutes from './routes/businessRoutes.js';
import recipesRoutes from './routes/recipesRoutes.js';
import marketsRoutes from './routes/marketsRoutes.js';
import restaurantRoutes from './routes/restaurantRoutes.js';
import doctorsRoutes from './routes/doctorsRoutes.js';
import professionProfileRoutes from './routes/professionProfileRoutes.js';
import professionRoutes from './routes/professionRoutes.js';
import postRoutes from './routes/postRoutes.js';
import sanctuaryRoutes from './routes/sanctuaryRoutes.js';
import authRoutes from './routes/authRoutes.js';
import cacheRoutes from './routes/cacheRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import healthRoutes from './routes/healthRoutes.js';
import searchRoutes from './routes/searchRoutes.js';
import swaggerUi, { JsonObject } from 'swagger-ui-express';
import yaml from 'js-yaml';
import basicAuth from './middleware/basicAuth.js';

dotenv.config();

// MongoDB connection state tracking
let isMongoConnected = false;
let mongoConnectionError: Error | null = null;

// Connect to MongoDB asynchronously without blocking server startup
// This is critical for Cloud Run to pass health checks during startup
if (process.env.NODE_ENV !== 'test') {
    if (!process.env.MONGODB_URI) {
        logWarn('MONGODB_URI not set - running without database');
        mongoConnectionError = new Error('MONGODB_URI not configured');
    } else {
        // Start MongoDB connection in background
        connectDB()
            .then(() => {
                isMongoConnected = true;
                logInfo('MongoDB connected');
            })
            .catch(err => {
                isMongoConnected = false;
                mongoConnectionError = err;
                logWarn(`Failed to connect to MongoDB on startup: ${err.message}`);
                if (process.env.NODE_ENV !== 'production') {
                    logInfo('Server will continue running without database connection');
                }
            });
    }
}

// Export connection status for health checks
export const getMongoStatus = () => ({
    connected: isMongoConnected,
    error: mongoConnectionError?.message || null,
});

const app = express();

// In production, trust only the first proxy hop to prevent IP spoofing via
// forged X-Forwarded-For chains while still reading the client IP correctly.
// In non-prod, restrict to loopback only.
app.set('trust proxy', process.env.NODE_ENV === 'production' ? 1 : 'loopback');

// Load Swagger documentation with correct path for production
let swaggerDocument: JsonObject | null = null;
try {
    // In production (dist/), swagger.yaml is copied to the same directory by postbuild
    // In development, it's at ./swagger.yaml relative to project root
    swaggerDocument = yaml.load(fs.readFileSync('./swagger.yaml', 'utf8')) as JsonObject;
    if (process.env.NODE_ENV !== 'production') {
        logInfo('Swagger loaded successfully');
    }
} catch (error) {
    logWarn(`Swagger disabled: ${error instanceof Error ? error.message : 'Unknown error'}`);
}

// Add standard response wrapper
app.use(responseWrapper);

// Correlation ID: must run before request logger so logs include the ID
app.use(addCorrelationId);

// Add request logger early in the middleware chain
app.use(requestLogger);

// Health check endpoints mounted BEFORE requireAPIVersion so probes are never
// blocked by API-version enforcement (M-02: health routes bypass requireAPIVersion)
app.use('/health', healthRoutes);

// Enhanced security middleware configuration
app.use(enforceHTTPS); // Force HTTPS in production
app.use(configureHelmet()); // Enhanced helmet configuration with CSP
if (process.env.NODE_ENV !== 'test') {
    app.use(requireAPIVersion(['v1']));
} // API versioning support
if (process.env.NODE_ENV !== 'test') {
    app.use(validateUserAgent);
} // Block malicious user agents
app.use(limitRequestSize(10 * 1024 * 1024)); // Pre-parse gate: rejects oversized streams via Content-Length header before any body parsing occurs
app.use(express.json({ limit: '10mb' })); // Second line of defense: enforces 10MB cap post-parse
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // Second line of defense: enforces 10MB cap post-parse
app.use(cookieParser());
app.use(detectSuspiciousActivity); // Runs after parsers so req.body is available for pattern inspection

app.use(mongoSanitize()); // prevent MongoDB operator injection
app.use(...sanitizeInput()); // defense-in-depth: mongoSanitize + custom XSS patterns
app.use(xssSanitizer()); // sanitize user input against XSS using secure DOMPurify

app.use(corsMiddleware);
app.use(compression({ level: 6, threshold: 1024 }));

if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}
const enableSwaggerUI = process.env.NODE_ENV !== 'production' || process.env.ENABLE_SWAGGER_UI === 'true';
if (enableSwaggerUI && swaggerDocument) {
    // Protect Swagger UI in production if credentials are provided
    if (process.env.NODE_ENV === 'production') {
        app.use('/api-docs', basicAuth(), swaggerUi.serve, swaggerUi.setup(swaggerDocument));
    } else {
        app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
    }
}

app.get('/', (_req, res) => {
    res.json({
        message: 'Vegan Guide API',
        version: 'v1',
        endpoints: {
            health: '/health',
            api: '/api/v1',
            docs: '/api-docs',
        },
    });
});

app.get('/api/v1', (_req, res) => {
    res.json('API is running');
});

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/businesses', businessRoutes);
app.use('/api/v1/recipes', recipesRoutes);
app.use('/api/v1/markets', marketsRoutes);
app.use('/api/v1/restaurants', restaurantRoutes);
app.use('/api/v1/doctors', doctorsRoutes);
app.use('/api/v1/professionalProfile', professionProfileRoutes);
app.use('/api/v1/professions', professionRoutes);
app.use('/api/v1/posts', postRoutes);
app.use('/api/v1/sanctuaries', sanctuaryRoutes);
app.use('/api/v1/reviews', reviewRoutes);
app.use('/api/v1/search', searchRoutes);

// Cache administration routes
app.use('/api/v1/cache', cacheRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

export default app;
