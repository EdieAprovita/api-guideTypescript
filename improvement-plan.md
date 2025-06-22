# 🚀 API-GuideTypescript Improvement Plan

## 📋 Executive Summary

This improvement plan addresses critical areas identified in the comprehensive analysis of the API-GuideTypescript project. The plan is structured in 4 phases over 4 weeks, prioritizing security vulnerabilities, code quality, testing coverage, and performance optimization.

**Current Project Score: 7.2/10**  
**Target Score: 9.0/10**

---

## 🎯 Critical Issues Identified

### 🔴 **Critical Priority**
- **Input Validation Gaps**: Inconsistent validation across endpoints
- **Security Vulnerabilities**: JWT token management, ownership validation
- **Code Duplication**: Two different BaseService implementations
- **Testing Coverage**: Missing critical test scenarios (25% gap)

### 🟡 **High Priority**
- **Service Layer Inconsistencies**: Mixed responsibilities and patterns
- **Error Handling**: Inconsistent HTTP status codes and response formats
- **Performance**: Missing database indexes and caching strategies

### 🟢 **Medium Priority**
- **Monitoring**: Lack of metrics and observability
- **Documentation**: API documentation gaps
- **Code Quality**: Redundant code and architectural debt

---

## 📅 4-Week Implementation Roadmap

## 🔴 **Week 1: Critical Security & Foundation**

### **Day 1-2: Input Validation Implementation**

#### **Create Validation Middleware**
```typescript
// middleware/validation.ts
import { body, param, validationResult } from 'express-validator';

export const validateUser = [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 })
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
        .withMessage('Password must contain at least one lowercase, uppercase, number and special character'),
    body('username').isLength({ min: 3, max: 30 }).isAlphanumeric(),
];

export const validateBusiness = [
    body('name').isLength({ min: 2, max: 100 }),
    body('email').isEmail(),
    body('phone').optional().isMobilePhone('any'),
    body('location.coordinates').isArray({ min: 2, max: 2 }),
];

export const validateRestaurant = [
    body('name').isLength({ min: 2, max: 100 }),
    body('email').isEmail(),
    body('cuisine').isIn(['vegan', 'vegetarian', 'raw', 'organic']),
    body('location.coordinates').isArray({ min: 2, max: 2 }),
];

export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ 
            success: false,
            message: 'Validation failed',
            errors: errors.array() 
        });
    }
    next();
};
```

#### **Apply Validation to Routes**
```typescript
// routes/userRoutes.ts
import { validateUser, handleValidationErrors } from '../middleware/validation';

router.post('/register', validateUser, handleValidationErrors, registerUser);
router.put('/profile/:id', protect, validateUser, handleValidationErrors, updateUserProfile);
```

### **Day 3-4: Security Enhancements**

#### **Implement JWT Blacklist**
```typescript
// services/TokenService.ts
import Redis from 'ioredis';

class TokenService {
    private redis: Redis;
    
    constructor() {
        this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    }
    
    async revokeToken(token: string): Promise<void> {
        const decoded = jwt.decode(token) as any;
        const expiry = decoded.exp;
        await this.redis.setex(`blacklist:${token}`, expiry - Math.floor(Date.now() / 1000), 'revoked');
    }
    
    async isTokenBlacklisted(token: string): Promise<boolean> {
        const result = await this.redis.get(`blacklist:${token}`);
        return result !== null;
    }
}

export default new TokenService();
```

#### **Enhanced Auth Middleware**
```typescript
// middleware/authMiddleware.ts
import TokenService from '../services/TokenService';

export const protect = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    let token;
    
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies.token) {
        token = req.cookies.token;
    }
    
    if (!token) {
        return next(new HttpError(HttpStatusCode.UNAUTHORIZED, 'Not authorized to access this route'));
    }
    
    // Check if token is blacklisted
    if (await TokenService.isTokenBlacklisted(token)) {
        return next(new HttpError(HttpStatusCode.UNAUTHORIZED, 'Token has been revoked'));
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;
        req.user = await User.findById(decoded.userId);
        next();
    } catch (error) {
        return next(new HttpError(HttpStatusCode.UNAUTHORIZED, 'Not authorized to access this route'));
    }
});
```

