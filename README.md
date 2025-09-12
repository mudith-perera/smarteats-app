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
   PORT=5001
   ```
3. Run server:

   ```bash
   nodemon backend/server.js
   ```

4. Add sample data by running

   ```mongoimport --db smarteats --collection mealplans --file mealplans30.json --jsonArray

   ```

## Frontend

Open `http://localhost:5001/` in a browser.
