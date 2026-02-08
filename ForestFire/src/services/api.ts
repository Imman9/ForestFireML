import axios from 'axios';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FireReport, MLPrediction, WeatherData, User } from '../types';
import * as FileSystem from "expo-file-system/legacy";
import { realWeatherService, realFireReportService, realNotificationService } from './realApi';


const API_BASE_URL = (Constants.expoConfig?.extra as any)?.API_BASE_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// export const mlService = mockMlService;
export const fireReportService = realFireReportService;
export const weatherService = realWeatherService;
export const notificationService = realNotificationService;

// Real auth service wired to backend
export const authService = {
  login: async (email: string, password: string): Promise<{ user: User; token: string }> => {
    const res = await api.post('/auth/login', { email, password });
    return res.data;
  },
  register: async (userData: { name: string; email: string; password: string; role: string }): Promise<{ user: User; token: string }> => {
    // Create the user, then login to obtain token
    await api.post('/auth/register', userData);
    const loginRes = await api.post('/auth/login', { email: userData.email, password: userData.password });
    return loginRes.data;
  },
  getCurrentUser: async (): Promise<User> => {
    // Fallback: return user from storage; in a real app, add a /auth/me endpoint
    const stored = await AsyncStorage.getItem('user');
    if (!stored) throw new Error('No user');
    return JSON.parse(stored) as User;
  },
  updateLocation: async (lat: number, lng: number): Promise<void> => {
     // In a real app, you'd have an endpoint like POST /users/location or PUT /users/me
     // For now, we'll assume there is one or verify if we need to add it to backend
     try {
       await api.patch('/auth/me/location', { lat, lng });
     } catch (e) {
       console.warn('Failed to update location', e);
     }
  }
};

export const mlService = {
  predictFire: async (uri: string) => {
    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });

    // Use the dynamic API_BASE_URL defined above, appending /predict
    // Note: API_BASE_URL includes /api, so we just append /predict if it's not already there?
    // Actually API_BASE_URL is '.../api', and the route is '/predict', so it would be '.../api/predict'
    // But let's check how other services use it. `api` axios instance uses API_BASE_URL.
    // We can use the same base URL.
    
    const url = `${API_BASE_URL}/predict`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: base64 }),
    });

    return await response.json(); // { hasFire, confidence }
  },
};

export const rangersService = {
  getRiskMap: async () => {
    const res = await api.get('/rangers/risk-map');
    return res.data;
  },
  getReportContext: async (id: string) => {
      const res = await api.get(`/rangers/reports/${id}/context`);
      return res.data;
  },
  validateReport: async (id: string) => {
    // Legacy support or alias to confirm
    return await rangersService.updateReportStatus(id, 'confirmed');
  },
  updateReportStatus: async (id: string, status: string, notes?: string) => {
    const res = await api.patch(`/rangers/reports/${id}/status`, { status, notes });
    return res.data;
  },
  deleteReport: async (id: string) => {
    const res = await api.delete(`/rangers/reports/${id}`);
    return res.data;
  }
};


export default api; 