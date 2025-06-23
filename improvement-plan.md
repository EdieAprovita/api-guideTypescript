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

### **Day 18-19: Enhanced Logging & Error Handling**

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

### **Day 20-21: Mobile & React Native Integration**

#### **Geolocation Service Enhancement**
```typescript
// services/LocationService.ts
import { Model, Document } from 'mongoose';

interface LocationQuery {
    lat: number;
    lng: number;
    radius?: number;
    limit?: number;
    filter?: any;
}

class LocationService {
    static async findNearby<T extends Document>(
        model: Model<T>,
        { lat, lng, radius = 10000, limit = 20, filter = {} }: LocationQuery
    ): Promise<T[]> {
        return await model.aggregate([
            {
                $geoNear: {
                    near: { type: 'Point', coordinates: [lng, lat] },
                    distanceField: 'distance',
                    maxDistance: radius,
                    spherical: true,
                    query: filter
                }
            },
            { $limit: limit },
            {
                $addFields: {
                    distanceKm: { $round: [{ $divide: ['$distance', 1000] }, 2] }
                }
            },
            {
                $project: {
                    distance: 1,
                    distanceKm: 1,
                    name: 1,
                    address: 1,
                    location: 1,
                    rating: 1,
                    image: 1,
                    contact: 1
                }
            }
        ]);
    }

    static async searchByBounds<T extends Document>(
        model: Model<T>,
        bounds: {
            northEast: { lat: number; lng: number };
            southWest: { lat: number; lng: number };
        }
    ): Promise<T[]> {
        return await model.find({
            'location.coordinates': {
                $geoWithin: {
                    $box: [
                        [bounds.southWest.lng, bounds.southWest.lat],
                        [bounds.northEast.lng, bounds.northEast.lat]
                    ]
                }
            }
        }).select('name address location rating image contact');
    }

    static async getHeatmapData<T extends Document>(
        model: Model<T>,
        bounds: any
    ): Promise<Array<{ lat: number; lng: number; weight: number }>> {
        const results = await model.aggregate([
            {
                $match: {
                    'location.coordinates': {
                        $geoWithin: { $box: bounds }
                    }
                }
            },
            {
                $group: {
                    _id: {
                        lat: { $round: [{ $arrayElemAt: ['$location.coordinates', 1] }, 3] },
                        lng: { $round: [{ $arrayElemAt: ['$location.coordinates', 0] }, 3] }
                    },
                    count: { $sum: 1 },
                    avgRating: { $avg: '$rating' }
                }
            },
            {
                $project: {
                    lat: '$_id.lat',
                    lng: '$_id.lng',
                    weight: { $multiply: ['$count', '$avgRating'] }
                }
            }
        ]);

        return results.map(r => ({ lat: r.lat, lng: r.lng, weight: r.weight }));
    }
}

export default LocationService;
```

