import dotenv from 'dotenv';
import express from 'express';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import requestLogger from './middleware/requestLogger.js';
import { xssSanitizer } from './middleware/xssSanitizer.js';
import { responseWrapper } from './middleware/responseWrapper.js';
import fs from 'node:fs';

import connectDB from './config/db.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import corsMiddleware from './middleware/corsOptions.js';
import {
    configureHelmet,
    enforceHTTPS,
    detectSuspiciousActivity,
    limitRequestSize,
    validateUserAgent,
    requireAPIVersion,
} from './middleware/security.js';

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
    // Start MongoDB connection in background
    connectDB()
        .then(() => {
            isMongoConnected = true;
            console.log('✅ MongoDB connected successfully');
        })
        .catch(err => {
            isMongoConnected = false;
            mongoConnectionError = err;
            console.error('⚠️  Failed to connect to MongoDB on startup:', err.message);
            console.log('📌 Server will continue running without database connection');
            // Continue running - the app can still serve health checks and may reconnect later
        });
}

// Export connection status for health checks
export const getMongoStatus = () => ({
    connected: isMongoConnected,
    error: mongoConnectionError?.message || null,
});

const app = express();

// 🔧 Configure Express to trust proxies (essential for GCP, Heroku, etc.)
// This allows Express to correctly identify real client IPs from X-Forwarded-For headers
if (process.env.NODE_ENV === 'production') {
    // In production (GCP), trust the first proxy
    app.set('trust proxy', 1);
} else {
    // In development, trust all proxies (for local testing with proxies)
    app.set('trust proxy', true);
}

// Load Swagger documentation (with fallback for production)
let swaggerDocument: JsonObject | null = null;
try {
    swaggerDocument = yaml.load(fs.readFileSync('./swagger.yaml', 'utf8')) as JsonObject;
} catch (error) {
    console.warn('⚠️  Unable to load swagger.yaml, Swagger UI will be disabled');
}

// Add standard response wrapper
app.use(responseWrapper);

// Add request logger early in the middleware chain
app.use(requestLogger);

// Enhanced security middleware configuration
app.use(enforceHTTPS); // Force HTTPS in production
app.use(configureHelmet()); // Enhanced helmet configuration with CSP
if (process.env.NODE_ENV !== 'test') {
    app.use(requireAPIVersion(['v1']));
} // API versioning support
if (process.env.NODE_ENV !== 'test') {
    app.use(validateUserAgent);
} // Block malicious user agents
app.use(limitRequestSize(10 * 1024 * 1024)); // 10MB global limit
app.use(detectSuspiciousActivity); // Detect and block suspicious patterns

// app.use(mongoSanitize()); // prevent MongoDB operator injection - disabled due to version conflict
app.use(xssSanitizer()); // sanitize user input against XSS using secure DOMPurify

if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(corsMiddleware);
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

// Health check endpoints (without authentication)
app.use('/health', healthRoutes);

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
