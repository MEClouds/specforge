import React, { useState, useRef, useEffect } from 'react';
import { cn } from '../../utils/cn';
import Button from '../ui/Button';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  onInputChange?: () => void;
  onInputBlur?: () => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  onInputChange,
  onInputBlur,
  disabled = false,
  placeholder = 'Describe your app idea...',
  className,
}) => {
  const [message, setMessage] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [message]);

  // Focus textarea on mount
  useEffect(() => {
    if (textareaRef.current && !disabled) {
      textareaRef.current.focus();
    }
  }, [disabled]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled && !isComposing) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleCompositionStart = () => {
    setIsComposing(true);
  };

  const handleCompositionEnd = () => {
    setIsComposing(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    onInputChange?.();
  };

  const handleInputBlur = () => {
    onInputBlur?.();
  };

  const canSend = message.trim().length > 0 && !disabled && !isComposing;

  return (
    <div className={cn('border-t border-gray-200 bg-white p-4', className)}>
      <form onSubmit={handleSubmit} className="flex gap-3 items-end">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onKeyDown={handleKeyDown}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className={cn(
              'w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg resize-none',
              'placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
              'transition-colors duration-200 text-sm leading-relaxed',
              disabled && 'bg-gray-50 cursor-not-allowed opacity-50'
            )}
            style={{
              minHeight: '48px',
              maxHeight: '120px',
            }}
          />

          {/* Character count indicator for long messages */}
          {message.length > 500 && (
            <div className="absolute bottom-2 right-2 text-xs text-gray-400">
              {message.length}/2000
            </div>
          )}
        </div>

        <Button
          type="submit"
          disabled={!canSend}
          variant="primary"
          size="md"
          className="px-6 py-3 h-12 flex-shrink-0"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
            />
          </svg>
          <span className="ml-2 hidden sm:inline">Send</span>
        </Button>
      </form>

      {/* Helpful hints */}
      <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
        <span>Press Enter to send, Shift+Enter for new line</span>
        {disabled && (
          <span className="text-orange-500 font-medium">
            {placeholder.includes('Connecting') ||
            placeholder.includes('Reconnecting') ||
            placeholder.includes('Disconnected')
              ? 'Connecting to server...'
              : 'AI is thinking...'}
          </span>
        )}
      </div>
    </div>
  );
};

export default ChatInput;