#### **Mobile-Optimized Routes**
```typescript
// routes/mobileRoutes.ts
import express from 'express';
import { protect } from '../middleware/authMiddleware';
import LocationService from '../services/LocationService';
import { Restaurant } from '../models/Restaurant';
import { Business } from '../models/Business';
import { Market } from '../models/Market';
import { Doctor } from '../models/Doctor';
import { Profession } from '../models/Profession';
import CacheService from '../services/CacheService';

const router = express.Router();

/**
 * @swagger
 * /api/v1/mobile/nearby:
 *   get:
 *     summary: Get nearby places for mobile app
 *     tags: [Mobile]
 *     parameters:
 *       - in: query
 *         name: lat
 *         required: true
 *         schema:
 *           type: number
 *         description: Latitude
 *       - in: query
 *         name: lng
 *         required: true
 *         schema:
 *           type: number
 *         description: Longitude
 *       - in: query
 *         name: radius
 *         schema:
 *           type: number
 *           default: 5000
 *         description: Search radius in meters
 *       - in: query
 *         name: types
 *         schema:
 *           type: string
 *         description: Comma-separated list of types (restaurant,business,market,doctor,profession)
 *     responses:
 *       200:
 *         description: Nearby places found successfully
 */
router.get('/nearby', async (req, res, next) => {
    try {
        const { lat, lng, radius = 5000, types = 'restaurant,business,market,doctor,profession' } = req.query;
        
        if (!lat || !lng) {
            return res.status(400).json({
                success: false,
                message: 'Latitude and longitude are required'
            });
        }

        const typeArray = (types as string).split(',');
        const cacheKey = CacheService.generateKey('mobile', 'nearby', lat as string, lng as string, radius.toString(), types as string);
        
        // Try cache first
        let results = await CacheService.get(cacheKey);
        
        if (!results) {
            const locationQuery = {
                lat: parseFloat(lat as string),
                lng: parseFloat(lng as string),
                radius: parseInt(radius as string),
                limit: 50
            };

            const promises = [];
            
            if (typeArray.includes('restaurant')) {
                promises.push(LocationService.findNearby(Restaurant, locationQuery));
            }
            if (typeArray.includes('business')) {
                promises.push(LocationService.findNearby(Business, locationQuery));
            }
            if (typeArray.includes('market')) {
                promises.push(LocationService.findNearby(Market, locationQuery));
            }
            if (typeArray.includes('doctor')) {
                promises.push(LocationService.findNearby(Doctor, locationQuery));
            }
            if (typeArray.includes('profession')) {
                promises.push(LocationService.findNearby(Profession, locationQuery));
            }

            const allResults = await Promise.all(promises);
            
            results = {
                restaurants: typeArray.includes('restaurant') ? allResults[typeArray.indexOf('restaurant')] || [] : [],
                businesses: typeArray.includes('business') ? allResults[typeArray.indexOf('business')] || [] : [],
                markets: typeArray.includes('market') ? allResults[typeArray.indexOf('market')] || [] : [],
                doctors: typeArray.includes('doctor') ? allResults[typeArray.indexOf('doctor')] || [] : [],
                professions: typeArray.includes('profession') ? allResults[typeArray.indexOf('profession')] || [] : [],
                meta: {
                    searchCenter: { lat: locationQuery.lat, lng: locationQuery.lng },
                    searchRadius: locationQuery.radius,
                    timestamp: new Date().toISOString()
                }
            };

            // Cache for 10 minutes
            await CacheService.set(cacheKey, results, 600);
        }

        res.json({
            success: true,
            message: 'Nearby places retrieved successfully',
            data: results
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/v1/mobile/map-data:
 *   get:
 *     summary: Get optimized data for map visualization
 *     tags: [Mobile]
 */
router.get('/map-data', async (req, res, next) => {
    try {
        const { bounds, type = 'restaurant', zoom = 10 } = req.query;
        
        if (!bounds) {
            return res.status(400).json({
                success: false,
                message: 'Map bounds are required'
            });
        }

        const parsedBounds = JSON.parse(bounds as string);
        const zoomLevel = parseInt(zoom as string);
        
        // For high zoom levels, return individual markers
        // For low zoom levels, return heatmap data
        let data;
        
        if (zoomLevel >= 12) {
            const model = getModelByType(type as string);
            data = await LocationService.searchByBounds(model, parsedBounds);
        } else {
            const model = getModelByType(type as string);
            data = await LocationService.getHeatmapData(model, [
                [parsedBounds.southWest.lng, parsedBounds.southWest.lat],
                [parsedBounds.northEast.lng, parsedBounds.northEast.lat]
            ]);
        }

        res.json({
            success: true,
            message: 'Map data retrieved successfully',
            data: {
                type: zoomLevel >= 12 ? 'markers' : 'heatmap',
                items: data,
                bounds: parsedBounds,
                zoom: zoomLevel
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/v1/mobile/sync:
 *   post:
 *     summary: Synchronize offline data with server
 *     tags: [Mobile]
 *     security:
 *       - bearerAuth: []
 */
router.post('/sync', protect, async (req, res, next) => {
    try {
        const { lastSync, pendingActions = [], deviceId } = req.body;
        const userId = req.user?._id;

        if (!lastSync) {
            return res.status(400).json({
                success: false,
                message: 'lastSync timestamp is required'
            });
        }

        // Process pending actions from client
        const actionResults = await Promise.allSettled(
            pendingActions.map((action: any) => processOfflineAction(action, userId))
        );

        // Get changes since lastSync
        const changes = await getChangesSince(new Date(lastSync), userId);

        // Update device sync status
        await updateDeviceSyncStatus(deviceId, userId);

        res.json({
            success: true,
            message: 'Sync completed successfully',
            data: {
                actionResults: actionResults.map((result, index) => ({
                    actionId: pendingActions[index].id,
                    status: result.status,
                    error: result.status === 'rejected' ? result.reason : null
                })),
                changes,
                serverTime: new Date().toISOString(),
                nextSyncRecommended: Date.now() + (30 * 60 * 1000) // 30 minutes
            }
        });
    } catch (error) {
        next(error);
    }
});

// Helper functions
function getModelByType(type: string) {
    switch (type) {
        case 'restaurant': return Restaurant;
        case 'business': return Business;
        case 'market': return Market;
        case 'doctor': return Doctor;
        case 'profession': return Profession;
        default: return Restaurant;
    }
}

async function processOfflineAction(action: any, userId: string) {
    // Process different types of offline actions
    switch (action.type) {
        case 'CREATE_REVIEW':
            return await createReviewFromOffline(action.data, userId);
        case 'UPDATE_FAVORITE':
            return await updateFavoriteFromOffline(action.data, userId);
        case 'CREATE_BUSINESS':
            return await createBusinessFromOffline(action.data, userId);
        default:
            throw new Error(`Unknown action type: ${action.type}`);
    }
}

async function getChangesSince(lastSync: Date, userId: string) {
    // Get all changes since lastSync that affect this user
    const changes = {
        favorites: await getUserFavoriteChanges(lastSync, userId),
        reviews: await getUserReviewChanges(lastSync, userId),
        newPlaces: await getNewPlacesNearUser(lastSync, userId)
    };
    
    return changes;
}

async function createReviewFromOffline(reviewData: any, userId: string) {
    // Implementation for creating review from offline data
    // Include conflict resolution logic
}

async function updateFavoriteFromOffline(favoriteData: any, userId: string) {
    // Implementation for updating favorites from offline data
}

async function createBusinessFromOffline(businessData: any, userId: string) {
    // Implementation for creating business from offline data
}

async function getUserFavoriteChanges(lastSync: Date, userId: string) {
    // Get favorite changes since lastSync
}

async function getUserReviewChanges(lastSync: Date, userId: string) {
    // Get review changes since lastSync
}

async function getNewPlacesNearUser(lastSync: Date, userId: string) {
    // Get new places added near user's typical locations
}

async function updateDeviceSyncStatus(deviceId: string, userId: string) {
    // Update device sync status in database
}

export default router;
```

