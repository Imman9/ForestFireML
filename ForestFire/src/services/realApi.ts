import axios from 'axios';
import Constants from 'expo-constants';
import { FireReport, WeatherData } from '../types';

const API_BASE_URL = (Constants.expoConfig?.extra as any)?.API_BASE_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

// Real Weather Service
export const realWeatherService = {
  getWeatherData: async (latitude: number, longitude: number): Promise<WeatherData> => {
    try {
      const response = await api.get('/weather', {
        params: { lat: latitude, lng: longitude },
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch weather data:', error);
      throw new Error('Failed to fetch weather data');
    }
  },

  getFireRiskMap: async (): Promise<any> => {
    // This would require a dedicated endpoint on the backend
    throw new Error('Not implemented');
  },
};

// Real Fire Report Service
export const realFireReportService = {
  createReport: async (report: Omit<FireReport, 'id' | 'timestamp'>): Promise<FireReport> => {
    try {
      const response = await api.post('/fire-reports', report);
      return response.data;
    } catch (error) {
      console.error('Failed to create fire report:', error);
      throw new Error('Failed to create fire report');
    }
  },

  getReports: async (): Promise<FireReport[]> => {
    try {
      const response = await api.get('/fire-reports');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch fire reports:', error);
      throw new Error('Failed to fetch fire reports');
    }
  },

  updateReportStatus: async (reportId: string, status: FireReport['status'], notes?: string): Promise<FireReport> => {
    try {
      const response = await api.patch(`/fire-reports/${reportId}/status`, { status, notes });
      return response.data;
    } catch (error) {
      console.error('Failed to update report status:', error);
      throw new Error('Failed to update report status');
    }
  },

  getReportById: async (reportId: string): Promise<FireReport> => {
    try {
      const response = await api.get(`/fire-reports/${reportId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch fire report:', error);
      throw new Error('Failed to fetch fire report');
    }
  },
};

// Real Notification Service
export const realNotificationService = {
  registerDevice: async (deviceToken: string): Promise<void> => {
    try {
      await api.post('/notifications/register', { deviceToken });
    } catch (error) {
      console.error('Failed to register device:', error);
      throw new Error('Failed to register device');
    }
  },

  getNotifications: async (): Promise<any[]> => {
    try {
      const response = await api.get('/notifications');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      throw new Error('Failed to fetch notifications');
    }
  },
};
