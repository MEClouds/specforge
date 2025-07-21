import { Router, Request, Response, NextFunction } from 'express';
const { body, param, query, validationResult } = require('express-validator');
import { databaseService } from '../services/DatabaseService';
import { MessageType, PersonaRole } from '@prisma/client';

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

// Create message validation rules
const createMessageValidation = [
  param('conversationId')
    .isString()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Conversation ID must be a non-empty string'),
  body('content')
    .isString()
    .trim()
    .isLength({ min: 1, max: 10000 })
    .withMessage('Content must be a string between 1 and 10000 characters'),
  body('messageType')
    .isIn(['USER', 'AI'])
    .withMessage('Message type must be either USER or AI'),
  body('personaId')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Persona ID must be a non-empty string if provided'),
  body('personaName')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage(
      'Persona name must be a string between 1 and 100 characters if provided'
    ),
  body('personaRole')
    .optional()
    .isIn([
      'PRODUCT_MANAGER',
      'TECH_LEAD',
      'UX_DESIGNER',
      'DEVOPS',
      'SCRUM_MASTER',
    ])
    .withMessage(
      'Persona role must be one of: PRODUCT_MANAGER, TECH_LEAD, UX_DESIGNER, DEVOPS, SCRUM_MASTER'
    ),
  body('tokens')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Tokens must be a non-negative integer if provided'),
  body('processingTimeMs')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Processing time must be a non-negative integer if provided'),
  body('context')
    .optional()
    .custom((value: any) => {
      if (value !== null && typeof value !== 'object') {
        throw new Error('Context must be an object or null');
      }
      return true;
    }),
];

// Get messages validation rules
const getMessagesValidation = [
  param('conversationId')
    .isString()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Conversation ID must be a non-empty string'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be an integer between 1 and 100'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a non-negative integer'),
];

// Middleware to check if conversation exists
const checkConversationExists = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { conversationId } = req.params;
    const conversation = await databaseService.getConversation(conversationId);

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

    // Store conversation in request for use in route handlers
    (req as any).conversation = conversation;
    next();
  } catch (error) {
    next(error);
  }
};

// POST /api/conversations/:conversationId/messages - Add message to conversation
router.post(
  '/:conversationId/messages',
  createMessageValidation,
  handleValidationErrors,
  checkConversationExists,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { conversationId } = req.params;
      const {
        content,
        messageType,
        personaId,
        personaName,
        personaRole,
        tokens,
        processingTimeMs,
        context,
      } = req.body;

      // Validate AI message requirements
      if (messageType === 'AI') {
        if (!personaName || !personaRole) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'AI messages must include personaName and personaRole',
              timestamp: new Date().toISOString(),
              requestId: req.headers['x-request-id'] || 'unknown',
            },
          });
        }
      }

      const message = await databaseService.addMessage({
        conversationId,
        content,
        messageType: messageType as MessageType,
        personaId,
        personaName,
        personaRole: personaRole as PersonaRole,
        tokens,
        processingTimeMs,
        context,
      });

      res.status(201).json({
        success: true,
        data: {
          message: {
            id: message.id,
            conversationId: message.conversationId,
            personaId: message.personaId,
            personaName: message.personaName,
            personaRole: message.personaRole,
            content: message.content,
            messageType: message.messageType,
            tokens: message.tokens,
            processingTimeMs: message.processingTimeMs,
            context: message.context,
            createdAt: message.createdAt,
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

// GET /api/conversations/:conversationId/messages - Get messages for conversation
router.get(
  '/:conversationId/messages',
  getMessagesValidation,
  handleValidationErrors,
  checkConversationExists,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { conversationId } = req.params;
      const limit = req.query.limit
        ? parseInt(req.query.limit as string)
        : undefined;
      const offset = req.query.offset
        ? parseInt(req.query.offset as string)
        : undefined;

      const messages = await databaseService.getMessages(
        conversationId,
        limit,
        offset
      );

      res.json({
        success: true,
        data: {
          messages: messages.map((msg) => ({
            id: msg.id,
            conversationId: msg.conversationId,
            personaId: msg.personaId,
            personaName: msg.personaName,
            personaRole: msg.personaRole,
            content: msg.content,
            messageType: msg.messageType,
            tokens: msg.tokens,
            processingTimeMs: msg.processingTimeMs,
            context: msg.context,
            createdAt: msg.createdAt,
          })),
          pagination: {
            limit: limit || null,
            offset: offset || 0,
            total: messages.length,
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

export default router;