#### **Integration with Main App**
```typescript
// app.ts - Add mobile routes
import mobileRoutes from './routes/mobileRoutes';
import healthRoutes from './routes/healthRoutes';

// Add after existing routes
app.use('/api/v1/mobile', mobileRoutes);
app.use('/api/v1/health', healthRoutes);

// Add metrics endpoint
app.get('/metrics', metricsEndpoint);

// Add request logging and metrics middleware
app.use(requestLogger);
app.use(metricsMiddleware);
```

#### **Environment Variables for Mobile Features**
```env
# Firebase Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account-email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# Additional Mobile Settings
MOBILE_API_VERSION=v1
PUSH_NOTIFICATION_ENABLED=true
OFFLINE_SYNC_ENABLED=true
```

#### **Push Notification Service**
```typescript
// services/NotificationService.ts
import admin from 'firebase-admin';
import { User } from '../models/User';
import { logger } from '../utils/logger';

interface NotificationPayload {
    userId: string;
    title: string;
    body: string;
    data?: Record<string, string>;
    type: 'new_restaurant' | 'review_response' | 'nearby_event' | 'favorite_update';
}

interface LocationNotification {
    lat: number;
    lng: number;
    radius: number;
    title: string;
    body: string;
    data?: Record<string, string>;
}

class NotificationService {
    private messaging: admin.messaging.Messaging;

    constructor() {
        // Initialize Firebase Admin SDK
        if (!admin.apps.length) {
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: process.env.FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
                }),
            });
        }
        this.messaging = admin.messaging();
    }

    async sendToUser(payload: NotificationPayload): Promise<boolean> {
        try {
            const user = await User.findById(payload.userId);
            if (!user || !user.deviceTokens || user.deviceTokens.length === 0) {
                logger.warn('No device tokens found for user', { userId: payload.userId });
                return false;
            }

            const message = {
                notification: {
                    title: payload.title,
                    body: payload.body,
                },
                data: {
                    type: payload.type,
                    ...payload.data,
                },
                tokens: user.deviceTokens,
            };

            const response = await this.messaging.sendMulticast(message);
            
            // Remove invalid tokens
            if (response.failureCount > 0) {
                await this.removeInvalidTokens(user._id, response.responses, user.deviceTokens);
            }

            logger.info('Push notification sent', {
                userId: payload.userId,
                type: payload.type,
                successCount: response.successCount,
                failureCount: response.failureCount
            });

            return response.successCount > 0;
        } catch (error) {
            logger.error('Failed to send push notification', {
                userId: payload.userId,
                error: error.message
            });
            return false;
        }
    }

    async sendLocationBasedNotification(notification: LocationNotification): Promise<number> {
        try {
            // Find users within the specified radius
            const usersNearby = await User.find({
                'location.coordinates': {
                    $near: {
                        $geometry: {
                            type: 'Point',
                            coordinates: [notification.lng, notification.lat]
                        },
                        $maxDistance: notification.radius
                    }
                },
                deviceTokens: { $exists: true, $not: { $size: 0 } },
                notificationSettings: {
                    locationBased: true
                }
            });

            let sentCount = 0;
            
            for (const user of usersNearby) {
                const success = await this.sendToUser({
                    userId: user._id,
                    title: notification.title,
                    body: notification.body,
                    data: notification.data,
                    type: 'nearby_event'
                });
                
                if (success) sentCount++;
            }

            logger.info('Location-based notifications sent', {
                totalUsers: usersNearby.length,
                sentCount,
                location: { lat: notification.lat, lng: notification.lng },
                radius: notification.radius
            });

            return sentCount;
        } catch (error) {
            logger.error('Failed to send location-based notifications', {
                error: error.message,
                location: { lat: notification.lat, lng: notification.lng }
            });
            return 0;
        }
    }

    async registerDeviceToken(userId: string, deviceToken: string): Promise<void> {
        try {
            await User.findByIdAndUpdate(
                userId,
                { $addToSet: { deviceTokens: deviceToken } },
                { new: true }
            );
            
            logger.info('Device token registered', { userId, deviceToken: deviceToken.substring(0, 20) + '...' });
        } catch (error) {
            logger.error('Failed to register device token', {
                userId,
                error: error.message
            });
        }
    }

    async unregisterDeviceToken(userId: string, deviceToken: string): Promise<void> {
        try {
            await User.findByIdAndUpdate(
                userId,
                { $pull: { deviceTokens: deviceToken } }
            );
            
            logger.info('Device token unregistered', { userId, deviceToken: deviceToken.substring(0, 20) + '...' });
        } catch (error) {
            logger.error('Failed to unregister device token', {
                userId,
                error: error.message
            });
        }
    }

    private async removeInvalidTokens(userId: string, responses: any[], tokens: string[]): Promise<void> {
        const invalidTokens = [];
        
        responses.forEach((response, index) => {
            if (!response.success && response.error) {
                const errorCode = response.error.code;
                if (errorCode === 'messaging/invalid-registration-token' ||
                    errorCode === 'messaging/registration-token-not-registered') {
                    invalidTokens.push(tokens[index]);
                }
            }
        });

        if (invalidTokens.length > 0) {
            await User.findByIdAndUpdate(
                userId,
                { $pullAll: { deviceTokens: invalidTokens } }
            );
            
            logger.info('Removed invalid device tokens', {
                userId,
                removedCount: invalidTokens.length
            });
        }
    }

    // Predefined notification templates
    async notifyNewRestaurantNearby(userId: string, restaurantName: string, distance: number): Promise<boolean> {
        return await this.sendToUser({
            userId,
            title: '🍽️ New Vegan Restaurant Nearby!',
            body: `${restaurantName} just opened ${distance.toFixed(1)}km from you`,
            type: 'new_restaurant',
            data: {
                distance: distance.toString(),
                restaurantName
            }
        });
    }

    async notifyReviewResponse(userId: string, businessName: string): Promise<boolean> {
        return await this.sendToUser({
            userId,
            title: '💬 Response to Your Review',
            body: `${businessName} responded to your review`,
            type: 'review_response',
            data: {
                businessName
            }
        });
    }
}

export default new NotificationService();
```

