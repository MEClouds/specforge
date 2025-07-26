import React, { memo, useMemo } from 'react';
import { cn } from '../../utils/cn';
import { usePerformanceTracking } from '../../utils/performance';
import type { ChatMessage as ChatMessageType } from '../../types';

interface ChatMessageProps {
  message: ChatMessageType;
  isTyping?: boolean;
}

const ChatMessage: React.FC<ChatMessageProps> = memo(
  ({ message, isTyping = false }) => {
    // Track component performance
    usePerformanceTracking('ChatMessage');

    const isUser = message.type === 'user';
    const persona = message.persona;

    // Memoize persona styling to avoid recalculation
    const personaColor = useMemo(() => {
      if (!persona) return 'bg-gray-100 text-gray-800 border-gray-200';

      const colors = {
        'product-manager': 'bg-purple-100 text-purple-800 border-purple-200',
        'tech-lead': 'bg-blue-100 text-blue-800 border-blue-200',
        'ux-designer': 'bg-pink-100 text-pink-800 border-pink-200',
        devops: 'bg-green-100 text-green-800 border-green-200',
        'scrum-master': 'bg-orange-100 text-orange-800 border-orange-200',
      };
      return (
        colors[persona.role as keyof typeof colors] ||
        'bg-gray-100 text-gray-800 border-gray-200'
      );
    }, [persona?.role]);

    const personaAvatar = useMemo(() => {
      if (!persona) return '🤖';

      const avatars = {
        'product-manager': '👔',
        'tech-lead': '💻',
        'ux-designer': '🎨',
        devops: '⚙️',
        'scrum-master': '📋',
      };
      return avatars[persona.role as keyof typeof avatars] || '🤖';
    }, [persona]);

    const formattedTime = useMemo(() => {
      return new Date(message.timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
    }, [message.timestamp]);

    const displayName = useMemo(() => {
      return (
        persona?.role
          .replace('-', ' ')
          .replace(/\b\w/g, (l) => l.toUpperCase()) || ''
      );
    }, [persona?.role]);

    return (
      <div
        className={cn(
          'flex gap-3 p-4 animate-fade-in',
          isUser ? 'justify-end' : 'justify-start'
        )}
      >
        {!isUser && persona && (
          <div className="flex-shrink-0">
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border',
                personaColor
              )}
            >
              {personaAvatar}
            </div>
          </div>
        )}

        <div
          className={cn('flex flex-col', isUser ? 'items-end' : 'items-start')}
        >
          {!isUser && persona && (
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-gray-900">
                {persona.name}
              </span>
              <span
                className={cn(
                  'px-2 py-0.5 rounded-full text-xs font-medium border',
                  personaColor
                )}
              >
                {displayName}
              </span>
            </div>
          )}

          <div
            className={cn(
              'max-w-xs sm:max-w-md lg:max-w-lg xl:max-w-xl rounded-lg px-4 py-2 shadow-sm',
              isUser
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-900 border border-gray-200'
            )}
          >
            {isTyping ? (
              <div className="flex items-center gap-1">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-75"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-150"></div>
                </div>
                <span className="text-sm text-gray-500 ml-2">typing...</span>
              </div>
            ) : (
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {message.content}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-gray-500">{formattedTime}</span>
          </div>
        </div>

        {isUser && (
          <div className="flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-sm font-medium">
              U
            </div>
          </div>
        )}
      </div>
    );
  }
);

ChatMessage.displayName = 'ChatMessage';

export default ChatMessage;
