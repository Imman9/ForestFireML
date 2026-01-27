import axios from 'axios';
import { FIRMSFirePoint, FIRMSSource } from '../types';
import Constants from 'expo-constants';

// Simple client for NASA FIRMS public CSV endpoints.
// For production, use an authenticated FIRMS API endpoint via Earthdata credentials.

export type TimeWindow = '24h' | '48h' | '7d';

interface FetchOptions {
  bbox?: { minLat: number; minLng: number; maxLat: number; maxLng: number };
  source?: FIRMSSource;
  window?: TimeWindow;
}

// Public sample endpoints (worldwide); can be replaced with regional/bbox-specific endpoints if available.
// VIIRS 375m NRT (NOAA-20 + Suomi NPP), last 24h CSV:
// https://firms.modaps.eosdis.nasa.gov/data/active_fire/viirs/csv/VNP14IMGTDL_NRT_Global_24h.csv

const API_BASE_URL = (Constants.expoConfig?.extra as any)?.API_BASE_URL || 'https://192.168.100.158:5000/api';

function parseFirmsData(data: any[], source: FIRMSSource): FIRMSFirePoint[] {
  if (!Array.isArray(data)) return [];

  return data.map((item, i) => {
      const latitude = parseFloat(item.latitude);
      const longitude = parseFloat(item.longitude);
      if (Number.isNaN(latitude) || Number.isNaN(longitude)) return null;

      let confidence = 0;
      const confValue = String(item.confidence || '');
      
      if (source === 'VIIRS') {
        // VIIRS confidence is numeric percent usually, but let's handle string "n" or "h" if they exist?
        // VIIRS usually numeric (0-100) or 'low', 'nominal', 'high'
        // Actually VIIRS is usually character 'l', 'n', 'h'. Wait, no.
        // S-NPP VIIRS 375m: confidence is 'l', 'n', 'h'.
        // NOAA-20 VIIRS 375m: confidence is 'l', 'n', 'h'.
        // BUT the backend code might be fetching standard VIIRS which has numeric confidence?
        // Let's assume the previous logic was correct for what the backend fetches.
        // Previous logic: "VIIRS confidence is numeric percent".
        
        // Let's safe check:
        if (confValue === 'l' || confValue === 'low') confidence = 30;
        else if (confValue === 'n' || confValue === 'nominal') confidence = 60;
        else if (confValue === 'h' || confValue === 'high') confidence = 90;
        else {
             const num = parseFloat(confValue);
             confidence = Number.isNaN(num) ? 0 : num;
        }
      } else {
        // MODIS confidence may be string categories (low/nominal/high); map to 30/60/90
        const val = confValue.toLowerCase();
        confidence = val.includes('high') ? 90 : val.includes('nominal') ? 60 : val.includes('low') ? 30 : parseFloat(confValue) || 0;
      }

      const p: FIRMSFirePoint = {
        id: `${source}-${i}-${item.acq_date}-${item.acq_time}`,
        latitude,
        longitude,
        confidence,
        brightness: item.brightness ? parseFloat(item.brightness) : undefined,
        source,
        acqDate: item.acq_date,
        acqTime: item.acq_time,
        satellite: item.satellite,
        instrument: item.instrument,
        frp: item.frp ? parseFloat(item.frp) : undefined,
      };
      return p;
  }).filter((p): p is FIRMSFirePoint => p !== null);
}

export async function fetchFIRMSFires(options: FetchOptions = {}): Promise<FIRMSFirePoint[]> {
  const source = options.source || 'VIIRS';
  const window: TimeWindow = options.window || '24h';
  const params: any = { source, window };
  if (options.bbox) {
    const { minLat, minLng, maxLat, maxLng } = options.bbox;
    params.bbox = `${minLat},${minLng},${maxLat},${maxLng}`;
  }

  try {
    const response = await axios.get(`${API_BASE_URL}/firms`, { params });
    // Response data should be JSON array now
    const points = parseFirmsData(response.data, source);
    return points;
  } catch (err) {
    console.warn('Error fetching FIRMS data:', err);
    return [];
  }
}


