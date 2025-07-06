import { Types } from 'mongoose';
import { 
    MockRestaurant, 
    MockBusiness, 
    MockMarket, 
    MockSanctuary, 
    MockUser, 
    MockReview, 
    MockPost 
} from './types';

// Common mock data to avoid duplication across test files

// Mock Restaurants
export const mockRestaurants: MockRestaurant[] = [
    {
        _id: '1',
        name: 'Test Restaurant 1',
        description: 'A great vegan restaurant',
        address: 'Test Address 1',
        location: {
            type: 'Point',
            coordinates: [-3.7038, 40.4168]
        },
        contact: [
            {
                phone: '+34 123 456 789',
                email: 'test1@restaurant.com',
                website: 'https://test1.com'
            }
        ],
        cuisine: 'Vegan',
        reviews: [
            {
                _id: 'review1',
                rating: 5,
                comment: 'Excellent food!',
                username: 'testuser'
            }
        ],
        rating: 5,
        isVerified: true
    },
    {
        _id: '2',
        name: 'Test Restaurant 2',
        description: 'Another great vegan restaurant',
        address: 'Test Address 2',
        location: {
            type: 'Point',
            coordinates: [2.1734, 41.3851]
        },
        contact: [
            {
                phone: '+34 987 654 321',
                email: 'test2@restaurant.com'
            }
        ],
        cuisine: 'Vegetarian',
        reviews: [
            {
                _id: 'review2',
                rating: 4,
                comment: 'Good food',
                username: 'testuser2'
            }
        ],
        rating: 4,
        isVerified: true
    }
];

// Mock Businesses
export const mockBusinesses: MockBusiness[] = [
    {
        _id: '1',
        name: 'Test Business 1',
        description: 'A great vegan business',
        address: 'Test Business Address 1',
        location: {
            type: 'Point',
            coordinates: [-3.7038, 40.4168]
        },
        contact: [
            {
                phone: '+34 123 456 789',
                email: 'test1@business.com',
                website: 'https://testbusiness1.com'
            }
        ],
        category: 'market',
        reviews: [
            {
                _id: 'breview1',
                rating: 5,
                comment: 'Great service!',
                username: 'testuser'
            }
        ],
        rating: 5,
        isVerified: true
    },
    {
        _id: '2',
        name: 'Test Business 2',
        description: 'Another great vegan business',
        address: 'Test Business Address 2',
        location: {
            type: 'Point',
            coordinates: [2.1734, 41.3851]
        },
        contact: [
            {
                phone: '+34 987 654 321',
                email: 'test2@business.com'
            }
        ],
        category: 'shop',
        reviews: [
            {
                _id: 'breview2',
                rating: 4,
                comment: 'Good products',
                username: 'testuser2'
            }
        ],
        rating: 4,
        isVerified: true
    }
];

// Mock Markets
export const mockMarkets: MockMarket[] = [
    {
        _id: '1',
        name: 'Test Market 1',
        description: 'A great vegan market',
        address: 'Test Market Address 1',
        location: {
            type: 'Point',
            coordinates: [-3.7038, 40.4168]
        },
        contact: [
            {
                phone: '+34 123 456 789',
                email: 'test1@market.com'
            }
        ],
        reviews: [
            {
                _id: 'mreview1',
                rating: 5,
                comment: 'Fresh produce!',
                username: 'testuser'
            }
        ],
        rating: 5,
        isVerified: true
    }
];

// Mock Sanctuaries
export const mockSanctuaries: MockSanctuary[] = [
    {
        _id: '1',
        name: 'Test Sanctuary 1',
        description: 'A great animal sanctuary',
        address: 'Test Sanctuary Address 1',
        location: {
            type: 'Point',
            coordinates: [-3.7038, 40.4168]
        },
        animals: [
            {
                type: 'cow',
                count: 5,
                description: 'Rescued farm animals'
            }
        ],
        website: 'https://testsanctuary1.com',
        contact: [
            {
                phone: '+34 123 456 789',
                email: 'test1@sanctuary.com'
            }
        ],
        reviews: [
            {
                _id: 'sreview1',
                rating: 5,
                comment: 'Amazing work!',
                username: 'testuser'
            }
        ],
        rating: 5,
        isVerified: true
    }
];

// Mock Users
export const mockUsers: MockUser[] = [
    {
        _id: '1',
        username: 'testuser',
        email: 'test@example.com',
        role: 'user',
        isAdmin: false,
        isActive: true,
        isDeleted: false,
        photo: 'https://example.com/photo1.jpg',
        timestamps: {
            createdAt: new Date('2023-01-01'),
            updatedAt: new Date('2023-01-01')
        }
    },
    {
        _id: '2',
        username: 'testuser2',
        email: 'test2@example.com',
        role: 'professional',
        isAdmin: false,
        isActive: true,
        isDeleted: false,
        photo: 'https://example.com/photo2.jpg',
        timestamps: {
            createdAt: new Date('2023-01-02'),
            updatedAt: new Date('2023-01-02')
        }
    }
];

// Mock Reviews
export const mockReviews: MockReview[] = [
    {
        _id: '1',
        username: 'testuser',
        rating: 5,
        comment: 'Great experience!',
        user: new Types.ObjectId('507f1f77bcf86cd799439011'),
        refId: new Types.ObjectId('507f1f77bcf86cd799439012'),
        refModel: 'Restaurant',
        timestamps: {
            createdAt: new Date('2023-01-01'),
            updatedAt: new Date('2023-01-01')
        }
    }
];

// Mock Posts
export const mockPosts: MockPost[] = [
    {
        _id: '1',
        title: 'Test Post 1',
        content: 'This is a test post content',
        author: new Types.ObjectId('507f1f77bcf86cd799439011'),
        likes: [
            {
                username: 'testuser',
                user: new Types.ObjectId('507f1f77bcf86cd799439011')
            }
        ],
        timestamps: {
            createdAt: new Date('2023-01-01'),
            updatedAt: new Date('2023-01-01')
        }
    }
];

// Helper functions to create mock data with custom properties
export const createMockRestaurant = (overrides: Partial<MockRestaurant> = {}): MockRestaurant => ({
    ...mockRestaurants[0],
    ...overrides
});

export const createMockBusiness = (overrides: Partial<MockBusiness> = {}): MockBusiness => ({
    ...mockBusinesses[0],
    ...overrides
});

export const createMockUser = (overrides: Partial<MockUser> = {}): MockUser => ({
    ...mockUsers[0],
    ...overrides
});

export const createMockReview = (overrides: Partial<MockReview> = {}): MockReview => ({
    ...mockReviews[0],
    ...overrides
});

// Empty mock data for testing empty states
export const emptyMockData = {
    restaurants: [],
    businesses: [],
    markets: [],
    sanctuaries: [],
    users: [],
    reviews: [],
    posts: []
}; 