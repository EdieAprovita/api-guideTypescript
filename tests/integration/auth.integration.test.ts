import request from 'supertest';
import app from '../../src/app';
import UserService from '../../src/services/UserService';

jest.mock('../../src/config/db');
jest.mock('../../src/services/UserService');

describe('Auth Integration', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('registers a user', async () => {
        (UserService.registerUser as jest.Mock).mockResolvedValue({
            _id: '1',
            username: 'test',
            email: 'test@example.com',
            role: 'user',
        });

        const res = await request(app)
            .post('/api/v1/users/register')
            .send({ username: 'test', email: 'test@example.com', password: '123456' });

        expect(res.status).toBe(201);
        expect(UserService.registerUser).toHaveBeenCalled();
    });

    it('logs in a user', async () => {
        (UserService.loginUser as jest.Mock).mockResolvedValue({
            _id: '1',
            username: 'test',
            email: 'test@example.com',
            role: 'user',
            token: 'token',
        });

        const res = await request(app)
            .post('/api/v1/users/login')
            .send({ email: 'test@example.com', password: '123456' });

        expect(res.status).toBe(200);
        expect(UserService.loginUser).toHaveBeenCalledWith('test@example.com', '123456', expect.anything());
        expect(res.body).toHaveProperty('token');
    });
});
