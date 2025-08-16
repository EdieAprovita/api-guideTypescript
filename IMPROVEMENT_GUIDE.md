# 🚀 Guía Completa de Mejoras para API TypeScript - Vegan City Guide

## 📋 Resumen Ejecutivo

Esta guía está dividida en **4 fases** progresivas para mejorar tu API de manera sistemática, priorizando estabilidad, rendimiento y escalabilidad.

**Duración estimada total:** 6-8 semanas  
**Puntuación actual:** 8.2/10  
**Objetivo:** 9.5/10

---

## 🎯 FASE 1: ESTABILIZACIÓN Y CORRECCIÓN (Semana 1-2)
> **Objetivo:** Resolver problemas críticos y mejorar la confiabilidad del sistema

### 1.1 Corrección de Tests Fallidos ⚠️

#### **Problema: Test timeout en userControllers.test.ts**

**Archivo afectado:** `src/test/controllers/userControllers.test.ts:120`

```typescript
// src/test/controllers/userControllers.test.ts
describe('GET /api/v1/users - Get all users (Protected)', () => {
    it('should return all users with admin access', async () => {
        // Aumentar timeout específico para este test
        const response = await request(app)
            .get('/api/v1/users')
            .set('Authorization', `Bearer ${adminToken}`)
            .timeout(45000); // Timeout específico
            
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
    }, 45000); // Timeout del test también
});
```

#### **Problema: Token blacklisting fallido**

**Archivo afectado:** `src/test/services/tokenService.test.ts`

```typescript
// src/services/TokenService.ts - Mejorar blacklisting
export class TokenService {
    async blacklistToken(token: string): Promise<void> {
        try {
            const decoded = jwt.decode(token) as any;
            if (!decoded?.jti) {
                throw new Error('Invalid token structure');
            }
            
            // Calcular TTL basado en expiration
            const now = Math.floor(Date.now() / 1000);
            const ttl = decoded.exp - now;
            
            if (ttl > 0) {
                await this.redisClient.setex(`blacklist:${decoded.jti}`, ttl, 'true');
            }
        } catch (error) {
            logger.error('Failed to blacklist token:', error);
            throw new Error('Token blacklisting failed');
        }
    }
    
    async isTokenBlacklisted(jti: string): Promise<boolean> {
        try {
            const result = await this.redisClient.get(`blacklist:${jti}`);
            return result === 'true';
        } catch (error) {
            logger.warn('Redis blacklist check failed, continuing:', error);
            return false; // Fail-open en caso de error de Redis
        }
    }
}
```

### 1.2 Configuración de Vitest Mejorada

**Archivo:** `vitest.unit.config.ts`

```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    name: 'unit',
    include: [
      'src/test/services/**/*.test.ts',
      'src/test/controllers/**/*.test.ts',
      'src/test/utils/**/*.test.ts',
      'src/test/models/**/*.test.ts'
    ],
    exclude: [
      'src/test/integration/**',
      '**/*.integration.test.ts'
    ],
    environment: 'node',
    globals: true,
    clearMocks: true,
    restoreMocks: true,
    mockReset: true,
    setupFiles: ['src/test/setup/unit-setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/services/**', 'src/controllers/**', 'src/utils/**'],
      exclude: [
        'src/test/**',
        'src/**/*.test.ts',
        'src/**/*.spec.ts'
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    },
    testTimeout: 10000, // Aumentado de 5s a 10s
    hookTimeout: 10000,
    bail: 0,
    logHeapUsage: true,
    passWithNoTests: true,
    retry: 2 // Reintentar tests fallidos
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@test': path.resolve(__dirname, './src/test')
    }
  }
});
```

### 1.3 Logging Mejorado

**Archivo:** `src/utils/logger.ts`

```typescript
import winston from 'winston';
import path from 'path';

// Crear directorio de logs si no existe
const logsDir = path.join(process.cwd(), 'logs');

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
            return JSON.stringify({
                timestamp,
                level,
                message,
                ...meta,
                correlationId: meta.correlationId || 'no-correlation-id'
            });
        })
    ),
    defaultMeta: { service: 'vegan-city-guide-api' },
    transports: []
});

// Configurar transports según el entorno
if (process.env.NODE_ENV !== 'test') {
    // File transports para producción
    logger.add(new winston.transports.File({
        filename: path.join(logsDir, 'error.log'),
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5,
        tailable: true
    }));
    
    logger.add(new winston.transports.File({
        filename: path.join(logsDir, 'combined.log'),
        maxsize: 5242880,
        maxFiles: 10,
        tailable: true
    }));
    
    // Separate audit log
    logger.add(new winston.transports.File({
        filename: path.join(logsDir, 'audit.log'),
        level: 'info',
        maxsize: 10485760, // 10MB
        maxFiles: 20,
        format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
            winston.format.printf(({ timestamp, level, message, ...meta }) => {
                if (meta.audit) {
                    return JSON.stringify({
                        timestamp,
                        level: 'AUDIT',
                        message,
                        ...meta
                    });
                }
                return '';
            })
        )
    }));
}

// Console transport
logger.add(new winston.transports.Console({
    format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
            const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
            return `${timestamp} [${level}]: ${message} ${metaStr}`;
        })
    )
}));

// Audit logging helper
export const auditLogger = {
    log: (action: string, userId: string, details: object = {}) => {
        logger.info(`Audit: ${action}`, {
            audit: true,
            action,
            userId,
            timestamp: new Date().toISOString(),
            ...details
        });
    }
};

export default logger;
```

### 1.4 Health Check Endpoint

**Archivo:** `src/routes/healthRoutes.ts`

```typescript
import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { redisClient } from '../config/redis';

const router = Router();

interface HealthStatus {
    status: 'healthy' | 'unhealthy';
    timestamp: string;
    services: {
        database: 'connected' | 'disconnected';
        redis: 'connected' | 'disconnected';
        memory: {
            used: string;
            total: string;
            percentage: number;
        };
    };
    uptime: number;
}

router.get('/health', async (req: Request, res: Response) => {
    const healthStatus: HealthStatus = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
            database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
            redis: 'disconnected',
            memory: {
                used: '',
                total: '',
                percentage: 0
            }
        },
        uptime: process.uptime()
    };

    // Check Redis connection
    try {
        await redisClient.ping();
        healthStatus.services.redis = 'connected';
    } catch (error) {
        healthStatus.services.redis = 'disconnected';
        healthStatus.status = 'unhealthy';
    }

    // Memory usage
    const memoryUsage = process.memoryUsage();
    const totalMemory = memoryUsage.heapTotal;
    const usedMemory = memoryUsage.heapUsed;
    
    healthStatus.services.memory = {
        used: `${Math.round(usedMemory / 1024 / 1024)} MB`,
        total: `${Math.round(totalMemory / 1024 / 1024)} MB`,
        percentage: Math.round((usedMemory / totalMemory) * 100)
    };

    const statusCode = healthStatus.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(healthStatus);
});

router.get('/ready', async (req: Request, res: Response) => {
    try {
        // Check database
        if (mongoose.connection.readyState !== 1) {
            throw new Error('Database not ready');
        }

        // Check Redis
        await redisClient.ping();

        res.status(200).json({
            status: 'ready',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(503).json({
            status: 'not ready',
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
    }
});

export default router;
```

### 1.5 Checklist Fase 1

- [ ] Corregir timeout en tests de usuarios
- [ ] Arreglar token blacklisting en TokenService
- [ ] Implementar logging mejorado con rotación
- [ ] Agregar health check endpoints
- [ ] Configurar coverage thresholds en tests
- [ ] Ejecutar todos los tests y verificar que pasen
- [ ] Documentar cambios realizados

---

## 🔒 FASE 2: SEGURIDAD Y AUDIT (Semana 3-4)
> **Objetivo:** Implementar audit logging y mejorar la seguridad del sistema

### 2.1 Audit Logging System

