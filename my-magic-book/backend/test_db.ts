import mongoose from 'mongoose';
import User from './src/models/User';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/magic-book');
  const user = await User.findOne().select('+passwordHash');
  console.log('User passwordHash:', user?.passwordHash);
  process.exit(0);
}
run();
