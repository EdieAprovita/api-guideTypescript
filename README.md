# API Guide TypeScript

A comprehensive RESTful API built with Express.js and TypeScript, designed to serve as a platform for users to share and discover vegan-friendly places and services in their city. Whether it's recipes, restaurants, businesses, medical professionals, markets, or sanctuaries, this API provides a complete guide for vegans and those interested in plant-based living.

## 🚀 Features

- **User Authentication**: Secure JWT-based authentication and authorization with refresh tokens
- **CRUD Operations**: Full CRUD functionality for 11+ resource types
- **Review System**: Add reviews and ratings to places and services
- **Social Features**: Like, comment, and interact with posts
- **Professional Profiles**: Manage professional profiles and professions
- **TypeScript**: Full type safety with strict mode enabled
- **API Documentation**: Interactive Swagger UI documentation (production-ready with Basic Auth)
- **Docker Support**: Multi-stage containerized deployment with security hardening
- **Redis Caching**: Advanced caching and rate limiting with Redis
- **Security**: Multiple security layers (Helmet, rate limiting, XSS protection, NoSQL injection prevention)
- **Testing**: Comprehensive test suite with Vitest (44+ test files)
- **CI/CD**: Automated testing and quality checks via GitHub Actions
- **Cloud Deployment**: Production deployment on Google Cloud Run

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

- Node.js (v20 or higher) - See `.nvmrc` for exact version
- npm (v10 or higher)
- MongoDB 6.x (local or cloud instance like MongoDB Atlas)
- Redis 5.x or higher (optional, for caching and enhanced rate limiting)
- Docker & Docker Compose (optional, for containerized deployment)

### Installation

1. **Clone the repository**

    ```bash
    git clone https://github.com/EdieAprovita/api-guideTypescript.git
    cd api-guideTypescript
    ```

2. **Install dependencies**

    ```bash
    npm install
    ```

3. **Environment Setup**
   Create a `.env` file in the root directory (use `.env.example` as template):

    ```env
    NODE_ENV=development
    PORT=5001
    
    # Database
    MONGODB_URI=mongodb://localhost:27017/vegan-city-guide
    
    # JWT Configuration
    JWT_SECRET=your-secure-jwt-secret-at-least-64-characters-long
    JWT_REFRESH_SECRET=your-secure-refresh-secret-at-least-64-characters-long
    JWT_EXPIRE=30d
    
    # Redis (Optional - for caching and rate limiting)
    REDIS_URL=redis://localhost:6379
    REDIS_HOST=localhost
    REDIS_PORT=6379
    REDIS_PASSWORD=
    
    # External Services
    GOOGLE_MAPS_API_KEY=your-google-maps-api-key
    EMAIL_USER=your-email@gmail.com
    EMAIL_PASS=your-email-password
    
    # Frontend Configuration
    FRONTEND_URL=http://localhost:3000
    
    # Security
    BCRYPT_SALT_ROUNDS=10
    SECURE_BASE_URL=https://localhost
    
    # Swagger UI Protection (Production)
    ENABLE_SWAGGER_UI=true
    SWAGGER_AUTH_USER=admin
    SWAGGER_AUTH_PASS=your-secure-password
    
    # Debugging (Development Only)
    DEBUG_IP_INFO=false
    ```

4. **Start the server**

    ```bash
    # Development mode with hot reload
    npm run dev
    
    # Development mode with ts-node
    npm run start:dev
    
    # Production mode (requires build first)
    npm run build
    npm start
    ```

5. **Access the API**
    - API Base URL: `http://localhost:5001/api/v1`
    - Swagger Documentation: `http://localhost:5001/api-docs`
    - Health Check: `http://localhost:5001/health`

### Docker Deployment

> **⚠️ SECURITY NOTICE**: All hardcoded passwords have been removed. You MUST configure secure credentials before running Docker. See `DOCKER-SECURITY.md` for details.

#### Quick Start (Automated Setup)

1. **Generate secure credentials**

    ```bash
    # Run automated setup script (recommended)
    ./scripts/setup-docker-env.sh
    ```

    This will:
    - Generate secure random passwords
    - Create `.env.docker` with proper credentials
    - Replace all placeholders automatically

2. **Build and run with Docker Compose**

    ```bash
    # Production mode
    docker compose --profile prod up -d
    
    # Development mode
    docker compose --profile dev up
    
    # Check status
    docker compose ps
    docker compose logs -f api
    ```

