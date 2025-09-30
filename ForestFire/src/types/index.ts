export interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'ranger' | 'admin';
  location?: {
    latitude: number;
    longitude: number;
  };
}

export interface FireReport {
  id: string;
  userId: string;
  userName: string;
  location: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  imageUrl?: string;
  description?: string;
  status: 'unverified' | 'confirmed' | 'resolved';
  confidence?: number;
  timestamp: Date;
  weatherData?: WeatherData;
}

export interface WeatherData {
  temperature: number;
  humidity: number;
  windSpeed: number;
  windDirection: string;
  fireRisk: 'low' | 'moderate' | 'high' | 'extreme';
}

export type FIRMSSource = 'VIIRS' | 'MODIS';

export interface FIRMSFirePoint {
  id: string;
  latitude: number;
  longitude: number;
  confidence: number; // 0-100 if VIIRS, or derived for MODIS
  brightness?: number;
  source: FIRMSSource;
  acqDate: string; // YYYY-MM-DD
  acqTime: string; // HHMM
  satellite?: string; // e.g., NOAA-20, Suomi-NPP, Aqua/Terra
  instrument?: string; // VIIRS or MODIS
  frp?: number; // Fire Radiative Power if present
}

export interface MLPrediction {
  hasFire: boolean;
  confidence: number;
  class: string;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

export interface NotificationData {
  id: string;
  title: string;
  body: string;
  data?: any;
  timestamp: Date;
} 