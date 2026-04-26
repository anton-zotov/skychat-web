# Cloud Run Deployment

This project can be deployed to Google Cloud Run as a single container that:

- serves the built Vite frontend from `dist`
- runs the Express API from `build/server.js`

## What Gets Deployed

- frontend bundle: `dist/`
- production server: `build/server.js`

The production server serves static frontend assets and provides runtime API endpoints for:

- `/api/health`
- `/api/vapidPublicKey`
- `/api/sendPush`
- `/api/gifs/search`
- `/api/gifs/trending`

## Prerequisites

- Google Cloud project
- Billing enabled for the project
- Cloud Run API enabled
- Artifact Registry API enabled if you plan to build with Docker locally or in CI
- `gcloud` CLI authenticated to the target project

## Local Production Check

Build and run the same production artifacts used by Cloud Run:

```bash
npm run build
npm start
```

The app should then be available on `http://localhost:3000` unless `PORT` is set.

## Deploy With Cloud Build From Source

From the repo root:

```bash
gcloud run deploy skychat-web ^
  --source . ^
  --region europe-central2 ^
  --allow-unauthenticated
```

Cloud Run will build the container from the checked-in `Dockerfile`.

## Automated Deploys From GitHub Actions

The repo includes a workflow at `.github/workflows/deploy-cloud-run.yml` that:

- runs on pushes to `main`
- can also be triggered manually from GitHub Actions
- installs dependencies with `npm ci --legacy-peer-deps`
- runs `npm run lint`
- runs `npm run build`
- deploys the repo root to Cloud Run from source

The workflow uses Workload Identity Federation plus a Google Cloud service account, which is the recommended approach over storing a long-lived JSON key in GitHub.

### GitHub Repository Configuration

Add these GitHub repository variables:

- `GCP_PROJECT_ID`: your Google Cloud project id
- `GCP_REGION`: your Cloud Run region, for example `europe-central2`
- `CLOUD_RUN_SERVICE`: your Cloud Run service name, for example `skychat-web`

Add these GitHub repository secrets:

- `GCP_WORKLOAD_IDENTITY_PROVIDER`: full provider resource name, for example `projects/123456789/locations/global/workloadIdentityPools/github/providers/skychat-web`
- `GCP_SERVICE_ACCOUNT`: deployer service account email, for example `github-deployer@your-project.iam.gserviceaccount.com`
- `FIREBASE_APPLET_CONFIG_JSON`: full JSON payload for `firebase-applet-config.json`
- `GIPHY_API_KEY`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`

### One-Time Google Cloud Setup

Create a deployer service account:

```bash
gcloud iam service-accounts create github-deployer ^
  --project your-gcp-project-id ^
  --display-name "GitHub Cloud Run Deployer"
```

Grant the deployer account the roles Cloud Run source deployments need:

```bash
gcloud projects add-iam-policy-binding your-gcp-project-id ^
  --member serviceAccount:github-deployer@your-gcp-project-id.iam.gserviceaccount.com ^
  --role roles/run.sourceDeveloper

gcloud projects add-iam-policy-binding your-gcp-project-id ^
  --member serviceAccount:github-deployer@your-gcp-project-id.iam.gserviceaccount.com ^
  --role roles/serviceusage.serviceUsageConsumer
```

Allow that deployer to act as the runtime service account used by Cloud Run. By default this is the Compute Engine default service account:

```bash
gcloud iam service-accounts add-iam-policy-binding your-project-number-compute@developer.gserviceaccount.com ^
  --member serviceAccount:github-deployer@your-gcp-project-id.iam.gserviceaccount.com ^
  --role roles/iam.serviceAccountUser
```

Grant the Cloud Run Builder role to the build service account used for source deployments. By default Cloud Run uses the Compute Engine default service account for builds:

```bash
gcloud projects add-iam-policy-binding your-gcp-project-id ^
  --member serviceAccount:your-project-number-compute@developer.gserviceaccount.com ^
  --role roles/run.builder
```

Create a GitHub Workload Identity Pool:

```bash
gcloud iam workload-identity-pools create github ^
  --project your-gcp-project-id ^
  --location global ^
  --display-name "GitHub Actions Pool"
