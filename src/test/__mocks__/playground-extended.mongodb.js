/* global use, db */
// MongoDB Playground Extended - API Guide TypeScript Project
// Playground adicional con entidades específicas: Doctors, Markets, Recipes, Sanctuaries, Posts, etc.

// Seleccionar la base de datos de prueba
use('apiGuideTestDB');

// ============================================================================
// 1. INSERTAR DOCTORES DE PRUEBA
// ============================================================================
console.log('👨‍⚕️ Insertando doctores de prueba...');

const doctors = db.getCollection('doctors').insertMany([
    {
        doctorName: 'Dr. María González',
        author: ObjectId(), // Usar un ObjectId válido
        address: '100 Medical Center Dr, Miami, FL 33101',
        location: {
            type: 'Point',
            coordinates: [-80.1918, 25.7617],
        },
        image: 'https://example.com/dr-gonzalez.jpg',
        specialty: 'Cardiología',
        contact: [
            {
                phone: '+1-555-0100',
                email: 'dr.gonzalez@medical.com',
                facebook: 'https://facebook.com/drgonzalez',
                instagram: 'https://instagram.com/drgonzalez',
            },
        ],
        reviews: [],
        rating: 4.8,
        numReviews: 0,
        createdAt: new Date('2024-01-10T00:00:00Z'),
        updatedAt: new Date('2024-01-10T00:00:00Z'),
    },
    {
        doctorName: 'Dr. Carlos Rodríguez',
        author: ObjectId(),
        address: '200 Health Plaza, Houston, TX 77001',
        location: {
            type: 'Point',
            coordinates: [-95.3698, 29.7604],
        },
        image: 'https://example.com/dr-rodriguez.jpg',
        specialty: 'Dermatología',
        contact: [
            {
                phone: '+1-555-0200',
                email: 'dr.rodriguez@dermatology.com',
                facebook: 'https://facebook.com/drrodriguez',
                instagram: 'https://instagram.com/drrodriguez',
            },
        ],
        reviews: [],
        rating: 4.6,
        numReviews: 0,
        createdAt: new Date('2024-01-12T00:00:00Z'),
        updatedAt: new Date('2024-01-12T00:00:00Z'),
    },
]);

// ============================================================================
// 2. INSERTAR MERCADOS DE PRUEBA
// ============================================================================
console.log('🛒 Insertando mercados de prueba...');

const markets = db.getCollection('markets').insertMany([
    {
        marketName: 'Fresh Farmers Market',
        author: ObjectId(),
        address: '300 Market Street, Seattle, WA 98101',
        location: {
            type: 'Point',
            coordinates: [-122.3321, 47.6062],
        },
        image: 'https://example.com/fresh-market.jpg',
        typeMarket: 'farmers_market',
        reviews: [],
        rating: 4.4,
        numReviews: 0,
        createdAt: new Date('2024-01-14T00:00:00Z'),
        updatedAt: new Date('2024-01-14T00:00:00Z'),
    },
    {
        marketName: 'Organic Grocery Store',
        author: ObjectId(),
        address: '400 Organic Lane, Portland, OR 97201',
        location: {
            type: 'Point',
            coordinates: [-122.6765, 45.5152],
        },
        image: 'https://example.com/organic-grocery.jpg',
        typeMarket: 'grocery_store',
        reviews: [],
        rating: 4.7,
        numReviews: 0,
        createdAt: new Date('2024-01-16T00:00:00Z'),
        updatedAt: new Date('2024-01-16T00:00:00Z'),
    },
]);

// ============================================================================
// 3. INSERTAR RECETAS DE PRUEBA
// ============================================================================
console.log('👨‍🍳 Insertando recetas de prueba...');

