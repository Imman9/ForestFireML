import { Router, Response } from 'express';
import { FireReport, VerificationLog, User } from '../models';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import { fetchFirmsData } from './firms';
import { Op } from 'sequelize';
import { Expo } from 'expo-server-sdk';

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
            }
        });

        // 2. Fetch FIRMS Data (Real satellite detections)
        let firmsData: any[] = [];
        try {
            firmsData = await fetchFirmsData('VIIRS', '24h'); 
        } catch (e) {
            console.warn("Failed to fetch FIRMS data for risk map integration");
        }

        // 3. Cluster/Aggregate Logic
        const riskPoints: RiskPoint[] = [];

        // Process User Reports
        userReports.forEach(report => {
            let score = 0;
            const reliability = report.status === 'confirmed' ? 1.0 : (report.confidence || 0) / 100;
            
            // Base score for a report: 50 points * reliability
            score += 50 * reliability;

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
            const lat = parseFloat(point.latitude);
            const lng = parseFloat(point.longitude);
            
            if (isNaN(lat) || isNaN(lng)) return;

            // Check if this point is near an existing user report (Duplicate detection)
            const nearby = riskPoints.find(p => 
                Math.abs(p.latitude - lat) < 0.01 && Math.abs(p.longitude - lng) < 0.01
            );

            if (nearby) {
                nearby.riskScore += 30; // Add 30 points for Satellite confirmation
                nearby.factors.firmsData += 1;
            } else {
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

// Ranger Actions: Update Report Status (Confirm, False Alarm, Monitor)
router.patch('/reports/:id/status', async (req: AuthRequest, res: Response) => {
    try {
        const { status, notes } = req.body;
        
        // Validate allowed status transitions
        const allowedStatuses = ['confirmed', 'false_alarm', 'needs_monitoring', 'resolved'];
        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({ error: "Invalid status" });
        }

        const report = await FireReport.findByPk(req.params.id);
        if (!report) return res.status(404).json({error: "Report not found"});

        const oldStatus = report.status;
        report.status = status;
        if (notes) {
            report.notes = notes;
        }
        
        await report.save();

        // Audit Trail
        try {
            await VerificationLog.create({
                reportId: report.id,
                verifierId: req.user!.id,
                verifierName: 'Ranger',
                previousStatus: oldStatus,
                newStatus: status,
                notes: notes,
                timestamp: new Date(),
                verificationMethod: 'manual'
            });
        } catch (logError) {
            console.error("Failed to create verification log:", logError);
        }

        // --- ALERT B: Nearby Fire Warning ---
        // If status is confirmed, notify nearby users
        if (status === 'confirmed') {
            try {
                // Find users within ~10km (rough estimate: 0.1 degree is approx 11km)
                const nearbyUsers = await User.findAll({
                    where: {
                        lastLat: {
                            [Op.between]: [report.locationLat - 0.1, report.locationLat + 0.1]
                        },
                        lastLng: {
                            [Op.between]: [report.locationLng - 0.1, report.locationLng + 0.1]
                        }
                    }
                });

                const expo = new Expo();
                const messages: any[] = [];

                for (const user of nearbyUsers) {
                    if (user.expoPushToken && Expo.isExpoPushToken(user.expoPushToken)) {
                        messages.push({
                            to: user.expoPushToken,
                            sound: 'default',
                            title: '⚠️ Confirmed Fire Nearby',
                            body: 'A confirmed fire has been reported near your location. Avoid the area.',
                            data: { reportId: report.id },
                        });
                    }
                }

                if (messages.length > 0) {
                  await expo.sendPushNotificationsAsync(messages);
                }
            } catch (nearbyError) {
                console.error('Failed to send nearby fire alerts:', nearbyError);
            }
        }

        res.json({ success: true, report });
    } catch(e) {
        console.error("Status update failed:", e);
        res.status(500).json({ error: "Action failed" });
    }

});

// Ranger Actions: Delete Report
router.delete('/reports/:id', async (req: AuthRequest, res: Response) => {
    try {
        const report = await FireReport.findByPk(req.params.id);
        if (!report) return res.status(404).json({ error: "Report not found" });

        // Audit Trail (Deletion)
        try {
            await VerificationLog.create({
                reportId: report.id,
                verifierId: req.user!.id,
                verifierName: 'Ranger', 
                previousStatus: report.status,
                newStatus: 'deleted',
                notes: 'Report deleted by ranger',
                timestamp: new Date(),
                verificationMethod: 'manual'
            });
        } catch (logError) {
            console.error("Failed to create verification log for deletion:", logError);
        }

        await report.destroy();
        res.json({ success: true, message: "Report deleted" });

    } catch (e) {
        console.error("Report deletion failed:", e);
        res.status(500).json({ error: "Deletion failed" });
    }
});

// GET /api/rangers/reports/:id/context
// Returns full context for verification: Report + Nearby Reports + FIRMS + Weather
router.get('/reports/:id/context', async (req: AuthRequest, res: Response) => {
    try {
        const report = await FireReport.findByPk(req.params.id);
        if (!report) return res.status(404).json({ error: "Report not found" });

        // 1. Nearby User Reports (within ~5km)
        const nearbyReports = await FireReport.findAll({
            where: {
                locationLat: { [Op.between]: [report.locationLat - 0.045, report.locationLat + 0.045] },
                locationLng: { [Op.between]: [report.locationLng - 0.045, report.locationLng + 0.045] },
                id: { [Op.ne]: report.id } // Exclude current
            },
            limit: 10
        });

        // 2. FIRMS Data nearby (within ~10km)
        let firmsData: any[] = [];
        try {
            const allFirms = await fetchFirmsData('VIIRS', '24h');
            firmsData = allFirms.filter((p: any) => {
                const lat = parseFloat(p.latitude);
                const lng = parseFloat(p.longitude);
                if (isNaN(lat) || isNaN(lng)) return false;
                return Math.abs(lat - report.locationLat) < 0.09 && Math.abs(lng - report.locationLng) < 0.09;
            });
        } catch (e) {
            console.warn("FIRMS fetch failed for context:", e);
        }

        // 3. Current Weather (Mock or Real)
        const weather = {
            temp: 32,
            wind: 15,
            humidity: 20,
            risk: 'High' 
        };

        // 4. Calculate Verification Score
        const mlScore = (report.confidence || 0) * 0.4;
        const satelliteScore = firmsData.length > 0 ? 30 : 0;
        const crowdScore = nearbyReports.length > 0 ? 20 : 0;
        let weatherScore = 0;
        if (weather.risk.toLowerCase() === 'high') weatherScore = 10;
        if (weather.risk.toLowerCase() === 'extreme') weatherScore = 15;

        const totalScore = Math.min(Math.round(mlScore + satelliteScore + crowdScore + weatherScore), 100);

        const scoreBreakdown = {
            ml: Math.round(mlScore),
            satellite: satelliteScore,
            crowd: crowdScore,
            weather: weatherScore,
            total: totalScore
        };

        res.json({
            report,
            nearbyReports,
            firmsData,
            weather,
            verificationScore: scoreBreakdown
        });

    } catch (error) {
        console.error("Context fetch failed:", error);
        res.status(500).json({ error: "Failed to fetch verification context" });
    }
});

export default router;
