import archiver from 'archiver';
import { Readable } from 'stream';
import {
  SpecificationFiles,
  SpecificationMetadata,
  SpecificationValidationResult,
  SpecificationTemplate,
  GeneratedSpecification,
} from '../types/specifications';

export class FileGenerationService {
  private templates: Map<string, SpecificationTemplate> = new Map();

  constructor() {
    this.initializeTemplates();
  }

  private initializeTemplates(): void {
    // Requirements template
    this.templates.set('requirements', {
      name: 'requirements.md',
      content: this.getRequirementsTemplate(),
      requiredSections: [
        '# Requirements Document',
        '## Introduction',
        '## Requirements',
        '### Requirement',
        '**User Story:**',
        '#### Acceptance Criteria',
      ],
    });

    // Design template
    this.templates.set('design', {
      name: 'design.md',
      content: this.getDesignTemplate(),
      requiredSections: [
        '# Design Document',
        '## Overview',
        '## Architecture',
        '## Components and Interfaces',
        '## Data Models',
        '## Error Handling',
        '## Testing Strategy',
      ],
    });

    // Tasks template
    this.templates.set('tasks', {
      name: 'tasks.md',
      content: this.getTasksTemplate(),
      requiredSections: ['# Implementation Plan', '- [ ]', '_Requirements:'],
    });
  }

  private getRequirementsTemplate(): string {
    return `# Requirements Document

## Introduction

{{introduction}}

## Requirements

{{requirements}}
`;
  }

  private getDesignTemplate(): string {
    return `# Design Document

## Overview

{{overview}}

## Architecture

{{architecture}}

## Components and Interfaces

{{components}}

## Data Models

{{dataModels}}

## Error Handling

{{errorHandling}}

## Testing Strategy

{{testingStrategy}}
`;
  }

  private getTasksTemplate(): string {
    return `# Implementation Plan

{{tasks}}
`;
  }

  /**
   * Generate specification files from conversation data
   */
  public generateSpecifications(
    conversationData: any,
    aiGeneratedContent: {
      requirements: string;
      design: string;
      tasks: string;
    }
  ): GeneratedSpecification {
    const metadata: SpecificationMetadata = {
      conversationId: conversationData.id,
      title: conversationData.title,
      appIdea: conversationData.appIdea,
      generatedAt: new Date(),
      version: 1,
    };

    const files: SpecificationFiles = {
      requirements: this.formatRequirements(
        aiGeneratedContent.requirements,
        conversationData
      ),
      design: this.formatDesign(aiGeneratedContent.design, conversationData),
      tasks: this.formatTasks(aiGeneratedContent.tasks, conversationData),
    };

    const validation = this.validateSpecifications(files);

    return {
      files,
      metadata,
      validation,
    };
  }

  /**
   * Format requirements content using template
   */
  private formatRequirements(content: string, conversationData: any): string {
    if (!content || content.trim() === '') {
      const template = this.templates.get('requirements')!;
      return template.content
        .replace(
          '{{introduction}}',
          this.generateIntroduction(conversationData)
        )
        .replace(
          '{{requirements}}',
          this.generateDefaultRequirements(conversationData)
        );
    }
    return this.ensureProperFormatting(content, 'requirements');
  }

  /**
   * Format design content using template
   */
  private formatDesign(content: string, conversationData: any): string {
    if (!content || content.trim() === '') {
      const template = this.templates.get('design')!;
      return template.content
        .replace('{{overview}}', this.generateOverview(conversationData))
        .replace(
          '{{architecture}}',
          'TBD - To be defined during implementation'
        )
        .replace('{{components}}', 'TBD - To be defined during implementation')
        .replace('{{dataModels}}', 'TBD - To be defined during implementation')
        .replace(
          '{{errorHandling}}',
          'TBD - To be defined during implementation'
        )
        .replace(
          '{{testingStrategy}}',
          'TBD - To be defined during implementation'
        );
    }
    return this.ensureProperFormatting(content, 'design');
  }

