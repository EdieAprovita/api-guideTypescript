import { CookieOptions, Response } from 'express';
import jwt from 'jsonwebtoken';

import { UserIdRequiredError, TokenGenerationError } from '../types/Errors';

interface DefaultCookieOptions {
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'strict' | 'lax' | 'none';
    maxAge: number;
}

const COOKIE_NAME = 'jwt';
const DEFAULT_COOKIE_OPTIONS: DefaultCookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV !== 'development',
    sameSite: 'strict',
    maxAge: 30 * 24 * 60 * 60 * 1000,
};

interface TokenPayload {
    userId: string;
}

const generateTokenAndSetCookie = (res: Response, userId: string): void => {
    if (!userId) {
        throw new UserIdRequiredError('User ID is required');
    }

    try {
        const token = jwt.sign({ userId } as TokenPayload, process.env.JWT_SECRET as string, {
            expiresIn: '30d',
        });

        const cookieOptions: CookieOptions = {
            ...DEFAULT_COOKIE_OPTIONS,
            sameSite: 'strict',
        };
        res.cookie(COOKIE_NAME, token, cookieOptions);
    } catch (error) {
        throw new TokenGenerationError('Unable to generate token and set cookie');
    }
};

export default generateTokenAndSetCookie;
