import { Router, Request, Response } from 'express';
import { FireReport } from '../models';

const router = Router();

// Submit a new fire report
router.post('/', async (req: Request, res: Response) => {
  try {
    const { userId, imageUrl, location, description } = req.body;
    const newReport = await FireReport.create({
      userId,
      imageUrl,
      locationLat: location.latitude,
      locationLng: location.longitude,
      description,
      status: 'unverified',
    });
    res.status(201).json(newReport);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create fire report', details: error });
  }
});

// List all fire reports
router.get('/', async (req: Request, res: Response) => {
  try {
    const reports = await FireReport.findAll();
    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch fire reports', details: error });
  }
});

// Get a fire report by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const report = await FireReport.findByPk(req.params.id);
    if (!report) return res.status(404).json({ error: 'Not found' });
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch fire report', details: error });
  }
});

export default router; 