const recipes = db.getCollection('recipes').insertMany([
    {
        title: 'Pasta Carbonara Tradicional',
        author: ObjectId(),
        description: 'Una receta clásica italiana de pasta carbonara con huevos, queso pecorino y panceta.',
        instructions:
            '1. Cocinar la pasta al dente\n2. Freír la panceta hasta que esté crujiente\n3. Mezclar con huevos y queso\n4. Combinar todo con la pasta caliente',
        ingredients: ['400g spaghetti', '200g panceta', '4 huevos', '100g queso pecorino', 'Pimienta negra', 'Sal'],
        typeDish: 'pasta',
        image: 'https://example.com/carbonara.jpg',
        cookingTime: 30,
        difficulty: 'intermedio',
        reviews: [],
        rating: 4.9,
        numReviews: 0,
        budget: '$$',
        createdAt: new Date('2024-01-18T00:00:00Z'),
        updatedAt: new Date('2024-01-18T00:00:00Z'),
    },
    {
        title: 'Sushi California Roll',
        author: ObjectId(),
        description: 'Roll de sushi californiano con cangrejo, aguacate y pepino.',
        instructions:
            '1. Preparar el arroz para sushi\n2. Colocar nori en el makisu\n3. Agregar arroz, cangrejo, aguacate y pepino\n4. Enrollar y cortar',
        ingredients: ['Arroz para sushi', 'Nori (alga marina)', 'Cangrejo', 'Aguacate', 'Pepino', 'Salsa de soja'],
        typeDish: 'sushi',
        image: 'https://example.com/california-roll.jpg',
        cookingTime: 45,
        difficulty: 'avanzado',
        reviews: [],
        rating: 4.7,
        numReviews: 0,
        budget: '$$$',
        createdAt: new Date('2024-01-20T00:00:00Z'),
        updatedAt: new Date('2024-01-20T00:00:00Z'),
    },
]);

// ============================================================================
// 4. INSERTAR SANTUARIOS DE PRUEBA
// ============================================================================
console.log('🦁 Insertando santuarios de prueba...');

const sanctuaries = db.getCollection('sanctuaries').insertMany([
    {
        sanctuaryName: 'Wildlife Rescue Center',
        author: ObjectId(),
        address: '500 Conservation Road, Austin, TX 73301',
        location: {
            type: 'Point',
            coordinates: [-97.7431, 30.2672],
        },
        image: 'https://example.com/wildlife-sanctuary.jpg',
        typeofSanctuary: 'wildlife_rescue',
        animals: [
            {
                type: 'Lion',
                count: 3,
                description: 'Leones rescatados de circos',
            },
            {
                type: 'Eagle',
                count: 8,
                description: 'Águilas heridas rehabilitadas',
            },
        ],
        capacity: 50,
        caretakers: ['Dr. Sarah Johnson', 'Mike Wilson'],
        contact: [
            {
                phone: '+1-555-0500',
                email: 'info@wildliferescue.org',
                facebook: 'https://facebook.com/wildliferescue',
                instagram: 'https://instagram.com/wildliferescue',
            },
        ],
        reviews: [],
        rating: 4.9,
        numReviews: 0,
        createdAt: new Date('2024-01-22T00:00:00Z'),
        updatedAt: new Date('2024-01-22T00:00:00Z'),
    },
    {
        sanctuaryName: 'Farm Animal Sanctuary',
        author: ObjectId(),
        address: '600 Farm Road, Denver, CO 80201',
        location: {
            type: 'Point',
            coordinates: [-104.9903, 39.7392],
        },
        image: 'https://example.com/farm-sanctuary.jpg',
        typeofSanctuary: 'farm_animal',
        animals: [
            {
                type: 'Cow',
                count: 15,
                description: 'Vacas rescatadas de granjas industriales',
            },
            {
                type: 'Pig',
                count: 12,
                description: 'Cerdos rescatados de mataderos',
            },
        ],
        capacity: 100,
        caretakers: ['Emma Davis', 'Tom Brown'],
        contact: [
            {
                phone: '+1-555-0600',
                email: 'info@farmsanctuary.org',
                facebook: 'https://facebook.com/farmsanctuary',
                instagram: 'https://instagram.com/farmsanctuary',
            },
        ],
        reviews: [],
        rating: 4.8,
        numReviews: 0,
        createdAt: new Date('2024-01-24T00:00:00Z'),
        updatedAt: new Date('2024-01-24T00:00:00Z'),
    },
]);

// ============================================================================
// 5. INSERTAR POSTS DE PRUEBA
// ============================================================================
console.log('📝 Insertando posts de prueba...');

