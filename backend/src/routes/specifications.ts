import { Router, Request, Response } from 'express';
const { body, param, validationResult } = require('express-validator');
import { FileGenerationService } from '../services/FileGenerationService';
import { DatabaseService } from '../services/DatabaseService';

const router = Router();
const fileGenerationService = new FileGenerationService();
const databaseService = new DatabaseService();

/**
 * POST /api/specifications/generate
 * Generate specifications from conversation
 */
router.post(
  '/generate',
  [
    body('conversationId')
      .isUUID()
      .withMessage('Valid conversation ID is required'),
    body('aiGeneratedContent')
      .isObject()
      .withMessage('AI generated content is required'),
    body('aiGeneratedContent.requirements')
      .isString()
      .withMessage('Requirements content is required'),
    body('aiGeneratedContent.design')
      .isString()
      .withMessage('Design content is required'),
    body('aiGeneratedContent.tasks')
      .isString()
      .withMessage('Tasks content is required'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: errors.array(),
            timestamp: new Date(),
            requestId: req.headers['x-request-id'] || 'unknown',
          },
        });
      }

      const { conversationId, aiGeneratedContent } = req.body;

      // Get conversation data
      const conversation =
        await databaseService.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'CONVERSATION_NOT_FOUND',
            message: 'Conversation not found',
            timestamp: new Date(),
            requestId: req.headers['x-request-id'] || 'unknown',
          },
        });
      }

      // Generate specifications
      const startTime = Date.now();
      const generatedSpec = fileGenerationService.generateSpecifications(
        conversation,
        aiGeneratedContent
      );
      const generationTime = Date.now() - startTime;

      // Calculate file sizes
      const fileSizes = fileGenerationService.getFileSizes(generatedSpec.files);

      // Save to database
      const specification = await databaseService.createSpecification({
        conversationId,
        requirements: generatedSpec.files.requirements,
        design: generatedSpec.files.design,
        tasks: generatedSpec.files.tasks,
        totalTokens: req.body.totalTokens,
        generationTimeMs: generationTime,
        fileSizeBytes: fileSizes.total,
      });

      res.json({
        success: true,
        data: {
          id: specification.id,
          files: generatedSpec.files,
          metadata: generatedSpec.metadata,
          validation: generatedSpec.validation,
          fileSizes,
          generationTimeMs: generationTime,
        },
      });
    } catch (error) {
      console.error('Error generating specifications:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GENERATION_ERROR',
          message: 'Failed to generate specifications',
          timestamp: new Date(),
          requestId: req.headers['x-request-id'] || 'unknown',
        },
      });
    }
  }
);

/**
 * GET /api/specifications/:conversationId
 * Get specifications for a conversation
 */
router.get(
  '/:conversationId',
  [
    param('conversationId')
      .isUUID()
      .withMessage('Valid conversation ID is required'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid conversation ID',
            details: errors.array(),
            timestamp: new Date(),
            requestId: req.headers['x-request-id'] || 'unknown',
          },
        });
      }

      const { conversationId } = req.params;

      // Get conversation with specifications
      const conversation =
        await databaseService.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'CONVERSATION_NOT_FOUND',
            message: 'Conversation not found',
            timestamp: new Date(),
            requestId: req.headers['x-request-id'] || 'unknown',
          },
        });
      }

      const specification = conversation.specifications?.[0];
      if (!specification) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'SPECIFICATIONS_NOT_FOUND',
            message: 'No specifications found for this conversation',
            timestamp: new Date(),
            requestId: req.headers['x-request-id'] || 'unknown',
          },
        });
      }

      const files = {
        requirements: specification.requirements,
        design: specification.design,
        tasks: specification.tasks,
      };

      const fileSizes = fileGenerationService.getFileSizes(files);
      const validation = fileGenerationService.validateSpecifications(files);

      res.json({
        success: true,
        data: {
          id: specification.id,
          files,
          metadata: {
            conversationId: conversation.id,
            title: conversation.title,
            appIdea: conversation.appIdea,
            generatedAt: specification.generatedAt,
            version: specification.version,
          },
          validation,
          fileSizes,
          generationTimeMs: specification.generationTimeMs,
        },
      });
    } catch (error) {
      console.error('Error retrieving specifications:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'RETRIEVAL_ERROR',
          message: 'Failed to retrieve specifications',
          timestamp: new Date(),
          requestId: req.headers['x-request-id'] || 'unknown',
        },
      });
    }
  }
);

/**
 * GET /api/specifications/:conversationId/download
 * Download specifications as ZIP file
 */
