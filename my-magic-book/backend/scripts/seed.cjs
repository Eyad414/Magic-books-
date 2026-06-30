// Seeds the SiteSettings document (themes + book packages) into the target DB.
// Usage: MONGODB_URI=<your-atlas-uri> npm run seed
// Safe to re-run: upserts the single SiteSettings doc, never duplicates.
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

(async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('✗ MONGODB_URI is not set. Run: MONGODB_URI=<uri> npm run seed');
    process.exit(1);
  }
  const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'seed-data.json'), 'utf8'));
  await mongoose.connect(uri);
  const coll = mongoose.connection.collection('sitesettings');
  const existing = await coll.findOne({});
  if (existing) {
    await coll.updateOne({ _id: existing._id }, { $set: data });
    console.log(`✓ SiteSettings updated — ${data.themes.length} themes, ${data.bookPackages.length} packages`);
  } else {
    await coll.insertOne(data);
    console.log(`✓ SiteSettings created — ${data.themes.length} themes, ${data.bookPackages.length} packages`);
  }
  await mongoose.disconnect();
})().catch((e) => {
  console.error('✗ seed failed:', e.message);
  process.exit(1);
});
