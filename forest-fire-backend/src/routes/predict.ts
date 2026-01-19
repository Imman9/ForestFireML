import { Router, Request, Response } from 'express';
import axios from "axios";


const router = Router();

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";

router.post("/", async (req: Request, res: Response) => {
  const { image } = req.body;

  if (!image) {
    return res.status(400).json({ error: "No image provided" });
  }

  try {
    // Forward request to Python ML Service
    const response = await axios.post(`${ML_SERVICE_URL}/predict`, { image });
    return res.json(response.data);
  } catch (err: any) {
    console.error("ML Service Error:", err.message);
    return res.status(500).json({ error: "Failed to contact ML server", details: err.message });
  }
});

export default router; 