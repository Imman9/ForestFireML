import { Router, Response } from 'express';
import { User, SystemSetting } from '../models';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requireRole } from '../middleware/roles';

const router = Router();

// Protect all admin routes
router.use(authenticateToken);
router.use(requireRole(['admin']));

// Get all users
router.get('/users', async (req: AuthRequest, res: Response) => {
  try {
    const users = await User.findAll({ 
      attributes: ['id', 'name', 'email', 'role', 'expoPushToken'] // Exclude password
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Update user role
router.patch('/users/:id/role', async (req: AuthRequest, res: Response) => {
  try {
    const { role } = req.body;
    if (!['user', 'ranger', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    user.role = role;
    await user.save();
    
    res.json({ success: true, user: { id: user.id, role: user.role } });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

// Get system settings
router.get('/settings', async (req: AuthRequest, res: Response) => {
  try {
    const settings = await SystemSetting.findAll();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Update system setting
router.put('/settings', async (req: AuthRequest, res: Response) => {
  try {
    const { key, value, description } = req.body;
    
    const [setting, created] = await SystemSetting.findOrCreate({
      where: { key },
      defaults: { key, value, description }
    });
    
    if (!created) {
      setting.value = value;
      if (description) setting.description = description;
      await setting.save();
    }
    
    res.json(setting);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update setting' });
  }
});

export default router;
