/**
 * Print a short-lived admin JWT for calling the admin API from a terminal.
 *
 * The admin routes are behind `protect, adminOnly`, so maintenance calls —
 * regenerating one bad illustration, checking a build — otherwise need a
 * browser session. This signs a token with the project's own JWT_SECRET from
 * .env for an existing admin user; it creates nothing and changes nothing.
 *
 *   npx tsx scripts/adminToken.ts
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import User from '../src/models/User';

(async () => {
  const uri = process.env.MONGODB_URI;
  const secret = process.env.JWT_SECRET;
  if (!uri || !secret) throw new Error('MONGODB_URI and JWT_SECRET must be set in backend/.env');

  await mongoose.connect(uri);
  const admin = await User.findOne({ role: 'admin' }).select('_id email');
  if (!admin) throw new Error('no admin user found');

  // Identity to stderr, token to stdout, so `> tok.txt` captures only the token.
  console.error(`admin: ${admin.email}`);
  console.log(jwt.sign({ id: String(admin._id) }, secret, { expiresIn: '2h' }));

  await mongoose.disconnect();
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
