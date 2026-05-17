import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
dotenv.config();

async function reset() {
  await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/my-magic-book");
  const hash = await bcrypt.hash("test123", 12);
  await mongoose.connection.collection("users").updateOne({ email: "eyadat720@gmail.com" }, { $set: { passwordHash: hash } });
  console.log("Password reset to test123");
  process.exit(0);
}
reset();
