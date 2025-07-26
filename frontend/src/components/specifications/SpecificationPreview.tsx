import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAppStore } from '../../store';
import Button from '../ui/Button';
import Card from '../ui/Card';
import LoadingSpinner from '../ui/LoadingSpinner';
import ConversationService from '../../services/ConversationService';
import type { Specification } from '../../types';

interface SpecificationPreviewProps {
  conversationId: string;
  onClose?: () => void;
}

type FileType = 'requirements' | 'design' | 'tasks';

interface ValidationResult {
  isValid: boolean;
  completeness: number;
  issues: Array<{
    file: string;
    section: string;
    message: string;
    severity: 'error' | 'warning' | 'info';
  }>;
}

interface SpecificationData {
  id: string;
  files: {
    requirements: string;
    design: string;
    tasks: string;
  };
  metadata: {
    conversationId: string;
    title: string;
    appIdea: string;
    generatedAt: Date;
    version: number;
  };
  validation: ValidationResult;
  fileSizes: {
    requirements: number;
    design: number;
    tasks: number;
    total: number;
  };
  generationTimeMs?: number;
}

export const SpecificationPreview: React.FC<SpecificationPreviewProps> = memo(
  ({ conversationId, onClose }) => {
    const [activeTab, setActiveTab] = useState<FileType>('requirements');
    const [specification, setSpecification] =
      useState<SpecificationData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [copySuccess, setCopySuccess] = useState<string | null>(null);
    const [isDownloading, setIsDownloading] = useState(false);

    const { setError: setGlobalError } = useAppStore();

    const loadSpecification = useCallback(async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response =
          await ConversationService.getSpecifications(conversationId);
        setSpecification(response);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to load specifications';
        setError(errorMessage);
        setGlobalError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    }, [conversationId, setGlobalError]);

    useEffect(() => {
      loadSpecification();
    }, [loadSpecification]);

    const handleCopyFile = useCallback(
      async (fileType: FileType) => {
        if (!specification) return;

        try {
          await navigator.clipboard.writeText(specification.files[fileType]);
          setCopySuccess(fileType);
          setTimeout(() => setCopySuccess(null), 2000);
        } catch (err) {
          setGlobalError('Failed to copy to clipboard');
        }
      },
      [specification, setGlobalError]
    );

    const handleDownloadFile = useCallback(
      async (fileType: FileType) => {
        if (!specification) return;

        try {
          setIsDownloading(true);
          await ConversationService.downloadSpecificationFile(
            conversationId,
            fileType
          );
        } catch (err) {
          setGlobalError('Failed to download file');
        } finally {
          setIsDownloading(false);
        }
      },
      [conversationId, setGlobalError]
    );

    const handleDownloadZip = useCallback(async () => {
      if (!specification) return;

      try {
        setIsDownloading(true);
        await ConversationService.downloadSpecifications(conversationId);
      } catch (err) {
        setGlobalError('Failed to download ZIP file');
      } finally {
        setIsDownloading(false);
      }
    }, [conversationId, setGlobalError]);

    const handleValidateSpecifications = useCallback(async () => {
      if (!specification) return;

      try {
        setIsLoading(true);
        const validationResult =
          await ConversationService.validateSpecifications(conversationId);
        setSpecification((prev) =>
          prev ? { ...prev, validation: validationResult } : null
        );
      } catch (err) {
        setGlobalError('Failed to validate specifications');
      } finally {
        setIsLoading(false);
      }
    }, [conversationId, setGlobalError]);

    const getTabTitle = useMemo(
      () =>
        (fileType: FileType): string => {
          const titles = {
            requirements: 'Requirements',
            design: 'Design',
            tasks: 'Tasks',
          };
          return titles[fileType];
        },
      []
    );

    const getFileSize = useMemo(
      () =>
        (bytes: number): string => {
          if (bytes < 1024) return `${bytes} B`;
          if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
          return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
        },
      []
    );

    const getSeverityColor = useMemo(
      () =>
        (severity: 'error' | 'warning' | 'info'): string => {
          switch (severity) {
            case 'error':
              return 'text-red-600';
            case 'warning':
              return 'text-yellow-600';
            case 'info':
              return 'text-blue-600';
            default:
              return 'text-gray-600';
          }
        },
      []
    );

    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner />
          <span className="ml-2">Loading specifications...</span>
        </div>
      );
    }

    if (error) {
      return (
        <Card className="p-6">
          <div className="text-center">
            <div className="text-red-600 mb-4">
              <svg
                className="w-12 h-12 mx-auto mb-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Error Loading Specifications
            </h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={loadSpecification} variant="primary">
              Try Again
            </Button>
          </div>
        </Card>
      );
    }

    if (!specification) {
      return (
        <Card className="p-6">
          <div className="text-center">
            <div className="text-gray-400 mb-4">
              <svg
                className="w-12 h-12 mx-auto mb-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No Specifications Found
            </h3>
            <p className="text-gray-600">
              No specifications have been generated for this conversation yet.
            </p>
          </div>
        </Card>
      );
    }

    return (
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {specification.metadata.title}
            </h2>
            <p className="text-gray-600 mt-1">
              Generated on{' '}
              {new Date(
                specification.metadata.generatedAt
              ).toLocaleDateString()}{' '}
              • Version {specification.metadata.version}
            </p>
          </div>
          {onClose && (
            <Button onClick={onClose} variant="secondary">
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              Close
            </Button>
          )}
        </div>

        {/* Validation Status */}
        {specification.validation && (
          <Card className="mb-6 p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div
                  className={`w-3 h-3 rounded-full mr-2 ${
                    specification.validation.isValid
                      ? 'bg-green-500'
                      : 'bg-red-500'
                  }`}
                />
                <h3 className="font-semibold">
                  Validation Status:{' '}
                  {specification.validation.isValid ? 'Valid' : 'Issues Found'}
                </h3>
                <span className="ml-2 text-sm text-gray-600">
                  ({Math.round(specification.validation.completeness)}%
                  complete)
                </span>
              </div>
              <Button
                onClick={handleValidateSpecifications}
                variant="secondary"
                size="sm"
              >
                Re-validate
              </Button>
            </div>

            {specification.validation.issues.length > 0 && (
              <div className="space-y-2">
                {specification.validation.issues.map((issue, index) => (
                  <div key={index} className="flex items-start text-sm">
                    <span
                      className={`font-medium mr-2 ${getSeverityColor(issue.severity)}`}
                    >
                      {issue.severity.toUpperCase()}:
                    </span>
                    <span className="text-gray-700">
                      {issue.file} - {issue.section}: {issue.message}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* Download Actions */}
        <Card className="mb-6 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <span>
                Total size: {getFileSize(specification.fileSizes.total)}
              </span>
              {specification.generationTimeMs && (
                <span>Generated in {specification.generationTimeMs}ms</span>
              )}
            </div>
            <div className="flex space-x-2">
              <Button
                onClick={handleDownloadZip}
                disabled={isDownloading}
                variant="primary"
                size="sm"
              >
                {isDownloading ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span className="ml-2">Downloading...</span>
                  </>
                ) : (
                  <>
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    Download ZIP
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {(['requirements', 'design', 'tasks'] as FileType[]).map(
              (fileType) => (
                <button
                  key={fileType}
                  onClick={() => setActiveTab(fileType)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === fileType
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {getTabTitle(fileType)}
                  <span className="ml-2 text-xs text-gray-400">
                    ({getFileSize(specification.fileSizes[fileType])})
                  </span>
                </button>
              )
            )}
          </nav>
        </div>

        {/* File Content */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">
              {getTabTitle(activeTab)}.md
            </h3>
            <div className="flex space-x-2">
              <Button
                onClick={() => handleCopyFile(activeTab)}
                variant="secondary"
                size="sm"
              >
                {copySuccess === activeTab ? (
                  <>
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                    Copy
                  </>
                )}
              </Button>
              <Button
                onClick={() => handleDownloadFile(activeTab)}
                disabled={isDownloading}
                variant="secondary"
                size="sm"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Download
              </Button>
            </div>
          </div>

          <div className="prose prose-sm max-w-none markdown-content">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {specification.files[activeTab]}
            </ReactMarkdown>
          </div>
        </Card>
      </div>
    );
  }
);

SpecificationPreview.displayName = 'SpecificationPreview';