  /**
   * Format tasks content using template
   */
  private formatTasks(content: string, conversationData: any): string {
    if (!content || content.trim() === '') {
      const template = this.templates.get('tasks')!;
      return template.content.replace(
        '{{tasks}}',
        this.generateDefaultTasks(conversationData)
      );
    }
    return this.ensureProperFormatting(content, 'tasks');
  }

  /**
   * Ensure proper markdown formatting
   */
  private ensureProperFormatting(content: string, type: string): string {
    let formatted = content.trim();

    // Ensure proper line endings
    formatted = formatted.replace(/\r\n/g, '\n');

    // Ensure file ends with newline
    if (!formatted.endsWith('\n')) {
      formatted += '\n';
    }

    return formatted;
  }

  /**
   * Generate default introduction for requirements
   */
  private generateIntroduction(conversationData: any): string {
    return `This document outlines the requirements for ${conversationData.title}.

**App Idea:** ${conversationData.appIdea}

**Target Users:** ${conversationData.targetUsers?.join(', ') || 'General users'}

**Complexity:** ${conversationData.complexity || 'Moderate'}
`;
  }

  /**
   * Generate default requirements
   */
  private generateDefaultRequirements(conversationData: any): string {
    return `### Requirement 1

**User Story:** As a user, I want to use ${conversationData.title}, so that I can achieve my goals.

#### Acceptance Criteria

1. WHEN the application loads THEN the system SHALL display the main interface
2. WHEN a user interacts with the system THEN it SHALL respond appropriately
3. WHEN an error occurs THEN the system SHALL handle it gracefully

_Requirements: To be refined based on conversation_
`;
  }

  /**
   * Generate default overview for design
   */
  private generateOverview(conversationData: any): string {
    return `${conversationData.title} is designed to ${conversationData.appIdea}.

This document outlines the technical design and architecture decisions for the application.
`;
  }

  /**
   * Generate default tasks
   */
  private generateDefaultTasks(conversationData: any): string {
    return `- [ ] 1. Set up project foundation
  - Initialize project structure
  - Configure development environment
  - Set up basic dependencies
  - _Requirements: TBD_

- [ ] 2. Implement core functionality
  - Develop main features
  - Add user interface components
  - Implement business logic
  - _Requirements: TBD_

- [ ] 3. Testing and deployment
  - Write comprehensive tests
  - Set up CI/CD pipeline
  - Deploy to production
  - _Requirements: TBD_
`;
  }

  /**
   * Validate specification files
   */
  public validateSpecifications(
    files: SpecificationFiles
  ): SpecificationValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate requirements
    const reqValidation = this.validateFile(files.requirements, 'requirements');
    errors.push(...reqValidation.errors);
    warnings.push(...reqValidation.warnings);

    // Validate design
    const designValidation = this.validateFile(files.design, 'design');
    errors.push(...designValidation.errors);
    warnings.push(...designValidation.warnings);

