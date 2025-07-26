import { useState, useCallback } from 'react';
import { useAppStore } from '../store';
import { conversationService } from '../services/ConversationService';
import { useToast } from '../contexts/ToastContext';
import {
  getUserFriendlyErrorMessage,
  logError,
  retryWithBackoff,
  type AppError,
} from '../utils/errorHandling';

export const useSpecifications = () => {
  const {
    specifications,
    setSpecifications,
    setPreviewMode,
    setLoading,
    setError,
  } = useAppStore();

  const { showSuccess, showError, showInfo } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  /**
   * Load specifications for a conversation
   */
  const loadSpecifications = useCallback(
    async (conversationId: string): Promise<boolean> => {
      try {
        setLoading(true);
        setError(null);

        const specData = await retryWithBackoff(() =>
          conversationService.getSpecifications(conversationId)
        );

        setSpecifications({
          requirements: specData.files.requirements,
          design: specData.files.design,
          tasks: specData.files.tasks,
        });

        return true;
      } catch (err) {
        const error = err as AppError;
        const context = { action: 'load_specifications', conversationId };
        const userMessage = getUserFriendlyErrorMessage(error, context);

        logError(error, context);
        setError(userMessage);
        showError(userMessage);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [setSpecifications, setLoading, setError, showError]
  );

  /**
   * Download all specifications as ZIP
   */
  const downloadSpecifications = useCallback(
    async (conversationId: string): Promise<boolean> => {
      try {
        setIsDownloading(true);
        setError(null);
        showInfo('Preparing download...');

        await retryWithBackoff(
          () => conversationService.downloadSpecifications(conversationId),
          2 // Max 2 retries for downloads
        );

        showSuccess('Specifications downloaded successfully!');
        return true;
      } catch (err) {
        const error = err as AppError;
        const context = { action: 'download_specifications', conversationId };
        const userMessage = getUserFriendlyErrorMessage(error, context);

        logError(error, context);
        setError(userMessage);
        showError(userMessage);
        return false;
      } finally {
        setIsDownloading(false);
      }
    },
    [setError, showSuccess, showError, showInfo]
  );

  /**
   * Download individual specification file
   */
  const downloadSpecificationFile = useCallback(
    async (
      conversationId: string,
      fileType: 'requirements' | 'design' | 'tasks'
    ): Promise<boolean> => {
      try {
        setIsDownloading(true);
        setError(null);
        showInfo(`Downloading ${fileType}.md...`);

        await retryWithBackoff(
          () =>
            conversationService.downloadSpecificationFile(
              conversationId,
              fileType
            ),
          2 // Max 2 retries for downloads
        );

        showSuccess(`${fileType}.md downloaded successfully!`);
        return true;
      } catch (err) {
        const error = err as AppError;
        const context = {
          action: 'download_specification_file',
          conversationId,
          additionalData: { fileType },
        };
        const userMessage = getUserFriendlyErrorMessage(error, context);

        logError(error, context);
        setError(userMessage);
        showError(userMessage);
        return false;
      } finally {
        setIsDownloading(false);
      }
    },
    [setError, showSuccess, showError, showInfo]
  );

  /**
   * Validate specifications
   */
  const validateSpecifications = useCallback(
    async (conversationId: string): Promise<any> => {
      try {
        setIsValidating(true);
        setError(null);
        showInfo('Validating specifications...');

        const validation = await retryWithBackoff(() =>
          conversationService.validateSpecifications(conversationId)
        );

        if (validation.isValid) {
          showSuccess('Specifications are valid and complete!');
        } else {
          const issueCount = validation.issues.length;
          showError(
            `Found ${issueCount} issue${issueCount !== 1 ? 's' : ''} in specifications`
          );
        }

        return validation;
      } catch (err) {
        const error = err as AppError;
        const context = { action: 'validate_specifications', conversationId };
        const userMessage = getUserFriendlyErrorMessage(error, context);

        logError(error, context);
        setError(userMessage);
        showError(userMessage);
        return null;
      } finally {
        setIsValidating(false);
      }
    },
    [setError, showSuccess, showError, showInfo]
  );

  /**
   * Copy specification content to clipboard
   */
  const copyToClipboard = useCallback(
    async (content: string, fileName: string): Promise<boolean> => {
      try {
        await navigator.clipboard.writeText(content);
        showSuccess(`${fileName} copied to clipboard!`);
        return true;
      } catch (err) {
        const error = err as AppError;
        const context = {
          action: 'copy_to_clipboard',
          additionalData: { fileName },
        };
        const userMessage = getUserFriendlyErrorMessage(error, context);

        logError(error, context);
        showError(userMessage || 'Failed to copy to clipboard');
        return false;
      }
    },
    [showSuccess, showError]
  );

  /**
   * Toggle preview mode
   */
  const togglePreviewMode = useCallback(
    (enabled: boolean) => {
      setPreviewMode(enabled);
      if (enabled) {
        showInfo('Preview mode enabled');
      }
    },
    [setPreviewMode, showInfo]
  );

  /**
   * Clear specifications
   */
  const clearSpecifications = useCallback(() => {
    setSpecifications({
      requirements: null,
      design: null,
      tasks: null,
    });
    setPreviewMode(false);
  }, [setSpecifications, setPreviewMode]);

  return {
    // State
    specifications,
    isGenerating,
    isDownloading,
    isValidating,

    // Actions
    loadSpecifications,
    downloadSpecifications,
    downloadSpecificationFile,
    validateSpecifications,
    copyToClipboard,
    togglePreviewMode,
    clearSpecifications,
  };
};