router.get(
  '/:conversationId/download',
  [
    param('conversationId')
      .isUUID()
      .withMessage('Valid conversation ID is required'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid conversation ID',
            details: errors.array(),
            timestamp: new Date(),
            requestId: req.headers['x-request-id'] || 'unknown',
          },
        });
      }

      const { conversationId } = req.params;

      // Get conversation with specifications
      const conversation =
        await databaseService.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'CONVERSATION_NOT_FOUND',
            message: 'Conversation not found',
            timestamp: new Date(),
            requestId: req.headers['x-request-id'] || 'unknown',
          },
        });
      }

      const specification = conversation.specifications?.[0];
      if (!specification) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'SPECIFICATIONS_NOT_FOUND',
            message: 'No specifications found for this conversation',
            timestamp: new Date(),
            requestId: req.headers['x-request-id'] || 'unknown',
          },
        });
      }

      const files = {
        requirements: specification.requirements,
        design: specification.design,
        tasks: specification.tasks,
      };

      const metadata = {
        conversationId: conversation.id,
        title: conversation.title,
        appIdea: conversation.appIdea,
        generatedAt: specification.generatedAt,
        version: specification.version,
      };

      // Create ZIP archive
      const zipBuffer = await fileGenerationService.createZipArchive(
        files,
        metadata
      );

      // Set response headers for file download
      const filename = `${conversation.title.replace(/[^a-zA-Z0-9]/g, '_')}_specifications.zip`;
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`
      );
      res.setHeader('Content-Length', zipBuffer.length);

      res.send(zipBuffer);
    } catch (error) {
      console.error('Error downloading specifications:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'DOWNLOAD_ERROR',
          message: 'Failed to download specifications',
          timestamp: new Date(),
          requestId: req.headers['x-request-id'] || 'unknown',
        },
      });
    }
  }
);

/**
 * GET /api/specifications/:conversationId/file/:fileType
 * Download individual specification file
 */
router.get(
  '/:conversationId/file/:fileType',
  [
    param('conversationId')
      .isUUID()
      .withMessage('Valid conversation ID is required'),
    param('fileType')
      .isIn(['requirements', 'design', 'tasks'])
      .withMessage('Valid file type is required'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid parameters',
            details: errors.array(),
            timestamp: new Date(),
            requestId: req.headers['x-request-id'] || 'unknown',
          },
        });
      }

      const { conversationId, fileType } = req.params;

      // Get conversation with specifications
      const conversation =
        await databaseService.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'CONVERSATION_NOT_FOUND',
            message: 'Conversation not found',
            timestamp: new Date(),
            requestId: req.headers['x-request-id'] || 'unknown',
          },
        });
      }

      const specification = conversation.specifications?.[0];
      if (!specification) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'SPECIFICATIONS_NOT_FOUND',
            message: 'No specifications found for this conversation',
            timestamp: new Date(),
            requestId: req.headers['x-request-id'] || 'unknown',
          },
        });
      }

      let fileContent: string;
      switch (fileType) {
        case 'requirements':
          fileContent = specification.requirements;
          break;
        case 'design':
          fileContent = specification.design;
          break;
        case 'tasks':
          fileContent = specification.tasks;
          break;
        default:
          return res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_FILE_TYPE',
              message: 'Invalid file type',
              timestamp: new Date(),
              requestId: req.headers['x-request-id'] || 'unknown',
            },
          });
      }

      // Set response headers for file download
      const filename = `${fileType}.md`;
      res.setHeader('Content-Type', 'text/markdown');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`
      );
      res.setHeader('Content-Length', Buffer.byteLength(fileContent, 'utf8'));

      res.send(fileContent);
    } catch (error) {
      console.error('Error downloading file:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'DOWNLOAD_ERROR',
          message: 'Failed to download file',
          timestamp: new Date(),
          requestId: req.headers['x-request-id'] || 'unknown',
        },
      });
    }
  }
);

/**
 * POST /api/specifications/:conversationId/validate
 * Validate specifications
 */
router.post(
  '/:conversationId/validate',
  [
    param('conversationId')
      .isUUID()
      .withMessage('Valid conversation ID is required'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid conversation ID',
            details: errors.array(),
            timestamp: new Date(),
            requestId: req.headers['x-request-id'] || 'unknown',
          },
        });
      }

      const { conversationId } = req.params;

      // Get conversation with specifications
      const conversation =
        await databaseService.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'CONVERSATION_NOT_FOUND',
            message: 'Conversation not found',
            timestamp: new Date(),
            requestId: req.headers['x-request-id'] || 'unknown',
          },
        });
      }

      const specification = conversation.specifications?.[0];
      if (!specification) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'SPECIFICATIONS_NOT_FOUND',
            message: 'No specifications found for this conversation',
            timestamp: new Date(),
            requestId: req.headers['x-request-id'] || 'unknown',
          },
        });
      }

      const files = {
        requirements: specification.requirements,
        design: specification.design,
        tasks: specification.tasks,
      };

      const validation = fileGenerationService.validateSpecifications(files);

      res.json({
        success: true,
        data: {
          validation,
          timestamp: new Date(),
        },
      });
    } catch (error) {
      console.error('Error validating specifications:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Failed to validate specifications',
          timestamp: new Date(),
          requestId: req.headers['x-request-id'] || 'unknown',
        },
      });
    }
  }
);

export default router;