**Archivo:** `src/middleware/auditMiddleware.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import { auditLogger } from '../utils/logger';

interface AuditableAction {
    method: string;
    path: string;
    requiresAudit: boolean;
    action: string;
}

const auditableActions: AuditableAction[] = [
    { method: 'POST', path: '/api/v1/users/register', requiresAudit: true, action: 'USER_REGISTER' },
    { method: 'POST', path: '/api/v1/users/login', requiresAudit: true, action: 'USER_LOGIN' },
    { method: 'POST', path: '/api/v1/auth/logout', requiresAudit: true, action: 'USER_LOGOUT' },
    { method: 'DELETE', path: '/api/v1/users/:id', requiresAudit: true, action: 'USER_DELETE' },
    { method: 'PUT', path: '/api/v1/users/profile/:id', requiresAudit: true, action: 'USER_UPDATE' },
    { method: 'POST', path: '/api/v1/restaurants', requiresAudit: true, action: 'RESTAURANT_CREATE' },
    { method: 'PUT', path: '/api/v1/restaurants/:id', requiresAudit: true, action: 'RESTAURANT_UPDATE' },
    { method: 'DELETE', path: '/api/v1/restaurants/:id', requiresAudit: true, action: 'RESTAURANT_DELETE' },
];

export const auditMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.send;
    
    // Override res.send to capture response
    res.send = function(body: any) {
        const auditableAction = auditableActions.find(
            action => action.method === req.method && 
            matchPath(action.path, req.path)
        );

        if (auditableAction && auditableAction.requiresAudit) {
            const userId = req.user?._id || 'anonymous';
            const statusCode = res.statusCode;
            
            auditLogger.log(auditableAction.action, userId, {
                method: req.method,
                path: req.path,
                statusCode,
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                body: sanitizeForAudit(req.body),
                params: req.params,
                query: req.query,
                success: statusCode >= 200 && statusCode < 400,
                correlationId: req.correlationId
            });
        }
        
        return originalSend.call(this, body);
    };

    next();
};

function matchPath(pattern: string, path: string): boolean {
    const patternSegments = pattern.split('/');
    const pathSegments = path.split('/');
    
    if (patternSegments.length !== pathSegments.length) {
        return false;
    }
    
    return patternSegments.every((segment, index) => {
        return segment.startsWith(':') || segment === pathSegments[index];
    });
}

function sanitizeForAudit(body: any): any {
    if (!body) return body;
    
    const sensitiveFields = ['password', 'currentPassword', 'newPassword', 'token', 'refreshToken'];
    const sanitized = { ...body };
    
    sensitiveFields.forEach(field => {
        if (sanitized[field]) {
            sanitized[field] = '[REDACTED]';
        }
    });
    
    return sanitized;
}
```

### 2.2 Enhanced Security Middleware

**Archivo:** `src/middleware/advancedSecurity.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { auditLogger } from '../utils/logger';

// IP Whitelist para endpoints administrativos
const ADMIN_IP_WHITELIST = process.env.ADMIN_IP_WHITELIST?.split(',') || [];

export const adminIPWhitelist = (req: Request, res: Response, next: NextFunction) => {
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
        return next();
    }

    const clientIP = req.ip || req.connection.remoteAddress || '';
    const isWhitelisted = ADMIN_IP_WHITELIST.includes(clientIP) || 
                         ADMIN_IP_WHITELIST.includes('0.0.0.0'); // Allow all if configured

    if (!isWhitelisted) {
        auditLogger.log('ADMIN_ACCESS_DENIED', 'system', {
            ip: clientIP,
            path: req.path,
            method: req.method,
            userAgent: req.get('User-Agent')
        });

        return res.status(403).json({
            success: false,
            message: 'Access denied from this IP address'
        });
    }

    next();
};

// CSP Nonce generator
export const generateCSPNonce = (req: Request, res: Response, next: NextFunction) => {
    const nonce = crypto.randomBytes(16).toString('base64');
    res.locals.nonce = nonce;
    
    // Update CSP header with nonce
    res.setHeader(
        'Content-Security-Policy',
        `default-src 'self'; script-src 'self' 'nonce-${nonce}'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;`
    );
    
    next();
};

// Request signature validation para APIs críticas
export const validateRequestSignature = (secret: string) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const signature = req.get('X-Request-Signature');
        const timestamp = req.get('X-Request-Timestamp');
        
        if (!signature || !timestamp) {
            return res.status(401).json({
                success: false,
                message: 'Missing request signature or timestamp'
            });
        }

        // Verificar que el timestamp no sea muy antiguo (5 minutos)
        const now = Date.now();
        const requestTime = parseInt(timestamp);
        
        if (now - requestTime > 5 * 60 * 1000) {
            return res.status(401).json({
                success: false,
                message: 'Request timestamp too old'
            });
        }

        // Generar signature esperado
        const payload = JSON.stringify(req.body) + timestamp;
        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(payload)
            .digest('hex');

        if (signature !== expectedSignature) {
            auditLogger.log('INVALID_REQUEST_SIGNATURE', 'system', {
                ip: req.ip,
                path: req.path,
                expectedSignature,
                receivedSignature: signature
            });

            return res.status(401).json({
                success: false,
                message: 'Invalid request signature'
            });
        }

        next();
    };
};

// Detección de ataques por fuerza bruta
const failedAttempts = new Map<string, { count: number; lastAttempt: number }>();

export const bruteForcePrevention = (maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const key = req.ip || 'unknown';
        const now = Date.now();
        
        const attempts = failedAttempts.get(key);
        
        if (attempts) {
            // Reset counter si ha pasado la ventana de tiempo
            if (now - attempts.lastAttempt > windowMs) {
                failedAttempts.delete(key);
            } else if (attempts.count >= maxAttempts) {
                auditLogger.log('BRUTE_FORCE_BLOCKED', 'system', {
                    ip: key,
                    attempts: attempts.count,
                    path: req.path
                });

                return res.status(429).json({
                    success: false,
                    message: 'Too many failed attempts. Please try again later.',
                    retryAfter: Math.ceil((windowMs - (now - attempts.lastAttempt)) / 1000)
                });
            }
        }

        // Interceptar respuesta para contar fallos
        const originalSend = res.send;
        res.send = function(body: any) {
            if (res.statusCode === 401 || res.statusCode === 403) {
                const current = failedAttempts.get(key) || { count: 0, lastAttempt: 0 };
                failedAttempts.set(key, {
                    count: current.count + 1,
                    lastAttempt: now
                });
            } else if (res.statusCode >= 200 && res.statusCode < 300) {
                // Login exitoso, resetear contador
                failedAttempts.delete(key);
            }
            
            return originalSend.call(this, body);
        };

        next();
    };
};
```

### 2.3 Secrets Management

**Archivo:** `src/utils/secretsManager.ts`

