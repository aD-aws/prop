import { Router } from 'express';
import { NotificationService } from '../services/NotificationService';
import { authenticateToken as auth, AuthenticatedRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();
const notificationService = new NotificationService();

// Get user notifications
router.get('/', auth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.userId;
    const limit = parseInt(req.query.limit as string) || 50;
    const lastKey = req.query.lastKey as string;

    const result = await notificationService.getUserNotifications(userId, limit, lastKey);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Failed to get notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get notifications'
    });
  }
});

// Mark notification as read
router.patch('/:notificationId/read', auth, async (req: AuthenticatedRequest, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user!.userId;

    await notificationService.markNotificationAsRead(notificationId, userId);

    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    logger.error('Failed to mark notification as read:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark notification as read'
    });
  }
});

// Get notification preferences
router.get('/preferences', auth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.userId;
    const preferences = await notificationService.getUserPreferences(userId);

    res.json({
      success: true,
      data: preferences
    });
  } catch (error) {
    logger.error('Failed to get notification preferences:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get notification preferences'
    });
  }
});

// Update notification preferences
router.put('/preferences', auth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.userId;
    const preferences = req.body;

    await notificationService.updateUserPreferences(userId, preferences);

    res.json({
      success: true,
      message: 'Notification preferences updated'
    });
  } catch (error) {
    logger.error('Failed to update notification preferences:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update notification preferences'
    });
  }
});

// Unsubscribe via token (for email links)
router.post('/unsubscribe/:token', async (req, res) => {
  try {
    const { token } = req.params;
    await notificationService.unsubscribeUser(token);

    res.json({
      success: true,
      message: 'Successfully unsubscribed from notifications'
    });
  } catch (error) {
    logger.error('Failed to unsubscribe user:', error);
    res.status(400).json({
      success: false,
      error: 'Invalid unsubscribe token'
    });
  }
});

// Send test notification (admin only)
router.post('/test', auth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { type, title, message, channels } = req.body;

    // Check if user is admin (you might want to implement proper admin check)
    const notification = await notificationService.sendNotification({
      userId,
      type: type || 'system_alert',
      title: title || 'Test Notification',
      message: message || 'This is a test notification',
      channels: channels || ['in_app'],
      priority: 'low'
    });

    res.json({
      success: true,
      data: notification
    });
  } catch (error) {
    logger.error('Failed to send test notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send test notification'
    });
  }
});

export default router;