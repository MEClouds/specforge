import { FileGenerationService } from '../services/FileGenerationService';
import { SpecificationFiles } from '../types/specifications';

describe('FileGenerationService', () => {
  let fileGenerationService: FileGenerationService;

  beforeEach(() => {
    fileGenerationService = new FileGenerationService();
  });

  describe('generateSpecifications', () => {
    const mockConversationData = {
      id: 'test-conversation-id',
      title: 'Test App',
      appIdea: 'A test application for unit testing',
      targetUsers: ['developers', 'testers'],
      complexity: 'moderate',
    };

    const mockAiContent = {
      requirements: `# Requirements Document

## Introduction

This is a test requirements document.

## Requirements

### Requirement 1

**User Story:** As a user, I want to test the app, so that I can verify it works.

#### Acceptance Criteria

1. WHEN the app loads THEN it SHALL display the interface
2. WHEN a user clicks a button THEN the system SHALL respond
`,
      design: `# Design Document

## Overview

This is a test design document.

## Architecture

The system uses a simple architecture.

## Components and Interfaces

Components are well-defined.

## Data Models

Data models are structured.

## Error Handling

Errors are handled gracefully.

## Testing Strategy

Testing is comprehensive.
`,
      tasks: `# Implementation Plan

- [ ] 1. Set up project
  - Initialize codebase
  - Configure environment
  - _Requirements: 1.1_

- [ ] 2. Implement features
  - Add core functionality
  - Create user interface
  - _Requirements: 1.2_
`,
    };

    it('should generate specifications with valid content', () => {
      const result = fileGenerationService.generateSpecifications(
        mockConversationData,
        mockAiContent
      );

      expect(result).toBeDefined();
      expect(result.files).toBeDefined();
      expect(result.metadata).toBeDefined();
      expect(result.validation).toBeDefined();

      expect(result.files.requirements).toContain('# Requirements Document');
      expect(result.files.design).toContain('# Design Document');
      expect(result.files.tasks).toContain('# Implementation Plan');

      expect(result.metadata.conversationId).toBe(mockConversationData.id);
      expect(result.metadata.title).toBe(mockConversationData.title);
      expect(result.metadata.appIdea).toBe(mockConversationData.appIdea);
    });

    it('should generate default content when AI content is empty', () => {
      const emptyAiContent = {
        requirements: '',
        design: '',
        tasks: '',
      };

      const result = fileGenerationService.generateSpecifications(
        mockConversationData,
        emptyAiContent
      );

      expect(result.files.requirements).toContain('# Requirements Document');
      expect(result.files.requirements).toContain(mockConversationData.title);
      expect(result.files.requirements).toContain(mockConversationData.appIdea);

      expect(result.files.design).toContain('# Design Document');
      expect(result.files.design).toContain(mockConversationData.title);

      expect(result.files.tasks).toContain('# Implementation Plan');
      expect(result.files.tasks).toContain('- [ ]');
    });

    it('should include proper metadata', () => {
      const result = fileGenerationService.generateSpecifications(
        mockConversationData,
        mockAiContent
      );

      expect(result.metadata.conversationId).toBe(mockConversationData.id);
      expect(result.metadata.title).toBe(mockConversationData.title);
      expect(result.metadata.appIdea).toBe(mockConversationData.appIdea);
      expect(result.metadata.generatedAt).toBeInstanceOf(Date);
      expect(result.metadata.version).toBe(1);
    });
  });

  describe('validateSpecifications', () => {
    it('should validate complete specifications as valid', () => {
      const validFiles: SpecificationFiles = {
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

Test overview.

## Architecture

Test architecture.

## Components and Interfaces

Test components.

## Data Models

Test data models.

## Error Handling

Test error handling.

## Testing Strategy

Test strategy.
`,
        tasks: `# Implementation Plan

- [ ] 1. Test task
  - Test subtask
  - _Requirements: 1.1_
`,
      };

      const result = fileGenerationService.validateSpecifications(validFiles);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should identify missing sections as errors', () => {
      const invalidFiles: SpecificationFiles = {
        requirements: `# Requirements Document

Some content without proper sections.
`,
        design: `# Design Document

Missing required sections.
`,
        tasks: `# Implementation Plan

No tasks here.
`,
      };

      const result = fileGenerationService.validateSpecifications(invalidFiles);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(
        result.errors.some((error) =>
          error.includes('Missing required section')
        )
      ).toBe(true);
    });

    it('should identify empty files as errors', () => {
      const emptyFiles: SpecificationFiles = {
        requirements: '',
        design: '',
        tasks: '',
      };

      const result = fileGenerationService.validateSpecifications(emptyFiles);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('requirements file is empty');
      expect(result.errors).toContain('design file is empty');
      expect(result.errors).toContain('tasks file is empty');
    });

    it('should provide warnings for missing recommended elements', () => {
      const filesWithMissingElements: SpecificationFiles = {
        requirements: `# Requirements Document

## Introduction

Test introduction.

## Requirements

### Requirement 1

Some requirement without proper format.
`,
        design: `# Design Document

## Overview

Test overview.

## Architecture

Test architecture.

## Components and Interfaces

Test components.

## Data Models

Test data models.

## Error Handling

Test error handling.

## Testing Strategy

Test strategy.
`,
        tasks: `# Implementation Plan

- [ ] 1. Test task without requirements reference
`,
      };

      const result = fileGenerationService.validateSpecifications(
        filesWithMissingElements
      );

      expect(result.warnings.length).toBeGreaterThan(0);
      // Check for missing acceptance criteria, user stories, or requirements reference
      expect(
        result.warnings.some(
          (warning) =>
            warning.includes('user stories') ||
            warning.includes('acceptance criteria') ||
            warning.includes('requirements reference')
        )
      ).toBe(true);
    });
  });

  describe('createZipArchive', () => {
    const mockFiles: SpecificationFiles = {
      requirements: '# Requirements\n\nTest requirements content.',
      design: '# Design\n\nTest design content.',
      tasks: '# Tasks\n\nTest tasks content.',
    };

    const mockMetadata = {
      conversationId: 'test-id',
      title: 'Test App',
      appIdea: 'Test app idea',
      generatedAt: new Date(),
      version: 1,
    };

    it('should create a valid ZIP archive', async () => {
      const zipBuffer = await fileGenerationService.createZipArchive(
        mockFiles,
        mockMetadata
      );

      expect(zipBuffer).toBeInstanceOf(Buffer);
      expect(zipBuffer.length).toBeGreaterThan(0);

      // Check if it's a valid ZIP file by checking the ZIP signature
      const zipSignature = zipBuffer.subarray(0, 4);
      expect(zipSignature[0]).toBe(0x50); // 'P'
      expect(zipSignature[1]).toBe(0x4b); // 'K'
    });

    it('should handle empty files in ZIP creation', async () => {
      const emptyFiles: SpecificationFiles = {
        requirements: '',
        design: '',
        tasks: '',
      };

      const zipBuffer = await fileGenerationService.createZipArchive(
        emptyFiles,
        mockMetadata
      );

      expect(zipBuffer).toBeInstanceOf(Buffer);
      expect(zipBuffer.length).toBeGreaterThan(0);
    });
  });

  describe('getFileSizes', () => {
    it('should calculate correct file sizes', () => {
      const files: SpecificationFiles = {
        requirements: 'Test requirements content',
        design: 'Test design content',
        tasks: 'Test tasks content',
      };

      const sizes = fileGenerationService.getFileSizes(files);

      expect(sizes.requirements).toBe(
        Buffer.byteLength(files.requirements, 'utf8')
      );
      expect(sizes.design).toBe(Buffer.byteLength(files.design, 'utf8'));
      expect(sizes.tasks).toBe(Buffer.byteLength(files.tasks, 'utf8'));
      expect(sizes.total).toBe(
        Buffer.byteLength(
          files.requirements + files.design + files.tasks,
          'utf8'
        )
      );
    });

    it('should handle empty files', () => {
      const emptyFiles: SpecificationFiles = {
        requirements: '',
        design: '',
        tasks: '',
      };

      const sizes = fileGenerationService.getFileSizes(emptyFiles);

      expect(sizes.requirements).toBe(0);
      expect(sizes.design).toBe(0);
      expect(sizes.tasks).toBe(0);
      expect(sizes.total).toBe(0);
    });

    it('should handle unicode content', () => {
      const unicodeFiles: SpecificationFiles = {
        requirements: 'Test with émojis 🚀 and ñ characters',
        design: 'Tëst with spëcial charactërs',
        tasks: 'Test with 中文 characters',
      };

      const sizes = fileGenerationService.getFileSizes(unicodeFiles);

      expect(sizes.requirements).toBeGreaterThan(
        unicodeFiles.requirements.length
      );
      expect(sizes.design).toBeGreaterThan(unicodeFiles.design.length);
      expect(sizes.tasks).toBeGreaterThan(unicodeFiles.tasks.length);
    });
  });

  describe('getTemplate', () => {
    it('should return template for valid type', () => {
      const template = fileGenerationService.getTemplate('requirements');

      expect(template).toBeDefined();
      expect(template?.name).toBe('requirements.md');
      expect(template?.content).toContain('# Requirements Document');
      expect(template?.requiredSections).toContain('# Requirements Document');
    });

    it('should return undefined for invalid type', () => {
      const template = fileGenerationService.getTemplate('invalid');

      expect(template).toBeUndefined();
    });
  });

  describe('getAllTemplates', () => {
    it('should return all available templates', () => {
      const templates = fileGenerationService.getAllTemplates();

      expect(templates).toHaveLength(3);
      expect(templates.map((t) => t.name)).toContain('requirements.md');
      expect(templates.map((t) => t.name)).toContain('design.md');
      expect(templates.map((t) => t.name)).toContain('tasks.md');
    });
  });

  describe('validation edge cases', () => {
    it('should handle malformed markdown gracefully', () => {
      const malformedFiles: SpecificationFiles = {
        requirements: '# Requirements\n\n### Missing level 2 header\n\nContent',
        design: '# Design\n\n## Overview\n\n### Subsection without parent',
        tasks: '# Tasks\n\n- [ ] Task without proper formatting',
      };

      const result =
        fileGenerationService.validateSpecifications(malformedFiles);

      // Should not throw errors, but may have warnings
      expect(result).toBeDefined();
      expect(result.isValid).toBeDefined();
      expect(result.errors).toBeDefined();
      expect(result.warnings).toBeDefined();
    });

    it('should validate EARS format in requirements', () => {
      const filesWithEars: SpecificationFiles = {
        requirements: `# Requirements Document

## Introduction

Test introduction.

## Requirements

### Requirement 1

**User Story:** As a user, I want to test, so that I can verify.

#### Acceptance Criteria

1. WHEN the user clicks THEN the system SHALL respond
2. IF the condition is met THEN the system SHALL execute
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
      };

      const result =
        fileGenerationService.validateSpecifications(filesWithEars);

      // Should not warn about EARS format since it's present
      expect(result.warnings.some((w) => w.includes('EARS format'))).toBe(
        false
      );
    });
  });
});
