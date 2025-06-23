import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { Restaurant } from '../models/Restaurant';
import { Recipe } from '../models/Recipe';
import { Doctor } from '../models/Doctor';
import { Market } from '../models/Market';
import { Business } from '../models/Business';
import { Profession } from '../models/Profession';
import { Sanctuary } from '../models/Sanctuary';
import { Review } from '../models/Review';
import connectDB from '../config/db';

// Load environment variables
dotenv.config();

// Sample Users Data
if (!process.env.SEED_USER_PASSWORD) {
    throw new Error(
        'Environment variable SEED_USER_PASSWORD is required but not provided. Please set a secure password.'
    );
}
const defaultPassword = process.env.SEED_USER_PASSWORD;
const sampleUsers = [
    {
        username: 'admin',
        email: 'admin@veganguide.com',
        password: process.env.ADMIN_PASSWORD ?? defaultPassword,
        role: 'user',
        isAdmin: true,
        photo: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
    },
    {
        username: 'chef_sarah',
        email: 'sarah@veganrecipes.com',
        password: process.env.CHEF_PASSWORD ?? defaultPassword,
        role: 'user',
        photo: 'https://images.unsplash.com/photo-1494790108755-2616b332c789?w=150',
    },
    {
        username: 'dr_green',
        email: 'drgreen@healthyvegan.com',
        password: process.env.DOCTOR_PASSWORD ?? defaultPassword,
        role: 'professional',
        photo: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150',
    },
    {
        username: 'restaurant_owner',
        email: 'owner@veganplace.com',
        password: process.env.OWNER_PASSWORD ?? defaultPassword,
        role: 'user',
        photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    },
];

// Sample Restaurants Data
const sampleRestaurants = [
    {
        restaurantName: 'Green Garden Bistro',
        typePlace: 'Casual Dining',
        address: '123 Organic Ave, Portland, OR 97201',
        location: {
            type: 'Point',
            coordinates: [-122.6765, 45.5152],
        },
        image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400',
        budget: 'moderate',
        contact: [
            {
                phone: '+1-503-555-0123',
                email: 'info@greengarden.com',
                website: 'https://greengarden.com',
            },
        ],
        cuisine: ['Mediterranean', 'Organic', 'Raw'],
    },
    {
        restaurantName: 'Plant Power Kitchen',
        typePlace: 'Fast Casual',
        address: '456 Vegan St, Los Angeles, CA 90210',
        location: {
            type: 'Point',
            coordinates: [-118.2437, 34.0522],
        },
        image: 'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=400',
        budget: 'affordable',
        contact: [
            {
                phone: '+1-323-555-0456',
                email: 'hello@plantpower.com',
                website: 'https://plantpower.com',
            },
        ],
        cuisine: ['American', 'Healthy', 'Fast Food'],
    },
    {
        restaurantName: 'The Herbivore',
        typePlace: 'Fine Dining',
        address: '789 Gourmet Blvd, New York, NY 10001',
        location: {
            type: 'Point',
            coordinates: [-74.006, 40.7128],
        },
        image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400',
        budget: 'expensive',
        contact: [
            {
                phone: '+1-212-555-0789',
                email: 'reservations@herbivore.com',
                website: 'https://herbivore.com',
            },
        ],
        cuisine: ['French', 'Gourmet', 'Fine Dining'],
    },
];

// Sample Recipes Data
const sampleRecipes = [
    {
        title: 'Creamy Cashew Alfredo Pasta',
        description: 'A rich and creamy vegan alfredo sauce made with cashews, perfect over your favorite pasta.',
        instructions:
            'Soak cashews for 2 hours. Blend with nutritional yeast, garlic, and plant milk. Cook pasta and toss with sauce.',
        ingredients: [
            '400g pasta',
            '1 cup raw cashews',
            '1/4 cup nutritional yeast',
            '3 garlic cloves',
            '1 cup plant milk',
            'Salt and pepper',
        ],
        typeDish: 'Main Course',
        image: 'https://images.unsplash.com/photo-1621996346565-e3dbc353d2e5?w=400',
        cookingTime: 30,
        difficulty: 'medium',
        budget: 'moderate',
    },
    {
        title: 'Rainbow Buddha Bowl',
        description: 'A nutritious and colorful bowl packed with fresh vegetables, quinoa, and tahini dressing.',
        instructions: 'Cook quinoa. Prepare vegetables. Make tahini dressing. Assemble bowl with all ingredients.',
        ingredients: [
            '1 cup quinoa',
            '2 cups kale',
            '1 cup chickpeas',
            '1 avocado',
            '1 carrot',
            '1/4 cup tahini',
            '2 tbsp lemon juice',
        ],
        typeDish: 'Main Course',
        image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400',
        cookingTime: 25,
        difficulty: 'easy',
        budget: 'moderate',
    },
    {
        title: 'Chocolate Avocado Mousse',
        description: 'A decadent and healthy chocolate mousse made with ripe avocados and cocoa powder.',
        instructions:
            'Blend ripe avocados with cocoa powder, maple syrup, and vanilla. Chill for 2 hours before serving.',
        ingredients: [
            '3 ripe avocados',
            '1/4 cup cocoa powder',
            '1/4 cup maple syrup',
            '1 tsp vanilla extract',
            'Pinch of salt',
        ],
        typeDish: 'Dessert',
        image: 'https://images.unsplash.com/photo-1541544181051-e46607d22224?w=400',
        cookingTime: 15,
        difficulty: 'easy',
        budget: 'affordable',
    },
];

