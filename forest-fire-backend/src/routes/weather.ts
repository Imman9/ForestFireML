import { Router, Request, Response } from 'express';
import axios from 'axios';

const router = Router();
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;

// Calculate fire risk based on temperature, humidity, and wind speed
function calculateFireRisk(temp: number, humidity: number, windSpeed: number): string {
  let riskScore = 0;
  
  // Temperature factor (higher temp = higher risk)
  if (temp > 35) riskScore += 3;
  else if (temp > 30) riskScore += 2;
  else if (temp > 25) riskScore += 1;
  
  // Humidity factor (lower humidity = higher risk)
  if (humidity < 30) riskScore += 3;
  else if (humidity < 50) riskScore += 2;
  else if (humidity < 70) riskScore += 1;
  
  // Wind speed factor (higher wind = higher risk)
  if (windSpeed > 40) riskScore += 3;
  else if (windSpeed > 25) riskScore += 2;
  else if (windSpeed > 15) riskScore += 1;
  
  // Determine risk level
  if (riskScore >= 7) return 'extreme';
  if (riskScore >= 5) return 'high';
  if (riskScore >= 3) return 'moderate';
  return 'low';
}

// GET /api/weather?lat=...&lng=...
router.get('/', async (req: Request, res: Response) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) return res.status(400).json({ error: 'lat and lng required' });
    
    if (!OPENWEATHER_API_KEY) {
      return res.status(500).json({ error: 'OpenWeather API key not configured' });
    }
    
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${OPENWEATHER_API_KEY}&units=metric`;
    const response = await axios.get(url);
    const data = response.data;
    
    // Extract and format weather data
    const temperature = Math.round(data.main.temp);
    const humidity = data.main.humidity;
    const windSpeed = Math.round(data.wind.speed * 3.6); // Convert m/s to km/h
    const windDeg = data.wind.deg;
    
    // Convert wind direction from degrees to cardinal direction
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const windDirection = directions[Math.round(windDeg / 45) % 8];
    
    // Calculate fire risk
    const fireRisk = calculateFireRisk(temperature, humidity, windSpeed);
    
    // Return formatted data
    const formattedWeather = {
      temperature,
      humidity,
      windSpeed,
      windDirection,
      fireRisk,
    };
    
    res.json(formattedWeather);
  } catch (error: any) {
    console.error('Weather API error:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Failed to fetch weather data', 
      details: error.response?.data?.message || error.message 
    });
  }
});

export default router;