#### Manual Docker Setup

1. **Create secure environment file**

    ```bash
    # Copy template
    cp .env.docker.example .env.docker
    
    # Generate secure passwords
    openssl rand -base64 32  # For MongoDB/Redis
    openssl rand -hex 64     # For JWT secrets
    
    # Edit .env.docker and replace ALL placeholder values
    nano .env.docker
    ```

2. **Build the Docker image**

    ```bash
    docker build -t api-guide-typescript .
    
    # Or optimized production build
    npm run docker:build:optimized
    ```

3. **Run the container**

    ```bash
    docker run -d \
      --name api-guide-app \
      -p 5001:8080 \
      --env-file .env.docker \
      --restart unless-stopped \
      api-guide-typescript
    ```

4. **Check container status**

    ```bash
    docker ps
    docker logs api-guide-app
    docker exec -it api-guide-app sh  # Access container shell
    ```

#### Docker Security Features

- ✅ Multi-stage build for optimized image size
- ✅ Non-root user execution (nodejs:1001)
- ✅ Minimal Alpine Linux base image
- ✅ No hardcoded credentials
- ✅ Security scanning with Docker Scout
- ✅ Health checks configured
- ✅ dumb-init for proper signal handling

#### Docker Commands Reference

```bash
# Build optimized image
npm run docker:build:optimized

# Security scan
npm run docker:scan

# Stop and remove
docker compose down

# View logs
docker compose logs -f

# Rebuild after changes
docker compose up --build
```

## 🔒 Security Features

The API implements multiple security layers following OWASP best practices:

### Security Middleware Stack

