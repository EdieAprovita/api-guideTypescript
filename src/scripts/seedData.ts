import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { Restaurant } from '../models/Restaurant.js';
import { Recipe } from '../models/Recipe.js';
import { Doctor } from '../models/Doctor.js';
import { Market } from '../models/Market.js';
import { Business } from '../models/Business.js';
import { Profession } from '../models/Profession.js';
import { Sanctuary } from '../models/Sanctuary.js';
import { Review } from '../models/Review.js';
import { Post } from '../models/Post.js';
import connectDB from '../config/db.js';

dotenv.config();

// ── Env defaults (no throw – seed is a dev-only tool) ─────────────────────────
if (!process.env.MONGODB_URI) {
    process.env.MONGODB_URI = 'mongodb://localhost:27017/veganguide';
    console.warn('⚠️  MONGODB_URI not set – using default: mongodb://localhost:27017/veganguide');
}

// Seed-only password: generated once per run if not provided via env.
// This is intentionally random and dev-only – never used in production.
const seedPassword = process.env.SEED_USER_PASSWORD ?? generateSeedPassword();

function generateSeedPassword(): string {
    const pwd = `seed-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    console.warn(`⚠️  SEED_USER_PASSWORD not set – generated one-time password: ${pwd}`);
    return pwd;
}

// ── Users ─────────────────────────────────────────────────────────────────────
const sampleUsers = [
    {
        username: 'admin',
        email: 'admin@veganguide.com',
        password: process.env.ADMIN_PASSWORD ?? seedPassword,
        role: 'user' as const,
        isAdmin: true,
        photo: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
    },
    {
        username: 'chef_sarah',
        email: 'sarah@veganrecipes.com',
        password: process.env.CHEF_PASSWORD ?? seedPassword,
        role: 'user' as const,
        isAdmin: false,
        photo: 'https://images.unsplash.com/photo-1494790108755-2616b332c789?w=150',
    },
    {
        username: 'dr_green',
        email: 'drgreen@healthyvegan.com',
        password: process.env.DOCTOR_PASSWORD ?? seedPassword,
        role: 'professional' as const,
        isAdmin: false,
        photo: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150',
    },
    {
        username: 'restaurant_owner',
        email: 'owner@veganplace.com',
        password: process.env.OWNER_PASSWORD ?? seedPassword,
        role: 'user' as const,
        isAdmin: false,
        photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    },
    {
        username: 'maria_vegan',
        email: 'maria@greenliving.com',
        password: seedPassword,
        role: 'user' as const,
        isAdmin: false,
        photo: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
    },
];

// ── Restaurants ───────────────────────────────────────────────────────────────
const sampleRestaurants = [
    {
        restaurantName: 'Green Garden Bistro',
        address: '123 Organic Ave, Portland, OR 97201',
        location: { type: 'Point', coordinates: [-122.6765, 45.5152] },
        image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600',
        budget: 'moderate',
        contact: [{ phone: '503-555-0123', facebook: 'greengardenbistro', instagram: '@greengarden' }],
        cuisine: ['Mediterranean', 'Organic', 'Raw'],
    },
    {
        restaurantName: 'Plant Power Kitchen',
        address: '456 Vegan St, Los Angeles, CA 90210',
        location: { type: 'Point', coordinates: [-118.2437, 34.0522] },
        image: 'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=600',
        budget: 'affordable',
        contact: [{ phone: '323-555-0456', facebook: 'plantpowerkitchen', instagram: '@plantpower' }],
        cuisine: ['American', 'Healthy', 'Fast Food'],
    },
    {
        restaurantName: 'The Herbivore',
        address: '789 Gourmet Blvd, New York, NY 10001',
        location: { type: 'Point', coordinates: [-74.006, 40.7128] },
        image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600',
        budget: 'expensive',
        contact: [{ phone: '212-555-0789', facebook: 'theherbivore', instagram: '@herbivore_ny' }],
        cuisine: ['French', 'Gourmet', 'Fine Dining'],
    },
    {
        restaurantName: 'Roots & Bowls',
        address: '321 Mission St, San Francisco, CA 94105',
        location: { type: 'Point', coordinates: [-122.4194, 37.7749] },
        image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600',
        budget: 'moderate',
        contact: [{ phone: '415-555-0321', instagram: '@rootsandbowls' }],
        cuisine: ['Asian Fusion', 'Whole Foods', 'Bowls'],
    },
    {
        restaurantName: 'Karma Kitchen',
        address: '88 Chapel St, Austin, TX 78702',
        location: { type: 'Point', coordinates: [-97.7431, 30.2672] },
        image: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=600',
        budget: 'affordable',
        contact: [{ phone: '512-555-0088', facebook: 'karmakitchenaustin', instagram: '@karmakitchen' }],
        cuisine: ['Indian', 'Comfort Food', 'Spicy'],
    },
];

// ── Recipes ───────────────────────────────────────────────────────────────────
// FIX: instructions must be string[], budget must be 'low'|'medium'|'high', preparationTime required
const sampleRecipes = [
    {
        title: 'Creamy Cashew Alfredo Pasta',
        description: 'A rich and creamy vegan alfredo sauce made with cashews, perfect over your favorite pasta.',
        instructions: [
            'Soak cashews in water for at least 2 hours, then drain.',
            'Add cashews, nutritional yeast, garlic, plant milk, salt and pepper to a blender. Blend until completely smooth.',
            'Cook pasta according to package directions. Reserve 1/2 cup pasta water.',
            'Warm the cashew sauce in a pan over medium heat, adding pasta water to reach desired consistency.',
            'Toss with cooked pasta and serve immediately. Garnish with fresh parsley.',
        ],
        ingredients: [
            '400g pasta (fettuccine or linguine)',
            '1 cup raw cashews (soaked)',
            '1/4 cup nutritional yeast',
            '3 garlic cloves',
            '1 cup unsweetened plant milk',
            'Salt and black pepper to taste',
            'Fresh parsley for garnish',
        ],
        typeDish: 'Main Course',
        image: 'https://images.unsplash.com/photo-1621996346565-e3dbc353d2e5?w=600',
        cookingTime: 20,
        preparationTime: 120,
        servings: 4,
        difficulty: 'medium' as const,
        budget: 'medium' as const,
    },
    {
        title: 'Rainbow Buddha Bowl',
        description: 'A nutritious and colorful bowl packed with fresh vegetables, quinoa, and tahini dressing.',
        instructions: [
            'Rinse quinoa and cook in 2 cups of water until fluffy, about 15 minutes.',
            'Roast chickpeas with olive oil, cumin and paprika at 400°F for 25 minutes until crispy.',
            'Massage kale with a little olive oil and salt for 2 minutes to soften.',
            'Julienne carrots, slice avocado, and halve cherry tomatoes.',
            'Whisk together tahini, lemon juice, garlic, and water to make the dressing.',
            'Assemble bowls with quinoa as the base, then arrange all toppings. Drizzle with dressing.',
        ],
        ingredients: [
            '1 cup quinoa',
            '1 can chickpeas (400g)',
            '2 cups kale, stems removed',
            '1 ripe avocado',
            '2 carrots',
            '1 cup cherry tomatoes',
            '1/4 cup tahini',
            '2 tbsp lemon juice',
            '1 garlic clove',
            'Olive oil, cumin, paprika, salt',
        ],
        typeDish: 'Main Course',
        image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600',
        cookingTime: 25,
        preparationTime: 10,
        servings: 2,
        difficulty: 'easy' as const,
        budget: 'medium' as const,
    },
    {
        title: 'Chocolate Avocado Mousse',
        description: 'A decadent and healthy chocolate mousse made with ripe avocados and cocoa powder.',
        instructions: [
            'Halve and pit the avocados, then scoop the flesh into a food processor.',
            'Add cocoa powder, maple syrup, vanilla extract, and a pinch of salt.',
            'Process until completely smooth and creamy, scraping down sides as needed.',
            'Taste and adjust sweetness with more maple syrup if desired.',
            'Transfer to serving glasses and refrigerate for at least 2 hours before serving.',
            'Garnish with fresh berries, coconut whipped cream, or crushed nuts.',
        ],
        ingredients: [
            '3 ripe avocados',
            '1/4 cup unsweetened cocoa powder',
            '1/4 cup maple syrup (or to taste)',
            '1 tsp pure vanilla extract',
            'Pinch of sea salt',
            'Fresh berries or mint to garnish',
        ],
        typeDish: 'Dessert',
        image: 'https://images.unsplash.com/photo-1541544181051-e46607d22224?w=600',
        cookingTime: 5,
        preparationTime: 10,
        servings: 4,
        difficulty: 'easy' as const,
        budget: 'low' as const,
    },
    {
        title: 'Smoky Black Bean Tacos',
        description: 'Crispy, smoky black bean tacos with fresh mango salsa and chipotle cream.',
        instructions: [
            'Drain and rinse black beans. Mash half of them with a fork.',
            'Season beans with chipotle powder, cumin, garlic powder, and lime juice.',
            'Cook beans in a pan over medium heat for 5-7 minutes until heated and slightly crispy.',
            'Make the mango salsa: dice mango, red onion, jalapeño, and cilantro. Mix with lime juice.',
            'Blend cashews, chipotle peppers, lime juice, and salt for the cream.',
            'Warm corn tortillas. Fill with bean mixture, mango salsa, and chipotle cream.',
        ],
        ingredients: [
            '2 cans black beans',
            '8 corn tortillas',
            '1 ripe mango',
            '1 red onion',
            '1 jalapeño',
            '1/2 cup cashews (soaked)',
            '1 chipotle pepper in adobo',
            'Fresh cilantro',
            'Limes',
            'Chipotle powder, cumin, garlic powder',
        ],
        typeDish: 'Main Course',
        image: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=600',
        cookingTime: 15,
        preparationTime: 20,
        servings: 4,
        difficulty: 'easy' as const,
        budget: 'low' as const,
    },
    {
        title: 'Lemon Blueberry Chia Pudding',
        description: 'A bright and refreshing overnight chia pudding perfect for breakfast or a light dessert.',
        instructions: [
            'Whisk together coconut milk, maple syrup, lemon zest, and lemon juice.',
            'Add chia seeds and whisk vigorously to prevent clumping.',
            'Let sit for 5 minutes, then whisk again.',
            'Cover and refrigerate overnight (or at least 4 hours).',
            'In the morning, stir the pudding and adjust consistency with more coconut milk if needed.',
            'Top with fresh blueberries, lemon zest, and a drizzle of maple syrup.',
        ],
        ingredients: [
            '400ml coconut milk (canned)',
            '1/4 cup chia seeds',
            '2 tbsp maple syrup',
            'Zest and juice of 1 lemon',
            '1 cup fresh blueberries',
        ],
        typeDish: 'Breakfast',
        image: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=600',
        cookingTime: 0,
        preparationTime: 10,
        servings: 2,
        difficulty: 'easy' as const,
        budget: 'low' as const,
    },
    {
        title: 'Jackfruit Pulled "Pork" Sandwich',
        description: 'Tender, smoky pulled jackfruit with BBQ sauce piled high on a toasted brioche bun.',
        instructions: [
            'Drain canned jackfruit and pat dry. Use hands to shred into long strips.',
            'Sauté onion and garlic in oil until soft, about 5 minutes.',
            'Add jackfruit, smoked paprika, cumin, and liquid smoke. Cook 5 minutes.',
            'Pour in BBQ sauce and vegetable broth. Simmer 20-25 minutes until sauce is thick.',
            'Shred jackfruit further with two forks into pulled texture.',
            'Toast buns and pile high with jackfruit. Top with coleslaw and pickles.',
        ],
        ingredients: [
            '2 cans young green jackfruit in brine',
            '1 cup BBQ sauce (vegan)',
            '1/2 cup vegetable broth',
            '1 onion',
            '3 garlic cloves',
            'Smoked paprika, cumin, liquid smoke',
            '4 brioche buns (vegan)',
            'Vegan coleslaw',
        ],
        typeDish: 'Main Course',
        image: 'https://images.unsplash.com/photo-1553909489-cd47e0907980?w=600',
        cookingTime: 35,
        preparationTime: 10,
        servings: 4,
        difficulty: 'medium' as const,
        budget: 'medium' as const,
    },
];

// ── Doctors ───────────────────────────────────────────────────────────────────
// FIX: phone must be String
const sampleDoctors = [
    {
        doctorName: 'Dr. Sarah Green',
        address: '123 Health St, San Francisco, CA 94102',
        location: { type: 'Point', coordinates: [-122.4194, 37.7749] },
        image: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400',
        specialty: 'Plant-Based Nutrition',
        education: ['MD – UCSF School of Medicine', 'MSc Nutritional Science – Stanford'],
        experience: '12 years specializing in lifestyle medicine and plant-based diets.',
        languages: ['English', 'Spanish'],
        contact: [{ phone: '415-555-0123', email: 'dr.green@healthcenter.com', instagram: '@drsarahgreen' }],
    },
    {
        doctorName: 'Dr. Michael Plant',
        address: '456 Wellness Ave, Austin, TX 78701',
        location: { type: 'Point', coordinates: [-97.7431, 30.2672] },
        image: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400',
        specialty: 'Integrative Medicine',
        education: ['MD – UT Health Austin', 'Fellowship in Integrative Medicine – University of Arizona'],
        experience: '8 years in integrative and functional medicine.',
        languages: ['English'],
        contact: [{ phone: '512-555-0456', email: 'dr.plant@wellness.com', facebook: 'drmichaelplant' }],
    },
    {
        doctorName: 'Dra. Luna Morales',
        address: '200 Salud Ave, Miami, FL 33101',
        location: { type: 'Point', coordinates: [-80.1918, 25.7617] },
        image: 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=400',
        specialty: 'Vegan Sports Medicine',
        education: ['MD – University of Miami', 'Certified Plant-Based Nutrition (Cornell)'],
        experience: '6 years working with plant-based athletes.',
        languages: ['English', 'Spanish', 'Portuguese'],
        contact: [{ phone: '305-555-0200', email: 'dra.luna@saludvegan.com', instagram: '@dralunamorales' }],
    },
];

// ── Markets ───────────────────────────────────────────────────────────────────
// FIX: contact requires phone+email (contactSchema), hours structure {day, open, close}
const sampleMarkets = [
    {
        marketName: 'Organic Oasis Market',
        address: '789 Fresh Ave, Seattle, WA 98101',
        location: { type: 'Point', coordinates: [-122.3321, 47.6062] },
        image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=600',
        typeMarket: 'grocery store' as const,
        products: ['Organic produce', 'Bulk grains', 'Plant-based dairy', 'Superfoods', 'Herbs & spices'],
        contact: [{ phone: '206-555-0789', email: 'info@organicoasis.com', instagram: '@organicoasis' }],
        hours: [
            { day: 'monday', open: '08:00', close: '20:00' },
            { day: 'tuesday', open: '08:00', close: '20:00' },
            { day: 'wednesday', open: '08:00', close: '20:00' },
            { day: 'thursday', open: '08:00', close: '20:00' },
            { day: 'friday', open: '08:00', close: '21:00' },
            { day: 'saturday', open: '09:00', close: '21:00' },
            { day: 'sunday', open: '10:00', close: '18:00' },
        ],
    },
    {
        marketName: 'Green Valley Supermarket',
        address: '321 Vegan Blvd, Denver, CO 80201',
        location: { type: 'Point', coordinates: [-104.9903, 39.7392] },
        image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=600',
        typeMarket: 'supermarket' as const,
        products: ['Vegan meats', 'Organic vegetables', 'Plant-based cheeses', 'Kombucha', 'Raw snacks'],
        contact: [{ phone: '720-555-0321', email: 'hello@greenvalley.com', facebook: 'greenvalleydenver' }],
        hours: [
            { day: 'monday', open: '07:00', close: '22:00' },
            { day: 'tuesday', open: '07:00', close: '22:00' },
            { day: 'wednesday', open: '07:00', close: '22:00' },
            { day: 'thursday', open: '07:00', close: '22:00' },
            { day: 'friday', open: '07:00', close: '23:00' },
            { day: 'saturday', open: '08:00', close: '23:00' },
            { day: 'sunday', open: '09:00', close: '20:00' },
        ],
    },
    {
        marketName: 'Seeds & Roots Co-op',
        address: '14 Community Ln, Asheville, NC 28801',
        location: { type: 'Point', coordinates: [-82.5515, 35.5951] },
        image: 'https://images.unsplash.com/photo-1608686207856-001b95cf60ca?w=600',
        typeMarket: 'convenience store' as const,
        products: ['Local produce', 'Artisan bread', 'Small-batch preserves', 'Mushroom varieties', 'Seed blends'],
        contact: [{ phone: '828-555-0014', email: 'coop@seedsandroots.org', instagram: '@seedsandroots' }],
        hours: [
            { day: 'monday', open: '09:00', close: '18:00' },
            { day: 'tuesday', open: '09:00', close: '18:00' },
            { day: 'wednesday', open: '09:00', close: '18:00' },
            { day: 'thursday', open: '09:00', close: '18:00' },
            { day: 'friday', open: '09:00', close: '19:00' },
            { day: 'saturday', open: '09:00', close: '17:00' },
        ],
    },
];

// ── Businesses ────────────────────────────────────────────────────────────────
// FIX: phone must be String
const sampleBusinesses = [
    {
        namePlace: 'Vegan Supply Co.',
        address: '555 Commerce St, Chicago, IL 60601',
        location: { type: 'Point', coordinates: [-87.6298, 41.8781] },
        image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600',
        contact: [{ phone: '312-555-0555', email: 'info@vegansupply.com', instagram: '@vegansupply' }],
        budget: 25,
        typeBusiness: 'Retail Store',
        hours: [
            { dayOfWeek: 'Monday', openTime: '09:00', closeTime: '18:00' },
            { dayOfWeek: 'Tuesday', openTime: '09:00', closeTime: '18:00' },
            { dayOfWeek: 'Wednesday', openTime: '09:00', closeTime: '18:00' },
            { dayOfWeek: 'Thursday', openTime: '09:00', closeTime: '18:00' },
            { dayOfWeek: 'Friday', openTime: '09:00', closeTime: '20:00' },
            { dayOfWeek: 'Saturday', openTime: '10:00', closeTime: '20:00' },
        ],
    },
    {
        namePlace: 'Plant-Based Consulting Group',
        address: '777 Business Ave, Miami, FL 33101',
        location: { type: 'Point', coordinates: [-80.1918, 25.7617] },
        image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600',
        contact: [{ phone: '305-555-0777', email: 'contact@plantconsulting.com', facebook: 'plantconsulting' }],
        budget: 150,
        typeBusiness: 'Consulting',
        hours: [
            { dayOfWeek: 'Monday', openTime: '08:00', closeTime: '17:00' },
            { dayOfWeek: 'Tuesday', openTime: '08:00', closeTime: '17:00' },
            { dayOfWeek: 'Wednesday', openTime: '08:00', closeTime: '17:00' },
            { dayOfWeek: 'Thursday', openTime: '08:00', closeTime: '17:00' },
            { dayOfWeek: 'Friday', openTime: '08:00', closeTime: '16:00' },
        ],
    },
    {
        namePlace: 'Eco Roots Spa & Wellness',
        address: '42 Serenity Blvd, Portland, OR 97204',
        location: { type: 'Point', coordinates: [-122.6785, 45.5231] },
        image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=600',
        contact: [{ phone: '503-555-0042', email: 'hello@ecoroots.com', instagram: '@ecorootsspa' }],
        budget: 80,
        typeBusiness: 'Wellness & Beauty',
        hours: [
            { dayOfWeek: 'Tuesday', openTime: '10:00', closeTime: '19:00' },
            { dayOfWeek: 'Wednesday', openTime: '10:00', closeTime: '19:00' },
            { dayOfWeek: 'Thursday', openTime: '10:00', closeTime: '19:00' },
            { dayOfWeek: 'Friday', openTime: '10:00', closeTime: '20:00' },
            { dayOfWeek: 'Saturday', openTime: '09:00', closeTime: '20:00' },
            { dayOfWeek: 'Sunday', openTime: '11:00', closeTime: '17:00' },
        ],
    },
];

// ── Professions ───────────────────────────────────────────────────────────────
// FIX: phone must be String
const sampleProfessions = [
    {
        professionName: 'Vegan Culinary Arts',
        address: '888 Culinary Ave, Portland, OR 97201',
        location: { type: 'Point', coordinates: [-122.6765, 45.5152] },
        specialty: 'Plant-Based Culinary Arts',
        contact: [{ phone: '503-555-1001', email: 'chef@vegancuisine.com', instagram: '@veganchefpdx' }],
    },
    {
        professionName: 'Plant-Based Nutritionist',
        address: '444 Wellness St, Austin, TX 78701',
        location: { type: 'Point', coordinates: [-97.7431, 30.2672] },
        specialty: 'Vegan Nutrition and Wellness',
        contact: [{ phone: '512-555-1002', email: 'nutritionist@plantbased.com', facebook: 'plantnutrition' }],
    },
    {
        professionName: 'Vegan Life Coaching',
        address: '10 Mindful Rd, Boulder, CO 80301',
        location: { type: 'Point', coordinates: [-105.2705, 40.015] },
        specialty: 'Ethical & Compassionate Living',
        contact: [{ phone: '720-555-1003', email: 'coach@veganlife.com', instagram: '@veganlifecoach' }],
    },
];

// ── Sanctuaries ───────────────────────────────────────────────────────────────
// FIX: phone must be String
const sampleSanctuaries = [
    {
        sanctuaryName: 'Happy Hooves Farm Sanctuary',
        address: '999 Sanctuary Rd, Woodstock, NY 12498',
        location: { type: 'Point', coordinates: [-74.1181, 42.0409] },
        image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600',
        typeofSanctuary: 'Farm Animal Sanctuary',
        capacity: 150,
        caretakers: ['Jane Smith', 'Bob Wilson', 'Maria Garcia'],
        contact: [{ phone: '845-555-0999', email: 'info@happyhooves.org', instagram: '@happyhooves' }],
        animals: [
            {
                animalName: 'Betsy',
                specie: 'Cow',
                age: 8,
                gender: 'Female',
                habitat: 'Pasture',
                diet: ['Grass', 'Hay', 'Vegetables'],
                image: 'https://images.unsplash.com/photo-1516467508483-a7212febe31a?w=300',
                rescued: true,
                rescueDate: new Date('2016-05-10'),
                healthStatus: 'Excellent',
                description: 'Betsy was rescued from a dairy farm and loves belly rubs.',
            },
            {
                animalName: 'Wilbur',
                specie: 'Pig',
                age: 4,
                gender: 'Male',
                habitat: 'Barn with outdoor access',
                diet: ['Vegetables', 'Fruits', 'Grains'],
                image: 'https://images.unsplash.com/photo-1516467508483-a7212febe31a?w=300',
                rescued: true,
                rescueDate: new Date('2020-08-22'),
                healthStatus: 'Good',
                description: 'Wilbur was saved from a factory farm and enjoys mud baths.',
            },
            {
                animalName: 'Eleanor',
                specie: 'Chicken',
                age: 2,
                gender: 'Female',
                habitat: 'Free range coop',
                diet: ['Seeds', 'Insects', 'Greens'],
                rescued: true,
                rescueDate: new Date('2023-02-14'),
                healthStatus: 'Good',
                description: 'Eleanor loves exploring the yard and sunbathing.',
            },
        ],
    },
    {
        sanctuaryName: 'Peaceful Paws Sanctuary',
        address: '55 Forest Way, Sebastopol, CA 95472',
        location: { type: 'Point', coordinates: [-122.8258, 38.4021] },
        image: 'https://images.unsplash.com/photo-1444464666168-49d633b86797?w=600',
        typeofSanctuary: 'Wildlife & Domestic Sanctuary',
        capacity: 80,
        caretakers: ['Anna Lee', 'Carlos Rivera'],
        contact: [{ phone: '707-555-0055', email: 'contact@peacefulpaws.org', facebook: 'peacefulpawssanctuary' }],
        animals: [
            {
                animalName: 'Luna',
                specie: 'Goat',
                age: 3,
                gender: 'Female',
                diet: ['Hay', 'Shrubs', 'Vegetables'],
                rescued: true,
                rescueDate: new Date('2022-11-01'),
                healthStatus: 'Excellent',
                description: 'Luna is very social and loves climbing everything.',
            },
            {
                animalName: 'Milo',
                specie: 'Duck',
                age: 1,
                gender: 'Male',
                diet: ['Aquatic plants', 'Seeds', 'Insects'],
                rescued: true,
                rescueDate: new Date('2024-04-05'),
                healthStatus: 'Good',
                description: 'Milo waddles everywhere and loves the pond.',
            },
        ],
    },
];

// ── Posts ─────────────────────────────────────────────────────────────────────
const samplePosts = [
    {
        text: 'Just tried the new jackfruit tacos at Karma Kitchen in Austin – absolutely mind-blowing! 🌮 Who else is obsessed with jackfruit as a meat substitute?',
        name: 'Maria Vegan',
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
        likes: [],
        comments: [],
    },
    {
        text: 'Made the Rainbow Buddha Bowl recipe from this app and it was a huge hit at our dinner party! My non-vegan friends were completely amazed. Proof that plant-based food is for everyone. 🌈🥗',
        name: 'Chef Sarah',
        avatar: 'https://images.unsplash.com/photo-1494790108755-2616b332c789?w=150',
        likes: [],
        comments: [],
    },
    {
        text: 'Visited Happy Hooves Farm Sanctuary this weekend and I am not okay (in the best way). Betsy the cow gave me the biggest eyes when I scratched her ears. If you want to reconnect with why this lifestyle matters, visit a sanctuary. 🐄❤️',
        name: 'Dr. Green',
        avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150',
        likes: [],
        comments: [],
    },
    {
        text: "PSA: The Organic Oasis Market in Seattle just got a new shipment of rare mushroom varieties – lion's mane, maitake, and king trumpet. First come first served! 🍄",
        name: 'Admin',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
        likes: [],
        comments: [],
    },
    {
        text: 'As a plant-based doctor I can say with confidence: a well-planned vegan diet can meet ALL your nutritional needs. The research is clear. Happy to answer questions! 🌿',
        name: 'Dr. Green',
        avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150',
        likes: [],
        comments: [],
    },
];

// ── DB cleanup ────────────────────────────────────────────────────────────────
const cleanDatabase = async () => {
    const collections = await mongoose.connection.db?.listCollections().toArray();
    if (!collections || collections.length === 0) {
        console.log('   No existing collections to drop.');
        return;
    }
    console.log('Dropping existing collections...');
    for (const col of collections) {
        await mongoose.connection.db?.dropCollection(col.name).catch(() => {
            /* ignore */
        });
        console.log(`   Dropped: ${col.name}`);
    }
};

// ── Main seed function ────────────────────────────────────────────────────────
export const seedDatabase = async () => {
    await connectDB();
    console.log('\nConnected to MongoDB\n');

    await cleanDatabase();

    // Users
    console.log('Creating users...');
    const hashedUsers = await Promise.all(
        sampleUsers.map(async u => ({ ...u, password: await bcrypt.hash(u.password, 12) }))
    );
    const createdUsers = await User.insertMany(hashedUsers);
    const adminUser = createdUsers.find(u => u.username === 'admin')!;
    const chefUser = createdUsers.find(u => u.username === 'chef_sarah')!;
    const doctorUser = createdUsers.find(u => u.username === 'dr_green')!;
    const ownerUser = createdUsers.find(u => u.username === 'restaurant_owner')!;
    const mariaUser = createdUsers.find(u => u.username === 'maria_vegan')!;
    console.log(`  Created ${createdUsers.length} users`);

    // Restaurants
    console.log('Creating restaurants...');
    const createdRestaurants = await Restaurant.insertMany(
        sampleRestaurants.map(r => ({ ...r, author: ownerUser._id }))
    );
    console.log(`  Created ${createdRestaurants.length} restaurants`);

    // Recipes
    console.log('Creating recipes...');
    const createdRecipes = await Recipe.insertMany(sampleRecipes.map(r => ({ ...r, author: chefUser._id })));
    console.log(`  Created ${createdRecipes.length} recipes`);

    // Doctors
    console.log('Creating doctors...');
    const createdDoctors = await Doctor.insertMany(sampleDoctors.map(d => ({ ...d, author: doctorUser._id })));
    console.log(`  Created ${createdDoctors.length} doctors`);

    // Markets
    console.log('Creating markets...');
    const createdMarkets = await Market.insertMany(sampleMarkets.map(m => ({ ...m, author: adminUser._id })));
    console.log(`  Created ${createdMarkets.length} markets`);

    // Businesses
    console.log('Creating businesses...');
    const createdBusinesses = await Business.insertMany(sampleBusinesses.map(b => ({ ...b, author: adminUser._id })));
    console.log(`  Created ${createdBusinesses.length} businesses`);

    // Professions
    console.log('Creating professions...');
    const createdProfessions = await Profession.insertMany(
        sampleProfessions.map(p => ({ ...p, author: adminUser._id }))
    );
    console.log(`  Created ${createdProfessions.length} professions`);

    // Sanctuaries
    console.log('Creating sanctuaries...');
    const createdSanctuaries = await Sanctuary.insertMany(
        sampleSanctuaries.map(s => ({ ...s, author: adminUser._id }))
    );
    console.log(`  Created ${createdSanctuaries.length} sanctuaries`);

    // Posts
    console.log('Creating posts...');
    const postAuthors = [mariaUser, chefUser, doctorUser, adminUser, doctorUser];
    const createdPosts = await Post.insertMany(samplePosts.map((p, i) => ({ ...p, username: postAuthors[i]!._id })));
    console.log(`  Created ${createdPosts.length} posts`);

    // Reviews – FIX: entityType + entity are required (polymorphic ref)
    console.log('Creating reviews...');
    const reviewsData = [
        // Restaurant reviews
        {
            title: 'Best vegan spot in Portland',
            content:
                'Green Garden Bistro blew me away. The cashew-based sauces are so rich and flavorful you forget there is no dairy. The atmosphere is warm and the staff genuinely passionate about what they serve.',
            rating: 5,
            author: chefUser._id,
            entityType: 'Restaurant' as const,
            entity: createdRestaurants[0]!._id,
            recommendedDishes: ['Cashew Alfredo', 'Raw Tacos'],
            tags: ['vegan', 'cozy', 'must-try'],
            visitDate: new Date('2024-11-15'),
        },
        {
            title: 'Great plant-based fast food',
            content:
                'Plant Power Kitchen delivers exactly what it promises: fast, affordable and delicious plant-based food. The Beyond Burger is juicy and the loaded fries are dangerously addictive.',
            rating: 4,
            author: adminUser._id,
            entityType: 'Restaurant' as const,
            entity: createdRestaurants[1]!._id,
            recommendedDishes: ['Beyond Burger', 'Loaded Fries'],
            tags: ['fast-food', 'affordable', 'vegan-burgers'],
            visitDate: new Date('2024-12-01'),
        },
        {
            title: 'Fine dining done right',
            content:
                'The Herbivore is in a league of its own. The tasting menu was a journey through creative plant-based cuisine – each course more impressive than the last. Perfect for anniversaries or celebrations.',
            rating: 5,
            author: ownerUser._id,
            entityType: 'Restaurant' as const,
            entity: createdRestaurants[2]!._id,
            recommendedDishes: ['Truffle Risotto', 'Beet Carpaccio', 'Dark Chocolate Tart'],
            tags: ['fine-dining', 'romantic', 'tasting-menu'],
            visitDate: new Date('2025-01-20'),
        },
        {
            title: 'Love this neighborhood gem',
            content:
                'Roots & Bowls in SF is my weekly ritual. The Buddha bowls are always fresh, colorful and filling. The tahini dressing is worth the trip alone.',
            rating: 5,
            author: mariaUser._id,
            entityType: 'Restaurant' as const,
            entity: createdRestaurants[3]!._id,
            recommendedDishes: ['Rainbow Bowl', 'Green Smoothie'],
            tags: ['healthy', 'fresh', 'local-fav'],
            visitDate: new Date('2025-02-10'),
        },
        // Recipe reviews
        {
            title: 'My family devoured this!',
            content:
                'Made the Cashew Alfredo for a dinner party of 8, including two die-hard meat eaters. Everyone asked for the recipe. Soaking the cashews overnight makes the sauce incredibly silky.',
            rating: 5,
            author: mariaUser._id,
            entityType: 'Recipe' as const,
            entity: createdRecipes[0]!._id,
            tags: ['easy-win', 'crowd-pleaser', 'comfort-food'],
            visitDate: new Date('2025-01-05'),
        },
        {
            title: 'My go-to meal prep',
            content:
                'The Buddha Bowl recipe is my Sunday meal prep staple. I batch-roast the chickpeas for the week and keep the dressing in a jar. Healthy, colorful and satisfying every time.',
            rating: 5,
            author: chefUser._id,
            entityType: 'Recipe' as const,
            entity: createdRecipes[1]!._id,
            tags: ['meal-prep', 'healthy', 'colorful'],
            visitDate: new Date('2025-02-01'),
        },
        // Doctor review
        {
            title: 'Life-changing consultation',
            content:
                'Dr. Sarah Green completely transformed my understanding of plant-based nutrition. She built a detailed meal plan for my athletic lifestyle and checked in regularly. My energy levels have never been higher.',
            rating: 5,
            author: mariaUser._id,
            entityType: 'Doctor' as const,
            entity: createdDoctors[0]!._id,
            tags: ['professional', 'helpful', 'evidence-based'],
            visitDate: new Date('2025-01-15'),
        },
        // Market review
        {
            title: 'Best selection in Seattle',
            content:
                'Organic Oasis is the only grocery store I go to now. The produce is always fresh, the bulk section is incredible for reducing packaging waste, and the staff know their products inside out.',
            rating: 5,
            author: adminUser._id,
            entityType: 'Market' as const,
            entity: createdMarkets[0]!._id,
            tags: ['fresh', 'organic', 'zero-waste'],
            visitDate: new Date('2025-02-05'),
        },
        // Sanctuary review
        {
            title: 'A must-visit experience',
            content:
                'Happy Hooves was one of the most moving experiences of my life. Meeting Betsy and Wilbur face-to-face reaffirmed every reason I chose to go vegan. The caretakers are deeply dedicated and knowledgeable.',
            rating: 5,
            author: chefUser._id,
            entityType: 'Sanctuary' as const,
            entity: createdSanctuaries[0]!._id,
            tags: ['inspiring', 'education', 'animals'],
            visitDate: new Date('2025-01-25'),
        },
    ];

    const createdReviews = await Review.insertMany(reviewsData);
    console.log(`  Created ${createdReviews.length} reviews`);

    // Update rating/numReviews on restaurants with reviews
    const restaurantReviews = reviewsData.filter(r => r.entityType === 'Restaurant');
    for (const restaurant of createdRestaurants) {
        const related = restaurantReviews.filter(r => String(r.entity) === String(restaurant._id));
        if (related.length > 0) {
            const avg = related.reduce((sum, r) => sum + r.rating, 0) / related.length;
            await Restaurant.findByIdAndUpdate(restaurant._id, {
                rating: Math.round(avg * 10) / 10,
                numReviews: related.length,
            });
        }
    }

    console.log('\n✅ Database seeded successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`  👥 Users:        ${createdUsers.length}`);
    console.log(`  🍽️  Restaurants:  ${createdRestaurants.length}`);
    console.log(`  🥗 Recipes:      ${createdRecipes.length}`);
    console.log(`  👨‍⚕️  Doctors:      ${createdDoctors.length}`);
    console.log(`  🛒 Markets:      ${createdMarkets.length}`);
    console.log(`  🏢 Businesses:   ${createdBusinesses.length}`);
    console.log(`  💼 Professions:  ${createdProfessions.length}`);
    console.log(`  🐄 Sanctuaries:  ${createdSanctuaries.length}`);
    console.log(`  📝 Posts:        ${createdPosts.length}`);
    console.log(`  ⭐ Reviews:      ${createdReviews.length}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n🔑 Admin credentials:');
    console.log('   Email:    admin@veganguide.com');
    console.log(`   Password: ${process.env.ADMIN_PASSWORD ?? seedPassword}`);
    console.log('\n🌍 Cities: Portland, LA, NYC, SF, Austin, Seattle, Denver, Asheville,');
    console.log('           Chicago, Miami, Boulder, Woodstock, Sebastopol');
};

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    seedDatabase()
        .then(() => process.exit(0))
        .catch(err => {
            console.error('Seeding failed:', err);
            process.exit(1);
        });
}
