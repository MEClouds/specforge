import React, { useState } from 'react';
import { AIPersona, ChatMessage } from '../../types';
import Card from '../ui/Card';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';

interface ConflictingViewpoint {
  persona: AIPersona;
  message: ChatMessage;
  position: string;
}

interface ConflictResolutionProps {
  conversationId: string;
  conflictingViewpoints: ConflictingViewpoint[];
  onResolutionComplete: (resolution: ChatMessage) => void;
  onDismiss: () => void;
}

const ConflictResolution: React.FC<ConflictResolutionProps> = ({
  conversationId,
  conflictingViewpoints,
  onResolutionComplete,
  onDismiss,
}) => {
  const [isResolving, setIsResolving] = useState(false);
  const [selectedApproach, setSelectedApproach] = useState<string>('');
  const [customInput, setCustomInput] = useState('');

  const resolutionApproaches = [
    {
      id: 'compromise',
      title: 'Find a Compromise',
      description: 'Look for a middle ground that addresses both perspectives',
      icon: '🤝',
    },
    {
      id: 'data-driven',
      title: 'Data-Driven Decision',
      description: 'Use research, metrics, or best practices to decide',
      icon: '📊',
    },
    {
      id: 'user-focused',
      title: 'User-Centered Approach',
      description: "Prioritize what's best for the end users",
      icon: '👥',
    },
    {
      id: 'technical-feasibility',
      title: 'Technical Feasibility',
      description: 'Choose the most technically sound approach',
      icon: '⚙️',
    },
    {
      id: 'business-value',
      title: 'Business Value',
      description: 'Focus on what delivers the most business impact',
      icon: '💼',
    },
    {
      id: 'custom',
      title: 'Custom Resolution',
      description: 'Provide your own guidance for resolution',
      icon: '✏️',
    },
  ];

  const handleResolveConflict = async () => {
    if (!selectedApproach) return;

    setIsResolving(true);

    try {
      const response = await fetch('/api/ai/resolve-conflict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId,
          conflictingMessages: conflictingViewpoints.map((v) => v.message),
          resolutionApproach: selectedApproach,
          customGuidance:
            selectedApproach === 'custom' ? customInput : undefined,
        }),
      });

      if (response.ok) {
        const resolution = await response.json();
        onResolutionComplete(resolution);
      } else {
        console.error('Failed to resolve conflict');
      }
    } catch (error) {
      console.error('Error resolving conflict:', error);
    } finally {
      setIsResolving(false);
    }
  };

  const getConflictSummary = () => {
    const topics = conflictingViewpoints.map((v) => {
      const content = v.message.content.toLowerCase();
      if (content.includes('technology') || content.includes('technical'))
        return 'Technology Choice';
      if (content.includes('user') || content.includes('ux'))
        return 'User Experience';
      if (content.includes('business') || content.includes('revenue'))
        return 'Business Strategy';
      if (content.includes('timeline') || content.includes('schedule'))
        return 'Timeline';
      if (content.includes('feature') || content.includes('functionality'))
        return 'Feature Scope';
      return 'Approach';
    });

    return topics.length > 1 ? topics.join(' vs ') : 'Team Discussion';
  };

  return (
    <Card className="p-6 border-2 border-orange-200 bg-orange-50">
      <div className="mb-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
            <span className="text-xl">⚖️</span>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Team Discussion: {getConflictSummary()}
            </h3>
            <p className="text-sm text-gray-600">
              Your AI team has different perspectives. Help them find the best
              path forward.
            </p>
          </div>
        </div>

        {/* Conflicting Viewpoints */}
        <div className="space-y-4 mb-6">
          {conflictingViewpoints.map((viewpoint, index) => (
            <div
              key={index}
              className="bg-white border border-gray-200 rounded-lg p-4"
            >
              <div className="flex items-start space-x-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm text-white"
                  style={{ backgroundColor: viewpoint.persona.color }}
                >
                  {viewpoint.persona.avatar}
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="font-medium text-gray-900">
                      {viewpoint.persona.name}
                    </span>
                    <span className="text-xs text-gray-500">
                      ({viewpoint.persona.role.replace('-', ' ')})
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {viewpoint.message.content}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Resolution Approaches */}
      <div className="mb-6">
        <h4 className="font-medium text-gray-900 mb-3">
          How should the team resolve this?
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {resolutionApproaches.map((approach) => (
            <label
              key={approach.id}
              className={`flex items-start p-3 border rounded-lg cursor-pointer transition-colors ${
                selectedApproach === approach.id
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="resolution"
                value={approach.id}
                checked={selectedApproach === approach.id}
                onChange={(e) => setSelectedApproach(e.target.value)}
                className="mt-1 mr-3"
              />
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-lg">{approach.icon}</span>
                  <span className="font-medium text-gray-900">
                    {approach.title}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{approach.description}</p>
              </div>
            </label>
          ))}
        </div>

        {/* Custom Input */}
        {selectedApproach === 'custom' && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your guidance for the team:
            </label>
            <textarea
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder="Provide specific guidance on how the team should resolve this disagreement..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              rows={3}
              maxLength={500}
            />
            <div className="mt-1 text-xs text-gray-500">
              {customInput.length}/500 characters
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="secondary" onClick={onDismiss} disabled={isResolving}>
          Let Team Continue Discussion
        </Button>
        <Button
          onClick={handleResolveConflict}
          disabled={
            !selectedApproach ||
            isResolving ||
            (selectedApproach === 'custom' && !customInput.trim())
          }
          className="flex items-center"
        >
          {isResolving ? (
            <>
              <LoadingSpinner size="sm" className="mr-2" />
              Resolving...
            </>
          ) : (
            'Help Team Resolve'
          )}
        </Button>
      </div>

      {/* Tips */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start space-x-2">
          <span className="text-blue-500 text-sm">💡</span>
          <div className="text-sm text-blue-700">
            <strong>Tip:</strong> The AI team will use your chosen approach to
            find a resolution and continue the conversation. You can always
            provide additional input afterward.
          </div>
        </div>
      </div>
    </Card>
  );
};

export default ConflictResolution;