- **[Helmet](https://helmetjs.github.io/)** – Sets security HTTP headers (CSP, HSTS, X-Frame-Options, etc.)
- **[express-rate-limit](https://github.com/nfriedly/express-rate-limit)** – Rate limiting (100 requests per 15 minutes)
- **[express-mongo-sanitize](https://github.com/fiznool/express-mongo-sanitize)** – Prevents NoSQL injection attacks
- **[express-xss-sanitizer](https://www.npmjs.com/package/express-xss-sanitizer)** – Prevents XSS attacks by sanitizing user input
- **JWT Authentication** – Secure token-based authentication with refresh tokens
- **Input Validation** – Request validation using express-validator and Joi
- **CORS Configuration** – Configurable cross-origin resource sharing
- **Request Size Limiting** – Prevents payload attacks
- **User Agent Validation** – Detects and blocks suspicious clients
- **HTTPS Enforcement** – Automatic redirect to HTTPS in production
- **Suspicious Activity Detection** – Monitors and blocks malicious patterns

### Additional Security Features

- **Docker Security**: Non-root user execution, minimal attack surface
- **Environment Variables**: All secrets in environment (never hardcoded)
- **Password Hashing**: bcryptjs with configurable salt rounds
- **API Versioning**: Required API version in requests
- **Request Logging**: Winston logger for audit trails
- **Error Handling**: Secure error messages (no stack traces in production)

### Security Best Practices Implemented

✅ Principle of least privilege  
✅ Defense in depth  
✅ Secure by default  
✅ Fail securely  
✅ No security through obscurity  
✅ Regular dependency updates  
✅ Security scanning in CI/CD

## 🏗️ Technology Stack

### Core Technologies
- **Runtime**: Node.js 20.x
- **Language**: TypeScript 5.8+ (strict mode)
- **Framework**: Express.js 4.18
- **Database**: MongoDB 6.x with Mongoose 8.15
- **Caching**: Redis 5.x with ioredis

### Security & Middleware
- **Helmet**: Security headers
- **express-rate-limit**: Rate limiting (100 req/15min)
- **express-mongo-sanitize**: NoSQL injection prevention
- **XSS Sanitizer**: Cross-site scripting protection
- **JWT**: Token-based authentication with refresh tokens
- **CORS**: Configurable cross-origin resource sharing

### Testing & Quality
- **Test Framework**: Vitest 3.x
- **Coverage**: v8 provider with 40% threshold
- **Test Count**: 44+ test files (unit, integration, services, controllers)
- **MongoDB Testing**: mongodb-memory-server for isolated tests
- **Linting**: ESLint 9.x with TypeScript support
- **Formatting**: Prettier 3.x

### DevOps & Deployment
- **CI/CD**: GitHub Actions
- **Containerization**: Docker with multi-stage builds
- **Cloud**: Google Cloud Run deployment
- **Monitoring**: Winston logger with request logging

## 📁 Project Structure

```
src/
├── controllers/        # Route controllers with base controller pattern
│   └── factories/     # Controller factory pattern implementation
├── models/            # Mongoose schemas (12 models)
├── routes/            # API route definitions
├── middleware/        # 10+ custom middleware (auth, cache, security, validation)
├── services/          # Business logic layer (17 services)
├── types/             # TypeScript type definitions and custom types
│   └── custom/        # Custom type declarations
├── utils/             # Helper functions and validators
├── config/            # Configuration files
├── scripts/           # Utility scripts (seeding, migrations)
├── test/              # Comprehensive test suite
│   ├── unit/          # Unit tests
│   ├── integration/   # Integration tests
│   ├── controllers/   # Controller tests
│   ├── services/      # Service tests
│   ├── middleware/    # Middleware tests
│   └── setup/         # Test setup and configuration
├── app.ts             # Express app setup
└── server.ts          # Server entry point
```

## 🧪 Testing

### Test Infrastructure

The project uses **Vitest** for modern, fast testing with the following configuration:

- **Test Framework**: Vitest 3.x with Node environment
- **Coverage Provider**: v8 (faster than istanbul)
- **Test Types**: Unit, Integration, Service, Controller, Middleware tests
- **Total Test Files**: 44+ test files
- **MongoDB Testing**: mongodb-memory-server for isolated database tests
- **Redis Testing**: Mock implementation for cache tests

### Running Tests

```bash
# Run all tests
npm test

# Run all tests once (CI mode)
npm run test:run

# Run tests with coverage
npm run test:coverage

# Run tests with UI (interactive browser interface)
npm run test:ui

# Run tests in watch mode
npm run test:watch

# Run specific test suites
npm run test:unit           # Unit tests only
npm run test:integration    # Integration tests only
npm run test:services       # Service layer tests
npm run test:controllers    # Controller tests
npm run test:middleware     # Middleware tests

# Run tests with verbose output
npm run test:ci

# Fast coverage report
npm run test:coverage:fast
```

### Coverage Thresholds

The project uses different coverage configurations depending on the test suite:

**Default Configuration** (`vitest.config.mts`):
```javascript
Global Thresholds:
- Branches: 30%
- Functions: 30%
- Lines: 30%
- Statements: 30%

Module-Specific Thresholds:
- Controllers: 40% (all metrics)
- Services: 35% (all metrics)
- Middleware: 35% (all metrics)
```

**Note**: The default `npm test` and `npm run test:coverage` commands use `vitest.config.mts`. Integration tests use a separate configuration file (`vitest.integration.config.mts`).

### Test Structure

```
src/test/
├── unit/                  # Unit tests for utilities
├── integration/          # End-to-end API tests
├── controllers/          # Controller layer tests (13 files)
├── services/            # Service layer tests (10 files)
├── middleware/          # Middleware tests (6 files)
├── models/              # Model/schema tests
├── routes/              # Route configuration tests
├── setup/               # Test configuration and setup
├── mocks/               # Mock data and factories
├── fixtures/            # Test fixtures and data
└── helpers/             # Test helper functions
```

### MongoDB Memory Server

Integration tests use `mongodb-memory-server` to start a temporary MongoDB instance:

```bash
# The binary is downloaded on demand
# Set MONGOMS_SYSTEM_BINARY to use local mongod
export MONGOMS_SYSTEM_BINARY=/usr/bin/mongod

# Or pre-download the binary
export MONGOMS_DOWNLOAD_URL=https://...
```

## 🧪 Manual Testing & API Documentation

### Using Swagger UI

1. Navigate to `http://localhost:5001/api-docs`
2. Explore available endpoints with full documentation
3. Test requests directly in the browser
4. View request/response schemas and examples
5. Authenticate using the "Authorize" button with Bearer token

### Using Postman Collection

A complete Postman collection is available in the repository:

- **File**: `API_Guide_TypeScript_COMPLETE.postman_collection.json`
- All authentication endpoints with automatic token management
- Complete CRUD operations for all 11+ resource types
- Pre-configured environment variables
- Sample request bodies with realistic data
- Organized by resource type for easy navigation

**Import Instructions**:
1. Open Postman
2. Click "Import" button
3. Select `API_Guide_TypeScript_COMPLETE.postman_collection.json`
4. Configure environment variables (base URL, tokens, etc.)

### Command Line Testing

Use curl, HTTPie, or similar tools:

```bash
# Register a new user
curl -X POST http://localhost:5001/api/v1/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "username":"testuser",
    "email":"test@example.com",
    "password":"SecurePass123!"
  }'

# Login and get JWT token
curl -X POST http://localhost:5001/api/v1/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test@example.com",
    "password":"SecurePass123!"
  }'

# Use token for authenticated request
curl -X GET http://localhost:5001/api/v1/restaurants \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"

# Create a restaurant (authenticated)
curl -X POST http://localhost:5001/api/v1/restaurants \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Vegan Bistro",
    "description":"Best vegan food in town",
    "address":"123 Main St",
    "city":"New York"
  }'

# Check health status
curl http://localhost:5001/health
```

### Alternative Testing Tools

- **Insomnia**: REST client with GraphQL support
- **Thunder Client**: VS Code extension for API testing
- **HTTPie**: User-friendly command-line HTTP client (`http GET localhost:5001/health`)
- **Postman**: Full-featured API development platform

## 🚀 CI/CD Pipeline

The project includes a comprehensive GitHub Actions CI/CD pipeline:

### Workflow Jobs

1. **Quality Checks**
   - TypeScript type checking
   - ESLint code linting
   - Prettier format checking
   - Runs on every push and PR

2. **Tests**
   - Unit tests
   - Integration tests
   - Service and controller tests
   - Coverage reporting
   - Uses mongodb-memory-server and Redis service
   - Runs on Ubuntu 22.04 for MongoDB compatibility

### Workflow Configuration

```yaml
Triggers:
- Push to main/develop branches
- Pull requests to main/develop
- Manual workflow dispatch

Environment:
- Node.js 20.x
- Ubuntu 22.04
- Redis 7-alpine service
- MongoDB memory server

Features:
- Concurrency control (cancels previous runs)
- Dependency caching
- System dependency installation for MongoDB
- Comprehensive test coverage
```

### Running CI/CD Locally

```bash
# Run quality checks
npm run type-check
npm run lint
npm run format:check

# Run complete test suite
npm run test:ci

# Run validation (all checks)
npm run validate
```

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch**
    ```bash
    git checkout -b feature/amazing-feature
    ```
3. **Make your changes**
   - Follow TypeScript best practices
   - Add proper type definitions
   - Write tests for new features
   - Update Swagger documentation for new endpoints
4. **Run quality checks**
    ```bash
    npm run validate  # Runs type-check, lint, and tests
    ```
5. **Commit your changes**
    ```bash
    git commit -m 'feat: add amazing feature'
    ```
    Use conventional commits format:
    - `feat:` New feature
    - `fix:` Bug fix
    - `docs:` Documentation changes
    - `test:` Test changes
    - `refactor:` Code refactoring
    - `chore:` Maintenance tasks
6. **Push to the branch**
    ```bash
    git push origin feature/amazing-feature
    ```
7. **Open a Pull Request**

### Development Guidelines

#### Code Style
- Follow TypeScript strict mode requirements
- Use ESLint and Prettier configurations
- Add JSDoc comments for public functions
- Keep functions small and focused
- Use meaningful variable and function names

#### Testing Requirements
- Write unit tests for utilities and services
- Write integration tests for API endpoints
- Maintain minimum coverage thresholds (40%)
- Use descriptive test names
- Mock external dependencies properly
- Clear mocks between tests using `beforeEach`

#### Type Safety
- Use TypeScript strict mode
- Avoid `any` type (use `unknown` if needed)
- Define proper interfaces for all data structures
- Use type guards for runtime type checking

#### Security
- Never hardcode credentials or secrets
- Validate all user inputs
- Sanitize data before database operations
- Follow OWASP security guidelines
- Test for security vulnerabilities

#### Documentation
- Update README for significant changes
- Update Swagger/OpenAPI documentation
- Add inline comments for complex logic
- Update environment variable documentation

### Code Quality Checklist

Before submitting a PR, ensure:

- [ ] All tests pass (`npm test`)
- [ ] Type checking passes (`npm run type-check`)
- [ ] Linting passes (`npm run lint`)
- [ ] Format checking passes (`npm run format:check`)
- [ ] Code coverage meets thresholds
- [ ] No console.log statements (use Winston logger)
- [ ] All new endpoints documented in Swagger
- [ ] Environment variables documented in `.env.example`
- [ ] Tests written for new features
- [ ] Security implications considered
- [ ] Breaking changes documented

## 📝 Development Scripts

```bash
# Development
npm run dev              # Start with nodemon (hot reload)
npm run start:dev        # Start with ts-node
npm run build:watch      # Build in watch mode

# Build & Production
npm run build            # Compile TypeScript
npm run start            # Start production server
npm run clean            # Clean dist directory

# Code Quality
npm run type-check       # TypeScript type checking
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint issues
npm run format           # Format with Prettier
npm run format:check     # Check formatting
npm run validate         # Run all checks + tests

# Testing (see Testing section for more)
npm test                 # Run all tests
npm run test:coverage    # With coverage report
npm run test:unit        # Unit tests only
npm run test:integration # Integration tests only

# Database
npm run seed             # Seed development database
npm run seed:prod        # Seed production database
npm run db:check         # Check database data

# Dependencies
npm run audit:fix        # Fix security vulnerabilities
npm run deps:check       # Check for outdated packages
npm run deps:update      # Update dependencies
npm run deps:update:major # Update to latest major versions

# Docker
npm run docker:build     # Build Docker image
npm run docker:run       # Run Docker container
npm run docker:scan      # Security scan
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👤 Author

**Edgar Chavero**
- Email: edieveg316@gmail.com
- LinkedIn: [Edgar Chavero](https://www.linkedin.com/in/edgar-chavero/)
- GitHub: [@EdieAprovita](https://github.com/EdieAprovita)

## 📞 Support

For support and questions:

- Create an issue in the [GitHub repository](https://github.com/EdieAprovita/api-guideTypescript/issues)
- Check the [Swagger documentation](http://localhost:5001/api-docs) for API details
- Review the test files for usage examples
- Check the [docs/](docs/) directory for additional documentation
- Use the interactive Swagger UI for endpoint testing

## 🔗 Additional Resources

- [CI/CD Setup Guide](docs/CI_SETUP.md)
- [Cloud Run Deployment Guide](docs/CLOUD_RUN_DEPLOYMENT.md)
- [GCP Deployment Guide](docs/gcp-deployment-guide.md)
- [Docker Security Setup](docs/docker-security-setup.md)
- [Testing Coverage Plan](docs/testing-coverage-plan.md)
- [Security Vulnerabilities Fixed](docs/security-vulnerabilities-fixed.md)
- [Review System Roadmap](docs/review-system-roadmap.md)

## 🌟 Project Stats

- **Version**: 2.3.0
- **Node.js**: 20.x
- **TypeScript**: 5.8+
- **Test Files**: 44+
- **Models**: 12
- **Controllers**: 13
- **Services**: 17
- **Middleware**: 10+
- **Lines of Code**: ~11,700+

## 🚀 Deployment

### Google Cloud Run

The API is deployed on Google Cloud Run for production use:

**Production URL**: `https://api-guidetypescript-787324382752.europe-west1.run.app`

For deployment instructions, see:
- [Cloud Run Deployment Guide](docs/CLOUD_RUN_DEPLOYMENT.md)
- [GCP Deployment Guide](docs/gcp-deployment-guide.md)

### Kubernetes Deployment

Kubernetes manifests are available:
- `api-configmap.yaml` - Configuration management
- `api-deployment.yaml` - Deployment configuration
- `api-service.yaml` - Service configuration

## 🎯 Roadmap

Future enhancements planned:
- [ ] GraphQL API support
- [ ] Real-time updates with WebSockets
- [ ] Advanced search and filtering
- [ ] Image upload and processing
- [ ] Email notifications system
- [ ] Admin dashboard
- [ ] Rate limiting per user tier
- [ ] API key authentication option
- [ ] Geospatial queries optimization
- [ ] Multi-language support

## 🙏 Acknowledgments

- Express.js community
- TypeScript team
- MongoDB and Mongoose teams
- All contributors and supporters

---

**Built with ❤️ for the vegan community**
