import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import morgan from "morgan";
import cookieParser from "cookie-parser";

import connectDB from "./config/db";
import { errorHandler, notFound } from "./middleware/errorHandler";

import userRoutes from "./routes/userRoutes";
import businessRoutes from "./routes/businessRoutes";
import recipesRoutes from "./routes/recipesRoutes";
import marketsRoutes from "./routes/marketsRoutes";
import restaurantRoutes from "./routes/restaurantRoutes";
import doctorsRoutes from "./routes/doctorsRoutes";
import professionProfileRoutes from "./routes/professionProfileRoutes";
import professionRoutes from "./routes/professionRoutes";
import postRoutes from "./routes/postRoutes";

dotenv.config();
connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

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
app.use("/api/v1/professionsProfile", professionProfileRoutes);
app.use("/api/v1/professions", professionRoutes);
app.use("/api/v1/posts", postRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

export default app;
