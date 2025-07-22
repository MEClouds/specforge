import request from 'supertest';
import express from 'express';
import { DatabaseService } from '../services/DatabaseService';
import specificationsRouter from '../routes/specifications';

// Mock the DatabaseService
jest.mock('../services/DatabaseService');

const app = express();
app.use(express.json());
app.use('/api/specifications', specificationsRouter);

const mockDatabaseService = DatabaseService as jest.MockedClass<
  typeof DatabaseService
>;

describe('Specifications API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/specifications/generate', () => {
    const validRequestBody = {
      conversationId: '123e4567-e89b-12d3-a456-426614174000',
      aiGeneratedContent: {
        requirements: '# Requirements\n\nTest requirements content.',
        design: '# Design\n\nTest design content.',
        tasks: '# Tasks\n\nTest tasks content.',
      },
      totalTokens: 1000,
    };

    const mockConversation = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      title: 'Test App',
      appIdea: 'A test application',
      targetUsers: ['developers'],
      complexity: 'moderate',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockSpecification = {
      id: 'spec-123',
      conversationId: '123e4567-e89b-12d3-a456-426614174000',
      requirements: '# Requirements\n\nTest requirements content.',
      design: '# Design\n\nTest design content.',
      tasks: '# Tasks\n\nTest tasks content.',
      version: 1,
      generatedAt: new Date(),
    };

    it('should generate specifications successfully', async () => {
      mockDatabaseService.prototype.getConversation.mockResolvedValue(
        mockConversation as any
      );
      mockDatabaseService.prototype.createSpecification.mockResolvedValue(
        mockSpecification as any
      );

      const response = await request(app)
        .post('/api/specifications/generate')
        .send(validRequestBody);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.files).toBeDefined();
      expect(response.body.data.metadata).toBeDefined();
      expect(response.body.data.validation).toBeDefined();
      expect(response.body.data.fileSizes).toBeDefined();
    });

    it('should return 400 for invalid conversation ID', async () => {
      const invalidRequestBody = {
        ...validRequestBody,
        conversationId: 'invalid-uuid',
      };

      const response = await request(app)
        .post('/api/specifications/generate')
        .send(invalidRequestBody);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 404 for non-existent conversation', async () => {
      mockDatabaseService.prototype.getConversation.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/specifications/generate')
        .send(validRequestBody);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('CONVERSATION_NOT_FOUND');
    });

    it('should return 400 for missing AI content', async () => {
      const invalidRequestBody = {
        conversationId: '123e4567-e89b-12d3-a456-426614174000',
        aiGeneratedContent: {
          requirements: '',
          design: '',
          // missing tasks
        },
      };

      const response = await request(app)
        .post('/api/specifications/generate')
        .send(invalidRequestBody);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should handle database errors gracefully', async () => {
      mockDatabaseService.prototype.getConversation.mockRejectedValue(
        new Error('Database error')
      );

      const response = await request(app)
        .post('/api/specifications/generate')
        .send(validRequestBody);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('GENERATION_ERROR');
    });
  });

  describe('GET /api/specifications/:conversationId', () => {
    const conversationId = '123e4567-e89b-12d3-a456-426614174000';

    const mockConversationWithSpecs = {
      id: conversationId,
      title: 'Test App',
      appIdea: 'A test application',
      targetUsers: ['developers'],
      complexity: 'moderate',
      specifications: [
        {
          id: 'spec-123',
          conversationId,
          requirements: '# Requirements\n\nTest requirements content.',
          design: '# Design\n\nTest design content.',
          tasks: '# Tasks\n\nTest tasks content.',
          version: 1,
          generatedAt: new Date(),
          generationTimeMs: 1000,
        },
      ],
    };

    it('should retrieve specifications successfully', async () => {
      mockDatabaseService.prototype.getConversation.mockResolvedValue(
        mockConversationWithSpecs as any
      );

      const response = await request(app).get(
        `/api/specifications/${conversationId}`
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.files).toBeDefined();
      expect(response.body.data.metadata).toBeDefined();
      expect(response.body.data.validation).toBeDefined();
    });

    it('should return 400 for invalid conversation ID', async () => {
      const response = await request(app).get(
        '/api/specifications/invalid-uuid'
      );

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 404 for non-existent conversation', async () => {
      mockDatabaseService.prototype.getConversation.mockResolvedValue(null);

      const response = await request(app).get(
        `/api/specifications/${conversationId}`
      );

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('CONVERSATION_NOT_FOUND');
    });

    it('should return 404 for conversation without specifications', async () => {
      const conversationWithoutSpecs = {
        ...mockConversationWithSpecs,
        specifications: [],
      };
      mockDatabaseService.prototype.getConversation.mockResolvedValue(
        conversationWithoutSpecs as any
      );

      const response = await request(app).get(
        `/api/specifications/${conversationId}`
      );

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('SPECIFICATIONS_NOT_FOUND');
    });
  });

  describe('GET /api/specifications/:conversationId/download', () => {
    const conversationId = '123e4567-e89b-12d3-a456-426614174000';

    const mockConversationWithSpecs = {
      id: conversationId,
      title: 'Test App',
      appIdea: 'A test application',
      specifications: [
        {
          id: 'spec-123',
          conversationId,
          requirements: '# Requirements\n\nTest requirements content.',
          design: '# Design\n\nTest design content.',
          tasks: '# Tasks\n\nTest tasks content.',
          version: 1,
          generatedAt: new Date(),
        },
      ],
    };

    it('should download ZIP file successfully', async () => {
      mockDatabaseService.prototype.getConversation.mockResolvedValue(
        mockConversationWithSpecs as any
      );

      const response = await request(app).get(
        `/api/specifications/${conversationId}/download`
      );

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('application/zip');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.headers['content-disposition']).toContain(
        'Test_App_specifications.zip'
      );
    });

    it('should return 404 for non-existent conversation', async () => {
      mockDatabaseService.prototype.getConversation.mockResolvedValue(null);

      const response = await request(app).get(
        `/api/specifications/${conversationId}/download`
      );

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('CONVERSATION_NOT_FOUND');
    });
  });

  describe('GET /api/specifications/:conversationId/file/:fileType', () => {
    const conversationId = '123e4567-e89b-12d3-a456-426614174000';

    const mockConversationWithSpecs = {
      id: conversationId,
      title: 'Test App',
      specifications: [
        {
          id: 'spec-123',
          conversationId,
          requirements: '# Requirements\n\nTest requirements content.',
          design: '# Design\n\nTest design content.',
          tasks: '# Tasks\n\nTest tasks content.',
          version: 1,
          generatedAt: new Date(),
        },
      ],
    };

    it('should download individual requirements file', async () => {
      mockDatabaseService.prototype.getConversation.mockResolvedValue(
        mockConversationWithSpecs as any
      );

      const response = await request(app).get(
        `/api/specifications/${conversationId}/file/requirements`
      );

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/markdown');
      expect(response.headers['content-disposition']).toContain(
        'requirements.md'
      );
      expect(response.text).toContain('# Requirements');
    });

    it('should download individual design file', async () => {
      mockDatabaseService.prototype.getConversation.mockResolvedValue(
        mockConversationWithSpecs as any
      );

      const response = await request(app).get(
        `/api/specifications/${conversationId}/file/design`
      );

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/markdown');
      expect(response.headers['content-disposition']).toContain('design.md');
      expect(response.text).toContain('# Design');
    });

    it('should download individual tasks file', async () => {
      mockDatabaseService.prototype.getConversation.mockResolvedValue(
        mockConversationWithSpecs as any
      );

      const response = await request(app).get(
        `/api/specifications/${conversationId}/file/tasks`
      );

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/markdown');
      expect(response.headers['content-disposition']).toContain('tasks.md');
      expect(response.text).toContain('# Tasks');
    });

    it('should return 400 for invalid file type', async () => {
      const response = await request(app).get(
        `/api/specifications/${conversationId}/file/invalid`
      );

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/specifications/:conversationId/validate', () => {
    const conversationId = '123e4567-e89b-12d3-a456-426614174000';

    const mockConversationWithSpecs = {
      id: conversationId,
      title: 'Test App',
      specifications: [
        {
          id: 'spec-123',
          conversationId,
          requirements: `# Requirements Document

## Introduction

Test introduction.

## Requirements

### Requirement 1

**User Story:** As a user, I want to test, so that I can verify.

#### Acceptance Criteria

1. WHEN something happens THEN the system SHALL respond
`,
          design: `# Design Document

## Overview
## Architecture
## Components and Interfaces
## Data Models
## Error Handling
## Testing Strategy
`,
          tasks: `# Implementation Plan

- [ ] 1. Test task
  - _Requirements: 1.1_
`,
          version: 1,
          generatedAt: new Date(),
        },
      ],
    };

    it('should validate specifications successfully', async () => {
      mockDatabaseService.prototype.getConversation.mockResolvedValue(
        mockConversationWithSpecs as any
      );

      const response = await request(app).post(
        `/api/specifications/${conversationId}/validate`
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.validation).toBeDefined();
      expect(response.body.data.validation.isValid).toBeDefined();
      expect(response.body.data.validation.errors).toBeDefined();
      expect(response.body.data.validation.warnings).toBeDefined();
    });

    it('should return 404 for non-existent conversation', async () => {
      mockDatabaseService.prototype.getConversation.mockResolvedValue(null);

      const response = await request(app).post(
        `/api/specifications/${conversationId}/validate`
      );

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('CONVERSATION_NOT_FOUND');
    });
  });
});
