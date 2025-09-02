# SmartEats Web App

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a `.env` file:
   ```env
   MONGO_URI=mongodb://localhost:27017/smarteats
   JWT_SECRET=your_jwt_secret
   PORT=5001
   ```
3. Run server:
   ```bash
   node backend/server.js
   ```

## Endpoints

- POST `/api/users/register` → Register new user
- POST `/api/users/login` → Login, returns JWT
- GET `/api/users` → List all users (Admin only)
- PUT `/api/users/:id` → Update user (Admin only)
- DELETE `/api/users/:id` → Delete user (Admin only)

## Frontend

Open `frontend/index.html` in a browser.
