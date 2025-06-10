# Vegan City Guide API

The Vegan City Guide API is a RESTful API designed to serve as a platform for users to share and discover vegan-friendly places and services in their city. Whether it's recipes, restaurants, businesses, medical professionals, or markets, this API aims to provide a comprehensive guide for vegans and those interested in plant-based living.

## Features

- **User Authentication**: Secure user authentication and authorization mechanisms.
- **CRUD Operations**: Full CRUD (Create, Read, Update, Delete) functionality for managing user-generated content.
- **Search and Filter**: Powerful search and filtering capabilities to help users find specific types of vegan-friendly places and services.
- **Social Features**: Social networking features such as liking, commenting, and sharing to facilitate user engagement and interaction.
- **Location-Based Services**: Integration with location-based services to provide personalized recommendations based on the user's current location.

## Endpoints

### Authentication

- `POST /api/v1/users/register`: Register a new user.
- `POST /api/v1/users/login`: User login.

### User Management

- `GET /api/v1/users`: Get all users.
- `GET /api/v1/users/:id`: Get user by ID.
- `PUT /api/v1/users/:id`: Update user profile.
- `DELETE /api/v1/users/:id`: Delete user account.

### Places

- `GET /api/v1/places`: Get all places.
- `GET /api/v1/places/:id`: Get place by ID.
- `POST /api/v1/places`: Create a new place.
- `PUT /api/v1/places/:id`: Update place details.
- `DELETE /api/v1/places/:id`: Delete a place.

### Services

- `GET /api/v1/services`: Get all services.
- `GET /api/v1/services/:id`: Get service by ID.
- `POST /api/v1/services`: Create a new service.
- `PUT /api/v1/services/:id`: Update service details.
- `DELETE /api/v1/services/:id`: Delete a service.

### Social Interactions

- `POST /api/v1/places/:id/like`: Like a place.
- `POST /api/v1/places/:id/comment`: Add a comment to a place.
- `POST /api/v1/places/:id/share`: Share a place.

## Getting Started

To get started with the Vegan City Guide API, follow these steps:

1. Clone the repository: `git clone https://github.com/your/repo.git`
2. Install dependencies: `npm install`
3. Set up your environment variables (see `.env.example` for reference).
4. Start the server: `npm start`
5. Explore the API using your favorite API testing tool (e.g., Postman).

### API Documentation

After running the server you can view interactive API docs powered by Swagger UI
at `http://localhost:5000/api-docs` (available only in non-production
environments).

## Security Middleware

The API uses several middleware packages to improve security:

- **[helmet](https://helmetjs.github.io/)** – sets HTTP headers to help protect the app.
- **[express-rate-limit](https://github.com/nfriedly/express-rate-limit)** – prevents abuse by limiting requests (100 requests per 15 minutes).
- **[express-mongo-sanitize](https://github.com/fiznool/express-mongo-sanitize)** – sanitizes data to prevent MongoDB operator injection.
- **[xss-clean](https://www.npmjs.com/package/xss-clean)** – cleans input to prevent cross-site scripting attacks.

## Contributing

Contributions to the Vegan City Guide API are welcome! To contribute, please follow these guidelines:

1. Fork the repository.
2. Create a new branch: `git checkout -b feature/my-feature`.
3. Commit your changes: `git commit -am 'Add new feature'`.
4. Push to the branch: `git push origin feature/my-feature`.
5. Submit a pull request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
