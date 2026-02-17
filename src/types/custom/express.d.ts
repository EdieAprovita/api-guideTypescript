import { IUser } from '../../models/User.js';

declare global {
    namespace Express {
        interface Request {
            user?: IUser;
        }
    }
    
    namespace NodeJS {
        interface ProcessEnv {
            NODE_ENV?: string;
            JWT_SECRET?: string;
            JWT_REFRESH_SECRET?: string;
            JWT_EXPIRES_IN?: string;
            JWT_REFRESH_EXPIRES_IN?: string;
            BCRYPT_SALT_ROUNDS?: string;
            REDIS_HOST?: string;
            REDIS_PORT?: string;
            REDIS_PASSWORD?: string;
            EMAIL_USER?: string;
            EMAIL_PASS?: string;
            CLIENT_URL?: string;
            MONGODB_URI?: string;
        }
    }
}
