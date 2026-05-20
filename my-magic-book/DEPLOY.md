# Deploying My Magic Book to Google Cloud Run

This guide walks you through deploying the **backend** (Express + Puppeteer) and
**frontend** (Vite/React) to Cloud Run, with MongoDB Atlas as the database and
Secret Manager for secrets.

> Replace `PROJECT_ID` and `REGION` (e.g. `europe-west1`, `us-central1`) with
> your values everywhere below.

---

## 0. Prerequisites

1. A Google Cloud project with **billing enabled**.
2. `gcloud` CLI installed and logged in: `gcloud auth login`.
3. Set the active project and region:
   ```bash
   gcloud config set project PROJECT_ID
   gcloud config set run/region REGION
   ```
4. Enable the APIs you'll need:
   ```bash
   gcloud services enable \
     run.googleapis.com \
     cloudbuild.googleapis.com \
     artifactregistry.googleapis.com \
     secretmanager.googleapis.com
   ```
5. Create an Artifact Registry repo for the images:
   ```bash
   gcloud artifacts repositories create my-magic-book \
     --repository-format=docker \
     --location=REGION
   ```

---

## 1. MongoDB Atlas

Cloud Run is stateless, so you cannot run MongoDB inside it.

1. Create a free cluster at https://www.mongodb.com/cloud/atlas.
2. Create a database user and password.
3. **Network access** → "Allow access from anywhere" (`0.0.0.0/0`).
   *Cloud Run egress IPs are not fixed; for production, use a Serverless VPC
   Connector + Atlas Private Endpoint.*
4. Copy the connection string. It looks like:
   ```
   mongodb+srv://USER:PASS@cluster0.xxxx.mongodb.net/my-magic-book?retryWrites=true&w=majority
   ```

---

## 2. Put secrets into Secret Manager

Never bake secrets into the image. Create one secret per value:

```bash
# Pipe the value in so it never touches your shell history file.
printf 'mongodb+srv://...' | gcloud secrets create MONGODB_URI --data-file=-
printf 'your_long_random_jwt_secret' | gcloud secrets create JWT_SECRET --data-file=-
printf 'sk-ant-...'  | gcloud secrets create ANTHROPIC_API_KEY --data-file=-
printf 'your_cloud_name' | gcloud secrets create CLOUDINARY_CLOUD_NAME --data-file=-
printf '...' | gcloud secrets create CLOUDINARY_API_KEY --data-file=-
printf '...' | gcloud secrets create CLOUDINARY_API_SECRET --data-file=-
printf 'sk_live_...' | gcloud secrets create STRIPE_SECRET_KEY --data-file=-
printf 'whsec_...'   | gcloud secrets create STRIPE_WEBHOOK_SECRET --data-file=-
printf 'price_...'   | gcloud secrets create STRIPE_PRICE_ID --data-file=-
printf 'you@gmail.com' | gcloud secrets create EMAIL_USER --data-file=-
printf 'app_password'  | gcloud secrets create EMAIL_PASS --data-file=-
```

Grant the Cloud Run runtime service account access to read them:

```bash
PROJECT_NUMBER=$(gcloud projects describe PROJECT_ID --format='value(projectNumber)')
RUNTIME_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

for s in MONGODB_URI JWT_SECRET ANTHROPIC_API_KEY \
         CLOUDINARY_CLOUD_NAME CLOUDINARY_API_KEY CLOUDINARY_API_SECRET \
         STRIPE_SECRET_KEY STRIPE_WEBHOOK_SECRET STRIPE_PRICE_ID \
         EMAIL_USER EMAIL_PASS; do
  gcloud secrets add-iam-policy-binding "$s" \
    --member="serviceAccount:${RUNTIME_SA}" \
    --role="roles/secretmanager.secretAccessor"
done
```

---

## 3. Deploy the backend

Build the image with Cloud Build, push to Artifact Registry, then deploy.

```bash
cd my-magic-book/backend

IMAGE="REGION-docker.pkg.dev/PROJECT_ID/my-magic-book/backend:$(date +%Y%m%d-%H%M%S)"

gcloud builds submit --tag "$IMAGE" .

gcloud run deploy my-magic-book-api \
  --image "$IMAGE" \
  --platform managed \
  --allow-unauthenticated \
  --memory 1Gi \
  --cpu 1 \
  --timeout 300 \
  --concurrency 20 \
  --min-instances 0 \
  --max-instances 5 \
  --set-env-vars NODE_ENV=production,JWT_EXPIRE=7d,EMAIL_HOST=smtp.gmail.com,EMAIL_PORT=587 \
  --set-secrets \
MONGODB_URI=MONGODB_URI:latest,\
JWT_SECRET=JWT_SECRET:latest,\
ANTHROPIC_API_KEY=ANTHROPIC_API_KEY:latest,\
CLOUDINARY_CLOUD_NAME=CLOUDINARY_CLOUD_NAME:latest,\
CLOUDINARY_API_KEY=CLOUDINARY_API_KEY:latest,\
CLOUDINARY_API_SECRET=CLOUDINARY_API_SECRET:latest,\
STRIPE_SECRET_KEY=STRIPE_SECRET_KEY:latest,\
STRIPE_WEBHOOK_SECRET=STRIPE_WEBHOOK_SECRET:latest,\
STRIPE_PRICE_ID=STRIPE_PRICE_ID:latest,\
EMAIL_USER=EMAIL_USER:latest,\
EMAIL_PASS=EMAIL_PASS:latest
```

