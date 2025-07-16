import { faker } from '@faker-js/faker';
import { User } from '../../../models/User';
import { Restaurant, IRestaurant } from '../../../models/Restaurant';
import { Business } from '../../../models/Business';
import { logTestError } from './errorLogger';
import jwt from 'jsonwebtoken';
import { generateTestPassword } from '../../utils/passwordGenerator';

// Import bcrypt with fallback for mocked environments
interface BcryptInterface {
  hash: (password: string, saltRounds: number) => Promise<string>;
  compare: (password: string, hash: string) => Promise<boolean>;
}

let bcrypt: BcryptInterface;
try {
  bcrypt = require('bcryptjs');
} catch (error) {
  // Fallback mock if bcrypt is not available
  bcrypt = {
    hash: async (password: string) => `hashed_${password}`,
    compare: async () => true,
  };
}

interface UserOverrides {
  password?: string;
  username?: string;
  email?: string;
  role?: string;
  isAdmin?: boolean;
  isActive?: boolean;
  isDeleted?: boolean;
  photo?: string;
}

export const createTestUser = async (overrides: UserOverrides = {}) => {
  try {
    // Use a plain-text password from overrides or generate one if not provided
    const plainPassword = overrides.password || generateTestPassword();
    
    if (!plainPassword) {
      throw new Error('Password is required for test user creation');
    }
    
    // Generate unique username and email to avoid conflicts
    const uniqueId = Date.now().toString() + Math.random().toString(36).substring(2);
    
    // Don't hash the password here - let the User model middleware handle it
    const userData = {
      username: overrides.username || `testuser_${uniqueId}`,
      email: (overrides.email || `test_${uniqueId}@example.com`).toLowerCase(),
      role: 'user',
      isAdmin: false,
      isActive: true,
      isDeleted: false,
      photo: 'default.png', // Use stable value instead of faker.image.avatar()
      ...overrides,
      password: plainPassword, // Use plain password - will be hashed by User model middleware
    };

    console.log('Creating user with data:', {
      ...userData,
      password: '[REDACTED]' // Don't log the actual password
    });

    const user = await User.create(userData);
    
    console.log('User created successfully:', user ? 'Yes' : 'No');
    console.log('User ID:', user?._id);
    
    if (!user) {
      throw new Error('User.create() returned null or undefined');
    }
    return user;
  } catch (error) {
    console.error('Detailed error in createTestUser:', error);
    logTestError('createTestUser', error);
    throw new Error(
      `Failed to create test user: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
};

export const createAdminUser = async (overrides: UserOverrides = {}) => {
  return createTestUser({
    role: 'admin',
    isAdmin: true,
    ...overrides
  });
};

export const createProfessionalUser = async (overrides: UserOverrides = {}) => {
  return createTestUser({
    role: 'professional',
    ...overrides
  });
};

export const generateAuthTokens = async (
  userId: string,
  email: string,
  role?: string
) => {
  const accessSecret =
    process.env.JWT_SECRET || 'test_jwt_secret_key_for_testing';
  const refreshSecret =
    process.env.JWT_REFRESH_SECRET || 'test_jwt_refresh_secret_key';

  const accessToken = jwt.sign(
    { userId, email, role },
    accessSecret,
    {
      expiresIn: '15m',
      issuer: 'vegan-guide-api',
      audience: 'vegan-guide-client'
    }
  );

  const refreshToken = jwt.sign(
    { userId, email, role },
    refreshSecret,
    {
      expiresIn: '7d',
      issuer: 'vegan-guide-api',
      audience: 'vegan-guide-client'
    }
  );

  return { accessToken, refreshToken };
};

interface RestaurantOverrides {
  restaurantName?: string;
  typePlace?: string;
  address?: string;
  location?: {
    type: string;
    coordinates: number[];
  };
  image?: string;
  budget?: string;
  contact?: Array<{
    phone?: string;
    facebook?: string;
    instagram?: string;
  }>;
  cuisine?: string[];
  rating?: number;
  numReviews?: number;
  reviews?: unknown[];
}

export const createTestRestaurant = async (
  authorId: string,
  overrides: RestaurantOverrides = {}
) => {
  const restaurantData = {
    restaurantName: faker.company.name(),
    author: authorId,
    typePlace: faker.helpers.arrayElement(['restaurant', 'cafe', 'bar']),
    address: faker.location.streetAddress(),
    location: {
      type: 'Point',
      coordinates: [
        faker.location.longitude(),
        faker.location.latitude()
      ]
    },
    image: faker.image.url(),
    budget: faker.helpers.arrayElement(['$', '$$', '$$$', '$$$$']),
    contact: [
      {
        phone: '1234567890', // Simple phone number string
        facebook: faker.internet.url(),
        instagram: `@${faker.internet.userName()}`
      }
    ],
    cuisine: faker.helpers.arrayElements(['Italian', 'Mexican', 'Asian', 'Vegan', 'American'], 2),
    rating: 0,
    numReviews: 0,
    reviews: [],
    ...overrides
  };

  try {
    const restaurant = await Restaurant.create(restaurantData);
    return restaurant;
  } catch (error) {
    logTestError('createTestRestaurant', error);
    throw new Error(
      `Failed to create test restaurant: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
};

interface BusinessOverrides {
  namePlace?: string;
  address?: string;
  location?: {
    type: string;
    coordinates: number[];
  };
  image?: string;
  contact?: Array<{
    phone?: string;
    email?: string;
    facebook?: string;
    instagram?: string;
  }>;
  budget?: number;
  typeBusiness?: string;
  hours?: Array<{
    dayOfWeek?: string;
    openTime?: string;
    closeTime?: string;
  }>;
  rating?: number;
  numReviews?: number;
  reviews?: unknown[];
}

export const createTestBusiness = async (
  authorId: string,
  overrides: BusinessOverrides = {}
) => {
  const businessData = {
    namePlace: faker.company.name(),
    author: authorId,
    address: faker.location.streetAddress(),
    location: {
      type: 'Point',
      coordinates: [
        faker.location.longitude(),
        faker.location.latitude()
      ]
    },
    image: faker.image.url(),
    contact: [
      {
        phone: faker.phone.number('##########'), // Generate simple 10-digit number
        email: faker.internet.email(),
        facebook: faker.internet.url(),
        instagram: `@${faker.internet.userName()}`
      }
    ],
    budget: faker.number.int({ min: 1, max: 100 }),
    typeBusiness: faker.helpers.arrayElement(['store', 'service', 'retail']),
    hours: [
      {
        dayOfWeek: 'Monday',
        openTime: '09:00',
        closeTime: '18:00'
      }
    ],
    rating: 0,
    numReviews: 0,
    reviews: [],
    ...overrides
  };

  try {
    const business = await Business.create(businessData);
    return business;
  } catch (error) {
    logTestError('createTestBusiness', error);
    throw new Error(
      `Failed to create test business: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
};

export const generateLocationQuery = (lat?: number, lng?: number, radius?: number) => {
  return {
    lat: lat ?? faker.location.latitude(),
    lng: lng ?? faker.location.longitude(),
    radius: radius ?? 5000
  };
};

export const createMultipleRestaurants = async (authorId: string, count: number = 5) => {
  const restaurants: IRestaurant[] = [];
  
  for (let i = 0; i < count; i++) {
    const restaurant = await createTestRestaurant(authorId, {
      rating: faker.number.float({ min: 0, max: 5, multipleOf: 0.1 }),
      numReviews: faker.number.int({ min: 0, max: 100 })
    });
    restaurants.push(restaurant);
  }
  
  return restaurants;
};

export const cleanupTestData = async () => {
  // Clean up any test data if needed
  await User.deleteMany({ email: { $regex: /@example\.(com|net|org)$/ } });
  await Restaurant.deleteMany({ restaurantName: { $regex: /^Test / } });
  await Business.deleteMany({ namePlace: { $regex: /^Test / } });
};