#### **User Model Enhancement for Mobile**
```typescript
// models/User.ts - Add mobile-specific fields
export interface IUser extends Document {
    // ... existing fields
    deviceTokens: string[];
    location?: IGeoJSONPoint;
    notificationSettings: {
        locationBased: boolean;
        reviewResponses: boolean;
        newPlacesNearby: boolean;
        favorites: boolean;
    };
    lastActiveLocation?: {
        coordinates: [number, number];
        timestamp: Date;
    };
    preferences: {
        searchRadius: number;
        favoriteCategories: string[];
        language: string;
    };
}

// Add to schema
deviceTokens: {
    type: [String],
    default: []
},
location: geoJSONPointSchema,
notificationSettings: {
    locationBased: {
        type: Boolean,
        default: true
    },
    reviewResponses: {
        type: Boolean,
        default: true
    },
    newPlacesNearby: {
        type: Boolean,
        default: true
    },
    favorites: {
        type: Boolean,
        default: true
    }
},
lastActiveLocation: {
    coordinates: {
        type: [Number],
        index: '2dsphere'
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
},
preferences: {
    searchRadius: {
        type: Number,
        default: 5000 // 5km
    },
    favoriteCategories: {
        type: [String],
        default: []
    },
    language: {
        type: String,
        default: 'en'
    }
}
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
- [ ] Mobile endpoints implemented
- [ ] Push notification system operational
- [ ] Geolocation service enhanced
- [ ] Offline sync functionality working

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

---

## 📱 **React Native Integration Guide**

### **Mobile App Architecture**

```typescript
// React Native Project Structure
VeganCityGuide/
├── src/
│   ├── api/           # API client and endpoints
│   ├── components/    # Reusable components
│   ├── screens/       # Screen components
│   ├── navigation/    # Navigation configuration
│   ├── store/         # Redux store and slices
│   ├── services/      # Location, notification services
│   ├── utils/         # Utility functions
│   └── types/         # TypeScript interfaces
├── android/           # Android specific code
├── ios/              # iOS specific code
└── package.json
```

### **API Client Configuration**

```typescript
// src/api/client.ts
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

