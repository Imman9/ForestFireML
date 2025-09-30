import { Router, Request, Response } from 'express';
import { User } from '../models';
import { Expo } from 'expo-server-sdk';

const router = Router();
const expo = new Expo();

// POST /api/notifications/send
router.post('/send', async (req: Request, res: Response) => {
  try {
    const { userId, title, body, data } = req.body;
    const user = await User.findByPk(userId);
    if (!user || !user.expoPushToken) return res.status(404).json({ error: 'User or push token not found' });
    if (!Expo.isExpoPushToken(user.expoPushToken)) return res.status(400).json({ error: 'Invalid Expo push token' });
    const messages = [{
      to: user.expoPushToken,
      sound: 'default',
      title,
      body,
      data,
    }];
    const ticketChunk = await expo.sendPushNotificationsAsync(messages);
    res.json({ success: true, ticketChunk });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send notification', details: error });
  }
});

export default router; 