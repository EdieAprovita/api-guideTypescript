# API Guide TypeScript

A comprehensive RESTful API built with Express.js and TypeScript, designed to serve as a platform for users to share and discover vegan-friendly places and services in their city. Whether it's recipes, restaurants, businesses, medical professionals, markets, or sanctuaries, this API provides a complete guide for vegans and those interested in plant-based living.

## 🚀 Features

- **User Authentication**: Secure JWT-based authentication and authorization
- **CRUD Operations**: Full CRUD functionality for all resources
- **Review System**: Add reviews and ratings to places and services
- **Social Features**: Like, comment, and interact with posts
- **Professional Profiles**: Manage professional profiles and professions
- **TypeScript**: Full type safety and modern development experience
- **API Documentation**: Interactive Swagger UI documentation
- **Docker Support**: Containerized deployment ready

## 📚 API Documentation

### Interactive Documentation

Access the interactive Swagger UI documentation at:

```
http://localhost:5001/api-docs
```

The Swagger documentation provides:

- Complete API endpoint reference
- Request/response schemas
- Interactive testing interface
- Authentication examples
- Error response documentation

### Swagger UI en Producción (Cloud Run)

Por seguridad, en producción el endpoint `/api-docs` está deshabilitado por defecto. Puedes habilitarlo bajo credenciales con variables de entorno en tu servicio de Cloud Run:

1) Habilitar y proteger con Basic Auth

```bash
gcloud run services update api-guidetypescript \
  --region=europe-west1 \
  --set-env-vars ENABLE_SWAGGER_UI=true,SWAGGER_AUTH_USER=admin,SWAGGER_AUTH_PASS='cambia-esta-contraseña'
```

2) Verificar

```bash
# sin credenciales debe responder 401
curl -I https://api-guidetypescript-787324382752.europe-west1.run.app/api-docs

# con credenciales debe responder 200
curl -u admin:'cambia-esta-contraseña' -I https://api-guidetypescript-787324382752.europe-west1.run.app/api-docs
```

3) Deshabilitar nuevamente en producción

```bash
gcloud run services update api-guidetypescript \
  --region=europe-west1 \
  --set-env-vars ENABLE_SWAGGER_UI=false,SWAGGER_AUTH_USER=,SWAGGER_AUTH_PASS=
```

Notas:
- Si solo configuras `ENABLE_SWAGGER_UI=true` sin usuario/contraseña, `/api-docs` quedará abierto. Se recomienda usar Basic Auth en producción.
- También puedes consumir el spec directamente desde el repositorio (`swagger.yaml`) o desde el endpoint `/api-docs` cuando esté habilitado.

## 🛠️ API Endpoints

### Authentication

- `POST /users/register` - Register a new user
- `POST /users/login` - User login with JWT token
- `POST /users/forgot-password` - Request password reset
- `PUT /users/reset-password` - Reset password with token
- `POST /users/logout` - User logout

### User Management

- `GET /users` - Get all users
- `GET /users/:id` - Get user by ID
- `PUT /users/profile/:id` - Update user profile
- `DELETE /users/:id` - Delete user account

### Businesses

- `GET /businesses` - Get all businesses
- `GET /businesses/:id` - Get business by ID
- `POST /businesses` - Create a new business
- `PUT /businesses/:id` - Update business details
- `DELETE /businesses/:id` - Delete a business
- `POST /businesses/add-review/:id` - Add review to business

### Restaurants

- `GET /restaurants` - Get all restaurants
- `GET /restaurants/top-rated` - Get top rated restaurants
- `GET /restaurants/:id` - Get restaurant by ID
- `POST /restaurants` - Create a new restaurant (requires authentication)
- `PUT /restaurants/:id` - Update restaurant details (requires authentication + admin)
- `DELETE /restaurants/:id` - Delete a restaurant (requires authentication + admin)
- `POST /restaurants/add-review/:id` - Add review to restaurant (requires authentication)

### Doctors

- `GET /doctors` - Get all doctors
- `GET /doctors/:id` - Get doctor by ID
- `POST /doctors` - Create a new doctor profile
- `PUT /doctors/:id` - Update doctor details
- `DELETE /doctors/:id` - Delete doctor profile
- `POST /doctors/add-review/:id` - Add review to doctor

### Markets

- `GET /markets` - Get all markets
- `GET /markets/:id` - Get market by ID
- `POST /markets` - Create a new market
- `PUT /markets/:id` - Update market details
- `DELETE /markets/:id` - Delete a market
- `POST /markets/add-review/:id` - Add review to market

### Recipes

- `GET /recipes` - Get all recipes
- `GET /recipes/:id` - Get recipe by ID
- `POST /recipes` - Create a new recipe
- `PUT /recipes/:id` - Update recipe details
- `DELETE /recipes/:id` - Delete a recipe
- `POST /recipes/add-review/:id` - Add review to recipe

### Posts