const API_BASE_URL = __DEV__ 
  ? 'http://localhost:5001/api/v1' 
  : 'https://your-production-api.com/api/v1';

class ApiClient {
  private axiosInstance;
  private isOnline = true;
  private offlineQueue: any[] = [];

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
    });

    this.setupInterceptors();
    this.setupNetworkListener();
  }

  private setupInterceptors() {
    // Request interceptor for auth token
    this.axiosInstance.interceptors.request.use(async (config) => {
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Response interceptor for error handling
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          await AsyncStorage.removeItem('auth_token');
          // Navigate to login screen
        }
        return Promise.reject(error);
      }
    );
  }

  private setupNetworkListener() {
    NetInfo.addEventListener(state => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected ?? false;
      
      if (wasOffline && this.isOnline) {
        this.processOfflineQueue();
      }
    });
  }

  // Location-based API calls
  async getNearbyPlaces(lat: number, lng: number, radius: number = 5000, types?: string[]) {
    const params = {
      lat,
      lng,
      radius,
      types: types?.join(',') || 'restaurant,business,market,doctor,profession'
    };

    if (!this.isOnline) {
      return this.getCachedNearbyPlaces(lat, lng, radius);
    }

    try {
      const response = await this.axiosInstance.get('/mobile/nearby', { params });
      
      // Cache successful response
      await this.cacheNearbyPlaces(lat, lng, radius, response.data);
      
      return response.data;
    } catch (error) {
      // Fallback to cached data
      return this.getCachedNearbyPlaces(lat, lng, radius);
    }
  }

  async syncOfflineData() {
    if (!this.isOnline) return;

    try {
      const lastSync = await AsyncStorage.getItem('lastSync');
      const pendingActions = JSON.parse(await AsyncStorage.getItem('pendingActions') || '[]');
      
      const response = await this.axiosInstance.post('/mobile/sync', {
        lastSync,
        pendingActions,
        deviceId: await this.getDeviceId()
      });

      // Clear processed actions
      await AsyncStorage.setItem('pendingActions', '[]');
      await AsyncStorage.setItem('lastSync', new Date().toISOString());

      return response.data;
    } catch (error) {
      console.error('Sync failed:', error);
      throw error;
    }
  }

  private async processOfflineQueue() {
    while (this.offlineQueue.length > 0) {
      const request = this.offlineQueue.shift();
      try {
        await request();
      } catch (error) {
        console.error('Failed to process queued request:', error);
      }
    }
  }
}

