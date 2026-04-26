<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/a70770b3-348f-4dd2-8426-c084e5055fa3

Feature documentation lives in [docs/FEATURES.md](docs/FEATURES.md). Keep that file updated whenever functionality changes.
Deployment instructions for Cloud Run live in [docs/CLOUD_RUN.md](docs/CLOUD_RUN.md).
GitHub Actions automation for Cloud Run is documented in the same deployment guide.
Agent workflow instructions live in [AGENTS.md](AGENTS.md), including the rule to bump the app version before every agent-authored commit.

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Playwright visual UI tests

The repo includes Playwright-based visual regression tests that open the real app on localhost and mock the backend directly in the Playwright test setup. Firebase-related browser modules are swapped with local mock modules before the page executes, and `/api/*` calls are fulfilled in the same test layer. This keeps screenshots deterministic and enables strict zero-pixel-diff comparisons for desktop and mobile viewports without a separate test-only UI route.

1. Install dependencies:
   `npm install`
2. Install Playwright browsers:
   `npx playwright install chromium`
3. Create or refresh baselines:
   `npm run test:ui:update`
4. Run the visual checks:
   `npm run test:ui`
