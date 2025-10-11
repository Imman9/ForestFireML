import { Router, Request, Response } from 'express';
import axios from 'axios';

const router = Router();

// ENV: EARTHDATA_USERNAME, EARTHDATA_PASSWORD (optional)
// Query: window=24h|48h|7d, source=VIIRS|MODIS, bbox=minLat,minLng,maxLat,maxLng

const PUBLIC_VIIRS_URLS: Record<string, string> = {
  '24h': 'https://firms.modaps.eosdis.nasa.gov/data/active_fire/viirs/csv/VNP14IMGTDL_NRT_Global_24h.csv',
  '48h': 'https://firms.modaps.eosdis.nasa.gov/data/active_fire/viirs/csv/VNP14IMGTDL_NRT_Global_48h.csv',
  '7d': 'https://firms.modaps.eosdis.nasa.gov/data/active_fire/viirs/csv/VNP14IMGTDL_NRT_Global_7d.csv',
};

const PUBLIC_MODIS_URLS: Record<string, string> = {
  '24h': 'https://firms.modaps.eosdis.nasa.gov/data/active_fire/c6/csv/MODIS_C6_1_Global_24h.csv',
  '48h': 'https://firms.modaps.eosdis.nasa.gov/data/active_fire/c6/csv/MODIS_C6_1_Global_48h.csv',
  '7d': 'https://firms.modaps.eosdis.nasa.gov/data/active_fire/c6/csv/MODIS_C6_1_Global_7d.csv',
};

function selectUrl(source: string, window: string): string {
  const s = (source || 'VIIRS').toUpperCase();
  const w = window || '24h';
  return s === 'VIIRS' ? PUBLIC_VIIRS_URLS[w] : PUBLIC_MODIS_URLS[w];
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const { window = '24h', source = 'VIIRS', bbox } = req.query as any;
    const url = selectUrl(source, window);

    const username = process.env.EARTHDATA_USERNAME;
    const password = process.env.EARTHDATA_PASSWORD;
    const apiKey = process.env.FIRMS_API_KEY;

    const axiosConfig: any = { responseType: 'text' };
    if (username && password) {
      axiosConfig.auth = { username, password };
    }

    let resp;
    // Try API key if provided
    if (apiKey) {
      const urlWithKey = `${url}${url.includes('?') ? '&' : '?'}api_key=${apiKey}`;
      try {
        resp = await axios.get<string>(urlWithKey, axiosConfig);
      } catch (err: any) {
        console.warn('[FIRMS] API key request failed:', err?.response?.status, err?.response?.data?.slice?.(0, 200));
      }
    }

    // If no response yet, try with basic auth (if provided)
    if (!resp) {
      try {
        resp = await axios.get<string>(url, axiosConfig);
      } catch (err: any) {
        console.warn('[FIRMS] Basic/public request failed:', err?.response?.status, err?.response?.data?.slice?.(0, 200));
      }
    }

    // If still no response, try public without auth at all
    if (!resp) {
      try {
        resp = await axios.get<string>(url, { responseType: 'text' });
      } catch (err: any) {
        // If VIIRS fails (e.g., 404), try MODIS as a final fallback
        const requestedSource = (source || 'VIIRS').toUpperCase();
        if (requestedSource === 'VIIRS') {
          const modisUrl = PUBLIC_MODIS_URLS[window] || PUBLIC_MODIS_URLS['24h'];
          try {
            resp = await axios.get<string>(modisUrl, { responseType: 'text' });
            // Mark header so client knows MODIS was served
            res.setHeader('X-FIRMS-Source', 'MODIS');
          } catch (err2: any) {
            console.error('[FIRMS] Public fallback failed:', err?.response?.status, err?.response?.data?.slice?.(0, 200));
            const status = err2?.response?.status || err2?.code || 500;
            const detail = err2?.response?.data || err2?.message;
            return res.status(502).json({ error: 'Failed to fetch FIRMS upstream', status, detail });
          }
        } else {
          console.error('[FIRMS] Public fallback failed:', err?.response?.status, err?.response?.data?.slice?.(0, 200));
          const status = err?.response?.status || err?.code || 500;
          const detail = err?.response?.data || err?.message;
          return res.status(502).json({ error: 'Failed to fetch FIRMS upstream', status, detail });
        }
      }
    }

    let csv = resp.data;

    // Optional bbox filtering on server to reduce payload
    if (bbox) {
      const [minLat, minLng, maxLat, maxLng] = (bbox as string).split(',').map(parseFloat);
      const lines = csv.trim().split(/\r?\n/);
      const header = lines[0];
      const cols = header.split(',');
      const latIdx = cols.indexOf('latitude');
      const lonIdx = cols.indexOf('longitude');
      const filtered = [header, ...lines.slice(1).filter(line => {
        const row = line.split(',');
        const lat = parseFloat(row[latIdx]);
        const lon = parseFloat(row[lonIdx]);
        return lat >= minLat && lat <= maxLat && lon >= minLng && lon <= maxLng;
      })];
      csv = filtered.join('\n');
    }

    res.setHeader('Content-Type', 'text/csv');
    res.send(csv);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch FIRMS data' });
  }
});

export default router;


