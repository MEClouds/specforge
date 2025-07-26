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
import type { Conversation } from '../types';

interface CreateConversationData {
  title: string;
  description?: string;
  appIdea: string;
  targetUsers: string[];
  complexity?: 'simple' | 'moderate' | 'complex';
  userId?: string;
}

export const useConversation = () => {
  const {
    conversation: { current, list, pagination },
    setCurrentConversation,
    setMessages,
    setConversationList,
    addConversationToList,
    updateConversationInList,
    removeConversationFromList,
    setLoading,
    setError,
  } = useAppStore();

  const { showSuccess, showError, showInfo } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  /**
   * Create a new conversation
   */
  const createConversation = useCallback(
    async (data: CreateConversationData): Promise<Conversation | null> => {
      try {
        setIsCreating(true);
        setError(null);
        showInfo('Creating conversation...');

        const conversation = await retryWithBackoff(
          () => conversationService.createConversation(data),
          2 // Max 2 retries for creation
        );

        // Add to the conversation list
        addConversationToList({
          ...conversation,
          messageCount: 0,
          specificationCount: 0,
        });

        // Set as current conversation
        setCurrentConversation(conversation);
        setMessages([]);

        showSuccess('Conversation created successfully!');
        return conversation;
      } catch (err) {
        const error = err as AppError;
        const context = { action: 'create_conversation' };
        const userMessage = getUserFriendlyErrorMessage(error, context);

        logError(error, context);
        setError(userMessage);
        showError(userMessage);
        return null;
      } finally {
        setIsCreating(false);
      }
    },
    [
      addConversationToList,
      setCurrentConversation,
      setMessages,
      setError,
      showSuccess,
      showError,
      showInfo,
    ]
  );

  /**
   * Load a conversation by ID
   */
  const loadConversation = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        setLoading(true);
        setError(null);

        const result = await retryWithBackoff(() =>
          conversationService.getConversation(id)
        );

        setCurrentConversation(result.conversation);
        setMessages(result.messages);

        return true;
      } catch (err) {
        const error = err as AppError;
        const context = { action: 'load_conversation', conversationId: id };
        const userMessage = getUserFriendlyErrorMessage(error, context);

        logError(error, context);
        setError(userMessage);
        showError(userMessage);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [setCurrentConversation, setMessages, setLoading, setError, showError]
  );

  /**
   * Load conversations list with pagination
   */
  const loadConversations = useCallback(
    async (
      page: number = 1,
      limit: number = 20,
      status?: 'active' | 'completed' | 'archived',
      append: boolean = false
    ): Promise<boolean> => {
      try {
        if (!append) {
          setLoading(true);
        }
        setError(null);

        const response = await retryWithBackoff(() =>
          conversationService.getConversations(page, limit, status)
        );

        if (append && list.length > 0) {
          // Append to existing list
          setConversationList(
            [...list, ...response.conversations],
            response.pagination
          );
        } else {
          // Replace list
          setConversationList(response.conversations, response.pagination);
        }

        return true;
      } catch (err) {
        const error = err as AppError;
        const context = { action: 'load_conversations' };
        const userMessage = getUserFriendlyErrorMessage(error, context);

        logError(error, context);
        setError(userMessage);
        showError(userMessage);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [list, setConversationList, setLoading, setError, showError]
  );

  /**
   * Update conversation status
   */
  const updateConversationStatus = useCallback(
    async (
      id: string,
      status: 'active' | 'completed' | 'archived'
    ): Promise<boolean> => {
      try {
        setIsUpdating(true);
        setError(null);

        const updatedConversation = await retryWithBackoff(() =>
          conversationService.updateConversationStatus(id, status)
        );

        // Update in list
        updateConversationInList(id, updatedConversation);

        // Update current conversation if it's the same
        if (current?.id === id) {
          setCurrentConversation(updatedConversation);
        }

        showSuccess(
          `Conversation ${status === 'archived' ? 'archived' : 'updated'} successfully!`
        );
        return true;
      } catch (err) {
        const error = err as AppError;
        const context = { action: 'update_conversation', conversationId: id };
        const userMessage = getUserFriendlyErrorMessage(error, context);

        logError(error, context);
        setError(userMessage);
        showError(userMessage);
        return false;
      } finally {
        setIsUpdating(false);
      }
    },
    [
      current,
      updateConversationInList,
      setCurrentConversation,
      setError,
      showSuccess,
      showError,
    ]
  );

  /**
   * Delete a conversation
   */
  const deleteConversation = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        setIsDeleting(true);
        setError(null);

        await retryWithBackoff(
          () => conversationService.deleteConversation(id),
          2 // Max 2 retries for deletion
        );

        // Remove from list
        removeConversationFromList(id);

        // Clear current conversation if it's the same
        if (current?.id === id) {
          setCurrentConversation(null);
          setMessages([]);
        }

        showSuccess('Conversation deleted successfully!');
        return true;
      } catch (err) {
        const error = err as AppError;
        const context = { action: 'delete_conversation', conversationId: id };
        const userMessage = getUserFriendlyErrorMessage(error, context);

        logError(error, context);
        setError(userMessage);
        showError(userMessage);
        return false;
      } finally {
        setIsDeleting(false);
      }
    },
    [
      current,
      removeConversationFromList,
      setCurrentConversation,
      setMessages,
      setError,
      showSuccess,
      showError,
    ]
  );

  /**
   * Switch to a different conversation
   */
  const switchConversation = useCallback(
    async (conversation: Conversation): Promise<boolean> => {
      if (current?.id === conversation.id) {
        return true; // Already current
      }

      return await loadConversation(conversation.id);
    },
    [current, loadConversation]
  );

  /**
   * Clear current conversation
   */
  const clearCurrentConversation = useCallback(() => {
    setCurrentConversation(null);
    setMessages([]);
  }, [setCurrentConversation, setMessages]);

  return {
    // State
    current,
    list,
    pagination,
    isCreating,
    isUpdating,
    isDeleting,

    // Actions
    createConversation,
    loadConversation,
    loadConversations,
    updateConversationStatus,
    deleteConversation,
    switchConversation,
    clearCurrentConversation,
  };
};
