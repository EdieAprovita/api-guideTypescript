import dotenv from 'dotenv';
import express from 'express';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import { xss } from 'express-xss-sanitizer';

import connectDB from './config/db';
import { errorHandler, notFound } from './middleware/errorHandler';
import corsMiddleware from './middleware/corsOptions';
import { 
  configureHelmet, 
  enforceHTTPS, 
  detectSuspiciousActivity,
  limitRequestSize,
  validateUserAgent,
  addCorrelationId,
  requireAPIVersion
} from './middleware/security';

import userRoutes from './routes/userRoutes';
import businessRoutes from './routes/businessRoutes';
import recipesRoutes from './routes/recipesRoutes';
import marketsRoutes from './routes/marketsRoutes';
import restaurantRoutes from './routes/restaurantRoutes';
import doctorsRoutes from './routes/doctorsRoutes';
import professionProfileRoutes from './routes/professionProfileRoutes';
import professionRoutes from './routes/professionRoutes';
import postRoutes from './routes/postRoutes';
import sanctuaryRoutes from './routes/sanctuaryRoutes';
import authRoutes from './routes/authRoutes';
import cacheRoutes from './routes/cacheRoutes';
import reviewRoutes from './routes/reviewRoutes';
import swaggerUi, { JsonObject } from 'swagger-ui-express';
import fs from 'fs';
import yaml from 'js-yaml';

dotenv.config();
if (process.env.NODE_ENV !== 'test') {
    connectDB();
}

const app = express();

const swaggerDocument = yaml.load(fs.readFileSync('./swagger.yaml', 'utf8')) as JsonObject;

// Enhanced security middleware configuration
app.use(enforceHTTPS); // Force HTTPS in production
app.use(configureHelmet()); // Enhanced helmet configuration with CSP
app.use(addCorrelationId); // Add correlation ID for request tracing
if (process.env.NODE_ENV !== 'test') { app.use(requireAPIVersion(['v1'])); } // API versioning support
if (process.env.NODE_ENV !== 'test') { app.use(validateUserAgent); } // Block malicious user agents
app.use(limitRequestSize(10 * 1024 * 1024)); // 10MB global limit
app.use(detectSuspiciousActivity); // Detect and block suspicious patterns

if (process.env.NODE_ENV !== 'test') {
    app.use(mongoSanitize()); // prevent MongoDB operator injection
    app.use(xss()); // sanitize user input against XSS
}

if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(corsMiddleware);
if (process.env.NODE_ENV !== 'production') {
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
}

app.get('/api/v1', (_req, res) => {
    res.send('API is running');
});

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/businesses', businessRoutes);
app.use('/api/v1/recipes', recipesRoutes);
app.use('/api/v1/markets', marketsRoutes);
app.use('/api/v1/restaurants', restaurantRoutes);
app.use('/api/v1/doctors', doctorsRoutes);
app.use('/api/v1/professionsProfile', professionProfileRoutes);
app.use('/api/v1/professions', professionRoutes);
app.use('/api/v1/posts', postRoutes);
app.use('/api/v1/sanctuaries', sanctuaryRoutes);
app.use('/api/v1/reviews', reviewRoutes);

// Cache administration routes
app.use('/api/v1/cache', cacheRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

export default app;