// Sample Doctors Data
const sampleDoctors = [
    {
        doctorName: 'Dr. Sarah Green',
        address: '123 Health St, San Francisco, CA 94102',
        location: {
            type: 'Point',
            coordinates: [-122.4194, 37.7749],
        },
        image: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400',
        specialty: 'Plant-Based Nutrition',
        contact: [
            {
                phone: 4155550123,
                email: 'dr.green@healthcenter.com',
                facebook: 'drsarahgreen',
                instagram: '@drsarahgreen',
            },
        ],
    },
    {
        doctorName: 'Dr. Michael Plant',
        address: '456 Wellness Ave, Austin, TX 78701',
        location: {
            type: 'Point',
            coordinates: [-97.7431, 30.2672],
        },
        image: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400',
        specialty: 'Integrative Medicine',
        contact: [
            {
                phone: 5125550456,
                email: 'dr.plant@wellness.com',
                facebook: 'drmichaelplant',
                instagram: '@drmichaelplant',
            },
        ],
    },
];

// Sample Markets Data
const sampleMarkets = [
    {
        marketName: 'Organic Oasis Market',
        address: '789 Fresh Ave, Seattle, WA 98101',
        location: {
            type: 'Point',
            coordinates: [-122.3321, 47.6062],
        },
        image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400',
        typeMarket: 'grocery store' as const,
    },
    {
        marketName: 'Green Valley Supermarket',
        address: '321 Vegan Blvd, Denver, CO 80201',
        location: {
            type: 'Point',
            coordinates: [-104.9903, 39.7392],
        },
        image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400',
        typeMarket: 'supermarket' as const,
    },
];

// Sample Businesses Data
const sampleBusinesses = [
    {
        namePlace: 'Vegan Supply Co.',
        address: '555 Commerce St, Chicago, IL 60601',
        location: {
            type: 'Point',
            coordinates: [-87.6298, 41.8781],
        },
        image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400',
        contact: [
            {
                phone: 3125550555,
                email: 'info@vegansupply.com',
                facebook: 'vegansupplyco',
                instagram: '@vegansupply',
            },
        ],
        budget: 25,
        typeBusiness: 'Retail Store',
        hours: [
            {
                dayOfWeek: 'Monday-Friday',
                openTime: '09:00',
                closeTime: '18:00',
            },
        ],
    },
    {
        namePlace: 'Plant-Based Consulting',
        address: '777 Business Ave, Miami, FL 33101',
        location: {
            type: 'Point',
            coordinates: [-80.1918, 25.7617],
        },
        image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400',
        contact: [
            {
                phone: 3055550777,
                email: 'contact@plantconsulting.com',
                facebook: 'plantconsulting',
                instagram: '@plantconsult',
            },
        ],
        budget: 150,
        typeBusiness: 'Consulting',
        hours: [
            {
                dayOfWeek: 'Monday-Friday',
                openTime: '08:00',
                closeTime: '17:00',
            },
        ],
    },
];

// Sample Professions Data
const sampleProfessions = [
    {
        professionName: 'Vegan Chef',
        address: '888 Culinary Ave, Portland, OR 97201',
        location: {
            type: 'Point',
            coordinates: [-122.6765, 45.5152],
        },
        specialty: 'Plant-Based Culinary Arts',
        contact: [
            {
                phone: 5555551001,
                email: 'chef@vegancuisine.com',
                facebook: 'veganchef',
                instagram: '@veganchef',
            },
        ],
    },
    {
        professionName: 'Plant-Based Nutritionist',
        address: '444 Wellness St, Austin, TX 78701',
        location: {
            type: 'Point',
            coordinates: [-97.7431, 30.2672],
        },
        specialty: 'Vegan Nutrition and Wellness',
        contact: [
            {
                phone: 5555551002,
                email: 'nutritionist@plantbased.com',
                facebook: 'plantnutrition',
                instagram: '@plantnutrition',
            },
        ],
    },
];

