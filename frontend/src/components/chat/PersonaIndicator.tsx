import React, { memo, useMemo } from 'react';
import { cn } from '../../utils/cn';
import type { AIPersona } from '../../types';

interface PersonaIndicatorProps {
  activePersonas: AIPersona[];
  currentTypingPersona?: string | null;
  className?: string;
}

const PersonaIndicator: React.FC<PersonaIndicatorProps> = memo(
  ({ activePersonas, currentTypingPersona, className }) => {
    // Memoize persona styling functions
    const getPersonaColor = useMemo(
      () => (role: string) => {
        const colors = {
          'product-manager': 'bg-purple-500 border-purple-200',
          'tech-lead': 'bg-blue-500 border-blue-200',
          'ux-designer': 'bg-pink-500 border-pink-200',
          devops: 'bg-green-500 border-green-200',
          'scrum-master': 'bg-orange-500 border-orange-200',
        };
        return (
          colors[role as keyof typeof colors] || 'bg-gray-500 border-gray-200'
        );
      },
      []
    );

    const getPersonaAvatar = useMemo(
      () => (role: string) => {
        const avatars = {
          'product-manager': '👔',
          'tech-lead': '💻',
          'ux-designer': '🎨',
          devops: '⚙️',
          'scrum-master': '📋',
        };
        return avatars[role as keyof typeof avatars] || '🤖';
      },
      []
    );

    const getPersonaName = useMemo(
      () => (role: string) => {
        return role.replace('-', ' ').replace(/\b\w/g, (l) => l.toUpperCase());
      },
      []
    );

    // Memoize expertise tags to avoid recalculation
    const expertiseTags = useMemo(() => {
      return activePersonas.flatMap((persona) =>
        persona.expertise.slice(0, 2).map((skill, index) => ({
          key: `${persona.id}-${skill}-${index}`,
          skill,
        }))
      );
    }, [activePersonas]);

    if (activePersonas.length === 0) {
      return null;
    }

    return (
      <div
        className={cn('bg-white border-b border-gray-200 px-4 py-3', className)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700">
              AI Team Members:
            </span>
            <div className="flex items-center gap-2">
              {activePersonas.map((persona) => {
                const isTyping = currentTypingPersona === persona.role;

                return (
                  <div
                    key={persona.id}
                    className={cn(
                      'flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-200',
                      isTyping
                        ? 'bg-primary-50 border-primary-200 shadow-sm'
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    )}
                  >
                    <div
                      className={cn(
                        'w-6 h-6 rounded-full flex items-center justify-center text-xs text-white relative',
                        getPersonaColor(persona.role)
                      )}
                    >
                      {getPersonaAvatar(persona.role)}
                      {isTyping && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white animate-pulse"></div>
                      )}
                    </div>
                    <span
                      className={cn(
                        'text-xs font-medium',
                        isTyping ? 'text-primary-700' : 'text-gray-600'
                      )}
                    >
                      {getPersonaName(persona.role)}
                    </span>
                    {isTyping && (
                      <div className="flex gap-0.5 ml-1">
                        <div className="w-1 h-1 bg-primary-500 rounded-full animate-pulse"></div>
                        <div className="w-1 h-1 bg-primary-500 rounded-full animate-pulse delay-75"></div>
                        <div className="w-1 h-1 bg-primary-500 rounded-full animate-pulse delay-150"></div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Status indicator */}
          <div className="flex items-center gap-2">
            {currentTypingPersona ? (
              <div className="flex items-center gap-2 text-sm text-primary-600">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="font-medium">
                  {getPersonaName(currentTypingPersona)} is typing...
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                <span>Ready</span>
              </div>
            )}
          </div>
        </div>

        {/* Expertise tags */}
        {expertiseTags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {expertiseTags.map(({ key, skill }) => (
              <span
                key={key}
                className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full"
              >
                {skill}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }
);

PersonaIndicator.displayName = 'PersonaIndicator';

export default PersonaIndicator;
