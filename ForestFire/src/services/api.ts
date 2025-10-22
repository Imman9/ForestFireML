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
};

export const mlService = {
  predictFire: async (uri: string) => {
    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });

    const response = await fetch("http://192.168.100.5:5000/api/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: base64 }),
    });

    return await response.json(); // { hasFire, confidence }
  },
};


export default api; 