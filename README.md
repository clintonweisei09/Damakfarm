<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Damak Farm

Farm shop and husbandry advice site for Damak Farm.

## Run Locally

**Prerequisites:**  Node.js

1. Install dependencies:
   `npm install`
2. Run the app:
   `npm run dev`

## Deployment

Pushing to `main` builds the site and deploys it to GitHub Pages:
https://clintonweisei09.github.io/Damakfarm/

The M-Pesa checkout endpoints are served by `server.ts` and are not available
on the static GitHub Pages deployment. Checkout payments require a deployment
that runs the Node.js server with the required M-Pesa environment variables.
