import axios from 'axios';
import { FireReport, MLPrediction, WeatherData } from '../types';
import { 
  mockAuthService, 
  mockMlService, 
  mockFireReportService, 
  mockWeatherService, 
  mockNotificationService 
} from './mockApi';

const API_BASE_URL = 'https://your-backend-url.com/api'; // Replace with your backend URL

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

// Use mock services for now - replace with real API calls when backend is ready
export const mlService = mockMlService;
export const fireReportService = mockFireReportService;
export const weatherService = mockWeatherService;
export const authService = mockAuthService;
export const notificationService = mockNotificationService;

export default api; 