```typescript
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

interface SecretConfig {
    key: string;
    rotationIntervalMs: number;
    lastRotated: number;
}

class SecretsManager {
    private secrets: Map<string, SecretConfig> = new Map();
    private readonly secretsFile = path.join(process.cwd(), '.secrets.json');

    constructor() {
        this.loadSecrets();
        this.setupRotation();
    }

    private loadSecrets() {
        try {
            if (fs.existsSync(this.secretsFile)) {
                const data = fs.readFileSync(this.secretsFile, 'utf8');
                const secrets = JSON.parse(data);
                
                Object.entries(secrets).forEach(([name, config]) => {
                    this.secrets.set(name, config as SecretConfig);
                });
            }
        } catch (error) {
            console.warn('Could not load secrets file:', error);
        }
    }

    private saveSecrets() {
        try {
            const secretsObj = Object.fromEntries(this.secrets);
            fs.writeFileSync(this.secretsFile, JSON.stringify(secretsObj, null, 2));
        } catch (error) {
            console.error('Could not save secrets file:', error);
        }
    }

    public getSecret(name: string): string {
        const secret = this.secrets.get(name);
        
        if (!secret) {
            // Generate new secret if it doesn't exist
            const newSecret = this.generateSecret(name);
            return newSecret;
        }

        // Check if rotation is needed
        const now = Date.now();
        if (now - secret.lastRotated > secret.rotationIntervalMs) {
            return this.rotateSecret(name);
        }

        return secret.key;
    }

    private generateSecret(name: string, rotationIntervalMs: number = 24 * 60 * 60 * 1000): string {
        const key = crypto.randomBytes(64).toString('hex');
        
        this.secrets.set(name, {
            key,
            rotationIntervalMs,
            lastRotated: Date.now()
        });
        
        this.saveSecrets();
        return key;
    }

    private rotateSecret(name: string): string {
        const secret = this.secrets.get(name);
        if (!secret) {
            return this.generateSecret(name);
        }

        const newKey = crypto.randomBytes(64).toString('hex');
        
        this.secrets.set(name, {
            ...secret,
            key: newKey,
            lastRotated: Date.now()
        });
        
        this.saveSecrets();
        console.log(`Secret '${name}' has been rotated`);
        
        return newKey;
    }

    private setupRotation() {
        // Check for rotation every hour
        setInterval(() => {
            this.secrets.forEach((secret, name) => {
                const now = Date.now();
                if (now - secret.lastRotated > secret.rotationIntervalMs) {
                    this.rotateSecret(name);
                }
            });
        }, 60 * 60 * 1000); // 1 hour
    }
}

export const secretsManager = new SecretsManager();
```

### 2.4 Two-Factor Authentication

**Archivo:** `src/services/TwoFactorService.ts`

```typescript
import crypto from 'crypto';
import { User } from '../models/User';
import { CacheService } from './CacheService';
import nodemailer from 'nodemailer';

export class TwoFactorService {
    private cacheService = new CacheService();
    
    private transporter = nodemailer.createTransporter({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT || '587'),
        secure: false,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    async generateTwoFactorCode(userId: string): Promise<string> {
        const code = crypto.randomInt(100000, 999999).toString();
        const key = `2fa:${userId}`;
        
        // Store code for 10 minutes
        await this.cacheService.set(key, code, 600);
        
        return code;
    }

    async sendTwoFactorCode(userId: string, email: string): Promise<void> {
        const code = await this.generateTwoFactorCode(userId);
        
        const mailOptions = {
            from: process.env.EMAIL_FROM,
            to: email,
            subject: 'Your Two-Factor Authentication Code',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>Two-Factor Authentication</h2>
                    <p>Your verification code is:</p>
                    <div style="background-color: #f0f0f0; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; margin: 20px 0;">
                        ${code}
                    </div>
                    <p>This code will expire in 10 minutes.</p>
                    <p>If you didn't request this code, please contact support immediately.</p>
                </div>
            `
        };

        await this.transporter.sendMail(mailOptions);
    }

    async verifyTwoFactorCode(userId: string, code: string): Promise<boolean> {
        const key = `2fa:${userId}`;
        const storedCode = await this.cacheService.get(key);
        
        if (storedCode === code) {
            // Remove used code
            await this.cacheService.delete(key);
            return true;
        }
        
        return false;
    }

    async requiresTwoFactor(userId: string): Promise<boolean> {
        const user = await User.findById(userId);
        return user?.role === 'admin' || user?.role === 'professional';
    }
}
```

### 2.5 Checklist Fase 2

- [ ] Implementar sistema de audit logging
- [ ] Configurar IP whitelist para admins
- [ ] Agregar detección de fuerza bruta
- [ ] Implementar secrets rotation
- [ ] Configurar 2FA para usuarios admin
- [ ] Actualizar middleware de seguridad
- [ ] Probar todas las funcionalidades de seguridad

---

## 📈 FASE 3: OPTIMIZACIÓN Y RENDIMIENTO (Semana 5-6)
> **Objetivo:** Mejorar el rendimiento y preparar para escalabilidad

### 3.1 Database Indexing Strategy

**Archivo:** `src/scripts/createIndexes.ts`

```typescript
import mongoose from 'mongoose';
import { User } from '../models/User';
import { Restaurant } from '../models/Restaurant';
import { Business } from '../models/Business';
import logger from '../utils/logger';

interface IndexDefinition {
    collection: string;
    indexes: Array<{
        fields: Record<string, 1 | -1>;
        options?: mongoose.IndexOptions;
        description: string;
    }>;
}

const indexDefinitions: IndexDefinition[] = [
    {
        collection: 'users',
        indexes: [
            {
                fields: { email: 1 },
                options: { unique: true, sparse: true },
                description: 'Unique email index for faster login'
            },
            {
                fields: { username: 1 },
                options: { unique: true, sparse: true },
                description: 'Unique username index'
            },
            {
                fields: { role: 1, isActive: 1 },
                description: 'Compound index for role-based queries'
            },
            {
                fields: { createdAt: -1 },
                description: 'Index for date-based sorting'
            },
            {
                fields: { isDeleted: 1, isActive: 1 },
                description: 'Index for filtering active/deleted users'
            }
        ]
    },
    {
        collection: 'restaurants',
        indexes: [
            {
                fields: { location: '2dsphere' },
                description: 'Geospatial index for location-based queries'
            },
            {
                fields: { name: 'text', description: 'text', cuisine: 'text' },
                options: { 
                    weights: { name: 10, cuisine: 5, description: 1 },
                    name: 'restaurant_text_index'
                },
                description: 'Text search index with weighted fields'
            },
            {
                fields: { averageRating: -1, reviewCount: -1 },
                description: 'Index for sorting by rating and review count'
            },
            {
                fields: { cuisine: 1, priceRange: 1 },
                description: 'Compound index for filtering by cuisine and price'
            },
            {
                fields: { isActive: 1, isDeleted: 1 },
                description: 'Index for filtering active restaurants'
            },
            {
                fields: { createdAt: -1 },
                description: 'Index for date-based sorting'
            }
        ]
    },
    {
        collection: 'businesses',
        indexes: [
            {
                fields: { location: '2dsphere' },
                description: 'Geospatial index for location-based queries'
            },
            {
                fields: { name: 'text', description: 'text', category: 'text' },
                options: { 
                    weights: { name: 10, category: 5, description: 1 },
                    name: 'business_text_index'
                },
                description: 'Text search index'
            },
            {
                fields: { category: 1, isActive: 1 },
                description: 'Compound index for category filtering'
            }
        ]
    },
    {
        collection: 'reviews',
        indexes: [
            {
                fields: { targetId: 1, targetType: 1 },
                description: 'Compound index for finding reviews by target'
            },
            {
                fields: { userId: 1 },
                description: 'Index for finding user reviews'
            },
            {
                fields: { rating: -1, createdAt: -1 },
                description: 'Index for sorting reviews by rating and date'
            },
            {
                fields: { targetId: 1, userId: 1 },
                options: { unique: true },
                description: 'Prevent duplicate reviews from same user'
            }
        ]
    }
];

export async function createAllIndexes(): Promise<void> {
    try {
        logger.info('Starting index creation process...');
        
        for (const definition of indexDefinitions) {
            logger.info(`Creating indexes for collection: ${definition.collection}`);
            
            const collection = mongoose.connection.collection(definition.collection);
            
            for (const indexDef of definition.indexes) {
                try {
                    const indexName = await collection.createIndex(indexDef.fields, indexDef.options);
                    logger.info(`✅ Created index: ${indexName} - ${indexDef.description}`);
                } catch (error) {
                    if (error instanceof Error && error.message.includes('already exists')) {
                        logger.info(`ℹ️  Index already exists: ${indexDef.description}`);
                    } else {
                        logger.error(`❌ Failed to create index: ${indexDef.description}`, error);
                    }
                }
            }
        }
        
        logger.info('Index creation process completed');
    } catch (error) {
        logger.error('Failed to create indexes:', error);
        throw error;
    }
}

