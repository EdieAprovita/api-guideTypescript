import request from 'supertest';
import express from 'express';
import { errorHandler } from '../../middleware/errorHandler';
import { HttpError, HttpStatusCode } from '../../types/Errors';
import logger from '../../utils/logger';
import { testConfig } from '../config/testConfig';

// Helper functions to reduce duplication
const expectErrorResponse = (response: any, expectedStatus: number, expectedMessage: string, expectedError: string) => {
  expect(response.status).toBe(expectedStatus);
  expect(response.body).toEqual({
    success: false,
    message: expectedMessage,
    error: expectedError
  });
};

const expectValidationErrorResponse = (response: any, expectedMessage: string, expectedError: string, errors: any) => {
  expect(response.status).toBe(400);
  expect(response.body).toEqual({
    success: false,
    message: expectedMessage,
    error: expectedError,
    errors
  });
};

// Mock logger
jest.mock('../../utils/logger', () => ({
  default: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn()
  }
}));

const app = express();
app.use(express.json());

// Test routes that throw different types of errors
app.get('/http-error', (_req, _res, next) => {
  next(new HttpError(HttpStatusCode.BAD_REQUEST, 'Bad request error'));
});

app.get('/http-error-unauthorized', (_req, _res, next) => {
  const error = new HttpError(HttpStatusCode.UNAUTHORIZED, 'Unauthorized access');
  next(error);
});

app.get('/validation-error', (_req, _res, next) => {
  const error: any = new Error('Validation failed');
  error.name = 'ValidationError';
  error.errors = {
    email: { message: 'Invalid email format' },
    password: { message: testConfig.validationErrors.shortPassword }
  };
  next(error);
});

app.get('/cast-error', (_req, _res, next) => {
  const error: any = new Error('Cast to ObjectId failed');
  error.name = 'CastError';
  error.kind = 'ObjectId';
  error.value = 'invalid-id';
  error.path = '_id';
  next(error);
});

app.get('/duplicate-key-error', (_req, _res, next) => {
  const error: any = new Error('Duplicate key error');
  error.code = 11000;
  error.keyPattern = { email: 1 };
  error.keyValue = { email: 'test@example.com' };
  next(error);
});

app.get('/generic-error', (_req, _res, next) => {
  next(new Error('Something went wrong'));
});

app.get('/string-error', (_req, _res, next) => {
  next('String error message');
});

app.get('/unknown-error', (_req, _res, next) => {
  next({ weird: 'object' });
});

app.get('/syntax-error', (_req, _res, next) => {
  const error = new SyntaxError('Unexpected token');
  next(error);
});

app.get('/type-error', (_req, _res, next) => {
  const error = new TypeError('Cannot read property of undefined');
  next(error);
});

app.get('/range-error', (_req, _res, next) => {
  const error = new RangeError('Invalid array length');
  next(error);
});

// Add error handler middleware
app.use(errorHandler);

describe('Error Handler Middleware Tests', () => {
  const mockedLogger = logger as jest.Mocked<typeof logger>;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = 'test';
  });

  describe('HTTP Errors', () => {
    it('should handle HttpError with correct status and message', async () => {
      const response = await request(app).get('/http-error');

      expectErrorResponse(response, 400, 'Bad request error', 'Bad request error');
      expect(mockedLogger.error).toHaveBeenCalled();
    });

    it('should handle HttpError with unauthorized status', async () => {
      const response = await request(app).get('/http-error-unauthorized');

      expectErrorResponse(response, 401, 'Unauthorized access', 'Unauthorized access');
    });
  });

  describe('Mongoose Validation Errors', () => {
    it('should handle ValidationError with field details', async () => {
      const response = await request(app).get('/validation-error');

      expectValidationErrorResponse(response, 'Validation Error', 'Invalid input data', {
        email: 'Invalid email format',
        password: testConfig.validationErrors.shortPassword
      });
    });

    it('should handle CastError for invalid ObjectId', async () => {
      const response = await request(app).get('/cast-error');

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        message: 'Invalid _id: invalid-id',
        error: 'Invalid data format'
      });
    });

    it('should handle duplicate key errors', async () => {
      const response = await request(app).get('/duplicate-key-error');

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        message: 'Duplicate field value: email',
        error: 'Duplicate field value entered'
      });
    });
  });

  describe('JavaScript Built-in Errors', () => {
    it('should handle SyntaxError', async () => {
      const response = await request(app).get('/syntax-error');

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        message: 'Syntax Error: Unexpected token',
        error: 'Invalid request syntax'
      });
    });

    it('should handle TypeError', async () => {
      const response = await request(app).get('/type-error');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        message: 'Type Error: Cannot read property of undefined',
        error: 'Internal type error'
      });
    });

    it('should handle RangeError', async () => {
      const response = await request(app).get('/range-error');

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        message: 'Range Error: Invalid array length',
        error: 'Value out of range'
      });
    });
  });

  describe('Generic Errors', () => {
    it('should handle generic Error objects', async () => {
      const response = await request(app).get('/generic-error');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        message: 'Something went wrong',
        error: 'Something went wrong'
      });
    });

    it('should handle string errors', async () => {
      const response = await request(app).get('/string-error');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        message: 'String error message',
        error: 'An error occurred'
      });
    });

    it('should handle unknown error types', async () => {
      const response = await request(app).get('/unknown-error');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        message: 'An unknown error occurred',
        error: 'Unknown error'
      });
    });
  });

  describe('Environment-specific behavior', () => {
    it('should not expose error details in production', async () => {
      process.env.NODE_ENV = 'production';
      
      const response = await request(app).get('/generic-error');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        message: 'Something went wrong',
        error: 'Internal server error'
      });
      
      process.env.NODE_ENV = 'test';
    });

    it('should expose error details in development', async () => {
      process.env.NODE_ENV = 'development';
      
      const response = await request(app).get('/generic-error');

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Something went wrong');
      expect(response.body.error).toBe('Something went wrong');
      
      process.env.NODE_ENV = 'test';
    });
  });

  describe('Error Logging', () => {
    it('should log errors with appropriate level', async () => {
      await request(app).get('/http-error');
      
      expect(mockedLogger.error).toHaveBeenCalledWith(
        'Error Handler:',
        expect.objectContaining({
          status: 400,
          message: 'Bad request error'
        })
      );
    });

    it('should log validation errors with details', async () => {
      await request(app).get('/validation-error');
      
      expect(mockedLogger.error).toHaveBeenCalledWith(
        'Error Handler:',
        expect.objectContaining({
          name: 'ValidationError'
        })
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle errors without message', async () => {
      app.get('/no-message-error', (_req, _res, next) => {
        const error = new Error();
        next(error);
      });

      const response = await request(app).get('/no-message-error');
      
      expect(response.status).toBe(500);
      expect(response.body.message).toBeDefined();
    });

    it('should handle null errors', async () => {
      app.get('/null-error', (_req, _res, next) => {
        next(null);
      });

      // This should pass through to the next middleware (none in this case)
      const response = await request(app).get('/null-error');
      
      expect(response.status).toBe(404); // Express default 404
    });

    it('should prevent response after headers sent', async () => {
      app.get('/headers-sent', (req, res, next) => {
        res.json({ sent: true });
        // Simulate error after response
        res.headersSent = true;
        next(new Error('Error after response'));
      });

      const response = await request(app).get('/headers-sent');
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ sent: true });
    });
  });
});