- `GET /posts` - Get all posts
- `GET /posts/:id` - Get post by ID
- `POST /posts` - Create a new post
- `PUT /posts/:id` - Update post details
- `DELETE /posts/:id` - Delete a post
- `POST /posts/like/:id` - Like a post
- `POST /posts/unlike/:id` - Unlike a post
- `POST /posts/comment/:id` - Add comment to post

### Sanctuaries

- `GET /sanctuaries` - Get all sanctuaries
- `GET /sanctuaries/:id` - Get sanctuary by ID
- `POST /sanctuaries` - Create a new sanctuary
- `PUT /sanctuaries/:id` - Update sanctuary details
- `DELETE /sanctuaries/:id` - Delete a sanctuary
- `POST /sanctuaries/add-review/:id` - Add review to sanctuary

### Professions

- `GET /professions` - Get all professions
- `GET /professions/:id` - Get profession by ID
- `POST /professions` - Create a new profession
- `PUT /professions/:id` - Update profession details
- `DELETE /professions/:id` - Delete a profession
- `POST /professions/add-review/:id` - Add review to profession

### Professional Profiles

- `GET /professionalProfile` - Get all professional profiles
- `GET /professionalProfile/:id` - Get professional profile by ID
- `POST /professionalProfile` - Create a new professional profile
- `PUT /professionalProfile/:id` - Update professional profile
- `DELETE /professionalProfile/:id` - Delete professional profile

## 🚀 Getting Started

### Prerequisites

- Node.js (v20 or higher)
- npm or yarn
- MongoDB (local or cloud instance)
- Docker (optional, for containerized deployment)

### Installation

1. **Clone the repository**

    ```bash
    git clone https://github.com/your/repo.git
    cd api-guideTypescript
    ```

2. **Install dependencies**

    ```bash
    npm install
    ```

3. **Environment Setup**
   Create a `.env` file in the root directory:

    ```env
    NODE_ENV=development
    PORT=5001
    MONGODB_URI=mongodb://localhost:27017/vegan-city-guide
    JWT_SECRET=your-jwt-secret-key
    JWT_EXPIRE=30d
    GOOGLE_MAPS_API_KEY=your-google-maps-api-key
    EMAIL_USER=your-email@gmail.com
    EMAIL_PASS=your-email-password
    FRONTEND_URL=http://localhost:3000
    BCRYPT_SALT_ROUNDS=10
    ```

4. **Start the server**

    ```bash
    # Development mode
    npm run dev

    # Production mode
    npm run build
    npm start
    ```

5. **Access the API**
    - API Base URL: `http://localhost:5001/api/v1`
    - Swagger Documentation: `http://localhost:5001/api-docs`

### Docker Deployment

1. **Build the Docker image**

    ```bash
    docker build -t api-guide-typescript .
    ```

2. **Run the container**

    ```bash
    docker run -d \
      --name api-guide-app \
      -p 5001:5000 \
      -e NODE_ENV=production \
      -e MONGODB_URI=your-mongodb-connection-string \
      -e JWT_SECRET=your-jwt-secret \
      --restart unless-stopped \
      api-guide-typescript
    ```

3. **Check container status**

    ```bash
    docker ps
    docker logs api-guide-app
    ```

## 🔒 Security Features

The API implements multiple security layers:

- **[helmet](https://helmetjs.github.io/)** – Sets security HTTP headers
- **[express-rate-limit](https://github.com/nfriedly/express-rate-limit)** – Rate limiting (100 requests per 15 minutes)
- **[express-mongo-sanitize](https://github.com/fiznool/express-mongo-sanitize)** – Prevents NoSQL injection attacks
- **[express-xss-sanitizer](https://www.npmjs.com/package/express-xss-sanitizer)** – Prevents XSS attacks
- **JWT Authentication** – Secure token-based authentication
- **Input Validation** – Request validation and sanitization
- **Docker Security** – Non-root user execution in containers

## 📁 Project Structure

```
src/
├── controllers/     # Route controllers
├── models/         # Database models
├── routes/         # API routes
├── middleware/     # Custom middleware
├── services/       # Business logic services
├── types/          # TypeScript type definitions
├── utils/          # Utility functions
├── config/         # Configuration files
├── test/           # Unit and integration tests
├── app.ts          # Express app setup
└── server.ts       # Server entry point
```

## 🧪 Testing

### Using Swagger UI

1. Navigate to `http://localhost:5001/api-docs`
2. Explore available endpoints
3. Test requests directly in the browser
4. View request/response schemas
5. Authenticate using the "Authorize" button

### Using Postman Collection

A complete Postman collection is available in `restaurant-api-collection.json` that includes:

- Authentication endpoints with automatic token management
- All restaurant CRUD operations using standard REST endpoints
- Pre-configured environment variables
- Sample request bodies with realistic data

**Important**: Legacy routes (`/create`, `/update/:id`, `/delete/:id`) have been removed from the restaurant API. Use the standard REST endpoints instead:

- ❌ `POST /restaurants/create` → ✅ `POST /restaurants`
- ❌ `PUT /restaurants/update/:id` → ✅ `PUT /restaurants/:id`
- ❌ `DELETE /restaurants/delete/:id` → ✅ `DELETE /restaurants/:id`

### Running Tests

```bash
# Run all tests
npm test

# Run tests in CI mode
npm run test:ci

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration

# Integration tests use **mongodb-memory-server** to start a temporary MongoDB
# instance. The binary is downloaded on demand. If your environment lacks
# internet access, set `MONGOMS_SYSTEM_BINARY` to point to a local `mongod`
# executable or pre-download the binary using `MONGOMS_DOWNLOAD_URL`.

# Type checking
npm run type-check

# Linting
npm run lint
```

### Manual Testing

Use tools like:

- **curl** for command-line testing
- **Insomnia** or **Thunder Client** (VS Code extension)
- **HTTPie** for human-friendly HTTP requests

Example with curl:

```bash
# Register a user
curl -X POST http://localhost:5001/api/v1/users/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"password123"}'

# Login
curl -X POST http://localhost:5001/api/v1/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch**
    ```bash
    git checkout -b feature/amazing-feature
    ```
3. **Commit your changes**
    ```bash
    git commit -m 'Add some amazing feature'
    ```
4. **Push to the branch**
    ```bash
    git push origin feature/amazing-feature
    ```
5. **Open a Pull Request**

### Development Guidelines

- Follow TypeScript best practices
- Add proper type definitions
- Include JSDoc comments for functions
- Write unit tests for new features
- Update Swagger documentation for new endpoints
- Run linting and type checking before committing
- Follow conventional commit messages

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

For support and questions:

- Create an issue in the GitHub repository
- Check the Swagger documentation for API details
- Review the test files for usage examples
- Use the interactive Swagger UI for endpoint testing

## Code Review Best Practices

This section addresses common code review issues and provides solutions:

### 1. Test Coverage and ESM Compatibility

**Issue**: Tests being skipped due to ESM compatibility issues.

**Solution**:

- Updated `jest.config.js` with proper ESM handling
- Created `src/test/setup.ts` for consistent test environment
- Enhanced test files with proper imports and mocking

**Example**:

```typescript
// ✅ Good: Proper test structure with all imports
import { Response } from 'express';
import UserService from '../../services/UserService';
import { User } from '../../models/User';

// Mock dependencies at the top
jest.mock('../../models/User');
jest.mock('../../utils/generateToken');

describe('UserService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // Your tests here
});
```

### 2. Missing Imports in Components

**Issue**: Components using React hooks without proper imports.

**Solution**: Always include all necessary imports at the top of files.

```typescript
// ✅ Good: All necessary imports included
import React, { useState, useCallback, useEffect } from 'react';

function MyComponent() {
    const [state, setState] = useState(null);
    // Component logic
}
```

### 3. API Mocking Best Practices

**Issue**: Inconsistent API mocking patterns.

**Solution**: Use established patterns for mocking APIs.

```typescript
// ✅ Good: Using MSW with rest API
import { rest } from 'msw';

export const handlers = [
    rest.get('/api/users', (req, res, ctx) => {
        return res(ctx.json({ users: [] }));
    }),
];
```

### 4. Filter Implementation

**Issue**: Missing filter properties in API calls.

**Solution**: Ensure all filter types are included in API requests.

```typescript
// ✅ Good: All filters included
const getFiltersForAPI = () => {
    const apiFilters: any = {};

    if (statusFilters.length > 0) {
        apiFilters.status = statusFilters;
    }

    if (journeyFilters.length > 0) {
        apiFilters.journey = journeyFilters;
    }

    return apiFilters;
};
```

### 5. Error Handling Standards

Our codebase follows consistent error handling patterns:

```typescript
// ✅ Good: Consistent error handling
import { HttpError, HttpStatusCode } from '../types/Errors';
import { getErrorMessage } from '../types/modalTypes';

try {
    const result = await someAsyncOperation();
    return result;
} catch (error) {
    throw new HttpError(
        HttpStatusCode.INTERNAL_SERVER_ERROR,
        getErrorMessage(error instanceof Error ? error.message : 'Unknown error')
    );
}
```

### 6. Testing Guidelines

- **Always mock external dependencies** (databases, APIs, file systems)
- **Use proper TypeScript types** in tests
- **Test both success and error cases**
- **Clear mocks between tests** using `beforeEach(() => jest.clearAllMocks())`
- **Use descriptive test names** that explain what is being tested

### 7. Code Quality Checklist

Before submitting a PR, ensure:

- [ ] All tests pass and have proper coverage
- [ ] No skipped tests without valid reason
- [ ] All imports are properly declared
- [ ] Error handling follows project patterns
- [ ] API filters include all necessary parameters
- [ ] Mocks are properly configured and cleared
- [ ] TypeScript types are correctly used
- [ ] Code follows project style guidelines