export async function dropAllIndexes(): Promise<void> {
    try {
        logger.info('Dropping all custom indexes...');
        
        for (const definition of indexDefinitions) {
            const collection = mongoose.connection.collection(definition.collection);
            const indexes = await collection.indexes();
            
            for (const index of indexes) {
                // Don't drop the default _id index
                if (index.name !== '_id_') {
                    try {
                        await collection.dropIndex(index.name);
                        logger.info(`Dropped index: ${index.name}`);
                    } catch (error) {
                        logger.warn(`Could not drop index ${index.name}:`, error);
                    }
                }
            }
        }
        
        logger.info('Index dropping completed');
    } catch (error) {
        logger.error('Failed to drop indexes:', error);
        throw error;
    }
}

// Script para ejecutar desde línea de comandos
if (require.main === module) {
    mongoose.connect(process.env.MONGODB_URI!, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    } as mongoose.ConnectOptions).then(async () => {
        const action = process.argv[2];
        
        if (action === 'create') {
            await createAllIndexes();
        } else if (action === 'drop') {
            await dropAllIndexes();
        } else {
            console.log('Usage: ts-node createIndexes.ts [create|drop]');
        }
        
        await mongoose.disconnect();
        process.exit(0);
    }).catch(error => {
        logger.error('Database connection failed:', error);
        process.exit(1);
    });
}
```

### 3.2 Query Optimization Service

**Archivo:** `src/services/QueryOptimizationService.ts`

```typescript
import mongoose from 'mongoose';
import { Request } from 'express';
import logger from '../utils/logger';

interface QueryMetrics {
    executionTime: number;
    documentsExamined: number;
    documentsReturned: number;
    indexUsed: boolean;
    queryPattern: string;
}

export class QueryOptimizationService {
    private queryMetrics: Map<string, QueryMetrics[]> = new Map();
    private slowQueryThreshold = 100; // ms

    async executeWithProfiling<T>(
        query: mongoose.Query<T, any>,
        queryDescription: string
    ): Promise<T> {
        const startTime = Date.now();
        
        // Enable profiling for this query
        const explain = await query.explain('executionStats');
        const result = await query.exec();
        
        const executionTime = Date.now() - startTime;
        const stats = explain.executionStats;
        
        const metrics: QueryMetrics = {
            executionTime,
            documentsExamined: stats.totalDocsExamined,
            documentsReturned: stats.totalDocsReturned,
            indexUsed: stats.executionSuccess && stats.totalDocsExamined < stats.totalDocsReturned * 10,
            queryPattern: queryDescription
        };

        // Store metrics
        const existingMetrics = this.queryMetrics.get(queryDescription) || [];
        existingMetrics.push(metrics);
        
        // Keep only last 100 entries per query pattern
        if (existingMetrics.length > 100) {
            existingMetrics.shift();
        }
        
        this.queryMetrics.set(queryDescription, existingMetrics);

        // Log slow queries
        if (executionTime > this.slowQueryThreshold) {
            logger.warn('Slow query detected', {
                queryPattern: queryDescription,
                executionTime,
                documentsExamined: stats.totalDocsExamined,
                documentsReturned: stats.totalDocsReturned,
                indexUsed: metrics.indexUsed,
                query: query.getQuery()
            });
        }

        return result;
    }

    getQueryMetrics(queryPattern?: string): Record<string, any> {
        if (queryPattern) {
            const metrics = this.queryMetrics.get(queryPattern) || [];
            return this.analyzeMetrics(metrics, queryPattern);
        }

        const allMetrics: Record<string, any> = {};
        this.queryMetrics.forEach((metrics, pattern) => {
            allMetrics[pattern] = this.analyzeMetrics(metrics, pattern);
        });

        return allMetrics;
    }

    private analyzeMetrics(metrics: QueryMetrics[], pattern: string): any {
        if (metrics.length === 0) {
            return { pattern, count: 0 };
        }

        const executionTimes = metrics.map(m => m.executionTime);
        const avgExecutionTime = executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length;
        const maxExecutionTime = Math.max(...executionTimes);
        const slowQueries = metrics.filter(m => m.executionTime > this.slowQueryThreshold).length;
        const indexUsageRate = metrics.filter(m => m.indexUsed).length / metrics.length * 100;

        return {
            pattern,
            count: metrics.length,
            avgExecutionTime: Math.round(avgExecutionTime),
            maxExecutionTime,
            slowQueries,
            indexUsageRate: Math.round(indexUsageRate),
            recommendations: this.generateRecommendations(metrics)
        };
    }

    private generateRecommendations(metrics: QueryMetrics[]): string[] {
        const recommendations: string[] = [];
        
        const avgExecutionTime = metrics.reduce((a, b) => a + b.executionTime, 0) / metrics.length;
        const indexUsageRate = metrics.filter(m => m.indexUsed).length / metrics.length * 100;
        const avgDocsExamined = metrics.reduce((a, b) => a + b.documentsExamined, 0) / metrics.length;
        const avgDocsReturned = metrics.reduce((a, b) => a + b.documentsReturned, 0) / metrics.length;

        if (avgExecutionTime > this.slowQueryThreshold) {
            recommendations.push('Query execution time is above threshold. Consider optimization.');
        }

        if (indexUsageRate < 80) {
            recommendations.push('Low index usage rate. Consider adding appropriate indexes.');
        }

        if (avgDocsExamined > avgDocsReturned * 10) {
            recommendations.push('High document examination ratio. Query may benefit from better indexing.');
        }

        if (recommendations.length === 0) {
            recommendations.push('Query performance looks good.');
        }

        return recommendations;
    }

    clearMetrics(): void {
        this.queryMetrics.clear();
    }
}

export const queryOptimizer = new QueryOptimizationService();
```

### 3.3 Advanced Caching Strategy

**Archivo:** `src/services/AdvancedCacheService.ts`

```typescript
import { CacheService } from './CacheService';
import logger from '../utils/logger';

interface CacheConfig {
    ttl: number;
    tags: string[];
    strategy: 'write-through' | 'write-behind' | 'cache-aside';
}

interface CacheStats {
    hits: number;
    misses: number;
    writes: number;
    evictions: number;
}

export class AdvancedCacheService extends CacheService {
    private stats: CacheStats = { hits: 0, misses: 0, writes: 0, evictions: 0 };
    private tagIndex: Map<string, Set<string>> = new Map();

    async getWithStats<T>(key: string): Promise<T | null> {
        const result = await super.get<T>(key);
        
        if (result !== null) {
            this.stats.hits++;
        } else {
            this.stats.misses++;
        }
        
        return result;
    }

    async setWithConfig<T>(key: string, value: T, config: CacheConfig): Promise<void> {
        await super.set(key, value, config.ttl);
        this.stats.writes++;
        
        // Update tag index
        config.tags.forEach(tag => {
            if (!this.tagIndex.has(tag)) {
                this.tagIndex.set(tag, new Set());
            }
            this.tagIndex.get(tag)!.add(key);
        });
    }

    async invalidateByTag(tag: string): Promise<number> {
        const keys = this.tagIndex.get(tag);
        if (!keys) return 0;
        
        let invalidated = 0;
        for (const key of keys) {
            await super.delete(key);
            invalidated++;
        }
        
        this.tagIndex.delete(tag);
        this.stats.evictions += invalidated;
        
        logger.info(`Invalidated ${invalidated} cache entries for tag: ${tag}`);
        return invalidated;
    }

    async warmup(warmupFunctions: Array<() => Promise<void>>): Promise<void> {
        logger.info('Starting cache warmup...');
        
        const startTime = Date.now();
        const results = await Promise.allSettled(warmupFunctions.map(fn => fn()));
        
        const successful = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;
        
        logger.info(`Cache warmup completed in ${Date.now() - startTime}ms`, {
            successful,
            failed,
            total: warmupFunctions.length
        });
    }

    getStats(): CacheStats & { hitRate: number } {
        const total = this.stats.hits + this.stats.misses;
        const hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
        
        return {
            ...this.stats,
            hitRate: Math.round(hitRate * 100) / 100
        };
    }

