<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/fc2485e0-cd12-461d-8400-89337797bdeb

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the auth/backend server:
   `npm run api`
4. Run the app:
   `npm run dev`

For production-style serving after build:

1. Build the frontend:
   `npm run build`
2. Start the backend + static server:
   `npm start`

The backend serves the API and, when `dist/` exists, the built frontend as well.

## Demo Login

Use these demo accounts on the login page:

- `user / 1234`
- `technician / 1234`
- `customer / 1234`

## Routes

- `/login`
- `/user`
- `/technician`
- `/customer`
