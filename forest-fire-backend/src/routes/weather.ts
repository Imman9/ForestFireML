import { Router, Request, Response } from 'express';
import axios from 'axios';

const router = Router();
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;

// GET /api/weather?lat=...&lng=...
router.get('/', async (req: Request, res: Response) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) return res.status(400).json({ error: 'lat and lng required' });
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${OPENWEATHER_API_KEY}&units=metric`;
    const response = await axios.get(url);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch weather data', details: error });
  }
});

export default router; 