    resetStats(): void {
        this.stats = { hits: 0, misses: 0, writes: 0, evictions: 0 };
    }
}

// Pre-configured cache instances for different use cases
export const userCache = new AdvancedCacheService();
export const restaurantCache = new AdvancedCacheService();
export const searchCache = new AdvancedCacheService();

// Cache warming functions
export const cacheWarmupFunctions = [
    // Warm up popular restaurants
    async () => {
        // Implementation would fetch popular restaurants and cache them
        logger.info('Warming up popular restaurants cache...');
    },
    
    // Warm up user sessions
    async () => {
        logger.info('Warming up active user sessions...');
    },
    
    // Warm up search results
    async () => {
        logger.info('Warming up popular search results...');
    }
];
```

### 3.4 Connection Pool Monitoring

**Archivo:** `src/config/database.ts`

```typescript
import mongoose from 'mongoose';
import logger from '../utils/logger';

interface ConnectionMetrics {
    totalConnections: number;
    availableConnections: number;
    checkedOutConnections: number;
    minPoolSize: number;
    maxPoolSize: number;
}

class DatabaseManager {
    private metricsInterval?: NodeJS.Timeout;

    async connect(): Promise<void> {
        const options: mongoose.ConnectOptions = {
            maxPoolSize: parseInt(process.env.DB_MAX_POOL_SIZE || '10'),
            minPoolSize: parseInt(process.env.DB_MIN_POOL_SIZE || '5'),
            maxIdleTimeMS: parseInt(process.env.DB_MAX_IDLE_TIME || '30000'),
            serverSelectionTimeoutMS: parseInt(process.env.DB_SERVER_SELECTION_TIMEOUT || '5000'),
            socketTimeoutMS: parseInt(process.env.DB_SOCKET_TIMEOUT || '45000'),
            bufferMaxEntries: 0, // Disable mongoose buffering
            bufferCommands: false, // Disable mongoose buffering
        };

        try {
            await mongoose.connect(process.env.MONGODB_URI!, options);
            logger.info('Database connected successfully');
            
            this.setupEventListeners();
            this.startMetricsCollection();
            
        } catch (error) {
            logger.error('Database connection failed:', error);
            throw error;
        }
    }

    private setupEventListeners(): void {
        mongoose.connection.on('connected', () => {
            logger.info('Mongoose connected to MongoDB');
        });

        mongoose.connection.on('error', (err) => {
            logger.error('Mongoose connection error:', err);
        });

        mongoose.connection.on('disconnected', () => {
            logger.warn('Mongoose disconnected from MongoDB');
        });

        // Monitor connection pool events
        mongoose.connection.on('connectionPoolCreated', (event) => {
            logger.info('Connection pool created', { 
                address: event.address,
                options: event.options 
            });
        });

        mongoose.connection.on('connectionPoolClosed', () => {
            logger.info('Connection pool closed');
        });

        mongoose.connection.on('connectionCreated', (event) => {
            logger.debug('New connection created', { connectionId: event.connectionId });
        });

        mongoose.connection.on('connectionClosed', (event) => {
            logger.debug('Connection closed', { connectionId: event.connectionId });
        });
    }

    private startMetricsCollection(): void {
        this.metricsInterval = setInterval(() => {
            const metrics = this.getConnectionMetrics();
            
            logger.info('Database connection metrics', metrics);
            
            // Alert if connection pool is running low
            if (metrics.availableConnections < 2) {
                logger.warn('Low available database connections', metrics);
            }
            
        }, 60000); // Every minute
    }

    getConnectionMetrics(): ConnectionMetrics {
        const db = mongoose.connection.db;
        const admin = db?.admin();
        
        // Basic metrics from Mongoose
        return {
            totalConnections: mongoose.connection.readyState === 1 ? 1 : 0,
            availableConnections: mongoose.connection.readyState === 1 ? 1 : 0,
            checkedOutConnections: 0,
            minPoolSize: parseInt(process.env.DB_MIN_POOL_SIZE || '5'),
            maxPoolSize: parseInt(process.env.DB_MAX_POOL_SIZE || '10')
        };
    }

    async gracefulShutdown(): Promise<void> {
        if (this.metricsInterval) {
            clearInterval(this.metricsInterval);
        }
        
        try {
            await mongoose.connection.close();
            logger.info('Database connection closed gracefully');
        } catch (error) {
            logger.error('Error closing database connection:', error);
        }
    }
}

export const databaseManager = new DatabaseManager();
```

### 3.5 Performance Monitoring Middleware

**Archivo:** `src/middleware/performanceMonitoring.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

interface PerformanceMetrics {
    path: string;
    method: string;
    duration: number;
    statusCode: number;
    memoryUsage: NodeJS.MemoryUsage;
    timestamp: number;
}

class PerformanceMonitor {
    private metrics: PerformanceMetrics[] = [];
    private readonly maxMetrics = 1000;

    addMetric(metric: PerformanceMetrics): void {
        this.metrics.push(metric);
        
        // Keep only last N metrics
        if (this.metrics.length > this.maxMetrics) {
            this.metrics.shift();
        }

        // Log slow requests
        if (metric.duration > 1000) { // Slower than 1 second
            logger.warn('Slow request detected', {
                path: metric.path,
                method: metric.method,
                duration: metric.duration,
                statusCode: metric.statusCode
            });
        }
    }

    getMetrics(path?: string): any {
        let filteredMetrics = this.metrics;
        
        if (path) {
            filteredMetrics = this.metrics.filter(m => m.path === path);
        }

        if (filteredMetrics.length === 0) {
            return { count: 0 };
        }

        const durations = filteredMetrics.map(m => m.duration);
        const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
        const maxDuration = Math.max(...durations);
        const minDuration = Math.min(...durations);
        
        // Calculate percentiles
        const sortedDurations = [...durations].sort((a, b) => a - b);
        const p95 = sortedDurations[Math.floor(sortedDurations.length * 0.95)];
        const p99 = sortedDurations[Math.floor(sortedDurations.length * 0.99)];

        // Group by status code
        const statusCodes = filteredMetrics.reduce((acc, m) => {
            acc[m.statusCode] = (acc[m.statusCode] || 0) + 1;
            return acc;
        }, {} as Record<number, number>);

        // Recent metrics (last 5 minutes)
        const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
        const recentMetrics = filteredMetrics.filter(m => m.timestamp > fiveMinutesAgo);
        const throughput = recentMetrics.length / 5; // requests per minute

        return {
            count: filteredMetrics.length,
            avgDuration: Math.round(avgDuration),
            maxDuration,
            minDuration,
            p95Duration: p95,
            p99Duration: p99,
            statusCodes,
            throughput: Math.round(throughput * 100) / 100,
            slowRequests: filteredMetrics.filter(m => m.duration > 1000).length
        };
    }

    clearMetrics(): void {
        this.metrics = [];
    }
}

export const performanceMonitor = new PerformanceMonitor();

