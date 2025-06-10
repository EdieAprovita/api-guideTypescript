import dotenv from "dotenv";
import express from "express";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import mongoSanitize from "express-mongo-sanitize";
import xssClean from "xss-clean";

import connectDB from "./config/db";
import { errorHandler, notFound } from "./middleware/errorHandler";
import corsMiddleware from "./middleware/corsOptions";

import userRoutes from "./routes/userRoutes";
import businessRoutes from "./routes/businessRoutes";
import recipesRoutes from "./routes/recipesRoutes";
import marketsRoutes from "./routes/marketsRoutes";
import restaurantRoutes from "./routes/restaurantRoutes";
import doctorsRoutes from "./routes/doctorsRoutes";
import professionProfileRoutes from "./routes/professionProfileRoutes";
import professionRoutes from "./routes/professionRoutes";
import postRoutes from "./routes/postRoutes";
import sanctuaryRoutes from "./routes/sanctuaryRoutes";
import swaggerUi from "swagger-ui-express";
import swaggerDocument from "./swagger";

dotenv.config();
if (process.env.NODE_ENV !== "test") {
        connectDB();
}

const app = express();

// Security middleware to protect the application from common vulnerabilities
app.use(helmet()); // sets HTTP headers for basic security

// Limit repeated requests to 100 per 15 minutes to mitigate abuse
const limiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100,
        message: "Too many requests, please try again later.",
});
app.use(limiter);

app.use(mongoSanitize()); // prevent MongoDB operator injection
app.use(xssClean()); // sanitize user input against XSS

if (process.env.NODE_ENV === "development") {
        app.use(morgan("dev"));
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(corsMiddleware);
if (process.env.NODE_ENV !== "production") {
    app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
}

app.get("/api/v1", (req, res) => {
	res.send("API is running");
});

// Routes
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/businesses", businessRoutes);
app.use("/api/v1/recipes", recipesRoutes);
app.use("/api/v1/markets", marketsRoutes);
app.use("/api/v1/restaurants", restaurantRoutes);
app.use("/api/v1/doctors", doctorsRoutes);
app.use("/api/v1/professionalProfile", professionProfileRoutes);
app.use("/api/v1/professions", professionRoutes);
app.use("/api/v1/posts", postRoutes);
app.use("/api/v1/sanctuaries", sanctuaryRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

export default app;