#### **Ownership Validation Middleware**
```typescript
// middleware/ownership.ts
export const validateOwnership = (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const userId = req.user?._id?.toString();
    
    if (id !== userId && req.user?.role !== 'admin') {
        return next(new HttpError(HttpStatusCode.FORBIDDEN, 'Access denied: insufficient permissions'));
    }
    next();
};

export const validateResourceOwnership = (resourceModel: string) => {
    return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
        const { id } = req.params;
        const userId = req.user?._id;
        
        const resource = await mongoose.model(resourceModel).findById(id);
        
        if (!resource) {
            return next(new HttpError(HttpStatusCode.NOT_FOUND, 'Resource not found'));
        }
        
        if (resource.userId?.toString() !== userId?.toString() && req.user?.role !== 'admin') {
            return next(new HttpError(HttpStatusCode.FORBIDDEN, 'Access denied: not resource owner'));
        }
        
        next();
    });
};
```

### **Day 5-7: BaseService Consolidation**

#### **Unified BaseService Implementation**
```typescript
// services/BaseService.ts
import { Model, Document, FilterQuery, UpdateQuery } from 'mongoose';
import { HttpError, HttpStatusCode } from '../types/Errors';

export interface IBaseService<T extends Document> {
    create(data: Partial<T>): Promise<T>;
    getAll(filter?: FilterQuery<T>): Promise<T[]>;
    getById(id: string): Promise<T | null>;
    updateById(id: string, data: UpdateQuery<T>): Promise<T | null>;
    deleteById(id: string): Promise<boolean>;
}

export class BaseService<T extends Document> implements IBaseService<T> {
    constructor(protected model: Model<T>) {}
    
    async create(data: Partial<T>): Promise<T> {
        try {
            const document = new this.model(data);
            return await document.save();
        } catch (error: any) {
            if (error.code === 11000) {
                throw new HttpError(HttpStatusCode.CONFLICT, 'Resource already exists');
            }
            throw new HttpError(HttpStatusCode.BAD_REQUEST, `Error creating resource: ${error.message}`);
        }
    }
    
    async getAll(filter: FilterQuery<T> = {}): Promise<T[]> {
        try {
            return await this.model.find(filter);
        } catch (error: any) {
            throw new HttpError(HttpStatusCode.INTERNAL_SERVER_ERROR, `Error fetching resources: ${error.message}`);
        }
    }
    
    async getById(id: string): Promise<T | null> {
        try {
            return await this.model.findById(id);
        } catch (error: any) {
            throw new HttpError(HttpStatusCode.INTERNAL_SERVER_ERROR, `Error fetching resource: ${error.message}`);
        }
    }
    
    async updateById(id: string, data: UpdateQuery<T>): Promise<T | null> {
        try {
            return await this.model.findByIdAndUpdate(id, data, { new: true, runValidators: true });
        } catch (error: any) {
            if (error.code === 11000) {
                throw new HttpError(HttpStatusCode.CONFLICT, 'Resource already exists');
            }
            throw new HttpError(HttpStatusCode.BAD_REQUEST, `Error updating resource: ${error.message}`);
        }
    }
    
    async deleteById(id: string): Promise<boolean> {
        try {
            const result = await this.model.findByIdAndDelete(id);
            return result !== null;
        } catch (error: any) {
            throw new HttpError(HttpStatusCode.INTERNAL_SERVER_ERROR, `Error deleting resource: ${error.message}`);
        }
    }
}
```

#### **Refactor Existing Services**
```typescript
// services/BusinessService.ts
import { BaseService } from './BaseService';
import { Business, IBusiness } from '../models/Business';

class BusinessService extends BaseService<IBusiness> {
    constructor() {
        super(Business);
    }
    
    async getTopRated(limit: number = 10): Promise<IBusiness[]> {
        return await this.model.find({ rating: { $gte: 4.0 } })
            .sort({ rating: -1 })
            .limit(limit);
    }
    
    async getByLocation(coordinates: number[], radius: number): Promise<IBusiness[]> {
        return await this.model.find({
            'location.coordinates': {
                $near: {
                    $geometry: { type: 'Point', coordinates },
                    $maxDistance: radius
                }
            }
        });
    }
}

export default new BusinessService();
```