// Sample Sanctuaries Data
const sampleSanctuaries = [
    {
        sanctuaryName: 'Happy Hooves Farm Sanctuary',
        address: '999 Sanctuary Rd, Woodstock, NY 12498',
        location: {
            type: 'Point',
            coordinates: [-74.1181, 42.0409],
        },
        image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400',
        typeofSanctuary: 'Farm Animal Sanctuary',
        animals: [
            {
                animalName: 'Betsy',
                specie: 'Cow',
                age: 8,
                gender: 'Female',
                habitat: 'Pasture',
                diet: ['Grass', 'Hay', 'Vegetables'],
                image: 'https://images.unsplash.com/photo-1516467508483-a7212febe31a?w=300',
                vaccines: ['Bovine respiratory disease', 'Clostridial diseases'],
                lastVaccine: new Date('2024-01-15'),
            },
            {
                animalName: 'Wilbur',
                specie: 'Pig',
                age: 4,
                gender: 'Male',
                habitat: 'Barn with outdoor access',
                diet: ['Vegetables', 'Fruits', 'Grains'],
                image: 'https://images.unsplash.com/photo-1516467508483-a7212febe31a?w=300',
                vaccines: ['Swine flu', 'Erysipelas'],
                lastVaccine: new Date('2024-02-20'),
            },
        ],
        capacity: 150,
        caretakers: ['Jane Smith', 'Bob Wilson', 'Maria Garcia'],
        contact: [
            {
                phone: 8455550999,
                email: 'info@happyhooves.org',
                facebook: 'happyhoovessanctuary',
                instagram: '@happyhooves',
            },
        ],
    },
];

// Clean database function
const cleanDatabase = async () => {
    try {
        // Get all collection names
        const collections = await mongoose.connection.db?.listCollections().toArray();

        if (collections && collections.length > 0) {
            console.log('🧹 Cleaning existing collections...');

            // Drop each collection individually
            for (const collection of collections) {
                try {
                    await mongoose.connection.db?.dropCollection(collection.name);
                    console.log(`   Dropped: ${collection.name}`);
                } catch (error) {
                    console.log(`   Could not drop ${collection.name} (may not exist)`);
                }
            }
        } else {
            console.log('   No existing collections found');
        }
    } catch (error) {
        console.log('   Database cleaning completed (may have been empty)');
    }
};