const posts = db.getCollection('posts').insertMany([
    {
        username: ObjectId(),
        text: '¡Acabo de descubrir el mejor restaurante italiano en la ciudad! La pasta carbonara es increíble.',
        name: 'Ana García',
        avatar: 'https://example.com/ana-avatar.jpg',
        likes: [{ username: ObjectId() }, { username: ObjectId() }],
        comments: [
            {
                id: '1',
                username: ObjectId(),
                text: '¡Suena delicioso! ¿Cuál es el nombre del restaurante?',
                name: 'Carlos López',
                avatar: 'https://example.com/carlos-avatar.jpg',
                date: new Date('2024-02-01T10:30:00Z'),
            },
        ],
        date: new Date('2024-02-01T09:00:00Z'),
    },
    {
        username: ObjectId(),
        text: 'Receta casera de sushi que hice hoy. ¡Quedó perfecto! 🍣',
        name: 'Miguel Torres',
        avatar: 'https://example.com/miguel-avatar.jpg',
        likes: [{ username: ObjectId() }, { username: ObjectId() }, { username: ObjectId() }],
        comments: [
            {
                id: '2',
                username: ObjectId(),
                text: '¡Se ve increíble! ¿Puedes compartir la receta?',
                name: 'Laura Martínez',
                avatar: 'https://example.com/laura-avatar.jpg',
                date: new Date('2024-02-01T11:15:00Z'),
            },
        ],
        date: new Date('2024-02-01T08:30:00Z'),
    },
]);

// ============================================================================
// 6. INSERTAR PROFESIONES DE PRUEBA
// ============================================================================
console.log('💼 Insertando profesiones de prueba...');

const professions = db.getCollection('professions').insertMany([
    {
        professionName: 'Desarrollador Full Stack',
        author: ObjectId(),
        address: '700 Tech Street, San Francisco, CA 94102',
        location: {
            type: 'Point',
            coordinates: [-122.4194, 37.7749],
        },
        specialty: 'Desarrollo Web',
        contact: [
            {
                phone: '+1-555-0700',
                email: 'dev@techcompany.com',
                facebook: 'https://facebook.com/techdev',
                instagram: 'https://instagram.com/techdev',
            },
        ],
        reviews: [],
        rating: 4.6,
        numReviews: 0,
        createdAt: new Date('2024-01-26T00:00:00Z'),
        updatedAt: new Date('2024-01-26T00:00:00Z'),
    },
    {
        professionName: 'Diseñador UX/UI',
        author: ObjectId(),
        address: '800 Design Avenue, New York, NY 10001',
        location: {
            type: 'Point',
            coordinates: [-74.006, 40.7128],
        },
        specialty: 'Diseño de Interfaces',
        contact: [
            {
                phone: '+1-555-0800',
                email: 'designer@creative.com',
                facebook: 'https://facebook.com/uxdesigner',
                instagram: 'https://instagram.com/uxdesigner',
            },
        ],
        reviews: [],
        rating: 4.8,
        numReviews: 0,
        createdAt: new Date('2024-01-28T00:00:00Z'),
        updatedAt: new Date('2024-01-28T00:00:00Z'),
    },
]);

// ============================================================================
// 7. CONSULTAS ESPECÍFICAS POR ENTIDAD
// ============================================================================
console.log('🔍 Ejecutando consultas específicas...');

// Buscar doctores por especialidad
const cardiologists = db.getCollection('doctors').find({ specialty: 'Cardiología' });

console.log('❤️ Cardiólogos:');
cardiologists.forEach(doctor => {
    console.log(`  ${doctor.doctorName}: ${doctor.rating}⭐ - ${doctor.address}`);
});

// Buscar mercados por tipo
const farmersMarkets = db.getCollection('markets').find({ typeMarket: 'farmers_market' });

console.log('\n🌾 Mercados de agricultores:');
farmersMarkets.forEach(market => {
    console.log(`  ${market.marketName}: ${market.rating}⭐ - ${market.address}`);
});

// Buscar recetas por dificultad
const easyRecipes = db.getCollection('recipes').find({ difficulty: 'intermedio' }).sort({ rating: -1 });

console.log('\n👨‍🍳 Recetas de dificultad intermedia:');
easyRecipes.forEach(recipe => {
    console.log(`  ${recipe.title}: ${recipe.rating}⭐ - ${recipe.cookingTime}min`);
});