---

## 🟡 **Week 2: Testing & Service Layer Improvements**

### **Day 8-10: Complete Service Testing**

#### **Enhanced UserService Tests**
```typescript
// test/services/userService.test.ts
import UserService from '../../services/UserService';
import { User } from '../../models/User';
import { faker } from '@faker-js/faker';

describe('UserService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    
    describe('Password Reset Functionality', () => {
        describe('requestPasswordReset', () => {
            it('should send reset email for valid user', async () => {
                const mockUser = {
                    _id: 'user123',
                    email: 'test@example.com',
                    save: jest.fn().mockResolvedValue(true)
                };
                
                User.findOne = jest.fn().mockResolvedValue(mockUser);
                
                const result = await UserService.requestPasswordReset('test@example.com');
                
                expect(User.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
                expect(result).toEqual({ message: 'Reset email sent successfully' });
            });
            
            it('should throw error for non-existent user', async () => {
                User.findOne = jest.fn().mockResolvedValue(null);
                
                await expect(UserService.requestPasswordReset('nonexistent@example.com'))
                    .rejects.toThrow('User not found');
            });
            
            it('should handle email service failures', async () => {
                const mockUser = { _id: 'user123', email: 'test@example.com' };
                User.findOne = jest.fn().mockResolvedValue(mockUser);
                
                // Mock email service failure
                jest.spyOn(UserService, 'sendEmail').mockRejectedValue(new Error('Email service down'));
                
                await expect(UserService.requestPasswordReset('test@example.com'))
                    .rejects.toThrow('Failed to send reset email');
            });
        });
    });
    
    describe('User Profile Management', () => {
        it('should update user profile with valid data', async () => {
            const userId = 'user123';
            const updateData = { username: 'newusername', email: 'new@example.com' };
            const updatedUser = { _id: userId, ...updateData };
            
            User.findByIdAndUpdate = jest.fn().mockResolvedValue(updatedUser);
            
            const result = await UserService.updateById(userId, updateData);
            
            expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
                userId, 
                updateData, 
                { new: true, runValidators: true }
            );
            expect(result).toEqual(updatedUser);
        });
    });
});
```

#### **Middleware Testing**
```typescript
// test/middleware/authMiddleware.test.ts
import { protect } from '../../middleware/authMiddleware';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

describe('AuthMiddleware', () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let next: NextFunction;
    
    beforeEach(() => {
        req = {
            headers: {},
            cookies: {}
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        next = jest.fn();
    });
    
    describe('protect middleware', () => {
        it('should authenticate valid JWT token', async () => {
            const token = jwt.sign({ userId: 'user123' }, process.env.JWT_SECRET!);
            req.headers!.authorization = `Bearer ${token}`;
            
            const mockUser = { _id: 'user123', email: 'test@example.com' };
            User.findById = jest.fn().mockResolvedValue(mockUser);
            
            await protect(req as Request, res as Response, next);
            
            expect(req.user).toEqual(mockUser);
            expect(next).toHaveBeenCalled();
        });
        
        it('should reject invalid token', async () => {
            req.headers!.authorization = 'Bearer invalid-token';
            
            await protect(req as Request, res as Response, next);
            
            expect(next).toHaveBeenCalledWith(
                expect.objectContaining({
                    statusCode: 401,
                    message: 'Not authorized to access this route'
                })
            );
        });
        
        it('should handle missing token', async () => {
            await protect(req as Request, res as Response, next);
            
            expect(next).toHaveBeenCalledWith(
                expect.objectContaining({
                    statusCode: 401,
                    message: 'Not authorized to access this route'
                })
            );
        });
    });
});
```

### **Day 11-14: Service Layer Refactoring**

