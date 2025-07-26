import React, { useEffect, useState } from 'react';
import { useAppStore } from '../../store';
import { conversationService } from '../../services/ConversationService';
import LoadingSpinner from '../ui/LoadingSpinner';
import type { Conversation } from '../../types';

interface ConversationNavigationProps {
  onSelectConversation: (conversation: Conversation) => void;
  onCreateNew: () => void;
  className?: string;
}

export const ConversationNavigation: React.FC<ConversationNavigationProps> = ({
  onSelectConversation,
  onCreateNew,
  className = '',
}) => {
  const {
    conversation: { list, current },
    ui: { isLoading },
    setConversationList,
    setLoading,
    setError,
  } = useAppStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [filteredConversations, setFilteredConversations] = useState(list);

  useEffect(() => {
    loadRecentConversations();
  }, [loadRecentConversations]);

  useEffect(() => {
    // Filter conversations based on search query
    const filtered = list.filter(
      (conv) =>
        conv.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.appIdea.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredConversations(filtered);
  }, [list, searchQuery]);

  const loadRecentConversations = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await conversationService.getConversations(
        1,
        10,
        'active'
      );
      setConversationList(response.conversations, response.pagination);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load conversations'
      );
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else if (diffInHours < 168) {
      return `${Math.floor(diffInHours / 24)}d ago`;
    } else {
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
      }).format(date);
    }
  };

  const truncateText = (text: string, maxLength: number) => {
    return text.length > maxLength
      ? text.substring(0, maxLength) + '...'
      : text;
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Conversations</h2>
          <button
            onClick={onCreateNew}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
            title="New conversation"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <svg
            className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <LoadingSpinner size="md" />
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-4 text-center">
            {searchQuery ? (
              <div>
                <p className="text-sm text-gray-500 mb-2">
                  No conversations found
                </p>
                <p className="text-xs text-gray-400">
                  Try a different search term
                </p>
              </div>
            ) : (
              <div>
                <p className="text-sm text-gray-500 mb-3">
                  No conversations yet
                </p>
                <button
                  onClick={onCreateNew}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Start your first conversation
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="p-2">
            {filteredConversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => onSelectConversation(conversation)}
                className={`w-full text-left p-3 rounded-lg mb-2 transition-colors ${
                  current?.id === conversation.id
                    ? 'bg-blue-50 border border-blue-200'
                    : 'hover:bg-gray-50 border border-transparent'
                }`}
              >
                <div className="flex items-start justify-between mb-1">
                  <h3 className="text-sm font-medium text-gray-900 truncate pr-2">
                    {truncateText(conversation.title, 25)}
                  </h3>
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    {formatDate(conversation.updatedAt)}
                  </span>
                </div>

                <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                  {truncateText(conversation.appIdea, 60)}
                </p>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-1.5 py-0.5 text-xs rounded-full ${
                        conversation.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : conversation.status === 'completed'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {conversation.status}
                    </span>
                    {conversation.complexity && (
                      <span
                        className={`px-1.5 py-0.5 text-xs rounded-full ${
                          conversation.complexity === 'simple'
                            ? 'bg-green-100 text-green-600'
                            : conversation.complexity === 'moderate'
                              ? 'bg-yellow-100 text-yellow-600'
                              : 'bg-red-100 text-red-600'
                        }`}
                      >
                        {conversation.complexity}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-1 text-xs text-gray-400">
                    <span>{conversation.messageCount}</span>
                    <svg
                      className="w-3 h-3"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {filteredConversations.length > 0 && (
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={() => {
              // Navigate to full conversation list view
              window.location.href = '/conversations';
            }}
            className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium py-2"
          >
            View all conversations
          </button>
        </div>
      )}
    </div>
  );
};
