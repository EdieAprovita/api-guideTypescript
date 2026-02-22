import Joi from 'joi';
const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const schema = Joi.object({
  email: Joi.string().pattern(emailPattern).message('Must be a valid email address').required(),
  password: Joi.string().min(8).max(128).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,128}$/).required()
});

const test1 = schema.validate({ email: 'invalid-email', password: 'TestPassword123!' });
const test2 = schema.validate({ email: 'test@example.com', password: '123' });

console.log('test1 error:', test1.error?.message);
console.log('test2 error:', test2.error?.message);