#### **Separate Auth Service**
```typescript
// services/AuthService.ts
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User';
import { HttpError, HttpStatusCode } from '../types/Errors';
import EmailService from './EmailService';

interface LoginCredentials {
    email: string;
    password: string;
}

interface RegisterData {
    username: string;
    email: string;
    password: string;
    role?: string;
}

interface AuthResult {
    user: Omit<IUser, 'password'>;
    token: string;
}

class AuthService {
    async register(userData: RegisterData): Promise<AuthResult> {
        const { username, email, password, role = 'user' } = userData;
        
        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            throw new HttpError(HttpStatusCode.CONFLICT, 'User already exists');
        }
        
        // Create user
        const user = await User.create({
            username,
            email,
            password, // Will be hashed by mongoose middleware
            role
        });
        
        // Generate token
        const token = this.generateToken(user._id);
        
        // Remove password from response
        const userResponse = user.toObject();
        delete userResponse.password;
        
        return { user: userResponse, token };
    }
    
    async login(credentials: LoginCredentials): Promise<AuthResult> {
        const { email, password } = credentials;
        
        // Find user and include password for comparison
        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            throw new HttpError(HttpStatusCode.UNAUTHORIZED, 'Invalid credentials');
        }
        
        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            throw new HttpError(HttpStatusCode.UNAUTHORIZED, 'Invalid credentials');
        }
        
        // Generate token
        const token = this.generateToken(user._id);
        
        // Remove password from response
        const userResponse = user.toObject();
        delete userResponse.password;
        
        return { user: userResponse, token };
    }
    
    async requestPasswordReset(email: string): Promise<{ message: string }> {
        const user = await User.findOne({ email });
        if (!user) {
            throw new HttpError(HttpStatusCode.NOT_FOUND, 'User not found');
        }
        
        // Generate reset token
        const resetToken = jwt.sign(
            { userId: user._id }, 
            process.env.JWT_SECRET!, 
            { expiresIn: '1h' }
        );
        
        // Send email
        await EmailService.sendPasswordResetEmail(user.email, resetToken);
        
        return { message: 'Reset email sent successfully' };
    }
    
    async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
            const user = await User.findById(decoded.userId);
            
            if (!user) {
                throw new HttpError(HttpStatusCode.NOT_FOUND, 'User not found');
            }
            
            user.password = newPassword; // Will be hashed by mongoose middleware
            await user.save();
            
            return { message: 'Password reset successfully' };
        } catch (error) {
            throw new HttpError(HttpStatusCode.BAD_REQUEST, 'Invalid or expired token');
        }
    }
    
    private generateToken(userId: string): string {
        return jwt.sign({ userId }, process.env.JWT_SECRET!, {
            expiresIn: process.env.JWT_EXPIRE || '30d'
        });
    }
}

export default new AuthService();
```

#### **Refactored UserService**
```typescript
// services/UserService.ts
import { BaseService } from './BaseService';
import { User, IUser } from '../models/User';
import { HttpError, HttpStatusCode } from '../types/Errors';

class UserService extends BaseService<IUser> {
    constructor() {
        super(User);
    }
    
    async getUserByEmail(email: string): Promise<IUser | null> {
        return await this.model.findOne({ email });
    }
    
    async getUserByUsername(username: string): Promise<IUser | null> {
        return await this.model.findOne({ username });
    }
    
    async updateProfile(userId: string, profileData: Partial<IUser>): Promise<IUser | null> {
        // Remove sensitive fields that shouldn't be updated directly
        const { password, role, ...updateData } = profileData;
        
        return await this.updateById(userId, updateData);
    }
    
    async getUsersByRole(role: string): Promise<IUser[]> {
        return await this.model.find({ role });
    }
    
    async searchUsers(query: string): Promise<IUser[]> {
        return await this.model.find({
            $or: [
                { username: { $regex: query, $options: 'i' } },
                { email: { $regex: query, $options: 'i' } }
            ]
        });
    }
}

export default new UserService();
```

---

## 🟢 **Week 3: Performance & Optimization**

### **Day 15-17: Database Optimization**

#### **Add Strategic Indexes**
```typescript
// models/User.ts
import mongoose, { Schema, Document } from 'mongoose';

const userSchema = new Schema({
    // ... existing fields
}, {
    timestamps: true
});

// Performance indexes
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ username: 1 }, { unique: true });
userSchema.index({ role: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ isActive: 1 });

// Compound indexes for common queries
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ createdAt: -1, role: 1 });

export const User = mongoose.model<IUser>('User', userSchema);
```