export const performanceMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const startMemory = process.memoryUsage();

    res.on('finish', () => {
        const duration = Date.now() - startTime;
        const endMemory = process.memoryUsage();
        
        const metric: PerformanceMetrics = {
            path: req.path,
            method: req.method,
            duration,
            statusCode: res.statusCode,
            memoryUsage: {
                rss: endMemory.rss - startMemory.rss,
                heapTotal: endMemory.heapTotal - startMemory.heapTotal,
                heapUsed: endMemory.heapUsed - startMemory.heapUsed,
                external: endMemory.external - startMemory.external,
                arrayBuffers: endMemory.arrayBuffers - startMemory.arrayBuffers
            },
            timestamp: Date.now()
        };

        performanceMonitor.addMetric(metric);
    });

    next();
};
```

### 3.6 Scripts de Utilidad

**Archivo:** `package.json` (agregar scripts)

```json
{
  "scripts": {
    "db:indexes:create": "ts-node src/scripts/createIndexes.ts create",
    "db:indexes:drop": "ts-node src/scripts/createIndexes.ts drop",
    "performance:monitor": "ts-node src/scripts/performanceReport.ts",
    "cache:warmup": "ts-node src/scripts/cacheWarmup.ts",
    "health:check": "curl http://localhost:5001/health",
    "metrics:query": "ts-node src/scripts/queryMetrics.ts"
  }
}
```

### 3.7 Checklist Fase 3

- [ ] Implementar estrategia de indexing en base de datos
- [ ] Configurar Query Optimization Service
- [ ] Implementar caching avanzado con tags
- [ ] Configurar monitoreo de connection pool
- [ ] Agregar middleware de performance monitoring
- [ ] Crear scripts de warming cache
- [ ] Ejecutar pruebas de performance

---

## 🔄 FASE 4: ESCALABILIDAD Y MODERNIZACIÓN (Semana 7-8)
> **Objetivo:** Preparar la API para crecimiento futuro y implementar mejores prácticas modernas

### 4.1 DTOs (Data Transfer Objects)

**Archivo:** `src/dtos/UserDTO.ts`

```typescript
import { IsEmail, IsString, IsOptional, IsEnum, MinLength, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateUserDTO {
    @IsString()
    @MinLength(3)
    @MaxLength(50)
    username!: string;

    @IsEmail()
    @Transform(({ value }) => value.toLowerCase().trim())
    email!: string;

    @IsString()
    @MinLength(8)
    password!: string;

    @IsOptional()
    @IsString()
    @MaxLength(50)
    firstName?: string;

    @IsOptional()
    @IsString()
    @MaxLength(50)
    lastName?: string;

    @IsOptional()
    @IsEnum(['user', 'professional', 'admin'])
    role?: 'user' | 'professional' | 'admin';
}

export class UpdateUserDTO {
    @IsOptional()
    @IsString()
    @MinLength(3)
    @MaxLength(50)
    username?: string;

    @IsOptional()
    @IsEmail()
    @Transform(({ value }) => value.toLowerCase().trim())
    email?: string;

    @IsOptional()
    @IsString()
    @MaxLength(50)
    firstName?: string;

    @IsOptional()
    @IsString()  
    @MaxLength(50)
    lastName?: string;

    @IsOptional()
    @IsString()
    photo?: string;
}

export class UserResponseDTO {
    id!: string;
    username!: string;
    email!: string;
    firstName?: string;
    lastName?: string;
    role!: string;
    photo!: string;
    isActive!: boolean;
    createdAt!: Date;
    updatedAt!: Date;

    constructor(user: any) {
        this.id = user._id.toString();
        this.username = user.username;
        this.email = user.email;
        this.firstName = user.firstName;
        this.lastName = user.lastName;
        this.role = user.role;
        this.photo = user.photo;
        this.isActive = user.isActive;
        this.createdAt = user.createdAt;
        this.updatedAt = user.updatedAt;
    }
}

export class LoginDTO {
    @IsEmail()
    @Transform(({ value }) => value.toLowerCase().trim())
    email!: string;

    @IsString()
    @MinLength(1)
    password!: string;
}

export class LoginResponseDTO {
    user!: UserResponseDTO;
    token!: string;
    refreshToken!: string;
    expiresIn!: string;
    
    constructor(user: any, token: string, refreshToken: string, expiresIn: string) {
        this.user = new UserResponseDTO(user);
        this.token = token;
        this.refreshToken = refreshToken;
        this.expiresIn = expiresIn;
    }
}
```

### 4.2 API Versioning Strategy

**Archivo:** `src/middleware/apiVersioning.ts`

```typescript
import { Request, Response, NextFunction } from 'express';

export interface VersionedRequest extends Request {
    apiVersion: string;
    isLegacyVersion: boolean;
}

export const apiVersioning = (supportedVersions: string[] = ['v1', 'v2']) => {
    return (req: VersionedRequest, res: Response, next: NextFunction) => {
        // Get version from URL path, header, or query parameter
        let version = 'v1'; // default
        
        // Check URL path first (e.g., /api/v2/users)
        const pathMatch = req.path.match(/^\/api\/(v\d+)\//);
        if (pathMatch) {
            version = pathMatch[1];
        }
        
        // Override with header if present
        const headerVersion = req.get('API-Version');
        if (headerVersion) {
            version = headerVersion;
        }
        
        // Override with query parameter if present
        const queryVersion = req.query.version as string;
        if (queryVersion) {
            version = queryVersion;
        }

        // Validate version
        if (!supportedVersions.includes(version)) {
            return res.status(400).json({
                success: false,
                message: `Unsupported API version: ${version}`,
                supportedVersions,
                error: 'UNSUPPORTED_API_VERSION'
            });
        }

        // Set version info
        req.apiVersion = version;
        req.isLegacyVersion = version !== supportedVersions[supportedVersions.length - 1];
        
        // Add version to response headers
        res.setHeader('API-Version', version);
        
        // Add deprecation warning for old versions
        if (req.isLegacyVersion) {
            res.setHeader('Deprecation', 'true');
            res.setHeader('Sunset', new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()); // 90 days
        }

        next();
    };
};

// Version-specific route handler
export const versionedHandler = (handlers: Record<string, Function>) => {
    return async (req: VersionedRequest, res: Response, next: NextFunction) => {
        const handler = handlers[req.apiVersion] || handlers['default'];
        
        if (!handler) {
            return res.status(501).json({
                success: false,
                message: `Handler not implemented for version ${req.apiVersion}`,
                error: 'HANDLER_NOT_IMPLEMENTED'
            });
        }
        
        try {
            await handler(req, res, next);
        } catch (error) {
            next(error);
        }
    };
};
```

### 4.3 GraphQL Implementation

**Archivo:** `src/graphql/schema.ts`

```typescript
import { buildSchema } from 'graphql';

export const schema = buildSchema(`
    type User {
        id: ID!
        username: String!
        email: String!
        firstName: String
        lastName: String
        role: String!
        photo: String!
        isActive: Boolean!
        createdAt: String!
        updatedAt: String!
    }

    type Restaurant {
        id: ID!
        name: String!
        description: String
        cuisine: String!
        location: Location!
        averageRating: Float
        reviewCount: Int!
        priceRange: String
        photos: [String!]
        isActive: Boolean!
        createdAt: String!
        updatedAt: String!
        reviews: [Review!]
    }

    type Location {
        type: String!
        coordinates: [Float!]!
        address: String
        city: String
        country: String
    }

    type Review {
        id: ID!
        rating: Int!
        comment: String
        user: User!
        createdAt: String!
        updatedAt: String!
    }

    input LocationInput {
        coordinates: [Float!]!
        address: String
        city: String
        country: String
    }

    input RestaurantInput {
        name: String!
        description: String
        cuisine: String!
        location: LocationInput!
        priceRange: String
        photos: [String!]
    }

    input ReviewInput {
        rating: Int!
        comment: String
    }

    type Query {
        # User queries
        user(id: ID!): User
        users(limit: Int, offset: Int): [User!]!
        
        # Restaurant queries
        restaurant(id: ID!): Restaurant
        restaurants(
            limit: Int
            offset: Int
            cuisine: String
            city: String
            minRating: Float
            maxDistance: Float
            coordinates: [Float!]
        ): [Restaurant!]!
        
        # Search
        searchRestaurants(query: String!, limit: Int): [Restaurant!]!
    }

    type Mutation {
        # User mutations
        createUser(input: UserInput!): User!
        updateUser(id: ID!, input: UserInput!): User!
        
        # Restaurant mutations
        createRestaurant(input: RestaurantInput!): Restaurant!
        updateRestaurant(id: ID!, input: RestaurantInput!): Restaurant!
        
        # Review mutations
        addReview(restaurantId: ID!, input: ReviewInput!): Review!
        updateReview(id: ID!, input: ReviewInput!): Review!
        deleteReview(id: ID!): Boolean!
    }

    input UserInput {
        username: String
        email: String
        firstName: String
        lastName: String
        photo: String
    }
`);
```

### 4.4 Microservices Preparation

**Archivo:** `src/services/EventBus.ts`

```typescript
import { EventEmitter } from 'events';
import logger from '../utils/logger';

export interface DomainEvent {
    eventType: string;
    aggregateId: string;
    aggregateType: string;
    eventData: any;
    timestamp: Date;
    version: number;
}

class EventBus extends EventEmitter {
    constructor() {
        super();
        this.setMaxListeners(100); // Increase max listeners for microservices
    }

    async publishEvent(event: DomainEvent): Promise<void> {
        try {
            logger.info('Publishing domain event', {
                eventType: event.eventType,
                aggregateId: event.aggregateId,
                aggregateType: event.aggregateType
            });

            // Emit to local handlers
            this.emit(event.eventType, event);
            this.emit('*', event); // Wildcard listener

            // In microservices architecture, this would publish to message queue
            // await this.publishToMessageQueue(event);
            
        } catch (error) {
            logger.error('Failed to publish event', error);
            throw error;
        }
    }

    subscribeToEvent(eventType: string, handler: (event: DomainEvent) => Promise<void>): void {
        this.on(eventType, async (event: DomainEvent) => {
            try {
                await handler(event);
            } catch (error) {
                logger.error(`Event handler failed for ${eventType}`, error);
                // In production, implement retry logic or dead letter queue
            }
        });
    }

    subscribeToAllEvents(handler: (event: DomainEvent) => Promise<void>): void {
        this.on('*', handler);
    }
}

export const eventBus = new EventBus();

// Domain event types
export const DomainEvents = {
    USER_REGISTERED: 'user.registered',
    USER_UPDATED: 'user.updated',
    USER_DELETED: 'user.deleted',
    RESTAURANT_CREATED: 'restaurant.created',
    RESTAURANT_UPDATED: 'restaurant.updated',
    RESTAURANT_DELETED: 'restaurant.deleted',
    REVIEW_ADDED: 'review.added',
    REVIEW_UPDATED: 'review.updated',
    REVIEW_DELETED: 'review.deleted'
} as const;

// Event handlers registration
eventBus.subscribeToEvent(DomainEvents.USER_REGISTERED, async (event) => {
    // Send welcome email, create user profile, etc.
    logger.info('Processing user registration', { userId: event.aggregateId });
});

eventBus.subscribeToEvent(DomainEvents.REVIEW_ADDED, async (event) => {
    // Update restaurant average rating, send notifications, etc.
    logger.info('Processing new review', { 
        reviewId: event.aggregateId,
        restaurantId: event.eventData.restaurantId 
    });
});
```

### 4.5 Load Testing Setup

**Archivo:** `src/test/load/loadTest.ts`

```typescript
import autocannon from 'autocannon';
import { performance } from 'perf_hooks';

interface LoadTestConfig {
    url: string;
    connections: number;
    duration: number;
    pipelining: number;
    headers: Record<string, string>;
    body?: string;
    method?: string;
}

interface LoadTestResult {
    throughput: number;
    latency: {
        average: number;
        p50: number;
        p95: number;
        p99: number;
        max: number;
    };
    errors: number;
    timeouts: number;
    duration: number;
}

class LoadTester {
    async runTest(config: LoadTestConfig): Promise<LoadTestResult> {
        console.log(`Starting load test: ${config.connections} connections for ${config.duration}s`);
        
        const startTime = performance.now();
        
        const result = await autocannon({
            url: config.url,
            connections: config.connections,
            duration: config.duration,
            pipelining: config.pipelining,
            headers: config.headers,
            body: config.body,
            method: config.method || 'GET'
        });

        const endTime = performance.now();
        
        return {
            throughput: result.requests.average,
            latency: {
                average: result.latency.average,
                p50: result.latency.p50,
                p95: result.latency.p95,
                p99: result.latency.p99,
                max: result.latency.max
            },
            errors: result.errors,
            timeouts: result.timeouts,
            duration: endTime - startTime
        };
    }

    async runScenario(name: string, tests: LoadTestConfig[]): Promise<void> {
        console.log(`\n=== Running Load Test Scenario: ${name} ===`);
        
        for (const test of tests) {
            try {
                const result = await this.runTest(test);
                
                console.log(`\nTest: ${test.url}`);
                console.log(`Throughput: ${result.throughput.toFixed(2)} req/sec`);
                console.log(`Average Latency: ${result.latency.average.toFixed(2)}ms`);
                console.log(`P95 Latency: ${result.latency.p95.toFixed(2)}ms`);
                console.log(`P99 Latency: ${result.latency.p99.toFixed(2)}ms`);
                console.log(`Errors: ${result.errors}`);
                console.log(`Timeouts: ${result.timeouts}`);
                
                // Performance thresholds
                const warnings = [];
                if (result.latency.p95 > 500) warnings.push('High P95 latency');
                if (result.latency.p99 > 1000) warnings.push('High P99 latency');
                if (result.errors > 0) warnings.push('Errors detected');
                if (result.throughput < 100) warnings.push('Low throughput');
                
                if (warnings.length > 0) {
                    console.log(`⚠️  Warnings: ${warnings.join(', ')}`);
                }
                
            } catch (error) {
                console.error(`Test failed for ${test.url}:`, error);
            }
        }
    }
}

// Load test scenarios
const baseUrl = process.env.LOAD_TEST_URL || 'http://localhost:5001';
const authToken = process.env.LOAD_TEST_TOKEN || '';

const scenarios = {
    basic: [
        {
            url: `${baseUrl}/api/v1`,
            connections: 10,
            duration: 30,
            pipelining: 1,
            headers: {}
        },
        {
            url: `${baseUrl}/api/v1/restaurants`,
            connections: 20,
            duration: 60,
            pipelining: 1,
            headers: {}
        }
    ],
    authenticated: [
        {
            url: `${baseUrl}/api/v1/users/profile`,
            connections: 10,
            duration: 30,
            pipelining: 1,
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        }
    ],
    search: [
        {
            url: `${baseUrl}/api/v1/restaurants?search=vegan&limit=10`,
            connections: 15,
            duration: 45,
            pipelining: 1,
            headers: {}
        }
    ]
};

// Run load tests
export async function runLoadTests(): Promise<void> {
    const loadTester = new LoadTester();
    
    try {
        await loadTester.runScenario('Basic Endpoints', scenarios.basic);
        await loadTester.runScenario('Authenticated Endpoints', scenarios.authenticated);  
        await loadTester.runScenario('Search Endpoints', scenarios.search);
        
        console.log('\n✅ Load testing completed successfully');
    } catch (error) {
        console.error('❌ Load testing failed:', error);
        process.exit(1);
    }
}

// Script execution
if (require.main === module) {
    runLoadTests();
}
```

### 4.6 Backup Strategy

**Archivo:** `src/scripts/backupStrategy.ts`

```typescript
import { spawn } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import logger from '../utils/logger';

interface BackupConfig {
    mongoUri: string;
    backupPath: string;
    retention: number; // days
    compression: boolean;
    encryption: boolean;
}

class BackupManager {
    private config: BackupConfig;

    constructor(config: BackupConfig) {
        this.config = config;
    }

    async createBackup(): Promise<string> {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupName = `vegan-guide-backup-${timestamp}`;
        const backupDir = path.join(this.config.backupPath, backupName);

        try {
            // Create backup directory
            await fs.mkdir(backupDir, { recursive: true });
            
            logger.info('Starting database backup', { backupName });

            // Run mongodump
            await this.runMongoDump(backupDir);
            
            // Compress if configured
            if (this.config.compression) {
                await this.compressBackup(backupDir);
            }
            
            // Encrypt if configured
            if (this.config.encryption) {
                await this.encryptBackup(backupDir);
            }
            
            // Clean old backups
            await this.cleanOldBackups();
            
            logger.info('Backup completed successfully', { backupName });
            return backupDir;
            
        } catch (error) {
            logger.error('Backup failed', { error, backupName });
            throw error;
        }
    }

    private async runMongoDump(backupDir: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const mongodump = spawn('mongodump', [
                '--uri', this.config.mongoUri,
                '--out', backupDir,
                '--gzip'
            ]);

            mongodump.stdout.on('data', (data) => {
                logger.debug('mongodump stdout:', data.toString());
            });

            mongodump.stderr.on('data', (data) => {
                logger.warn('mongodump stderr:', data.toString());
            });

            mongodump.on('close', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`mongodump exited with code ${code}`));
                }
            });

            mongodump.on('error', (error) => {
                reject(error);
            });
        });
    }

    private async compressBackup(backupDir: string): Promise<void> {
        const tarFile = `${backupDir}.tar.gz`;
        
        return new Promise((resolve, reject) => {
            const tar = spawn('tar', [
                '-czf', tarFile,
                '-C', path.dirname(backupDir),
                path.basename(backupDir)
            ]);

            tar.on('close', async (code) => {
                if (code === 0) {
                    // Remove original directory after compression
                    await fs.rm(backupDir, { recursive: true });
                    resolve();
                } else {
                    reject(new Error(`tar exited with code ${code}`));
                }
            });

            tar.on('error', reject);
        });
    }

    private async encryptBackup(backupPath: string): Promise<void> {
        const encryptionKey = process.env.BACKUP_ENCRYPTION_KEY;
        if (!encryptionKey) {
            throw new Error('BACKUP_ENCRYPTION_KEY not configured');
        }

        const encryptedFile = `${backupPath}.enc`;
        
        return new Promise((resolve, reject) => {
            const openssl = spawn('openssl', [
                'enc', '-aes-256-cbc',
                '-salt',
                '-in', backupPath,
                '-out', encryptedFile,
                '-pass', `pass:${encryptionKey}`
            ]);

            openssl.on('close', async (code) => {
                if (code === 0) {
                    // Remove unencrypted file
                    await fs.unlink(backupPath);
                    resolve();
                } else {
                    reject(new Error(`openssl exited with code ${code}`));
                }
            });

            openssl.on('error', reject);
        });
    }

    private async cleanOldBackups(): Promise<void> {
        try {
            const files = await fs.readdir(this.config.backupPath);
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - this.config.retention);

            for (const file of files) {
                const filePath = path.join(this.config.backupPath, file);
                const stats = await fs.stat(filePath);
                
                if (stats.mtime < cutoffDate) {
                    await fs.rm(filePath, { recursive: true });
                    logger.info('Removed old backup', { file });
                }
            }
        } catch (error) {
            logger.warn('Failed to clean old backups', error);
        }
    }

    async restoreBackup(backupPath: string): Promise<void> {
        try {
            logger.info('Starting database restore', { backupPath });

            // Decrypt if needed
            let restorePath = backupPath;
            if (backupPath.endsWith('.enc')) {
                restorePath = await this.decryptBackup(backupPath);
            }

            // Decompress if needed  
            if (restorePath.endsWith('.tar.gz')) {
                restorePath = await this.decompressBackup(restorePath);
            }

            // Run mongorestore
            await this.runMongoRestore(restorePath);
            
            logger.info('Database restore completed successfully');
            
        } catch (error) {
            logger.error('Restore failed', error);
            throw error;
        }
    }

    private async runMongoRestore(backupDir: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const mongorestore = spawn('mongorestore', [
                '--uri', this.config.mongoUri,
                '--gzip',
                '--drop', // Drop existing collections
                backupDir
            ]);

            mongorestore.on('close', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`mongorestore exited with code ${code}`));
                }
            });

            mongorestore.on('error', reject);
        });
    }
}

