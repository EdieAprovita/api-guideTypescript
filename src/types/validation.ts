export interface ValidationError {
  field: string;
  message: string;
  value?: any;
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
  body?: any;
  query?: any;
  params?: any;
}

export interface SanitizeOptions {
  xss: boolean;
  noSql: boolean;
  html: boolean;
}