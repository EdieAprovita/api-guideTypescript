import { faker } from '@faker-js/faker';
import bcrypt from 'bcryptjs';
import { User } from '../../../models/User';
import { Restaurant } from '../../../models/Restaurant';
import { Business } from '../../../models/Business';
import TokenService from '../../../services/TokenService';
import { testConfig } from '../../config/testConfig';

export const createTestUser = async (overrides: any = {}) => {
  const hashedPassword = await bcrypt.hash(testConfig.passwords.fixturePassword, 10);
  
  const userData = {
    username: faker.internet.userName(),
    email: faker.internet.email().toLowerCase(),
    password: hashedPassword,
    role: 'user',
    isAdmin: false,
    isActive: true,
    isDeleted: false,
    photo: faker.image.avatar(),
    ...overrides
  };

  const user = await User.create(userData);
  return user;
};

export const createAdminUser = async (overrides: any = {}) => {
  return createTestUser({
    role: 'admin',
    isAdmin: true,
    ...overrides
  });
};

export const createProfessionalUser = async (overrides: any = {}) => {
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

export const createTestRestaurant = async (authorId: string, overrides: any = {}) => {
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

export const createTestBusiness = async (authorId: string, overrides: any = {}) => {
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