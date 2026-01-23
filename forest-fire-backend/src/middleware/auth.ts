import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv'; // Ensure dotenv is loaded if accessing process.env here directly, though usually loaded in app.ts

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

// Extend Express Request to include user
export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: 'user' | 'ranger' | 'admin';
  };
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};
