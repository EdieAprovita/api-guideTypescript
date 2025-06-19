import dotenv from 'dotenv';
import express from 'express';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import { xss } from 'express-xss-sanitizer';

import connectDB from './config/db';
import { errorHandler, notFound } from './middleware/errorHandler';
import corsMiddleware from './middleware/corsOptions';

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
import swaggerUi, { JsonObject } from 'swagger-ui-express';
import fs from 'fs';
import yaml from 'js-yaml';

dotenv.config();
if (process.env.NODE_ENV !== 'test') {
    connectDB();
}

const app = express();

const swaggerDocument = yaml.load(fs.readFileSync('./swagger.yaml', 'utf8')) as JsonObject;

// Security middleware to protect the application from common vulnerabilities
app.use(helmet()); // sets HTTP headers for basic security

// Rate limiting configuration - more permissive in development
const limiter = rateLimit({
    windowMs: process.env.NODE_ENV === 'development' ? 1 * 60 * 1000 : 15 * 60 * 1000, // 1 minute in dev, 15 minutes in prod
    max: process.env.NODE_ENV === 'development' ? 1000 : 100, // 1000 requests in dev, 100 in prod
    message: 'Too many requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiter);

app.use(mongoSanitize()); // prevent MongoDB operator injection
app.use(xss()); // sanitize user input against XSS

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

// Error handling
app.use(notFound);
app.use(errorHandler);

export default app;
