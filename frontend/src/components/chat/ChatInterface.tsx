import React from 'react';
import { useAppStore } from '../../store';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import PersonaIndicator from './PersonaIndicator';

interface ChatInterfaceProps {
  onSendMessage: (message: string) => void;
  className?: string;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  onSendMessage,
  className,
}) => {
  const {
    conversation: { messages, activePersonas, isGenerating },
    ui: { isTyping, currentTypingPersona },
  } = useAppStore();

  return (
    <div className={`flex flex-col h-full ${className || ''}`}>
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
        onSendMessage={onSendMessage}
        disabled={isGenerating || isTyping}
        placeholder={
          messages.length === 0
            ? 'Describe your app idea and our AI team will help you create professional specifications...'
            : 'Continue the conversation...'
        }
      />
    </div>
  );
};

export default ChatInterface;
