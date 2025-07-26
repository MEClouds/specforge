import React from 'react';
import { cn } from '../../utils/cn';
import LoadingSpinner from './LoadingSpinner';

interface LoadingOverlayProps {
  isVisible: boolean;
  message?: string;
  progress?: number; // 0-100
  className?: string;
  backdrop?: 'light' | 'dark' | 'blur';
  size?: 'sm' | 'md' | 'lg';
  children?: React.ReactNode;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isVisible,
  message = 'Loading...',
  progress,
  className,
  backdrop = 'light',
  size = 'md',
  children,
}) => {
  if (!isVisible) return null;

  const backdropClasses = {
    light: 'bg-white/80',
    dark: 'bg-black/50',
    blur: 'bg-white/80 backdrop-blur-sm',
  };

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center',
        backdropClasses[backdrop],
        className
      )}
    >
      <div
        className={cn(
          'flex flex-col items-center space-y-4 p-6 bg-white rounded-lg shadow-lg border max-w-sm w-full mx-4',
          sizeClasses[size]
        )}
      >
        <LoadingSpinner
          size={size === 'sm' ? 'md' : size === 'md' ? 'lg' : 'xl'}
        />

        {message && (
          <p className="text-gray-700 font-medium text-center">{message}</p>
        )}

        {progress !== undefined && (
          <div className="w-full">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-500">Progress</span>
              <span className="text-sm text-gray-700 font-medium">
                {Math.round(progress)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
              />
            </div>
          </div>
        )}

        {children}
      </div>
    </div>
  );
};

export default LoadingOverlay;