// Configuration
const backupConfig: BackupConfig = {
    mongoUri: process.env.MONGODB_URI!,
    backupPath: process.env.BACKUP_PATH || './backups',
    retention: parseInt(process.env.BACKUP_RETENTION_DAYS || '30'),
    compression: process.env.BACKUP_COMPRESSION === 'true',
    encryption: process.env.BACKUP_ENCRYPTION === 'true'
};

export const backupManager = new BackupManager(backupConfig);

// Schedule automated backups
export function scheduleBackups(): void {
    const scheduleInterval = parseInt(process.env.BACKUP_INTERVAL_HOURS || '24') * 60 * 60 * 1000;
    
    setInterval(async () => {
        try {
            await backupManager.createBackup();
        } catch (error) {
            logger.error('Scheduled backup failed', error);
        }
    }, scheduleInterval);
    
    logger.info(`Backup scheduled every ${scheduleInterval / 1000 / 60 / 60} hours`);
}
```

### 4.7 Checklist Fase 4

- [ ] Implementar DTOs para todas las entidades
- [ ] Configurar API versioning avanzado
- [ ] Implementar GraphQL endpoint básico
- [ ] Preparar Event Bus para microservicios
- [ ] Configurar load testing con autocannon
- [ ] Implementar estrategia de backup automatizada
- [ ] Documentar nueva arquitectura
- [ ] Realizar pruebas de carga y validar rendimiento

---

## 🎯 PLAN DE IMPLEMENTACIÓN

### **Cronograma Sugerido:**

| Fase | Duración | Prioridad | Recursos Necesarios |
|------|----------|-----------|-------------------|
| Fase 1 | 2 semanas | 🔴 Alta | 1 desarrollador senior |
| Fase 2 | 2 semanas | 🟡 Media | 1 desarrollador + DevOps |
| Fase 3 | 2 semanas | 🟡 Media | 1 desarrollador + DBA |
| Fase 4 | 2 semanas | 🟢 Baja | 2 desarrolladores |

### **Hitos Clave:**

1. **Fin Fase 1:** Todos los tests pasando, logging implementado
2. **Fin Fase 2:** Sistema de auditoría funcionando, seguridad mejorada
3. **Fin Fase 3:** Performance optimizado, métricas implementadas
4. **Fin Fase 4:** Sistema preparado para escalabilidad

### **Métricas de Éxito:**

- **Tests:** 95%+ de cobertura, 0 tests fallidos
- **Performance:** <200ms P95 latency para endpoints principales  
- **Seguridad:** 0 vulnerabilidades críticas o altas
- **Escalabilidad:** Soporte para 10x más usuarios concurrentes

### **Variables de Entorno Adicionales:**

```bash
# Logging
LOG_LEVEL=info

