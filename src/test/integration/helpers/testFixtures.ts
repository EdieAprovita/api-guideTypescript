import { faker } from '@faker-js/faker';
import { User } from '../../../models/User';
import { Restaurant } from '../../../models/Restaurant';
import { Business } from '../../../models/Business';
import TokenService from '../../../services/TokenService';
import { testConfig } from '../../config/testConfig';

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
  // Use a plain-text password from overrides or a default from testConfig
  const plainPassword = overrides.password || testConfig.passwords.fixturePassword;
  
  if (!plainPassword) {
    throw new Error('No password provided for test user creation');
  }
  
  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  const userData = {
    username: faker.internet.userName(),
    email: faker.internet.email().toLowerCase(),
    role: 'user',
    isAdmin: false,
    isActive: true,
    isDeleted: false,
    photo: faker.image.avatar(),
    ...overrides,
    password: hashedPassword, // Ensure the final password is the hashed one
  };

  const user = await User.create(userData);
  return user;
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

export const generateAuthTokens = async (userId: string, email: string, role?: string) => {
  const tokens = await TokenService.generateTokenPair({
    userId,
    email,
    role
  });
  
  return tokens;
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

export const createTestRestaurant = async (authorId: string, overrides: RestaurantOverrides = {}) => {
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
        phone: faker.phone.number(),
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

  const restaurant = await Restaurant.create(restaurantData);
  return restaurant;
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

export const createTestBusiness = async (authorId: string, overrides: BusinessOverrides = {}) => {
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
        phone: faker.phone.number().toString(),
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

  const business = await Business.create(businessData);
  return business;
};

export const generateLocationQuery = (lat?: number, lng?: number, radius?: number) => {
  return {
    lat: lat ?? faker.location.latitude(),
    lng: lng ?? faker.location.longitude(),
    radius: radius ?? 5000
  };
};

export const createMultipleRestaurants = async (authorId: string, count: number = 5) => {
  const restaurants = [];
  
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