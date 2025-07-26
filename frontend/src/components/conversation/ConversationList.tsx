import React, { useEffect, useState } from 'react';
import { useAppStore } from '../../store';
import { conversationService } from '../../services/ConversationService';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import Card from '../ui/Card';
import type { Conversation } from '../../types';

interface ConversationListProps {
  onSelectConversation: (conversation: Conversation) => void;
  onCreateNew: () => void;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  onSelectConversation,
  onCreateNew,
}) => {
  const {
    conversation: { list, pagination, current },
    ui: { isLoading, error },
    setConversationList,
    setLoading,
    setError,
    updateConversationInList,
    removeConversationFromList,
  } = useAppStore();

  const [statusFilter, setStatusFilter] = useState<
    'active' | 'completed' | 'archived' | 'all'
  >('all');
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  useEffect(() => {
    loadConversations(1, true);
  }, [statusFilter]);

  const loadConversations = async (
    page: number = 1,
    reset: boolean = false
  ) => {
    try {
      if (reset) {
        setLoading(true);
      } else {
        setIsLoadingMore(true);
      }
      setError(null);

      const response = await conversationService.getConversations(
        page,
        20,
        statusFilter === 'all' ? undefined : statusFilter
      );

      if (reset) {
        setConversationList(response.conversations, response.pagination);
      } else {
        // Append to existing list for pagination
        setConversationList(
          [...list, ...response.conversations],
          response.pagination
        );
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load conversations'
      );
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (pagination.page < pagination.totalPages && !isLoadingMore) {
      loadConversations(pagination.page + 1, false);
    }
  };

  const handleStatusChange = async (
    conversationId: string,
    newStatus: 'active' | 'completed' | 'archived'
  ) => {
    try {
      const updatedConversation =
        await conversationService.updateConversationStatus(
          conversationId,
          newStatus
        );
      updateConversationInList(conversationId, updatedConversation);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to update conversation'
      );
    }
  };

  const handleDelete = async (conversationId: string) => {
    if (
      !confirm(
        'Are you sure you want to delete this conversation? This action cannot be undone.'
      )
    ) {
      return;
    }

    try {
      await conversationService.deleteConversation(conversationId);
      removeConversationFromList(conversationId);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to delete conversation'
      );
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'archived':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getComplexityColor = (complexity?: string) => {
    switch (complexity) {
      case 'simple':
        return 'bg-green-100 text-green-700';
      case 'moderate':
        return 'bg-yellow-100 text-yellow-700';
      case 'complex':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  if (isLoading && list.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Conversations</h2>
        <Button onClick={onCreateNew} variant="primary">
          New Conversation
        </Button>
      </div>

      {/* Filter */}
      <div className="flex space-x-2">
        {(['all', 'active', 'completed', 'archived'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              statusFilter === status
                ? 'bg-blue-100 text-blue-700 border border-blue-300'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Conversations List */}
      <div className="space-y-3">
        {list.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-gray-500 mb-4">No conversations found</p>
            <Button onClick={onCreateNew} variant="primary">
              Create your first conversation
            </Button>
          </Card>
        ) : (
          list.map((conversation) => (
            <div
              key={conversation.id}
              className="cursor-pointer"
              onClick={() => onSelectConversation(conversation)}
            >
              <Card
                className={`p-4 transition-all hover:shadow-md ${
                  current?.id === conversation.id
                    ? 'ring-2 ring-blue-500 bg-blue-50'
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {conversation.title}
                      </h3>
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${getStatusColor(
                          conversation.status
                        )}`}
                      >
                        {conversation.status}
                      </span>
                      {conversation.complexity && (
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${getComplexityColor(
                            conversation.complexity
                          )}`}
                        >
                          {conversation.complexity}
                        </span>
                      )}
                    </div>

                    {conversation.description && (
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                        {conversation.description}
                      </p>
                    )}

                    <p className="text-xs text-gray-500 mb-2 line-clamp-1">
                      {conversation.appIdea}
                    </p>

                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span>{conversation.messageCount} messages</span>
                      <span>{conversation.specificationCount} specs</span>
                      <span>Updated {formatDate(conversation.updatedAt)}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1 ml-4">
                    {/* Status change dropdown */}
                    <select
                      value={conversation.status}
                      onChange={(e) =>
                        handleStatusChange(
                          conversation.id,
                          e.target.value as 'active' | 'completed' | 'archived'
                        )
                      }
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs border border-gray-300 rounded px-2 py-1 bg-white"
                    >
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                      <option value="archived">Archived</option>
                    </select>

                    {/* Delete button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(conversation.id);
                      }}
                      className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                      title="Delete conversation"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </Card>
            </div>
          ))
        )}
      </div>

      {/* Load More */}
      {pagination.page < pagination.totalPages && (
        <div className="flex justify-center">
          <Button
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            variant="secondary"
          >
            {isLoadingMore ? <LoadingSpinner size="sm" /> : 'Load More'}
          </Button>
        </div>
      )}

      {/* Pagination Info */}
      {list.length > 0 && (
        <div className="text-center text-sm text-gray-500">
          Showing {list.length} of {pagination.total} conversations
        </div>
      )}
    </div>
  );
};
