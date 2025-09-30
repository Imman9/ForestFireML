import { Router, Request, Response } from 'express';
import multer from 'multer';

const router = Router();
const upload = multer({ dest: 'uploads/' });

// POST /api/predict
router.post('/', upload.single('image'), async (req: Request, res: Response) => {
  // In a real app, send req.file.path to your ML model/service
  // For now, return a mock prediction
  res.json({
    fireDetected: Math.random() > 0.5,
    confidence: Math.floor(Math.random() * 100),
    class: 'mock',
  });
});

export default router; 