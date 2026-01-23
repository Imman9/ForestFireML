'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';

export default function SettingsForm() {
  const [threshold, setThreshold] = useState('0.7');
  const [radius, setRadius] = useState('10');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await api.get('/admin/settings');
      const data = res.data;
      if (Array.isArray(data)) {
        const th = data.find((s: any) => s.key === 'ml_confidence_threshold');
        if (th) setThreshold(th.value);
        const rad = data.find((s: any) => s.key === 'firms_radius');
        if (rad) setRadius(rad.value);
      }
    } catch (err) {
      console.error(err);
    } finally {
        setLoading(false);
    }
  };

  const saveSetting = async (key: string, value: string, desc: string) => {
    await api.put('/admin/settings', { key, value, description: desc });
  };

  const handleSave = async () => {
    try {
      await saveSetting('ml_confidence_threshold', threshold, 'Minimum confidence for ML detection');
      await saveSetting('firms_radius', radius, 'Radius in km for FIRMS correlation');
      alert('Settings saved successfully!');
    } catch (err) {
      alert('Failed to save settings');
    }
  };

  if (loading) return <div className="p-4">Loading settings...</div>;

  return (
    <div className="space-y-6 max-w-lg bg-white p-6 rounded-lg shadow-sm border border-gray-200">
       <h2 className="text-xl font-semibold text-gray-800">System Parameters</h2>
       
       <div>
         <label className="block text-sm font-medium text-gray-700 mb-1">ML Confidence Threshold (0.0 - 1.0)</label>
         <input 
            type="number" step="0.05" min="0" max="1"
            className="w-full p-2 border rounded focus:ring-2 focus:ring-orange-500 outline-none"
            value={threshold}
            onChange={e => setThreshold(e.target.value)}
         />
         <p className="text-xs text-slate-500 mt-1">Lower values trigger more alerts, higher values reduce false positives.</p>
       </div>

       <div>
         <label className="block text-sm font-medium text-gray-700 mb-1">FIRMS Radius (km)</label>
         <input 
            type="number" 
            className="w-full p-2 border rounded focus:ring-2 focus:ring-orange-500 outline-none"
            value={radius}
            onChange={e => setRadius(e.target.value)}
         />
         <p className="text-xs text-slate-500 mt-1">Distance to search for satellite thermal hotspots near reports.</p>
       </div>

       <button onClick={handleSave} className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700 transition font-medium">
          Save Changes
       </button>
    </div>
  );
}
