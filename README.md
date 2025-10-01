# SmartEats Web App

## Setup

❗️ Make sure mongodb is up and running.
❗️ Make sure Node is installed.

After cloning the project

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a `.env` file in the project root:
   ```env
   MONGO_URI=mongodb://localhost:27017/smarteats
   JWT_SECRET=your_jwt_secret
   PORT=5001 (8000 for OAuth Functionality)
   <🆕> OPENAI_API_KEY= <Your secret key - get it from https://auth.openai.com/log-in >
   <🆕> GOOGLE_CLIENT_ID= <Your Google Client ID >
   <🆕> GOOGLE_CLIENT_SECRET= <Your Google Client Secret >
   <🆕> GOOGLE_OAUTH_URL=https://accounts.google.com/o/oauth2/v2/auth
   <🆕> GOOGLE_ACCESS_TOKEN_URL=https://oauth2.googleapis.com/token
   <🆕> GOOGLE_TOKEN_INFO_URL=https://oauth2.googleapis.com/tokeninfo
   ```
3. Run server:

   ```bash
   npm run dev
   ```

4. Add sample data by running

   ```
   mongoimport --db smarteats --collection mealplans --file mealplans30.json --jsonArray

   ```

## Frontend

Open in a browser from console.
