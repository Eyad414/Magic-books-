const { join } = require('path');

// Cache Chromium INSIDE the project directory instead of the default
// ~/.cache/puppeteer. On Render (and similar hosts) the home-dir cache created
// at build time is wiped before runtime, so puppeteer.launch() fails with
// "Could not find Chrome". A project-relative cache is part of the build output
// that persists to runtime, so the downloaded Chromium is found at launch.
module.exports = {
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
};
