/* global use, db */
// MongoDB Playground - API Guide TypeScript Project
// Este playground está adaptado específicamente para el proyecto de API con entidades:
// Users, Businesses, Restaurants, Reviews, Doctors, Markets, Recipes, Sanctuaries, etc.

// Seleccionar la base de datos de prueba
use('apiGuideTestDB');

// ============================================================================
// 1. LIMPIAR COLECCIONES EXISTENTES
// ============================================================================
console.log('🧹 Limpiando colecciones existentes...');

db.getCollection('users').deleteMany({});
db.getCollection('businesses').deleteMany({});
db.getCollection('restaurants').deleteMany({});
db.getCollection('reviews').deleteMany({});
db.getCollection('doctors').deleteMany({});
db.getCollection('markets').deleteMany({});
db.getCollection('recipes').deleteMany({});
db.getCollection('sanctuaries').deleteMany({});
db.getCollection('posts').deleteMany({});
db.getCollection('professions').deleteMany({});
db.getCollection('professionprofiles').deleteMany({});

// ============================================================================
// 2. INSERTAR USUARIOS DE PRUEBA
// ============================================================================
console.log('👥 Insertando usuarios de prueba...');

const users = db.getCollection('users').insertMany([
    {
        username: 'admin_user',
        email: 'admin@example.com',
        password: '$2a$10$hashedPassword123', // bcrypt hash
        role: 'admin',
        isAdmin: true,
        isActive: true,
        isDeleted: false,
        photo: 'https://res.cloudinary.com/dzqbzqgjm/image/upload/v1599098981/default-user_qjqjqz.png',
        firstName: 'Admin',
        lastName: 'User',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
    },
    {
        username: 'business_owner',
        email: 'business@example.com',
        password: '$2a$10$hashedPassword456',
        role: 'professional',
        isAdmin: false,
        isActive: true,
        isDeleted: false,
        photo: 'https://res.cloudinary.com/dzqbzqgjm/image/upload/v1599098981/default-user_qjqjqz.png',
        firstName: 'Business',
        lastName: 'Owner',
        createdAt: new Date('2024-01-02T00:00:00Z'),
        updatedAt: new Date('2024-01-02T00:00:00Z'),
    },
    {
        username: 'regular_user',
        email: 'user@example.com',
        password: '$2a$10$hashedPassword789',
        role: 'user',
        isAdmin: false,
        isActive: true,
        isDeleted: false,
        photo: 'https://res.cloudinary.com/dzqbzqgjm/image/upload/v1599098981/default-user_qjqjqz.png',
        firstName: 'Regular',
        lastName: 'User',
        createdAt: new Date('2024-01-03T00:00:00Z'),
        updatedAt: new Date('2024-01-03T00:00:00Z'),
    },
]);

const adminUserId = users.insertedIds[0];
const businessOwnerId = users.insertedIds[1];
const regularUserId = users.insertedIds[2];

// ============================================================================
// 3. INSERTAR NEGOCIOS DE PRUEBA
// ============================================================================
console.log('🏢 Insertando negocios de prueba...');

const businesses = db.getCollection('businesses').insertMany([
    {
        namePlace: 'Tech Solutions Inc',
        author: adminUserId,
        address: '123 Main Street, New York, NY 10001',
        location: {
            type: 'Point',
            coordinates: [-74.006, 40.7128],
        },
        image: 'https://example.com/tech-solutions.jpg',
        contact: [
            {
                phone: '+1-555-0123',
                email: 'contact@techsolutions.com',
                facebook: 'https://facebook.com/techsolutions',
                instagram: 'https://instagram.com/techsolutions',
            },
        ],
        budget: 5000,
        typeBusiness: 'technology',
        hours: [
            {
                dayOfWeek: 'Monday',
                openTime: '09:00',
                closeTime: '18:00',
            },
            {
                dayOfWeek: 'Tuesday',
                openTime: '09:00',
                closeTime: '18:00',
            },
        ],
        reviews: [],
        rating: 4.5,
        numReviews: 0,
        createdAt: new Date('2024-01-15T00:00:00Z'),
        updatedAt: new Date('2024-01-15T00:00:00Z'),
    },
    {
        namePlace: 'Green Market',
        author: businessOwnerId,
        address: '456 Oak Avenue, Los Angeles, CA 90210',
        location: {
            type: 'Point',
            coordinates: [-118.2437, 34.0522],
        },
        image: 'https://example.com/green-market.jpg',
        contact: [
            {
                phone: '+1-555-0456',
                email: 'info@greenmarket.com',
                facebook: 'https://facebook.com/greenmarket',
                instagram: 'https://instagram.com/greenmarket',
            },
        ],
        budget: 3000,
        typeBusiness: 'retail',
        hours: [
            {
                dayOfWeek: 'Monday',
                openTime: '08:00',
                closeTime: '20:00',
            },
        ],
        reviews: [],
        rating: 4.2,
        numReviews: 0,
        createdAt: new Date('2024-01-20T00:00:00Z'),
        updatedAt: new Date('2024-01-20T00:00:00Z'),
    },
]);

