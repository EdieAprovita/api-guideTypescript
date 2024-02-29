import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import path from "path";

import connectDB from "./config/db";
import { errorHandler, notFound } from "./middleware/errorHandler";
import userRoutes from "./routes/userRoutes";

dotenv.config();
connectDB();

const app = express();

if (process.env.NODE_ENV === "development") {
	app.use(morgan("dev"));
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
	cors((req, callback) => {
		const corsOptions = {
			credentials: true,
			origin: process.env.FRONTEND_URL,
		};
		callback(null, corsOptions);
	})
);
app.use("/uploads", express.static(path.join(__dirname, "/uploads")));

// Routes
app.use("/api/v1", userRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

export default app;