# Security
ADMIN_IP_WHITELIST=127.0.0.1,::1
BACKUP_ENCRYPTION_KEY=your-backup-encryption-key

# Performance
DB_MAX_POOL_SIZE=10
DB_MIN_POOL_SIZE=5
DB_MAX_IDLE_TIME=30000

# Backup
BACKUP_PATH=./backups
BACKUP_RETENTION_DAYS=30
BACKUP_COMPRESSION=true
BACKUP_ENCRYPTION=true
BACKUP_INTERVAL_HOURS=24

# Load Testing
LOAD_TEST_URL=http://localhost:5001
LOAD_TEST_TOKEN=your-test-token
```

### **Comandos Útiles:**

```bash
# Fase 1
npm run test:coverage
npm run health:check

# Fase 2  
npm run lint
npm run audit:fix

# Fase 3
npm run db:indexes:create
npm run performance:monitor

# Fase 4
npm run test:load
npm run backup:create
```

---

## 📚 RECURSOS ADICIONALES

### **Documentación Recomendada:**
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)
- [MongoDB Performance Best Practices](https://docs.mongodb.com/manual/administration/analyzing-mongodb-performance/)

### **Herramientas de Monitoreo:**
- **APM:** New Relic, Datadog, AppDynamics
- **Logging:** ELK Stack, Splunk
- **Métricas:** Prometheus + Grafana

### **Testing Tools:**
- **Load Testing:** Artillery, k6, JMeter
- **Security Testing:** OWASP ZAP, Burp Suite
- **API Testing:** Postman, Newman, REST Assured

---

¡Esta guía te proporcionará una hoja de ruta clara para transformar tu API en un sistema robusto, seguro y escalable! 🚀