const business1Id = businesses.insertedIds[0];
const business2Id = businesses.insertedIds[1];

// ============================================================================
// 4. INSERTAR RESTAURANTES DE PRUEBA
// ============================================================================
console.log('🍽️ Insertando restaurantes de prueba...');

const restaurants = db.getCollection('restaurants').insertMany([
    {
        restaurantName: 'La Trattoria',
        author: businessOwnerId,
        typePlace: 'restaurant',
        address: '789 Pine Street, Chicago, IL 60601',
        location: {
            type: 'Point',
            coordinates: [-87.6298, 41.8781],
        },
        image: 'https://example.com/la-trattoria.jpg',
        budget: '$$',
        contact: [
            {
                phone: '+1-555-0789',
                facebook: 'https://facebook.com/latrattoria',
                instagram: 'https://instagram.com/latrattoria',
            },
        ],
        cuisine: ['Italian', 'Mediterranean'],
        reviews: [],
        rating: 4.7,
        numReviews: 0,
        createdAt: new Date('2024-01-25T00:00:00Z'),
        updatedAt: new Date('2024-01-25T00:00:00Z'),
    },
    {
        restaurantName: 'Sushi Master',
        author: adminUserId,
        typePlace: 'restaurant',
        address: '321 Elm Street, San Francisco, CA 94102',
        location: {
            type: 'Point',
            coordinates: [-122.4194, 37.7749],
        },
        image: 'https://example.com/sushi-master.jpg',
        budget: '$$$',
        contact: [
            {
                phone: '+1-555-0321',
                facebook: 'https://facebook.com/sushimaster',
                instagram: 'https://instagram.com/sushimaster',
            },
        ],
        cuisine: ['Japanese', 'Sushi'],
        reviews: [],
        rating: 4.9,
        numReviews: 0,
        createdAt: new Date('2024-01-30T00:00:00Z'),
        updatedAt: new Date('2024-01-30T00:00:00Z'),
    },
]);

const restaurant1Id = restaurants.insertedIds[0];
const restaurant2Id = restaurants.insertedIds[1];

// ============================================================================
// 5. INSERTAR RESEÑAS DE PRUEBA
// ============================================================================
console.log('⭐ Insertando reseñas de prueba...');

const reviews = db.getCollection('reviews').insertMany([
    {
        rating: 5,
        title: 'Excelente experiencia gastronómica',
        content: 'La comida fue increíble, el servicio muy profesional y el ambiente perfecto para una cena romántica.',
        visitDate: new Date('2024-02-01T00:00:00Z'),
        recommendedDishes: ['Pasta Carbonara', 'Tiramisú'],
        tags: ['romántico', 'italiano', 'pasta'],
        author: regularUserId,
        restaurant: restaurant1Id,
        helpfulCount: 3,
        helpfulVotes: [adminUserId, businessOwnerId],
        createdAt: new Date('2024-02-01T00:00:00Z'),
        updatedAt: new Date('2024-02-01T00:00:00Z'),
    },
    {
        rating: 4,
        title: 'Sushi fresco y delicioso',
        content: 'El sushi estaba muy fresco y bien preparado. El chef es muy talentoso.',
        visitDate: new Date('2024-02-05T00:00:00Z'),
        recommendedDishes: ['Salmón Nigiri', 'Maki California'],
        tags: ['fresco', 'japonés', 'sushi'],
        author: businessOwnerId,
        restaurant: restaurant2Id,
        helpfulCount: 1,
        helpfulVotes: [regularUserId],
        createdAt: new Date('2024-02-05T00:00:00Z'),
        updatedAt: new Date('2024-02-05T00:00:00Z'),
    },
]);

