# Database Seeding Guide 🌱

This guide explains how to populate your Vegan Guide database with sample data for testing the frontend application.

## Quick Start

### 1. Prerequisites
- MongoDB running locally or connection string configured
- Backend API dependencies installed (`npm install`)
- Environment variables configured (`.env` file)

### 2. Run the Unified Seeder

```bash
# Development (using ts-node) - ONE COMMAND DOES EVERYTHING
npm run seed

# Production (requires build first)
npm run build
npm run seed:prod

# Check database status (optional)
npm run db:check
```

**The seed script automatically:**
- 🧹 Cleans existing database completely
- 📊 Creates all sample data
- 🔗 Sets up proper relationships
- ✅ Provides confirmation of success

## What Gets Created

The seeder creates comprehensive sample data across all resources:

### 👥 **Users (4 total)**
- **Admin User** - Full admin privileges
- **Chef Sarah** - Recipe creator  
- **Dr. Green** - Medical professional
- **Restaurant Owner** - Business owner

### 🍽️ **Restaurants (3 total)**
- **Green Garden Bistro** (Portland) - Mediterranean, Organic
- **Plant Power Kitchen** (Los Angeles) - Fast Casual
- **The Herbivore** (New York) - Fine Dining

### 🥗 **Recipes (3 total)**
- **Creamy Cashew Alfredo Pasta** - Medium difficulty
- **Rainbow Buddha Bowl** - Easy, nutritious
- **Chocolate Avocado Mousse** - Easy dessert

### 👨‍⚕️ **Doctors (2 total)**
- **Dr. Sarah Green** (San Francisco) - Plant-Based Nutrition
- **Dr. Michael Plant** (Austin) - Integrative Medicine

### 🛒 **Markets (2 total)**
- **Organic Oasis Market** (Seattle) - Grocery store
- **Green Valley Supermarket** (Denver) - Supermarket

### 🏢 **Businesses (2 total)**
- **Vegan Supply Co.** (Chicago) - Retail store
- **Plant-Based Consulting** (Miami) - Consulting

### 💼 **Professions (2 total)**
- **Vegan Chef** - Culinary arts category
- **Plant-Based Nutritionist** - Healthcare category

### 🐄 **Sanctuaries (1 total)**
- **Happy Hooves Farm Sanctuary** (Woodstock, NY)
  - Includes animals: Betsy (cow), Wilbur (pig)

### ⭐ **Reviews (3 total)**
- Sample reviews across restaurants, recipes, and doctors

## Login Credentials

After seeding, you can log in with these credentials:

### Admin Account
```
Email: admin@veganguide.com
Password: Admin123!
```

### Other Test Accounts
```
Chef Sarah:
Email: sarah@veganrecipes.com
Password: Chef123!

Dr. Green:
Email: drgreen@healthyvegan.com
Password: Doctor123!

Restaurant Owner:
Email: owner@veganplace.com
Password: Owner123!
```

## Geographic Coverage

Sample data includes locations across major US cities:
- **West Coast**: Portland, Los Angeles, San Francisco, Seattle
- **East Coast**: New York, Miami, Woodstock NY  
- **Central**: Austin, Denver, Chicago

All locations include proper geocoordinates for map functionality.

## Data Features

### 🗺️ **Geospatial Data**
- All location-based resources include proper coordinates
- Data spread across different US regions
- Compatible with map/location search features

### 📸 **Images**
- High-quality Unsplash images for all visual content
- Consistent image sizing (400px width)
- Professional food, business, and people photography

### 📝 **Rich Content**
- Detailed descriptions and instructions
- Realistic contact information
- Varied difficulty levels and categories

### 🔗 **Relationships**
- Proper author references linking users to their content
- Reviews connected to specific resources
- Professional profiles linked to professions

## Customization

To modify the seed data:

1. Edit `/src/scripts/seedData.ts`
2. Update the sample data arrays
3. Run the unified seeder

```bash
npm run seed
```

The script automatically cleans the database and creates fresh data every time.

## Troubleshooting

### Common Issues

**MongoDB Connection Error**
```bash
Error: MongoNetworkError
```
- Ensure MongoDB is running
- Check MONGODB_URI in .env file
- Verify network connectivity

**Missing Dependencies**
```bash
Cannot find module 'bcryptjs'
```
- Run `npm install` to install dependencies

**Permission Errors**
```bash
Error: EACCES permission denied
```
- Check file permissions
- Run with appropriate user privileges

### Reset Database

To completely reset and reseed:

```bash
# One command cleans and reseeds everything
npm run seed
```

## Production Notes

- Never run seeder scripts in production with real user data
- Use environment-specific databases
- Consider using different image URLs for production
- Update contact information to real values

## Next Steps

After seeding:

1. **Start the backend**: `npm run dev`
2. **Start the frontend**: `cd ../vegan-guide-platform && npm run dev`
3. **Test login** with admin credentials
4. **Explore features** with populated data
5. **Test API endpoints** at `http://localhost:5001/api-docs`

Happy testing! 🌱✨