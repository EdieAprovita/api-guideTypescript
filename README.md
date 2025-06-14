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
- **Postman Collection**: Ready-to-use API collection for testing

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

### Postman Collection

Import the included `postman_collection.json` file into Postman for:

- Pre-configured API requests
- Environment variables setup
- Automated token management
- Request examples with sample data

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
- `GET /restaurants/:id` - Get restaurant by ID
- `POST /restaurants` - Create a new restaurant
- `PUT /restaurants/:id` - Update restaurant details
- `DELETE /restaurants/:id` - Delete a restaurant
- `POST /restaurants/add-review/:id` - Add review to restaurant

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

- Node.js (v14 or higher)
- npm or yarn
- MongoDB (local or cloud instance)

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
   ```

4. **Start the server**

   ```bash
   # Development mode
   npm run dev

   # Production mode
   npm start
   ```

5. **Access the API**
   - API Base URL: `http://localhost:5001/api/v1`
   - Swagger Documentation: `http://localhost:5001/api-docs`

### Using Postman Collection

1. **Import Collection**

   - Open Postman
   - Click "Import" button
   - Select `postman_collection.json` file
   - Collection will be imported with all endpoints

2. **Set Environment Variables**

   - Base URL: `http://localhost:5001/api/v1`
   - Auth Token: Will be automatically set after login

3. **Authentication Flow**
   - Use "Register User" to create an account
   - Use "Login User" to get JWT token
   - Token will be automatically saved for subsequent requests

## 🔒 Security Features

The API implements multiple security layers:

- **[helmet](https://helmetjs.github.io/)** – Sets security HTTP headers
- **[express-rate-limit](https://github.com/nfriedly/express-rate-limit)** – Rate limiting (100 requests per 15 minutes)
- **[express-mongo-sanitize](https://github.com/fiznool/express-mongo-sanitize)** – Prevents NoSQL injection attacks
- **[express-xss-sanitizer](https://www.npmjs.com/package/express-xss-sanitizer)** – Prevents XSS attacks
- **JWT Authentication** – Secure token-based authentication
- **Input Validation** – Request validation and sanitization

## 📁 Project Structure

```
src/
├── controllers/     # Route controllers
├── models/         # Database models
├── routes/         # API routes
├── middleware/     # Custom middleware
├── services/       # Business logic
├── types/          # TypeScript type definitions
├── utils/          # Utility functions
├── config/         # Configuration files
├── app.ts          # Express app setup
└── server.ts       # Server entry point
```

## 🧪 Testing

### Using Swagger UI

1. Navigate to `http://localhost:5001/api-docs`
2. Explore available endpoints
3. Test requests directly in the browser
4. View request/response schemas

### Using Postman

1. Import the collection
2. Set up environment variables
3. Run individual requests or entire collections
4. Automated testing with pre-request scripts

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
- Update Swagger documentation for new endpoints
- Add corresponding Postman requests

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

For support and questions:

- Create an issue in the GitHub repository
- Check the Swagger documentation for API details
- Use the Postman collection for testing examples