// Buscar santuarios por tipo de animal
const wildlifeSanctuaries = db.getCollection('sanctuaries').find({ 'animals.type': 'Lion' });

console.log('\n🦁 Santuarios con leones:');
wildlifeSanctuaries.forEach(sanctuary => {
    console.log(`  ${sanctuary.sanctuaryName}: ${sanctuary.rating}⭐ - ${sanctuary.capacity} capacidad`);
});

// Buscar posts con más likes
const popularPosts = db.getCollection('posts').find({}).sort({ 'likes.length': -1 }).limit(3);

console.log('\n🔥 Posts más populares:');
popularPosts.forEach(post => {
    console.log(`  "${post.text.substring(0, 50)}..." - ${post.likes.length} likes`);
});

// ============================================================================
// 8. CONSULTAS DE AGREGACIÓN AVANZADAS
// ============================================================================
console.log('\n📊 Consultas de agregación avanzadas...');

// Rating promedio por tipo de entidad
const avgRatingsByType = db.getCollection('restaurants').aggregate([
    {
        $group: {
            _id: '$cuisine',
            avgRating: { $avg: '$rating' },
            count: { $sum: 1 },
        },
    },
    {
        $sort: { avgRating: -1 },
    },
]);

console.log('🍽️ Rating promedio por tipo de cocina:');
avgRatingsByType.forEach(result => {
    console.log(`  ${result._id.join(', ')}: ${result.avgRating.toFixed(1)}⭐ (${result.count} restaurantes)`);
});

// Estadísticas de recetas por dificultad
const recipeStats = db.getCollection('recipes').aggregate([
    {
        $group: {
            _id: '$difficulty',
            avgRating: { $avg: '$rating' },
            avgCookingTime: { $avg: '$cookingTime' },
            count: { $sum: 1 },
        },
    },
]);

console.log('\n👨‍🍳 Estadísticas de recetas por dificultad:');
recipeStats.forEach(stat => {
    console.log(
        `  ${stat._id}: ${stat.avgRating.toFixed(1)}⭐, ${stat.avgCookingTime.toFixed(0)}min promedio (${stat.count} recetas)`
    );
});

// ============================================================================
// 9. ESTADÍSTICAS FINALES EXTENDIDAS
// ============================================================================
console.log('\n📈 Estadísticas finales extendidas:');

const extendedStats = {
    doctors: db.getCollection('doctors').countDocuments(),
    markets: db.getCollection('markets').countDocuments(),
    recipes: db.getCollection('recipes').countDocuments(),
    sanctuaries: db.getCollection('sanctuaries').countDocuments(),
    posts: db.getCollection('posts').countDocuments(),
    professions: db.getCollection('professions').countDocuments(),
};

console.log(`  👨‍⚕️ Doctores: ${extendedStats.doctors}`);
console.log(`  🛒 Mercados: ${extendedStats.markets}`);
console.log(`  👨‍🍳 Recetas: ${extendedStats.recipes}`);
console.log(`  🦁 Santuarios: ${extendedStats.sanctuaries}`);
console.log(`  📝 Posts: ${extendedStats.posts}`);
console.log(`  💼 Profesiones: ${extendedStats.professions}`);

// Calcular rating promedio general
const allCollections = ['doctors', 'markets', 'recipes', 'sanctuaries', 'professions'];
let totalRating = 0;
let totalCount = 0;

allCollections.forEach(collection => {
    const avgRating = db.getCollection(collection).aggregate([
        {
            $group: {
                _id: null,
                avgRating: { $avg: '$rating' },
            },
        },
    ]);

    const result = avgRating.next();
    if (result) {
        totalRating += result.avgRating;
        totalCount++;
    }
});

if (totalCount > 0) {
    console.log(`  📊 Rating promedio general: ${(totalRating / totalCount).toFixed(1)}⭐`);
}

console.log('\n✅ Playground extendido completado exitosamente!');
console.log('💡 Este playground incluye todas las entidades principales de tu API.');
console.log('🔧 Puedes usar estas consultas para probar funcionalidades específicas de cada entidad.');
