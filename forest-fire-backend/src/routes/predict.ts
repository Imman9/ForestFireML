import { Router, Request, Response } from 'express';
import axios from "axios";


const router = Router();

router.post("/", async (req: Request, res: Response) => {
  const { image } = req.body;

  if (!image) {
    return res.status(400).json({ error: "No image provided" });
  }

  try {
    const response = await axios.post(" https://wrapping-began-diego-emotions.trycloudflare.com/predict ", { image });
    return res.json(response.data);
  } catch (err) {
    return res.status(500).json({ error: "Failed to contact ML server" });
  }
});

export default router; 