import cors from 'cors';

const corsOptions = {
    credentials: true,
    origin: process.env.FRONTEND_URL,
};

export default cors(corsOptions);
