// MongoDB initialization script
// Runs inside mongosh (MongoDB Shell 1.0+) when the container is first created.
// process.env IS available in mongosh (built on Node.js/V8).
// Docker automatically creates the root user from MONGO_INITDB_ROOT_USERNAME /
// MONGO_INITDB_ROOT_PASSWORD — this script creates the application database user.

const dbName = process.env.MONGO_INITDB_DATABASE;
const appUser = process.env.MONGO_APP_USERNAME;
const appPassword = process.env.MONGO_APP_PASSWORD;

if (!dbName) throw new Error('MONGO_INITDB_DATABASE must be set');
if (!appUser) throw new Error('MONGO_APP_USERNAME must be set');
if (!appPassword) throw new Error('MONGO_APP_PASSWORD must be set');

db = db.getSiblingDB(dbName);

db.createUser({
    user: appUser,
    pwd: appPassword,
    roles: [{ role: 'readWrite', db: dbName }],
});

print('MongoDB initialization complete: database and user created.');
