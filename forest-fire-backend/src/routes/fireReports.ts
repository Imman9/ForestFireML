import { Router, Request, Response } from 'express';
import { FireReport, User } from '../models';
import { Expo } from 'expo-server-sdk';

const router = Router();

// Submit a new fire report
router.post('/', async (req: Request, res: Response) => {
  try {
    const { userId, userName, imageUrl, location, description, weatherData, confidence } = req.body;
    const newReport = await FireReport.create({
      userId,
      userName,
      imageUrl,
      locationLat: location.latitude,
      locationLng: location.longitude,
      address: location.address,
      description,
      weatherData: weatherData ? JSON.stringify(weatherData) : undefined,
      confidence,
      status: 'unverified',
    });
    
    // Format response to match frontend expectations
    const response = {
      id: newReport.id,
      userId: newReport.userId,
      userName: newReport.userName,
      location: {
        latitude: newReport.locationLat,
        longitude: newReport.locationLng,
        address: newReport.address,
      },
      imageUrl: newReport.imageUrl,
      description: newReport.description,
      status: newReport.status,
      confidence: newReport.confidence,
      weatherData: newReport.weatherData ? JSON.parse(newReport.weatherData) : undefined,
      timestamp: newReport.timestamp,
    };
    
    // --- ALERT A: Report Submission Feedback ---
    // If the user has a push token, send them a confirmation
    try {
      const user = await User.findByPk(userId);
      if (user && user.expoPushToken && Expo.isExpoPushToken(user.expoPushToken)) {
        const expo = new Expo();
        await expo.sendPushNotificationsAsync([{
          to: user.expoPushToken,
          sound: 'default',
          title: 'Report Received',
          body: `Fire likelihood: ${confidence > 0.5 ? 'HIGH' : 'MODERATE'}. Awaiting ranger verification.`,
          data: { reportId: newReport.id },
        }]);
      }
    } catch (notifError) {
      console.error('Failed to send submission feedback:', notifError);
    }

    // --- ALERT D: High-confidence Fire Report (Ranger Alert) ---
    if (confidence && confidence > 0.8) {
      try {
        // Find all rangers with push tokens
        const rangers = await User.findAll({ where: { role: 'ranger' } });
        const expo = new Expo();
        const messages: any[] = [];
        
        for (const ranger of rangers) {
          if (ranger.expoPushToken && Expo.isExpoPushToken(ranger.expoPushToken)) {
            messages.push({
              to: ranger.expoPushToken,
              sound: 'default',
              title: '🚨 High-Confidence Fire Report',
              body: 'Immediate review recommended.',
              data: { reportId: newReport.id },
            });
          }
        }
        
        if (messages.length > 0) {
          await expo.sendPushNotificationsAsync(messages);
        }
      } catch (rangerError) {
        console.error('Failed to send ranger alerts:', rangerError);
      }
    }

    res.status(201).json(response);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create fire report', details: error });
  }
});

// List all fire reports
router.get('/', async (req: Request, res: Response) => {
  try {
    const reports = await FireReport.findAll({
      order: [['timestamp', 'DESC']],
    });
    
    // Format response to match frontend expectations
    const formattedReports = reports.map(report => ({
      id: report.id,
      userId: report.userId,
      userName: report.userName,
      location: {
        latitude: report.locationLat,
        longitude: report.locationLng,
        address: report.address,
      },
      imageUrl: report.imageUrl,
      description: report.description,
      status: report.status,
      confidence: report.confidence,
      weatherData: report.weatherData ? JSON.parse(report.weatherData) : undefined,
      timestamp: report.timestamp,
    }));
    
    res.json(formattedReports);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch fire reports', details: error });
  }
});

// Get a fire report by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const report = await FireReport.findByPk(req.params.id);
    if (!report) return res.status(404).json({ error: 'Not found' });
    
    // Format response to match frontend expectations
    const formattedReport = {
      id: report.id,
      userId: report.userId,
      userName: report.userName,
      location: {
        latitude: report.locationLat,
        longitude: report.locationLng,
        address: report.address,
      },
      imageUrl: report.imageUrl,
      description: report.description,
      status: report.status,
      confidence: report.confidence,
      weatherData: report.weatherData ? JSON.parse(report.weatherData) : undefined,
      timestamp: report.timestamp,
    };
    
    res.json(formattedReport);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch fire report', details: error });
  }
});

// Update report status (PATCH)
router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    
    if (!status || !['unverified', 'confirmed', 'resolved',].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be unverified, confirmed, or resolved' });
    }
    
    const report = await FireReport.findByPk(req.params.id);
    if (!report) return res.status(404).json({ error: 'Report not found' });
    
    report.status = status;
    await report.save();
    
    // Format response to match frontend expectations
    const formattedReport = {
      id: report.id,
      userId: report.userId,
      userName: report.userName,
      location: {
        latitude: report.locationLat,
        longitude: report.locationLng,
        address: report.address,
      },
      imageUrl: report.imageUrl,
      description: report.description,
      status: report.status,
      confidence: report.confidence,
      weatherData: report.weatherData ? JSON.parse(report.weatherData) : undefined,
      timestamp: report.timestamp,
    };
    
    res.json(formattedReport);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update report status', details: error });
  }
});

export default router; 