    // Validate tasks
    const tasksValidation = this.validateFile(files.tasks, 'tasks');
    errors.push(...tasksValidation.errors);
    warnings.push(...tasksValidation.warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate individual file
   */
  private validateFile(
    content: string,
    type: string
  ): SpecificationValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const template = this.templates.get(type);

    if (!template) {
      errors.push(`Unknown template type: ${type}`);
      return { isValid: false, errors, warnings };
    }

    if (!content || content.trim() === '') {
      errors.push(`${type} file is empty`);
      return { isValid: false, errors, warnings };
    }

    // Check for required sections
    for (const section of template.requiredSections) {
      if (!content.includes(section)) {
        if (section.startsWith('#')) {
          errors.push(`Missing required section: ${section}`);
        } else {
          warnings.push(`Missing recommended element: ${section}`);
        }
      }
    }

    // Additional validation based on type
    switch (type) {
      case 'requirements':
        this.validateRequirements(content, errors, warnings);
        break;
      case 'design':
        this.validateDesign(content, errors, warnings);
        break;
      case 'tasks':
        this.validateTasks(content, errors, warnings);
        break;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate requirements specific content
   */
  private validateRequirements(
    content: string,
    errors: string[],
    warnings: string[]
  ): void {
    // Check for user stories
    const userStoryCount = (content.match(/\*\*User Story:\*\*/g) || []).length;
    if (userStoryCount === 0) {
      errors.push('No user stories found in requirements');
    }

    // Check for acceptance criteria
    const acceptanceCriteriaCount = (
      content.match(/#### Acceptance Criteria/g) || []
    ).length;
    if (acceptanceCriteriaCount === 0) {
      errors.push('No acceptance criteria found in requirements');
    }

    // Check for EARS format
    const earsPatterns = [/WHEN .* THEN .* SHALL/, /IF .* THEN .* SHALL/];
    const hasEarsFormat = earsPatterns.some((pattern) => pattern.test(content));
    if (!hasEarsFormat) {
      warnings.push('Consider using EARS format for acceptance criteria');
    }
  }

  /**
   * Validate design specific content
   */
  private validateDesign(
    content: string,
    errors: string[],
    warnings: string[]
  ): void {
    // Check for architecture diagrams or descriptions
    if (!content.includes('```mermaid') && !content.includes('architecture')) {
      warnings.push(
        'Consider adding architecture diagrams or detailed descriptions'
      );
    }

    // Check for component interfaces
    if (!content.includes('interface') && !content.includes('Interface')) {
      warnings.push('Consider defining component interfaces');
    }
  }

  /**
   * Validate tasks specific content
   */
  private validateTasks(
    content: string,
    errors: string[],
    warnings: string[]
  ): void {
    // Check for task checkboxes
    const taskCount = (content.match(/- \[ \]/g) || []).length;
    if (taskCount === 0) {
      errors.push('No tasks found in implementation plan');
    }

    // Check for requirement references
    const reqReferences = (content.match(/_Requirements:/g) || []).length;
    if (reqReferences === 0) {
      warnings.push('Tasks should reference specific requirements');
    }

    // Check for task descriptions
    const lines = content.split('\n');
    let hasTaskDescriptions = false;
    for (const line of lines) {
      if (line.trim().startsWith('- [ ]') && line.length > 10) {
        hasTaskDescriptions = true;
        break;
      }
    }
    if (!hasTaskDescriptions) {
      warnings.push('Tasks should have descriptive titles');
    }
  }

  /**
   * Create ZIP archive of specification files
   */
  public async createZipArchive(
    files: SpecificationFiles,
    metadata: SpecificationMetadata
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const archive = archiver('zip', {
        zlib: { level: 9 }, // Maximum compression
      });

      const chunks: Buffer[] = [];

      archive.on('data', (chunk) => {
        chunks.push(chunk);
      });

      archive.on('end', () => {
        resolve(Buffer.concat(chunks));
      });

      archive.on('error', (err) => {
        reject(err);
      });

      // Add files to archive
      archive.append(files.requirements, { name: 'requirements.md' });
      archive.append(files.design, { name: 'design.md' });
      archive.append(files.tasks, { name: 'tasks.md' });

      // Add metadata file
      const metadataContent = JSON.stringify(metadata, null, 2);
      archive.append(metadataContent, { name: 'metadata.json' });

      // Finalize the archive
      archive.finalize();
    });
  }

  /**
   * Get file size in bytes
   */
  public getFileSizes(files: SpecificationFiles): { [key: string]: number } {
    return {
      requirements: Buffer.byteLength(files.requirements, 'utf8'),
      design: Buffer.byteLength(files.design, 'utf8'),
      tasks: Buffer.byteLength(files.tasks, 'utf8'),
      total: Buffer.byteLength(
        files.requirements + files.design + files.tasks,
        'utf8'
      ),
    };
  }

  /**
   * Get template for a specific type
   */
  public getTemplate(type: string): SpecificationTemplate | undefined {
    return this.templates.get(type);
  }

  /**
   * Get all available templates
   */
  public getAllTemplates(): SpecificationTemplate[] {
    return Array.from(this.templates.values());
  }
}
