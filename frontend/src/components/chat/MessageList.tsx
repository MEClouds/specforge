import React, { useEffect, useRef, useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';
import ChatMessage from './ChatMessage';
import type { ChatMessage as ChatMessageType } from '../../types';

interface MessageListProps {
  messages: ChatMessageType[];
  typingPersona?: string | null;
  className?: string;
}

interface MessageItemProps {
  index: number;
  style: React.CSSProperties;
  data: {
    messages: ChatMessageType[];
    typingPersona?: string | null;
  };
}

const MessageItem: React.FC<MessageItemProps> = ({ index, style, data }) => {
  const { messages, typingPersona } = data;
  const message = messages[index];

  // Check if this is a typing indicator message
  const isTypingMessage = typingPersona && index === messages.length;

  if (isTypingMessage) {
    // Create a temporary typing message
    const typingMessage: ChatMessageType = {
      id: 'typing',
      conversationId: '',
      persona: {
        id: typingPersona,
        name: typingPersona
          .replace('-', ' ')
          .replace(/\b\w/g, (l) => l.toUpperCase()),
        role: typingPersona as any,
        avatar: '',
        color: '',
        expertise: [],
      },
      content: '',
      timestamp: new Date(),
      type: 'ai',
      isTyping: true,
    };

    return (
      <div style={style}>
        <ChatMessage message={typingMessage} isTyping={true} />
      </div>
    );
  }

  return (
    <div style={style}>
      <ChatMessage message={message} />
    </div>
  );
};

const MessageList: React.FC<MessageListProps> = ({
  messages,
  typingPersona,
  className,
}) => {
  const listRef = useRef<List>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate total items (messages + typing indicator if present)
  const totalItems = messages.length + (typingPersona ? 1 : 0);

  // Memoize the data to prevent unnecessary re-renders
  const itemData = useMemo(
    () => ({
      messages,
      typingPersona,
    }),
    [messages, typingPersona]
  );

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (listRef.current && totalItems > 0) {
      listRef.current.scrollToItem(totalItems - 1, 'end');
    }
  }, [totalItems]);

  // Handle container resize
  useEffect(() => {
    const handleResize = () => {
      if (listRef.current && 'resetAfterIndex' in listRef.current) {
        (listRef.current as any).resetAfterIndex(0);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (messages.length === 0 && !typingPersona) {
    return (
      <div
        className={`flex-1 flex items-center justify-center ${className || ''}`}
      >
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Start Your Conversation
          </h3>
          <p className="text-gray-500 max-w-sm">
            Describe your app idea and our AI team will help you create
            professional specifications.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`flex-1 ${className || ''}`}>
      <List
        ref={listRef}
        height={containerRef.current?.clientHeight || 400}
        width="100%"
        itemCount={totalItems}
        itemSize={120} // Approximate height per message
        itemData={itemData}
        overscanCount={5}
        className="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
      >
        {MessageItem}
      </List>
    </div>
  );
};

export default MessageList;
