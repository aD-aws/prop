import { Router } from 'express';
import { CommunicationService } from '../services/CommunicationService';
import { authenticateToken as auth, AuthenticatedRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { z } from 'zod';

const router = Router();
const communicationService = new CommunicationService();

const SendMessageSchema = z.object({
  projectId: z.string(),
  recipientId: z.string(),
  subject: z.string().optional(),
  content: z.string().min(1),
  attachments: z.array(z.object({
    filename: z.string(),
    url: z.string(),
    size: z.number()
  })).optional()
});

// Send a message
router.post('/', auth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.userId;
    const validatedData = SendMessageSchema.parse(req.body);

    const message = await communicationService.sendMessage({
      ...validatedData,
      senderId: userId
    });

    res.status(201).json({
      success: true,
      data: message
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.errors
      });
      return;
    }

    logger.error('Failed to send message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send message'
    });
  }
});

// Get messages for a project
router.get('/project/:projectId', auth, async (req: AuthenticatedRequest, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user!.userId;
    const limit = parseInt(req.query.limit as string) || 50;
    const lastKey = req.query.lastKey as string;

    const result = await communicationService.getProjectMessages(projectId, userId, limit, lastKey);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Failed to get project messages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get project messages'
    });
  }
});

// Get user's messages
router.get('/user', auth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.userId;
    const limit = parseInt(req.query.limit as string) || 50;
    const lastKey = req.query.lastKey as string;

    const result = await communicationService.getUserMessages(userId, limit, lastKey);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Failed to get user messages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user messages'
    });
  }
});

// Get conversation between two users for a project
router.get('/conversation/:projectId/:otherUserId', auth, async (req: AuthenticatedRequest, res) => {
  try {
    const { projectId, otherUserId } = req.params;
    const userId = req.user!.userId;
    const limit = parseInt(req.query.limit as string) || 50;

    const messages = await communicationService.getConversation(projectId, userId, otherUserId, limit);

    res.json({
      success: true,
      data: messages
    });
  } catch (error) {
    logger.error('Failed to get conversation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get conversation'
    });
  }
});

// Mark message as read
router.patch('/:messageId/read', auth, async (req: AuthenticatedRequest, res) => {
  try {
    const { messageId } = req.params;
    const { projectId } = req.body;
    const userId = req.user!.userId;

    if (!projectId) {
      res.status(400).json({
        success: false,
        error: 'Project ID is required'
      });
      return;
    }

    await communicationService.markMessageAsRead(messageId, projectId, userId);

    res.json({
      success: true,
      message: 'Message marked as read'
    });
  } catch (error) {
    logger.error('Failed to mark message as read:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark message as read'
    });
  }
});

// Get unread message count
router.get('/unread-count', auth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.userId;
    const count = await communicationService.getUnreadMessageCount(userId);

    res.json({
      success: true,
      data: { count }
    });
  } catch (error) {
    logger.error('Failed to get unread message count:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get unread message count'
    });
  }
});

// Send clarification request (builder to homeowner)
router.post('/clarification', auth, async (req: AuthenticatedRequest, res) => {
  try {
    const builderId = req.user!.userId;
    const { projectId, question } = req.body;

    if (!projectId || !question) {
      res.status(400).json({
        success: false,
        error: 'Project ID and question are required'
      });
      return;
    }

    const message = await communicationService.sendClarificationRequest(projectId, builderId, question);

    res.status(201).json({
      success: true,
      data: message
    });
  } catch (error) {
    logger.error('Failed to send clarification request:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send clarification request'
    });
  }
});

export default router;