export default new ApiClient();
```

### **Location Service Integration**

```typescript
// src/services/LocationService.ts
import Geolocation from '@react-native-community/geolocation';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { Platform } from 'react-native';

export class LocationService {
  static async requestLocationPermission(): Promise<boolean> {
    try {
      const permission = Platform.OS === 'ios' 
        ? PERMISSIONS.IOS.LOCATION_WHEN_IN_USE
        : PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;

      const result = await request(permission);
      return result === RESULTS.GRANTED;
    } catch (error) {
      console.error('Location permission error:', error);
      return false;
    }
  }

  static async getCurrentLocation(): Promise<{lat: number, lng: number} | null> {
    const hasPermission = await this.requestLocationPermission();
    if (!hasPermission) return null;

    return new Promise((resolve) => {
      Geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error('Location error:', error);
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );
    });
  }

  static watchLocation(callback: (location: {lat: number, lng: number}) => void): number {
    return Geolocation.watchPosition(
      (position) => {
        callback({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      },
      (error) => console.error('Location watch error:', error),
      { enableHighAccuracy: true, distanceFilter: 100 }
    );
  }

  static clearWatch(watchId: number) {
    Geolocation.clearWatch(watchId);
  }
}
```

### **Push Notification Setup**

```typescript
// src/services/NotificationService.ts
import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export class NotificationService {
  static async initialize() {
    await this.requestPermission();
    await this.getToken();
    this.setupMessageHandlers();
  }

  static async requestPermission(): Promise<boolean> {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    return enabled;
  }

  static async getToken(): Promise<string | null> {
    try {
      const token = await messaging().getToken();
      await AsyncStorage.setItem('fcm_token', token);
      
      // Send token to your API
      await ApiClient.registerDeviceToken(token);
      
      return token;
    } catch (error) {
      console.error('Failed to get FCM token:', error);
      return null;
    }
  }

  static setupMessageHandlers() {
    // Handle background messages
    messaging().setBackgroundMessageHandler(async remoteMessage => {
      console.log('Message handled in the background!', remoteMessage);
    });

    // Handle foreground messages
    messaging().onMessage(async remoteMessage => {
      console.log('Message handled in the foreground!', remoteMessage);
      
      if (remoteMessage.notification) {
        this.showLocalNotification(remoteMessage.notification);
      }
    });

    // Handle notification opened app
    messaging().onNotificationOpenedApp(remoteMessage => {
      console.log(
        'Notification caused app to open from background state:',
        remoteMessage.notification,
      );
      
      this.handleNotificationNavigation(remoteMessage.data);
    });

    // Check whether an initial notification is available
    messaging()
      .getInitialNotification()
      .then(remoteMessage => {
        if (remoteMessage) {
          console.log(
            'Notification caused app to open from quit state:',
            remoteMessage.notification,
          );
          
          this.handleNotificationNavigation(remoteMessage.data);
        }
      });
  }

  static handleNotificationNavigation(data: any) {
    // Navigate based on notification type
    switch (data?.type) {
      case 'new_restaurant':
        // Navigate to restaurant detail
        break;
      case 'review_response':
        // Navigate to reviews section
        break;
      case 'nearby_event':
        // Navigate to map with location
        break;
    }
  }
}
```

### **Redux Store with RTK Query**

```typescript
// src/store/api.ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/v1',
    prepareHeaders: async (headers) => {
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['Restaurant', 'Business', 'User', 'Review'],
  endpoints: (builder) => ({
    getNearbyPlaces: builder.query({
      query: ({ lat, lng, radius, types }) => ({
        url: '/mobile/nearby',
        params: { lat, lng, radius, types: types?.join(',') },
      }),
      providesTags: ['Restaurant', 'Business'],
    }),
    
    getMapData: builder.query({
      query: ({ bounds, type, zoom }) => ({
        url: '/mobile/map-data',
        params: { bounds: JSON.stringify(bounds), type, zoom },
      }),
    }),
    
    syncOfflineData: builder.mutation({
      query: ({ lastSync, pendingActions, deviceId }) => ({
        url: '/mobile/sync',
        method: 'POST',
        body: { lastSync, pendingActions, deviceId },
      }),
    }),
  }),
});