**Why these settings:**
- `--memory 1Gi`: Chromium needs roughly 512 MB headroom; 1 GiB is the safe minimum.
- `--timeout 300`: PDF generation with Puppeteer can take 30–60s on cold starts.
- `--concurrency 20`: lower than the default 80 because each request can spawn Chromium.
- `--min-instances 0`: free tier friendly. Set to `1` if cold starts hurt UX.

Grab the URL Cloud Run prints (e.g. `https://my-magic-book-api-xxxx.a.run.app`).
You'll need it for the frontend build and Stripe.

Test it:
```bash
curl https://my-magic-book-api-xxxx.a.run.app/api/health
```

---

## 4. Deploy the frontend

The frontend reads `VITE_API_URL` at **build time** (Vite inlines it), so you
have to pass the backend URL as a build arg.

```bash
cd ../frontend

API_URL="https://my-magic-book-api-xxxx.a.run.app/api"
IMAGE="REGION-docker.pkg.dev/PROJECT_ID/my-magic-book/frontend:$(date +%Y%m%d-%H%M%S)"

gcloud builds submit \
  --tag "$IMAGE" \
  --substitutions=_API_URL="$API_URL" \
  . \
  --config=- <<EOF
steps:
- name: 'gcr.io/cloud-builders/docker'
  args: ['build', '--build-arg', 'VITE_API_URL=\${_API_URL}', '-t', '\${_IMAGE}', '.']
- name: 'gcr.io/cloud-builders/docker'
  args: ['push', '\${_IMAGE}']
substitutions:
  _IMAGE: '$IMAGE'
  _API_URL: '$API_URL'
images: ['\${_IMAGE}']
EOF

gcloud run deploy my-magic-book-web \
  --image "$IMAGE" \
  --platform managed \
  --allow-unauthenticated \
  --memory 256Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 3
```

> **Simpler alternative:** put the frontend on **Firebase Hosting** instead.
> It's free, faster, and made for static SPAs. Run `npm i -g firebase-tools`,
> `firebase init hosting` (point it at `dist/`), then
> `VITE_API_URL=... npm run build && firebase deploy`.

---

## 5. Wire CORS

After the frontend is deployed, redeploy the backend with the frontend URL:

```bash
gcloud run services update my-magic-book-api \
  --update-env-vars FRONTEND_URL=https://my-magic-book-web-xxxx.a.run.app
```

The current `cors({ origin: true })` in `src/server.ts` reflects any origin,
which works but is permissive. For production, tighten it to read
`process.env.FRONTEND_URL`.

---

## 6. Stripe webhook

1. In the Stripe dashboard → **Developers → Webhooks → Add endpoint**.
2. URL: `https://my-magic-book-api-xxxx.a.run.app/api/orders/webhook`.
3. Pick the events your code listens for (e.g. `checkout.session.completed`).
4. Copy the new signing secret and update Secret Manager:
   ```bash
   printf 'whsec_NEW...' | gcloud secrets versions add STRIPE_WEBHOOK_SECRET --data-file=-
   gcloud run services update my-magic-book-api \
     --update-secrets STRIPE_WEBHOOK_SECRET=STRIPE_WEBHOOK_SECRET:latest
   ```

---

## 7. Post-deploy checklist

- [ ] `GET /api/health` returns 200.
- [ ] Sign-up, login, password reset all work end-to-end.
- [ ] Create a story → PDF generation completes without timing out.
  *(If it times out, raise `--timeout` and `--memory`.)*
- [ ] Stripe test purchase fires the webhook and creates the order.
- [ ] Image upload to Cloudinary succeeds.
- [ ] Browser console has no CORS errors.

Tail logs while testing:
```bash
gcloud run services logs tail my-magic-book-api
```

---

## 8. Known gotchas

| Issue | Fix |
|---|---|
| Puppeteer "Failed to launch the browser process" | Confirm `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium` is set and the Dockerfile's `apt-get install chromium` step ran. |
| 503 on first request after idle | Cold start; set `--min-instances 1` if it bothers users. |
| Stripe webhook signature fails | The webhook handler is registered with `express.raw` *before* `express.json` — don't reorder them. |
| Mongo connection times out | Atlas IP allowlist still set to your laptop's IP. Switch to `0.0.0.0/0` or use a VPC connector. |
| Frontend calls `http://localhost:5001` in prod | `VITE_API_URL` wasn't passed as a build-arg. Rebuild the frontend image with the correct value. |
| Image is huge / slow to deploy | Double-check `.dockerignore` is being respected (no `node_modules` or `dist` in the layer). |

---

## 9. Cost expectations (rough)

For a low-traffic site (a few hundred PDF generations / month):

- Backend Cloud Run: **~$0–5/mo** (free tier covers 2M requests, 360k vCPU-s).
- Frontend Cloud Run or Firebase Hosting: **~$0/mo**.
- Atlas free tier: **$0**.
- Artifact Registry: **~$0.10/mo** for storage.
- Secret Manager: **$0** (first 6 secrets, 10k accesses free).

Puppeteer-heavy workloads are the main cost driver — keep an eye on
`max-instances` and `concurrency`.
