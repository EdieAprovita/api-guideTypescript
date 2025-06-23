import dotenv from 'dotenv';
import connectDB from '../config/db';
import { User } from '../models/User';
import { Restaurant } from '../models/Restaurant';
import { Recipe } from '../models/Recipe';
import { Doctor } from '../models/Doctor';
import { Market } from '../models/Market';
import { Business } from '../models/Business';
import { Profession } from '../models/Profession';
import { Sanctuary } from '../models/Sanctuary';
import { Review } from '../models/Review';

// Load environment variables
dotenv.config();

const checkData = async () => {
  try {
    await connectDB();
    console.log('Connected to MongoDB');

    const userCount = await User.countDocuments();
    const restaurantCount = await Restaurant.countDocuments();
    const recipeCount = await Recipe.countDocuments();
    const doctorCount = await Doctor.countDocuments();
    const marketCount = await Market.countDocuments();
    const businessCount = await Business.countDocuments();
    const professionCount = await Profession.countDocuments();
    const sanctuaryCount = await Sanctuary.countDocuments();
    const reviewCount = await Review.countDocuments();

    console.log('\n📊 Database Summary:');
    console.log('==================');
    console.log(`👥 Users: ${userCount}`);
    console.log(`🍽️ Restaurants: ${restaurantCount}`);
    console.log(`🥗 Recipes: ${recipeCount}`);
    console.log(`👨‍⚕️ Doctors: ${doctorCount}`);
    console.log(`🛒 Markets: ${marketCount}`);
    console.log(`🏢 Businesses: ${businessCount}`);
    console.log(`💼 Professions: ${professionCount}`);
    console.log(`🐄 Sanctuaries: ${sanctuaryCount}`);
    console.log(`⭐ Reviews: ${reviewCount}`);
    console.log('==================');

    const total = userCount + restaurantCount + recipeCount + doctorCount + 
                  marketCount + businessCount + professionCount + sanctuaryCount + reviewCount;

    if (total === 0) {
      console.log('\n❌ Database is empty. Run: npm run seed');
    } else if (total < 20) {
      console.log('\n⚠️  Database appears incomplete. Consider running: npm run seed');
    } else {
      console.log('\n✅ Database is properly seeded!');
      
      // Check admin user
      const adminUser = await User.findOne({ username: 'admin' });
      if (adminUser) {
        console.log('\n🔑 Admin Login:');
        console.log('   Email: admin@veganguide.com');
        console.log('   Password: Admin123!');
      }
    }

    console.log('\n🎯 Ready to start development!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking database:', error);
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  checkData();
}

export default checkData;