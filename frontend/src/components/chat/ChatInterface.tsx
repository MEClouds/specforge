import React, { useEffect } from 'react';
import { useAppStore } from '../../store';
import { useWebSocket } from '../../hooks/useWebSocket';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import PersonaIndicator from './PersonaIndicator';
import ConnectionStatus from '../ui/ConnectionStatus';

interface ChatInterfaceProps {
  conversationId?: string;
  className?: string;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  conversationId,
  className,
}) => {
  const {
    conversation: { messages, activePersonas, isGenerating, current },
    ui: { isTyping, currentTypingPersona },
  } = useAppStore();

  const {
    connectionStatus,
    isConnected,
    sendMessage,
    requestAIResponse,
    startTyping,
    stopTyping,
    reconnect,
  } = useWebSocket({
    conversationId,
    autoConnect: true,
  });

  // Request AI response when user sends a message
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.type === 'user' && isConnected && current) {
        // Small delay to ensure message is processed
        setTimeout(() => {
          requestAIResponse();
        }, 100);
      }
    }
  }, [messages, isConnected, current, requestAIResponse]);

  const handleSendMessage = (message: string) => {
    if (!conversationId) {
      console.warn('Cannot send message: No conversation ID');
      return;
    }

    sendMessage(message);
  };

  const handleInputChange = () => {
    if (conversationId && isConnected) {
      startTyping();
    }
  };

  const handleInputBlur = () => {
    if (conversationId && isConnected) {
      stopTyping();
    }
  };

  return (
    <div className={`flex flex-col h-full ${className || ''}`}>
      {/* Connection Status - only show when not connected */}
      {connectionStatus !== 'connected' && (
        <div className="px-4 py-2 border-b border-gray-200">
          <ConnectionStatus status={connectionStatus} onReconnect={reconnect} />
        </div>
      )}

      {/* Persona Indicator */}
      <PersonaIndicator
        activePersonas={activePersonas}
        currentTypingPersona={currentTypingPersona}
      />

      {/* Message List */}
      <MessageList
        messages={messages}
        typingPersona={isTyping ? currentTypingPersona : null}
        className="flex-1"
      />

      {/* Chat Input */}
      <ChatInput
        onSendMessage={handleSendMessage}
        onInputChange={handleInputChange}
        onInputBlur={handleInputBlur}
        disabled={isGenerating || isTyping || !isConnected}
        placeholder={
          !isConnected
            ? connectionStatus === 'connecting'
              ? 'Connecting to server...'
              : connectionStatus === 'reconnecting'
                ? 'Reconnecting...'
                : 'Disconnected from server'
            : messages.length === 0
              ? 'Describe your app idea and our AI team will help you create professional specifications...'
              : 'Continue the conversation...'
        }
      />
    </div>
  );
};

export default ChatInterface;
