import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

export const requireRole = (roles: Array<'user' | 'ranger' | 'admin'>) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.sendStatus(401);
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    next();
  };
};
