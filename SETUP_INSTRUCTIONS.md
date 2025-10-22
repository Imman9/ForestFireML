# Forest Fire Detection - Setup Instructions

## OpenWeather API Integration

The application now uses real weather data from OpenWeather API instead of mock data.

### Backend Setup

1. **Get your OpenWeather API Key**
   - Visit https://openweathermap.org/api
   - Sign up for a free account
   - Navigate to "API keys" section
   - Copy your API key

2. **Configure Backend Environment**
   - Navigate to `forest-fire-backend/` directory
   - Create a `.env` file (you can copy from `.env.example`)
   - Add your OpenWeather API key:
   ```
   OPENWEATHER_API_KEY=your_actual_api_key_here
   ```

3. **Start the Backend Server**
   ```bash
   cd forest-fire-backend
   npm install
   npm start
   ```
   The server will run on `http://localhost:5000`

### Database Setup

The backend will automatically create/update the `fire_reports` table with the new fields:
- `userName` - Name of the user reporting the fire
- `address` - Human-readable address of the fire location
- `weatherData` - JSON string containing weather conditions at time of report
- `confidence` - ML prediction confidence score

### Frontend Setup

The frontend has been updated to:
- Fetch real weather data from OpenWeather API via your backend
- Submit fire reports to the backend database
- Display historical fire reports from the database

Make sure your backend is running before using the app.

### Features Now Available

1. **Real Weather Data**
   - Temperature, humidity, wind speed, and direction
   - Automatic fire risk calculation based on weather conditions

2. **Fire Reporting**
   - Submit fire reports with photos, location, and description
   - Weather data automatically captured at time of report
   - Reports saved to database

3. **History Screen**
   - View all submitted fire reports
   - Filter by status (all, confirmed, resolved)
   - See weather conditions at time of each report
   - Reports sorted by most recent first

### Testing

1. Start your backend server
2. Ensure the database is running (PostgreSQL)
3. Launch the mobile app
4. Try reporting a fire - weather data will be fetched automatically
5. Check the History screen to see your submitted reports

### Notes

- The OpenWeather free tier allows 60 calls/minute and 1,000,000 calls/month
- Weather data includes automatic fire risk assessment (low, moderate, high, extreme)
- All reports are persisted in the PostgreSQL database