// ============================================================================
// 6. CONSULTAS DE DEMOSTRACIÓN
// ============================================================================
console.log('🔍 Ejecutando consultas de demostración...');

// Contar usuarios por rol
const userStats = db.getCollection('users').aggregate([
    {
        $group: {
            _id: '$role',
            count: { $sum: 1 },
            users: { $push: '$username' },
        },
    },
]);

console.log('📊 Estadísticas de usuarios por rol:');
userStats.forEach(stat => {
    console.log(`  ${stat._id}: ${stat.count} usuarios (${stat.users.join(', ')})`);
});

// Buscar restaurantes con rating alto
const topRestaurants = db
    .getCollection('restaurants')
    .find({ rating: { $gte: 4.5 } })
    .sort({ rating: -1 })
    .limit(5);

console.log('\n🏆 Top restaurantes (rating >= 4.5):');
topRestaurants.forEach(restaurant => {
    console.log(`  ${restaurant.restaurantName}: ${restaurant.rating}⭐ (${restaurant.cuisine.join(', ')})`);
});

// Buscar negocios por tipo
const techBusinesses = db.getCollection('businesses').find({ typeBusiness: 'technology' });

console.log('\n💻 Negocios de tecnología:');
techBusinesses.forEach(business => {
    console.log(`  ${business.namePlace}: $${business.budget} - ${business.address}`);
});

// Buscar reseñas recientes
const recentReviews = db
    .getCollection('reviews')
    .find({ visitDate: { $gte: new Date('2024-02-01') } })
    .sort({ visitDate: -1 })
    .limit(3);

console.log('\n📝 Reseñas recientes (desde Feb 2024):');
recentReviews.forEach(review => {
    console.log(`  "${review.title}" - ${review.rating}⭐ - ${review.visitDate.toDateString()}`);
});

// ============================================================================
// 7. CONSULTAS GEOESPACIALES
// ============================================================================
console.log('\n🌍 Consultas geoespaciales...');

// Buscar restaurantes cerca de Nueva York (dentro de 50km)
const restaurantsNearNYC = db.getCollection('restaurants').find({
    location: {
        $near: {
            $geometry: {
                type: 'Point',
                coordinates: [-74.006, 40.7128],
            },
            $maxDistance: 50000, // 50km
        },
    },
});

console.log('📍 Restaurantes cerca de NYC (50km):');
restaurantsNearNYC.forEach(restaurant => {
    console.log(`  ${restaurant.restaurantName}: ${restaurant.address}`);
});

// ============================================================================
// 8. ESTADÍSTICAS FINALES
// ============================================================================
console.log('\n📈 Estadísticas finales de la base de datos:');

const stats = {
    users: db.getCollection('users').countDocuments(),
    businesses: db.getCollection('businesses').countDocuments(),
    restaurants: db.getCollection('restaurants').countDocuments(),
    reviews: db.getCollection('reviews').countDocuments(),
};

console.log(`  👥 Usuarios: ${stats.users}`);
console.log(`  🏢 Negocios: ${stats.businesses}`);
console.log(`  🍽️ Restaurantes: ${stats.restaurants}`);
console.log(`  ⭐ Reseñas: ${stats.reviews}`);

// Calcular rating promedio de restaurantes
const avgRating = db.getCollection('restaurants').aggregate([
    {
        $group: {
            _id: null,
            averageRating: { $avg: '$rating' },
        },
    },
]);

const avgRatingResult = avgRating.next();
if (avgRatingResult) {
    console.log(`  📊 Rating promedio de restaurantes: ${avgRatingResult.averageRating.toFixed(1)}⭐`);
}

console.log('\n✅ Playground completado exitosamente!');
console.log('💡 Puedes usar estas consultas como base para tus tests de integración.');
