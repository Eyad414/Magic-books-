# Deploying Magic Fanoose

Architecture: **Vercel** (frontend) → **Render** (backend API) → **MongoDB Atlas** (database).
Your existing **Google Cloud Storage** bucket and **Gemini** key are reused.

The site can go live and be fully browsable in **Phase 1**. Generation (Puppeteer/GCS) and
payments (Stripe/BookPod) are wired in **Phase 2** and do not block getting the site online.

---

## Phase 1 — Get the site live & browsable

### 1. Database — MongoDB Atlas (free)
1. Create an account at https://www.mongodb.com/cloud/atlas → create a free **M0** cluster.
2. **Database Access** → add a database user (username + password). Keep the password.
3. **Network Access** → add IP `0.0.0.0/0` (allow from anywhere — needed so Render can connect).
4. **Connect → Drivers** → copy the connection string. It looks like:
   `mongodb+srv://<user>:<password>@cluster0.xxxx.mongodb.net/magicfanoose?retryWrites=true&w=majority`
   (add `/magicfanoose` before the `?` to name the database).

### 2. Backend — Render (free web service)
1. https://render.com → **New → Web Service** → connect the GitHub repo `Eyad414/Magic-books-`.
2. Settings:
   - **Root Directory:** `my-magic-book/backend`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Branch:** `feature/ai-book-pipeline` (or `main` once merged)
3. **Environment variables** (Render → Environment). Paste these yourself — never share secrets in chat:
   ```
   NODE_ENV=production
   MONGODB_URI=<your Atlas connection string from step 1>
   JWT_SECRET=<a long random string>
   JWT_EXPIRE=7d
   GEMINI_API_KEY=<your Gemini key>
   FRONTEND_URL=<your Vercel URL — fill in after step 3>
   CORS_ORIGINS=<your Vercel URL — fill in after step 3>
   ADMIN_SETUP_SECRET=<a long random string — used once to make yourself admin>
   # Photo uploads (wizard step 1):
   CLOUDINARY_CLOUD_NAME=...
   CLOUDINARY_API_KEY=...
   CLOUDINARY_API_SECRET=...
   ```
4. Deploy. Note the URL, e.g. `https://magic-books.onrender.com`.

### 3. Seed the database (themes + packages)
The new Atlas DB is empty. Populate it with your 9 themes + 5 packages:
- Easiest: locally, run `MONGODB_URI="<atlas-uri>" npm run seed` from `my-magic-book/backend`.
- (Re-runnable; it upserts the single SiteSettings doc.)

### 4. Frontend — Vercel
1. https://vercel.com → **Add New → Project** → import `Eyad414/Magic-books-`.
2. Settings:
   - **Root Directory:** `my-magic-book/frontend`
   - Framework preset: **Vite** (auto-detected). Build `npm run build`, output `dist`.
   - **Environment variable:** `VITE_API_URL = https://<your-render-url>/api`
3. Deploy. Note the URL, e.g. `https://magic-fanoose.vercel.app`.

### 5. Connect the two
- In **Render**, set `FRONTEND_URL` and `CORS_ORIGINS` to your Vercel URL, then redeploy.
- Open the Vercel URL — the site should load, themes/stories should appear (from the seed).

### 6. Make yourself admin (one time)
- Register a normal account on the live site.
- Send one request with your `ADMIN_SETUP_SECRET` to `PUT /api/auth/make-admin`
  body `{ "secret": "<ADMIN_SETUP_SECRET>" }` (only works for the first admin, then self-disables).

---

## Phase 2 — Enable generation & payments (after the site is live)

- **Google Cloud Storage creds:** the backend uses Application Default Credentials. On Render,
  add the service-account JSON as a **Secret File** (e.g. `/etc/secrets/gcp.json`) and set
  `GOOGLE_APPLICATION_CREDENTIALS=/etc/secrets/gcp.json`, plus
  `GCP_PROJECT_ID`, `GCS_BUCKET_NAME`, `GCS_PDF_FOLDER`. Needed for storing/serving generated images.
- **Puppeteer (print PDFs):** Render's free 512 MB instance is tight for Chromium + Sharp + image
  generation. If the build step OOMs, bump to a paid instance or move to a Dockerfile that installs
  Chromium. Only the post-payment book build needs this.
- **Stripe:** set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID`; point the Stripe
  webhook at `https://<render-url>/api/orders/webhook`.
- **BookPod:** add the print-submission API key once available.
- **Email (contact form / notifications):** `EMAIL_HOST/PORT/USER/PASS`.

---

## Notes
- `node_modules` and `dist` are rebuilt by each host — don't commit platform binaries.
- The backend reads `PORT` from the environment (Render sets it automatically).
- Custom domain `magicfanoose.com`: add it in Vercel (frontend) and point DNS; update
  `FRONTEND_URL`/`CORS_ORIGINS` on Render to match.