// Seed function
export const seedDatabase = async () => {
    try {
        await connectDB();
        console.log('Connected to MongoDB');

        // Clean database completely
        await cleanDatabase();

        // Hash passwords for users
        const hashedUsers = await Promise.all(
            sampleUsers.map(async user => ({
                ...user,
                password: await bcrypt.hash(user.password, 12),
            }))
        );

        // Create users
        console.log('Creating users...');
        const createdUsers = await User.insertMany(hashedUsers);
        console.log(`Created ${createdUsers.length} users`);

        // Add author references to other entities
        const adminUser = createdUsers.find(user => user.username === 'admin');
        const chefUser = createdUsers.find(user => user.username === 'chef_sarah');
        const doctorUser = createdUsers.find(user => user.username === 'dr_green');
        const ownerUser = createdUsers.find(user => user.username === 'restaurant_owner');

        // Create restaurants
        console.log('Creating restaurants...');
        const restaurantsWithAuthor = sampleRestaurants.map(restaurant => ({
            ...restaurant,
            author: ownerUser?._id,
        }));
        const createdRestaurants = await Restaurant.insertMany(restaurantsWithAuthor);
        console.log(`Created ${createdRestaurants.length} restaurants`);

        // Create recipes
        console.log('Creating recipes...');
        const recipesWithAuthor = sampleRecipes.map(recipe => ({
            ...recipe,
            author: chefUser?._id,
        }));
        const createdRecipes = await Recipe.insertMany(recipesWithAuthor);
        console.log(`Created ${createdRecipes.length} recipes`);

        // Create doctors
        console.log('Creating doctors...');
        const doctorsWithAuthor = sampleDoctors.map(doctor => ({
            ...doctor,
            author: doctorUser?._id,
        }));
        const createdDoctors = await Doctor.insertMany(doctorsWithAuthor);
        console.log(`Created ${createdDoctors.length} doctors`);

        // Create markets
        console.log('Creating markets...');
        const marketsWithAuthor = sampleMarkets.map(market => ({
            ...market,
            author: adminUser?._id,
        }));
        const createdMarkets = await Market.insertMany(marketsWithAuthor);
        console.log(`Created ${createdMarkets.length} markets`);

        // Create businesses
        console.log('Creating businesses...');
        const businessesWithAuthor = sampleBusinesses.map(business => ({
            ...business,
            author: adminUser?._id,
        }));
        const createdBusinesses = await Business.insertMany(businessesWithAuthor);
        console.log(`Created ${createdBusinesses.length} businesses`);

        // Create professions
        console.log('Creating professions...');
        const professionsWithAuthor = sampleProfessions.map(profession => ({
            ...profession,
            author: adminUser?._id,
        }));
        const createdProfessions = await Profession.insertMany(professionsWithAuthor);
        console.log(`Created ${createdProfessions.length} professions`);

        // Create sanctuaries
        console.log('Creating sanctuaries...');
        const sanctuariesWithAuthor = sampleSanctuaries.map(sanctuary => ({
            ...sanctuary,
            author: adminUser?._id,
        }));
        const createdSanctuaries = await Sanctuary.insertMany(sanctuariesWithAuthor);
        console.log(`Created ${createdSanctuaries.length} sanctuaries`);

        // Create sample reviews
        console.log('Creating sample reviews...');
        const sampleReviews = [
            {
                username: chefUser?.username ?? 'chef_sarah',
                rating: 5,
                comment: 'Amazing plant-based food! The cashew alfredo was incredible.',
                user: chefUser?._id,
                refId: createdRestaurants[0]?._id,
                refModel: 'Restaurant',
            },
            {
                username: adminUser?.username ?? 'admin',
                rating: 4,
                comment: 'Great recipe, easy to follow and delicious results!',
                user: adminUser?._id,
                refId: createdRecipes[0]?._id,
                refModel: 'Recipe',
            },
            {
                username: ownerUser?.username ?? 'restaurant_owner',
                rating: 5,
                comment: 'Dr. Green provided excellent nutritional guidance for my plant-based journey.',
                user: ownerUser?._id,
                refId: createdDoctors[0]?._id,
                refModel: 'Doctor',
            },
            {
                username: doctorUser?.username ?? 'dr_green',
                rating: 4,
                comment: 'Love this Buddha bowl recipe! Perfect for my patients.',
                user: doctorUser?._id,
                refId: createdRecipes[1]?._id,
                refModel: 'Recipe',
            },
            {
                username: adminUser?.username ?? 'admin',
                rating: 5,
                comment: 'Plant Power Kitchen has the best vegan burgers in LA!',
                user: adminUser?._id,
                refId: createdRestaurants[1]?._id,
                refModel: 'Restaurant',
            },
        ];

        const createdReviews = await Review.insertMany(sampleReviews);
        console.log(`Created ${createdReviews.length} reviews`);

        console.log('\n✅ Database seeded successfully!');
        console.log('🌱 Complete dataset created:');
        console.log(`   👥 Users: ${createdUsers.length} (including admin)`);
        console.log(`   🍽️ Restaurants: ${createdRestaurants.length}`);
        console.log(`   🥗 Recipes: ${createdRecipes.length}`);
        console.log(`   👨‍⚕️ Doctors: ${createdDoctors.length}`);
        console.log(`   🛒 Markets: ${createdMarkets.length}`);
        console.log(`   🏢 Businesses: ${createdBusinesses.length}`);
        console.log(`   💼 Professions: ${createdProfessions.length}`);
        console.log(`   🐄 Sanctuaries: ${createdSanctuaries.length}`);
        console.log(`   ⭐ Reviews: ${createdReviews.length}`);

        console.log('\n🔑 Admin login credentials:');
        console.log('   Email: admin@veganguide.com');
        console.log(`   Password: ${process.env.ADMIN_PASSWORD ?? defaultPassword}`);

        console.log(
            '\n🌍 Geographic coverage: Portland, LA, NYC, SF, Austin, Seattle, Denver, Chicago, Miami, Woodstock'
        );
        console.log('\n🎯 Ready to test your frontend with complete data!');
    } catch (error) {
        console.error('❌ Error seeding database:', error);
        throw error;
    }
};

// Run seeder if called directly
if (require.main === module) {
    seedDatabase()
        .then(() => {
            console.log('Seeding completed successfully!');
            process.exit(0);
        })
        .catch(error => {
            console.error('Seeding failed:', error);
            process.exit(1);
        });
}
