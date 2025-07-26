import { Router, Request, Response, NextFunction } from 'express';
const { body, param, query, validationResult } = require('express-validator');
import { databaseService } from '../services/DatabaseService';
import { Complexity, ConversationStatus } from '@prisma/client';

const router = Router();

// Validation middleware
const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: errors.array(),
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      },
    });
  }
  next();
};

// Create conversation validation rules
const createConversationValidation = [
  body('title')
    .isString()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Title must be a string between 1 and 255 characters'),
  body('description')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must be a string with maximum 1000 characters'),
  body('appIdea')
    .isString()
    .trim()
    .isLength({ min: 10, max: 5000 })
    .withMessage('App idea must be a string between 10 and 5000 characters'),
  body('targetUsers')
    .isArray({ min: 1 })
    .withMessage('Target users must be a non-empty array')
    .custom((value: any) => {
      if (
        !Array.isArray(value) ||
        !value.every(
          (item: any) => typeof item === 'string' && item.trim().length > 0
        )
      ) {
        throw new Error('All target users must be non-empty strings');
      }
      return true;
    }),
  body('complexity')
    .optional()
    .isIn(['SIMPLE', 'MODERATE', 'COMPLEX'])
    .withMessage('Complexity must be one of: SIMPLE, MODERATE, COMPLEX'),
  body('userId')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1 })
    .withMessage('User ID must be a non-empty string if provided'),
];

// Get conversation validation rules
const getConversationValidation = [
  param('id')
    .isString()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Conversation ID must be a non-empty string'),
];

// Get conversations list validation rules
const getConversationsValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('status')
    .optional()
    .isIn(['ACTIVE', 'COMPLETED', 'ARCHIVED'])
    .withMessage('Status must be one of: ACTIVE, COMPLETED, ARCHIVED'),
];

// Update conversation validation rules
const updateConversationValidation = [
  param('id')
    .isString()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Conversation ID must be a non-empty string'),
  body('status')
    .optional()
    .isIn(['ACTIVE', 'COMPLETED', 'ARCHIVED'])
    .withMessage('Status must be one of: ACTIVE, COMPLETED, ARCHIVED'),
  body('title')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Title must be a string between 1 and 255 characters'),
  body('description')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must be a string with maximum 1000 characters'),
];

// POST /api/conversations - Create new conversation
router.post(
  '/',
  createConversationValidation,
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { title, description, appIdea, targetUsers, complexity, userId } =
        req.body;

      const conversation = await databaseService.createConversation({
        title,
        description,
        appIdea,
        targetUsers,
        complexity: complexity as Complexity,
        userId,
      });

      res.status(201).json({
        success: true,
        data: {
          conversation: {
            id: conversation.id,
            title: conversation.title,
            description: conversation.description,
            status: conversation.status,
            appIdea: conversation.appIdea,
            targetUsers: conversation.targetUsers,
            complexity: conversation.complexity,
            createdAt: conversation.createdAt,
            updatedAt: conversation.updatedAt,
            messageCount: conversation.messages.length,
            specificationCount: conversation.specifications.length,
          },
        },
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/conversations/:id - Get conversation by ID
router.get(
  '/:id',
  getConversationValidation,
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const conversation = await databaseService.getConversation(id);

      if (!conversation) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'CONVERSATION_NOT_FOUND',
            message: 'Conversation not found',
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'] || 'unknown',
          },
        });
      }

      res.json({
        success: true,
        data: {
          conversation: {
            id: conversation.id,
            title: conversation.title,
            description: conversation.description,
            status: conversation.status,
            appIdea: conversation.appIdea,
            targetUsers: conversation.targetUsers,
            complexity: conversation.complexity,
            createdAt: conversation.createdAt,
            updatedAt: conversation.updatedAt,
            messageCount: conversation.messages.length,
            specificationCount: conversation.specifications.length,
            messages: conversation.messages.map((msg) => ({
              id: msg.id,
              personaId: msg.personaId,
              personaName: msg.personaName,
              personaRole: msg.personaRole,
              content: msg.content,
              messageType: msg.messageType,
              tokens: msg.tokens,
              processingTimeMs: msg.processingTimeMs,
              createdAt: msg.createdAt,
            })),
            specifications: conversation.specifications.map((spec) => ({
              id: spec.id,
              version: spec.version,
              totalTokens: spec.totalTokens,
              generationTimeMs: spec.generationTimeMs,
              fileSizeBytes: spec.fileSizeBytes,
              generatedAt: spec.generatedAt,
            })),
          },
        },
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/conversations - Get conversations list with pagination
router.get(
  '/',
  getConversationsValidation,
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const status = req.query.status as ConversationStatus | undefined;

      const conversations = await databaseService.getConversations({
        page,
        limit,
        status,
      });

      res.json({
        success: true,
        data: {
          conversations: conversations.data.map((conv) => ({
            id: conv.id,
            userId: conv.userId,
            title: conv.title,
            description: conv.description,
            status: conv.status,
            appIdea: conv.appIdea,
            targetUsers: conv.targetUsers,
            complexity: conv.complexity,
            createdAt: conv.createdAt,
            updatedAt: conv.updatedAt,
            messageCount: conv._count.messages,
            specificationCount: conv._count.specifications,
          })),
          pagination: conversations.pagination,
        },
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      });
    } catch (error) {
      next(error);
    }
  }
);

// PATCH /api/conversations/:id - Update conversation
router.patch(
  '/:id',
  updateConversationValidation,
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { status, title, description } = req.body;

      const conversation = await databaseService.updateConversation(id, {
        status: status as ConversationStatus,
        title,
        description,
      });

      if (!conversation) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'CONVERSATION_NOT_FOUND',
            message: 'Conversation not found',
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'] || 'unknown',
          },
        });
      }

      res.json({
        success: true,
        data: {
          conversation: {
            id: conversation.id,
            userId: conversation.userId,
            title: conversation.title,
            description: conversation.description,
            status: conversation.status,
            appIdea: conversation.appIdea,
            targetUsers: conversation.targetUsers,
            complexity: conversation.complexity,
            createdAt: conversation.createdAt,
            updatedAt: conversation.updatedAt,
            messageCount: conversation._count?.messages || 0,
            specificationCount: conversation._count?.specifications || 0,
          },
        },
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/conversations/:id - Delete conversation
router.delete(
  '/:id',
  getConversationValidation,
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const deleted = await databaseService.deleteConversation(id);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'CONVERSATION_NOT_FOUND',
            message: 'Conversation not found',
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'] || 'unknown',
          },
        });
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

export default router;