```typescript
// models/Business.ts
const businessSchema = new Schema({
    // ... existing fields
}, {
    timestamps: true
});

// Geospatial index for location queries
businessSchema.index({ 'location.coordinates': '2dsphere' });

// Text index for search functionality
businessSchema.index({ 
    name: 'text', 
    description: 'text', 
    tags: 'text' 
});

// Performance indexes
businessSchema.index({ rating: -1 });
businessSchema.index({ category: 1 });
businessSchema.index({ isActive: 1 });
businessSchema.index({ createdAt: -1 });

// Compound indexes
businessSchema.index({ category: 1, rating: -1 });
businessSchema.index({ isActive: 1, rating: -1 });

export const Business = mongoose.model<IBusiness>('Business', businessSchema);
```

#### **Implement Caching Strategy**
```typescript
// services/CacheService.ts
import Redis from 'ioredis';

class CacheService {
    private redis: Redis;
    private defaultTTL = 3600; // 1 hour
    
    constructor() {
        this.redis = new Redis({
            host: process.env.REDIS_HOST || 'localhost',
            port: Number(process.env.REDIS_PORT) || 6379,
            password: process.env.REDIS_PASSWORD,
            retryDelayOnFailover: 100,
            enableReadyCheck: false,
            maxRetriesPerRequest: null,
        });
    }
    
    async get<T>(key: string): Promise<T | null> {
        try {
            const cached = await this.redis.get(key);
            return cached ? JSON.parse(cached) : null;
        } catch (error) {
            console.error('Cache get error:', error);
            return null;
        }
    }
    
    async set<T>(key: string, data: T, ttl: number = this.defaultTTL): Promise<void> {
        try {
            await this.redis.setex(key, ttl, JSON.stringify(data));
        } catch (error) {
            console.error('Cache set error:', error);
        }
    }
    
    async del(key: string): Promise<void> {
        try {
            await this.redis.del(key);
        } catch (error) {
            console.error('Cache delete error:', error);
        }
    }
    
    async flush(): Promise<void> {
        try {
            await this.redis.flushall();
        } catch (error) {
            console.error('Cache flush error:', error);
        }
    }
    
    generateKey(prefix: string, ...parts: string[]): string {
        return `${prefix}:${parts.join(':')}`;
    }
}

export default new CacheService();
```

#### **Enhanced Service with Caching**
```typescript
// services/BusinessService.ts
import { BaseService } from './BaseService';
import { Business, IBusiness } from '../models/Business';
import CacheService from './CacheService';

class BusinessService extends BaseService<IBusiness> {
    constructor() {
        super(Business);
    }
    
    async getAll(filter: any = {}): Promise<IBusiness[]> {
        const cacheKey = CacheService.generateKey('businesses', JSON.stringify(filter));
        
        // Try cache first
        let businesses = await CacheService.get<IBusiness[]>(cacheKey);
        
        if (!businesses) {
            // Fetch from database
            businesses = await super.getAll(filter);
            
            // Cache for 30 minutes
            await CacheService.set(cacheKey, businesses, 1800);
        }
        
        return businesses;
    }
    
    async getById(id: string): Promise<IBusiness | null> {
        const cacheKey = CacheService.generateKey('business', id);
        
        let business = await CacheService.get<IBusiness>(cacheKey);
        
        if (!business) {
            business = await super.getById(id);
            if (business) {
                await CacheService.set(cacheKey, business, 3600);
            }
        }
        
        return business;
    }
    
    async updateById(id: string, data: any): Promise<IBusiness | null> {
        const business = await super.updateById(id, data);
        
        if (business) {
            // Invalidate cache
            const cacheKey = CacheService.generateKey('business', id);
            await CacheService.del(cacheKey);
        }
        
        return business;
    }
    
    async getTopRated(limit: number = 10): Promise<IBusiness[]> {
        const cacheKey = CacheService.generateKey('businesses', 'top-rated', limit.toString());
        
        let businesses = await CacheService.get<IBusiness[]>(cacheKey);
        
        if (!businesses) {
            businesses = await this.model.find({ rating: { $gte: 4.0 } })
                .sort({ rating: -1 })
                .limit(limit)
                .lean();
                
            await CacheService.set(cacheKey, businesses, 3600);
        }
        
        return businesses;
    }
}

export default new BusinessService();
```

