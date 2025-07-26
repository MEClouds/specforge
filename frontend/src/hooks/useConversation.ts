import { useState, useCallback } from 'react';
import { useAppStore } from '../store';
import { conversationService } from '../services/ConversationService';
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

        const conversation = await conversationService.createConversation(data);

        // Add to the conversation list
        addConversationToList({
          ...conversation,
          messageCount: 0,
          specificationCount: 0,
        });

        // Set as current conversation
        setCurrentConversation(conversation);
        setMessages([]);

        return conversation;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to create conversation';
        setError(errorMessage);
        return null;
      } finally {
        setIsCreating(false);
      }
    },
    [addConversationToList, setCurrentConversation, setMessages, setError]
  );

  /**
   * Load a conversation by ID
   */
  const loadConversation = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        setLoading(true);
        setError(null);

        const result = await conversationService.getConversation(id);

        setCurrentConversation(result.conversation);
        setMessages(result.messages);

        return true;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to load conversation';
        setError(errorMessage);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [setCurrentConversation, setMessages, setLoading, setError]
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

        const response = await conversationService.getConversations(
          page,
          limit,
          status
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
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to load conversations';
        setError(errorMessage);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [list, setConversationList, setLoading, setError]
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

        const updatedConversation =
          await conversationService.updateConversationStatus(id, status);

        // Update in list
        updateConversationInList(id, updatedConversation);

        // Update current conversation if it's the same
        if (current?.id === id) {
          setCurrentConversation(updatedConversation);
        }

        return true;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to update conversation';
        setError(errorMessage);
        return false;
      } finally {
        setIsUpdating(false);
      }
    },
    [current, updateConversationInList, setCurrentConversation, setError]
  );

  /**
   * Delete a conversation
   */
  const deleteConversation = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        setIsDeleting(true);
        setError(null);

        await conversationService.deleteConversation(id);

        // Remove from list
        removeConversationFromList(id);

        // Clear current conversation if it's the same
        if (current?.id === id) {
          setCurrentConversation(null);
          setMessages([]);
        }

        return true;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to delete conversation';
        setError(errorMessage);
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