export const {
  useGetNearbyPlacesQuery,
  useGetMapDataQuery,
  useSyncOfflineDataMutation,
} = apiSlice;
```

### **Key React Native Dependencies**

```json
{
  "dependencies": {
    "@react-navigation/native": "^6.1.0",
    "@react-navigation/stack": "^6.3.0",
    "@react-navigation/bottom-tabs": "^6.5.0",
    "@reduxjs/toolkit": "^1.9.0",
    "react-redux": "^8.0.0",
    "@react-native-async-storage/async-storage": "^1.19.0",
    "@react-native-community/geolocation": "^3.2.0",
    "@react-native-community/netinfo": "^11.0.0",
    "react-native-permissions": "^4.0.0",
    "react-native-maps": "^1.8.0",
    "@react-native-firebase/app": "^18.0.0",
    "@react-native-firebase/messaging": "^18.0.0",
    "react-native-image-picker": "^7.0.0",
    "react-native-vector-icons": "^10.0.0",
    "axios": "^1.4.0"
  }
}
```

### **Implementation Checklist**

#### **Week 1: Setup & Basic Integration**
- [ ] React Native project initialization
- [ ] API client configuration with offline support
- [ ] Basic navigation structure
- [ ] Authentication flow integration

#### **Week 2: Core Features**
- [ ] Location services implementation
- [ ] Map integration with markers
- [ ] Restaurant/business listing screens
- [ ] Search functionality

#### **Week 3: Advanced Features**
- [ ] Push notifications setup
- [ ] Offline data synchronization
- [ ] Review and rating system
- [ ] Favorites management

#### **Week 4: Polish & Testing**
- [ ] Performance optimization
- [ ] Error handling improvements
- [ ] User testing and feedback
- [ ] App store preparation

This integration guide provides a comprehensive roadmap for implementing the React Native mobile application that leverages all the enhanced API endpoints and services.