### **Day 18-21: Enhanced Logging & Error Handling**

#### **Structured Logging**
```typescript
// utils/logger.ts
import winston from 'winston';

const { combine, timestamp, errors, json, colorize, printf } = winston.format;

// Custom format for development
const devFormat = printf(({ level, message, timestamp, stack }) => {
    return `${timestamp} [${level}]: ${stack || message}`;
});

// Create logger instance
export const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        errors({ stack: true }),
        json()
    ),
    defaultMeta: { 
        service: 'api-guide',
        version: process.env.npm_package_version || '1.0.0'
    },
    transports: [
        // Error log
        new winston.transports.File({ 
            filename: 'logs/error.log', 
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }),
        
        // Combined log
        new winston.transports.File({ 
            filename: 'logs/combined.log',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }),
        
        // Console output
        new winston.transports.Console({
            format: process.env.NODE_ENV === 'development' 
                ? combine(colorize(), devFormat)
                : combine(json())
        })
    ],
});

// Security logger for authentication events
export const securityLogger = winston.createLogger({
    level: 'warn',
    format: combine(
        timestamp(),
        json()
    ),
    defaultMeta: { service: 'security' },
    transports: [
        new winston.transports.File({ 
            filename: 'logs/security.log',
            maxsize: 5242880, // 5MB
            maxFiles: 10,
        })
    ],
});

// Performance logger
export const performanceLogger = winston.createLogger({
    level: 'info',
    format: combine(
        timestamp(),
        json()
    ),
    defaultMeta: { service: 'performance' },
    transports: [
        new winston.transports.File({ 
            filename: 'logs/performance.log',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        })
    ],
});
```

#### **Request Logging Middleware**
```typescript
// middleware/requestLogger.ts
import { Request, Response, NextFunction } from 'express';
import { logger, performanceLogger, securityLogger } from '../utils/logger';

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    const { method, url, ip, headers } = req;
    
    // Log request
    logger.info('Incoming request', {
        method,
        url,
        ip,
        userAgent: headers['user-agent'],
        timestamp: new Date().toISOString()
    });
    
    // Capture response
    const originalSend = res.send;
    res.send = function(data) {
        const duration = Date.now() - start;
        
        // Log response
        logger.info('Request completed', {
            method,
            url,
            statusCode: res.statusCode,
            duration,
            ip
        });
        
        // Log performance metrics
        performanceLogger.info('Request performance', {
            method,
            url,
            statusCode: res.statusCode,
            duration,
            timestamp: new Date().toISOString()
        });
        
        // Log security events
        if (res.statusCode === 401 || res.statusCode === 403) {
            securityLogger.warn('Authentication/Authorization failure', {
                method,
                url,
                statusCode: res.statusCode,
                ip,
                userAgent: headers['user-agent']
            });
        }
        
        return originalSend.call(this, data);
    };
    
    next();
};
```

---

## 🔵 **Week 4: Monitoring & Documentation**

### **Day 22-24: Monitoring Implementation**

#### **Metrics Collection**
```typescript
// middleware/metrics.ts
import { Request, Response, NextFunction } from 'express';
import { register, Counter, Histogram, Gauge } from 'prom-client';

// HTTP request metrics
const httpRequestsTotal = new Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code']
});

const httpRequestDuration = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route'],
    buckets: [0.1, 0.5, 1, 2, 5]
});

// Database metrics
const dbConnectionsActive = new Gauge({
    name: 'db_connections_active',
    help: 'Number of active database connections'
});

const dbQueryDuration = new Histogram({
    name: 'db_query_duration_seconds',
    help: 'Duration of database queries in seconds',
    labelNames: ['operation', 'collection'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2]
});

// Auth metrics
const authAttempts = new Counter({
    name: 'auth_attempts_total',
    help: 'Total authentication attempts',
    labelNames: ['status'] // success, failure
});

export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    
    res.on('finish', () => {
        const duration = (Date.now() - start) / 1000;
        const route = req.route?.path || req.path;
        
        httpRequestsTotal.inc({
            method: req.method,
            route,
            status_code: res.statusCode
        });
        
        httpRequestDuration.observe({
            method: req.method,
            route
        }, duration);
    });
    
    next();
};

// Metrics endpoint
export const metricsEndpoint = async (req: Request, res: Response) => {
    try {
        res.set('Content-Type', register.contentType);
        res.end(await register.metrics());
    } catch (error) {
        res.status(500).end(error);
    }
};

export { httpRequestsTotal, httpRequestDuration, dbConnectionsActive, dbQueryDuration, authAttempts };
```

