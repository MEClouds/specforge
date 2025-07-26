import React from 'react';
import { cn } from '../../utils/cn';

export type ConnectionStatus =
  | 'connected'
  | 'disconnected'
  | 'reconnecting'
  | 'connecting';

interface ConnectionStatusProps {
  status: ConnectionStatus;
  onReconnect?: () => void;
  className?: string;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  status,
  onReconnect,
  className,
}) => {
  const getStatusConfig = (status: ConnectionStatus) => {
    switch (status) {
      case 'connected':
        return {
          color: 'text-green-600',
          bgColor: 'bg-green-50 border-green-200',
          icon: (
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          ),
          text: 'Connected',
          showReconnect: false,
        };
      case 'connecting':
        return {
          color: 'text-blue-600',
          bgColor: 'bg-blue-50 border-blue-200',
          icon: (
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-spin"></div>
          ),
          text: 'Connecting to server...',
          showReconnect: false,
        };
      case 'reconnecting':
        return {
          color: 'text-orange-600',
          bgColor: 'bg-orange-50 border-orange-200',
          icon: (
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce"></div>
          ),
          text: 'Reconnecting...',
          showReconnect: false,
        };
      case 'disconnected':
        return {
          color: 'text-red-600',
          bgColor: 'bg-red-50 border-red-200',
          icon: <div className="w-2 h-2 bg-red-500 rounded-full"></div>,
          text: 'Connection lost',
          showReconnect: true,
        };
      default:
        return {
          color: 'text-gray-600',
          bgColor: 'bg-gray-50 border-gray-200',
          icon: <div className="w-2 h-2 bg-gray-500 rounded-full"></div>,
          text: 'Unknown status',
          showReconnect: false,
        };
    }
  };

  const config = getStatusConfig(status);

  // Don't show anything when connected (to reduce UI clutter)
  if (status === 'connected') {
    return null;
  }

  return (
    <div
      className={cn(
        'flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium border',
        config.bgColor,
        config.color,
        className
      )}
    >
      <div className="flex items-center gap-2">
        {config.icon}
        <span>{config.text}</span>
      </div>

      {config.showReconnect && onReconnect && (
        <button
          onClick={onReconnect}
          className={cn(
            'px-3 py-1 text-xs rounded-md border transition-colors',
            'border-current hover:bg-current hover:text-white',
            'focus:outline-none focus:ring-2 focus:ring-current focus:ring-opacity-50'
          )}
        >
          Reconnect
        </button>
      )}
    </div>
  );
};

export default ConnectionStatus;
