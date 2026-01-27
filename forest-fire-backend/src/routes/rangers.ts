import { Router, Response } from 'express';
import { FireReport } from '../models';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import { fetchFirmsData } from './firms';
import { Op } from 'sequelize';

const router = Router();

// Protect all ranger routes
router.use(authenticateToken);
// Allow 'ranger' AND 'admin' (admins usually have superuser access, but specifically targeting rangers here)
router.use(requireRole(['ranger', 'admin']));

interface RiskPoint {
    latitude: number;
    longitude: number;
    riskScore: number; // 0 to 100+
    factors: {
        userReports: number;
        firmsData: number;
        weatherMultiplier: number; // default 1
    };
}

// GET /api/rangers/risk-map
router.get('/risk-map', async (req: AuthRequest, res: Response) => {
    try {
        // 1. Fetch Active User Reports (Verified/High Confidence)
        // We consider 'confirmed' reports OR 'unverified' with high ML confidence (>80%)
        const userReports = await FireReport.findAll({
            where: {
                status: { [Op.in]: ['confirmed', 'unverified'] },
                // Optional: Filter by recent time (last 48h) to keep map relevant
            }
        });

        // 2. Fetch FIRMS Data (Real satellite detections)
        // This is "Ground Truth" from space
        let firmsData: any[] = [];
        try {
            firmsData = await fetchFirmsData('VIIRS', '24h'); 
        } catch (e) {
            console.warn("Failed to fetch FIRMS data for risk map integration");
        }

        // 3. Cluster/Aggregate Logic (Simplified Grid or Point-based)
        // For this implementation, we will treat every verified report and firms point as a "Risk Center"
        // and calculate its score.
        
        const riskPoints: RiskPoint[] = [];

        // Process User Reports
        userReports.forEach(report => {
            let score = 0;
            const reliability = report.status === 'confirmed' ? 1.0 : (report.confidence || 0) / 100;
            
            // Base score for a report: 50 points * reliability
            score += 50 * reliability;

            // TODO: In a real app, we would query Weather for this specific point here
            // const weather = fetchWeather(report.locationLat, report.locationLng)
            // if (weather.wind > 30) score *= 1.5;

            riskPoints.push({
                latitude: report.locationLat,
                longitude: report.locationLng,
                riskScore: Math.round(score),
                factors: {
                    userReports: 1,
                    firmsData: 0,
                    weatherMultiplier: 1
                }
            });
        });

        // Process FIRMS Data
        firmsData.forEach(point => {
            // FIRMS point format from CSV: latitude, longitude, confidence/bright_ti4/scan etc.
            const lat = parseFloat(point.latitude);
            const lng = parseFloat(point.longitude);
            
            if (isNaN(lat) || isNaN(lng)) return;

            // Check if this point is near an existing user report (Duplicate detection)
            // Simple Euclidian distance check (approximate)
            const nearby = riskPoints.find(p => 
                Math.abs(p.latitude - lat) < 0.01 && Math.abs(p.longitude - lng) < 0.01
            );

            if (nearby) {
                // Reinforce existing risk point
                nearby.riskScore += 30; // Add 30 points for Satellite confirmation
                nearby.factors.firmsData += 1;
            } else {
                // New Risk Point
                riskPoints.push({
                    latitude: lat,
                    longitude: lng,
                    riskScore: 30, // Base score for Satellite only
                    factors: {
                        userReports: 0,
                        firmsData: 1,
                        weatherMultiplier: 1
                    }
                });
            }
        });

        res.json(riskPoints);

    } catch (error) {
        console.error("Risk Map Error:", error);
        res.status(500).json({ error: "Failed to generate risk map" });
    }
});

// Ranger Actions: Validate Report
router.post('/reports/:id/validate', async (req: AuthRequest, res: Response) => {
    try {
        // Rangers can confirm reports
        const report = await FireReport.findByPk(req.params.id);
        if (!report) return res.status(404).json({error: "Report not found"});

        report.status = 'confirmed';
        // Ranger ID could be logged here: report.validatedBy = req.user.id
        await report.save();

        res.json({ success: true, report });
    } catch(e) {
        res.status(500).json({ error: "Action failed" });
    }
});

export default router;