#### **Health Check Endpoint**
```typescript
// routes/healthRoutes.ts
import express from 'express';
import mongoose from 'mongoose';
import { logger } from '../utils/logger';
import CacheService from '../services/CacheService';

const router = express.Router();

interface HealthStatus {
    status: 'healthy' | 'unhealthy';
    timestamp: string;
    services: {
        database: 'up' | 'down';
        cache: 'up' | 'down';
        memory: {
            used: number;
            total: number;
            percentage: number;
        };
    };
    uptime: number;
}

router.get('/health', async (req, res) => {
    const healthStatus: HealthStatus = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
            database: 'up',
            cache: 'up',
            memory: {
                used: process.memoryUsage().heapUsed,
                total: process.memoryUsage().heapTotal,
                percentage: (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100
            }
        },
        uptime: process.uptime()
    };
    
    // Check database
    if (mongoose.connection.readyState !== 1) {
        healthStatus.services.database = 'down';
        healthStatus.status = 'unhealthy';
    }
    
    // Check cache
    try {
        await CacheService.get('health-check');
        await CacheService.set('health-check', 'ok', 10);
    } catch (error) {
        healthStatus.services.cache = 'down';
        healthStatus.status = 'unhealthy';
    }
    
    const statusCode = healthStatus.status === 'healthy' ? 200 : 503;
    
    logger.info('Health check performed', { status: healthStatus.status, statusCode });
    
    res.status(statusCode).json(healthStatus);
});

router.get('/ready', async (req, res) => {
    // Readiness check - more thorough than health check
    const checks = [];
    
    // Database check
    try {
        await mongoose.connection.db.admin().ping();
        checks.push({ service: 'database', status: 'ready' });
    } catch (error) {
        checks.push({ service: 'database', status: 'not_ready', error: error.message });
    }
    
    // Cache check
    try {
        await CacheService.set('readiness-check', 'ok', 5);
        const result = await CacheService.get('readiness-check');
        checks.push({ 
            service: 'cache', 
            status: result ? 'ready' : 'not_ready' 
        });
    } catch (error) {
        checks.push({ service: 'cache', status: 'not_ready', error: error.message });
    }
    
    const allReady = checks.every(check => check.status === 'ready');
    const statusCode = allReady ? 200 : 503;
    
    res.status(statusCode).json({
        status: allReady ? 'ready' : 'not_ready',
        checks,
        timestamp: new Date().toISOString()
    });
});

export default router;
```

### **Day 25-28: Documentation & API Versioning**