```

Create a provider scoped to this GitHub repository:

```bash
gcloud iam workload-identity-pools providers create-oidc skychat-web ^
  --project your-gcp-project-id ^
  --location global ^
  --workload-identity-pool github ^
  --display-name "SkyChat GitHub Provider" ^
  --attribute-mapping "google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository,attribute.repository_owner=assertion.repository_owner" ^
  --attribute-condition "assertion.repository == 'anton-zotov/skychat-web'" ^
  --issuer-uri "https://token.actions.githubusercontent.com"
```

Allow that GitHub identity to impersonate the deployer service account:

```bash
gcloud iam service-accounts add-iam-policy-binding github-deployer@your-gcp-project-id.iam.gserviceaccount.com ^
  --project your-gcp-project-id ^
  --member "principalSet://iam.googleapis.com/projects/your-project-number/locations/global/workloadIdentityPools/github/attribute.repository/anton-zotov/skychat-web" ^
  --role roles/iam.workloadIdentityUser
```

Then fetch the full provider resource name and store it in the `GCP_WORKLOAD_IDENTITY_PROVIDER` GitHub secret:

```bash
gcloud iam workload-identity-pools providers describe skychat-web ^
  --project your-gcp-project-id ^
  --location global ^
  --workload-identity-pool github ^
  --format "value(name)"
```

### First Deployment

The workflow deploys with `--allow-unauthenticated` so the web app remains publicly reachable like the manual deployment flow. If you want a private service instead, remove that flag from `.github/workflows/deploy-cloud-run.yml` before enabling the workflow.

It also writes `firebase-applet-config.json` from `FIREBASE_APPLET_CONFIG_JSON` and injects `GIPHY_API_KEY`, `VAPID_PUBLIC_KEY`, and `VAPID_PRIVATE_KEY` as Cloud Run runtime env vars from GitHub Secrets.

You can let the workflow create the service on first deploy, but many teams prefer doing the first deploy manually so runtime environment variables are in place before CI starts updating revisions:

```bash
gcloud run deploy skychat-web ^
  --source . ^
  --region europe-central2 ^
  --allow-unauthenticated ^
  --set-env-vars GIPHY_API_KEY=your_giphy_key,VAPID_PUBLIC_KEY=your_public_key,VAPID_PRIVATE_KEY=your_private_key
```

After that, the GitHub Actions workflow can keep deploying new revisions on every push to `main`.

## Deploy With Docker

Set your project variables:

```bash
set PROJECT_ID=your-gcp-project-id
set REGION=europe-central2
set SERVICE=skychat-web
```

Build and push:

```bash
gcloud auth configure-docker %REGION%-docker.pkg.dev
docker build -t %REGION%-docker.pkg.dev/%PROJECT_ID%/cloud-run-source-deploy/%SERVICE%:latest .
docker push %REGION%-docker.pkg.dev/%PROJECT_ID%/cloud-run-source-deploy/%SERVICE%:latest
```

Deploy:

```bash
gcloud run deploy %SERVICE% ^
  --image %REGION%-docker.pkg.dev/%PROJECT_ID%/cloud-run-source-deploy/%SERVICE%:latest ^
  --region %REGION% ^
  --allow-unauthenticated
```

## Environment Variables

Recommended runtime env vars:

- `GIPHY_API_KEY`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`

Example:

```bash
gcloud run deploy skychat-web ^
  --source . ^
  --region europe-central2 ^
  --allow-unauthenticated ^
  --set-env-vars GIPHY_API_KEY=your_giphy_key,VAPID_PUBLIC_KEY=your_public_key,VAPID_PRIVATE_KEY=your_private_key
```

For production, prefer storing secrets in Secret Manager and wiring them into Cloud Run instead of putting secret values directly into command history.

## Firebase Follow-Up

After first deploy, add your Cloud Run domain or custom domain to Firebase Authentication authorized domains. Without that, Google sign-in will fail with `auth/unauthorized-domain`.

Also verify:

- Firestore rules allow your intended client access
- Storage rules allow your intended upload access
- web push keys are configured if you want notifications

## Notes

- Cloud Run sets `PORT` automatically, and the server is configured to use it.
- Vite is only loaded in development. Production uses built assets from `dist`.
- If `GIPHY_API_KEY` is not set, the app falls back to mock GIF responses.
- The GitHub Actions workflow uses Workload Identity Federation instead of a stored service account key.
