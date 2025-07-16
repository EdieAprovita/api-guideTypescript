import cors from 'cors';

const corsOptions = {
    credentials: true,
    origin:
        process.env.NODE_ENV === 'production'
            ? process.env.FRONTEND_URL
            : ['http://localhost:3000', 'http://127.0.0.1:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
};

export default cors(corsOptions);
