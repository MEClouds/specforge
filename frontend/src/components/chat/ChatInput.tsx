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
  isLoading?: boolean;
  connectionStatus?:
    | 'connected'
    | 'disconnected'
    | 'reconnecting'
    | 'connecting';
  error?: string | null;
}

const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  onInputChange,
  onInputBlur,
  disabled = false,
  placeholder = 'Describe your app idea...',
  className,
  isLoading = false,
  connectionStatus = 'connected',
  error,
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

  const canSend =
    message.trim().length > 0 &&
    !disabled &&
    !isComposing &&
    !isLoading &&
    connectionStatus === 'connected';

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
          {isLoading ? (
            <>
              <svg
                className="w-4 h-4 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span className="ml-2 hidden sm:inline">Sending...</span>
            </>
          ) : (
            <>
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
            </>
          )}
        </Button>
      </form>

      {/* Status and hints */}
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="text-gray-500">
          Press Enter to send, Shift+Enter for new line
        </span>

        <div className="flex items-center space-x-2">
          {error && <span className="text-red-500 font-medium">{error}</span>}

          {!error && connectionStatus !== 'connected' && (
            <span className="text-orange-500 font-medium">
              {connectionStatus === 'connecting' && 'Connecting...'}
              {connectionStatus === 'reconnecting' && 'Reconnecting...'}
              {connectionStatus === 'disconnected' && 'Disconnected'}
            </span>
          )}

          {!error && connectionStatus === 'connected' && isLoading && (
            <span className="text-blue-500 font-medium">AI is thinking...</span>
          )}

          {!error &&
            connectionStatus === 'connected' &&
            !isLoading &&
            disabled && (
              <span className="text-gray-500 font-medium">Ready to send</span>
            )}
        </div>
      </div>
    </div>
  );
};

export default ChatInput;
