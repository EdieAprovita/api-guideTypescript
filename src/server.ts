import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import morgan from 'morgan';
import path from 'path';

import connectDB from './config/db';
import { colorTheme } from './types/colorTheme'; 

dotenv.config();

connectDB();

const app = express();

if (process.env.NODE_ENV === 'development') {
	app.use(morgan('dev'));
}

app.use(express.json());

//CORS
app.use(
	cors({
		credentials: true,
		origin: process.env.FRONTEND_URL,
	})
);

app.use('/uploads', express.static(path.join(__dirname, '/uploads')));

if (process.env.NODE_ENV === 'production') {
	app.use(express.static(path.join(__dirname, 'client/build')));
	app.get('*', (req, res) => {
		res.sendFile(path.join(__dirname, 'client', 'build', 'index.html'));
	});
} else {
	app.get('/', (req, res) => {
		res.send('API is running');
	});
}

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
	console.log(colorTheme.secondary.bold(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`));
});
