// MongoDB initialization script
// This script runs when the MongoDB container is first created
// It creates the application database and a dedicated user

db = db.getSiblingDB(process.env.MONGO_INITDB_DATABASE || 'vegan-city-guide');

db.createUser({
    user: process.env.MONGO_INITDB_ROOT_USERNAME || 'admin',
    pwd: process.env.MONGO_INITDB_ROOT_PASSWORD || 'admin',
    roles: [
        { role: 'readWrite', db: process.env.MONGO_INITDB_DATABASE || 'vegan-city-guide' },
    ],
});

print('MongoDB initialization complete: database and user created.');