#### **Enhanced Swagger Documentation**
```typescript
// swagger/schemas.ts
export const UserSchema = {
    type: 'object',
    required: ['username', 'email', 'password'],
    properties: {
        username: {
            type: 'string',
            minLength: 3,
            maxLength: 30,
            pattern: '^[a-zA-Z0-9_]+$',
            description: 'Username must be alphanumeric with underscores allowed'
        },
        email: {
            type: 'string',
            format: 'email',
            description: 'Valid email address'
        },
        password: {
            type: 'string',
            minLength: 8,
            pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]',
            description: 'Password must contain at least one lowercase, uppercase, number and special character'
        },
        role: {
            type: 'string',
            enum: ['user', 'professional', 'admin'],
            default: 'user'
        },
        profile: {
            type: 'object',
            properties: {
                firstName: { type: 'string' },
                lastName: { type: 'string' },
                bio: { type: 'string', maxLength: 500 },
                avatar: { type: 'string', format: 'url' }
            }
        }
    }
};

export const BusinessSchema = {
    type: 'object',
    required: ['name', 'email', 'location'],
    properties: {
        name: {
            type: 'string',
            minLength: 2,
            maxLength: 100,
            description: 'Business name'
        },
        email: {
            type: 'string',
            format: 'email'
        },
        phone: {
            type: 'string',
            pattern: '^[+]?[1-9]\\d{1,14}$',
            description: 'Phone number in international format'
        },
        location: {
            type: 'object',
            required: ['coordinates', 'address'],
            properties: {
                coordinates: {
                    type: 'array',
                    items: { type: 'number' },
                    minItems: 2,
                    maxItems: 2,
                    description: 'Longitude and latitude coordinates'
                },
                address: {
                    type: 'string',
                    description: 'Full address'
                }
            }
        },
        category: {
            type: 'string',
            enum: ['restaurant', 'shop', 'service', 'market'],
            description: 'Business category'
        },
        rating: {
            type: 'number',
            minimum: 0,
            maximum: 5,
            description: 'Average rating'
        }
    }
};

export const ErrorSchema = {
    type: 'object',
    properties: {
        success: { type: 'boolean', example: false },
        message: { type: 'string' },
        errors: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    field: { type: 'string' },
                    message: { type: 'string' }
                }
            }
        }
    }
};
```

#### **API Versioning Structure**
```typescript
// routes/v2/userRoutes.ts
import express from 'express';
import { validateUser, handleValidationErrors } from '../../middleware/validation';
import { protect, validateOwnership } from '../../middleware/authMiddleware';
import AuthService from '../../services/AuthService';
import UserService from '../../services/UserService';

const router = express.Router();

/**
 * @swagger
 * /api/v2/users/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserRegistration'
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "User registered successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                     token:
 *                       type: string
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/register', validateUser, handleValidationErrors, async (req, res, next) => {
    try {
        const result = await AuthService.register(req.body);
        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: result
        });
    } catch (error) {
        next(error);
    }
});

export default router;
```

---

## 📊 Success Metrics & KPIs

### **Week 1 Targets**
- [ ] 100% input validation coverage on critical endpoints
- [ ] 0 critical security vulnerabilities
- [ ] Unified BaseService implementation
- [ ] All ownership validations implemented

### **Week 2 Targets**
- [ ] 85% test coverage across all services
- [ ] Separated auth and user services
- [ ] All middleware properly tested
- [ ] JWT blacklist functionality working

### **Week 3 Targets**
- [ ] 50% improvement in response times
- [ ] Redis caching implemented
- [ ] Database indexes optimized
- [ ] Structured logging implemented

### **Week 4 Targets**
- [ ] Monitoring dashboard operational
- [ ] API documentation 95% complete
- [ ] Health checks implemented
- [ ] Performance metrics collected

---

## 🎯 Final Goals

### **Technical Debt Reduction**
- **Code Duplication**: Reduce from 15% to < 5%
- **Test Coverage**: Increase from 75% to 90%
- **Performance**: Improve response times by 50%
- **Security**: Achieve 0 critical vulnerabilities

### **Operational Excellence**
- **Monitoring**: 100% uptime visibility
- **Logging**: Structured logs for all operations
- **Documentation**: Complete API documentation
- **Automation**: CI/CD pipeline improvements

### **Scalability Preparation**
- **Caching**: Redis integration complete
- **Database**: Optimized for high load
- **Architecture**: Microservice-ready structure
- **Monitoring**: Production-grade observability

---

## 🚀 Conclusion

This improvement plan transforms the API-GuideTypescript project from a solid foundation into a production-ready, enterprise-grade API. The phased approach ensures minimal disruption while addressing critical issues first.

**Expected Outcomes:**
- **Security**: Production-ready security posture
- **Performance**: 50% improvement in response times
- **Reliability**: 99.9% uptime with comprehensive monitoring
- **Maintainability**: Clean, well-tested, documented codebase
- **Scalability**: Ready for high-load production environments

**Implementation Timeline**: 4 weeks
**Resource Requirements**: 1-2 developers
**Risk Level**: Low (phased approach with rollback capabilities)

The plan provides a clear roadmap for elevating the project to production standards while maintaining development velocity and code quality.