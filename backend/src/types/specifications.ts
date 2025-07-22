export interface SpecificationFiles {
  requirements: string;
  design: string;
  tasks: string;
}

export interface SpecificationMetadata {
  conversationId: string;
  title: string;
  appIdea: string;
  generatedAt: Date;
  version: number;
}

export interface SpecificationValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface SpecificationTemplate {
  name: string;
  content: string;
  requiredSections: string[];
}

export interface GeneratedSpecification {
  files: SpecificationFiles;
  metadata: SpecificationMetadata;
  validation: SpecificationValidationResult;
}
