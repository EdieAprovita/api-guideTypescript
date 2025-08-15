import { Schema } from 'joi';

export interface ValidationError {
    field: string;
    message: string;
    value?: unknown;
}

export interface ValidationResult {
    isValid: boolean;
    errors: ValidationError[];
}

export interface RateLimitConfig {
    windowMs: number;
    max: number;
    message: string;
    standardHeaders: boolean;
    legacyHeaders: boolean;
}

export interface ValidationSchema {
    body?: Schema;
    query?: Schema;
    params?: Schema;
}

export interface SanitizeOptions {
    xss: boolean;
    noSql: boolean;
    html: boolean;
}
