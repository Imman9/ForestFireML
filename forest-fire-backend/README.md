# Forest Fire Detection Backend (Express.js)

## Features
- Fire report submission and listing (mock data)
- Ready for ML prediction, notifications, and user authentication

## Setup
1. Install dependencies:
   ```sh
   npm install
   ```
2. Create a `.env` file (see `.env.example` for required variables).
3. Start the server:
   ```sh
   npm run dev
   # or
   npm start
   ```

## API Endpoints
- `GET /api/fire-reports` — List all fire reports
- `POST /api/fire-reports` — Submit a new fire report
- `GET /api/fire-reports/:id` — Get a fire report by ID

## Next Steps
- Add ML prediction endpoint
- Add push notification support
- Add authentication and database integration 