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


function parseCsv(csv: string, source: FIRMSSource): FIRMSFirePoint[] {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length <= 1) return [];
  const header = lines[0].split(',').map(h => h.trim());

  const col = (name: string) => header.indexOf(name);

  // Common columns in FIRMS CSVs
  const latIdx = col('latitude');
  const lonIdx = col('longitude');
  const confIdx = col('confidence'); // may be numeric or text for MODIS
  const brightIdx = col('brightness');
  const dateIdx = col('acq_date');
  const timeIdx = col('acq_time');
  const satIdx = col('satellite');
  const instIdx = col('instrument');
  const frpIdx = col('frp');

  const points: FIRMSFirePoint[] = [];

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(',');
    if (row.length !== header.length) continue;
    const latitude = parseFloat(row[latIdx]);
    const longitude = parseFloat(row[lonIdx]);
    if (Number.isNaN(latitude) || Number.isNaN(longitude)) continue;

    let confidence = 0;
    const confValue = row[confIdx];
    if (source === 'VIIRS') {
      // VIIRS confidence is numeric percent
      const num = parseFloat(confValue);
      confidence = Number.isNaN(num) ? 0 : num;
    } else {
      // MODIS confidence may be string categories (low/nominal/high); map to 30/60/90
      const val = confValue?.toLowerCase?.() || '';
      confidence = val.includes('high') ? 90 : val.includes('nominal') ? 60 : val.includes('low') ? 30 : parseFloat(confValue) || 0;
    }

    const p: FIRMSFirePoint = {
      id: `${source}-${i}-${row[dateIdx]}-${row[timeIdx]}`,
      latitude,
      longitude,
      confidence,
      brightness: brightIdx >= 0 ? parseFloat(row[brightIdx]) : undefined,
      source,
      acqDate: row[dateIdx],
      acqTime: row[timeIdx],
      satellite: satIdx >= 0 ? row[satIdx] : undefined,
      instrument: instIdx >= 0 ? row[instIdx] : undefined,
      frp: frpIdx >= 0 ? parseFloat(row[frpIdx]) : undefined,
    };
    points.push(p);
  }
  return points;
}

export async function fetchFIRMSFires(options: FetchOptions = {}): Promise<FIRMSFirePoint[]> {
  const source = options.source || 'VIIRS';
  const window: TimeWindow = options.window || '24h';
  const params: any = { source, window };
  if (options.bbox) {
    const { minLat, minLng, maxLat, maxLng } = options.bbox;
    params.bbox = `${minLat},${minLng},${maxLat},${maxLng}`;
  }

  const response = await axios.get(`${API_BASE_URL}/firms`, { params, responseType: 'text' });
  const points = parseCsv(response.data, source);

  if (options.bbox) {
    const { minLat, minLng, maxLat, maxLng } = options.bbox;
    return points.filter(p => p.latitude >= minLat && p.latitude <= maxLat && p.longitude >= minLng && p.longitude <= maxLng);
  }
  return points;
}


