import React, { useEffect, useState } from 'react';
import { useAppStore } from '../../store';
import { useWebSocket } from '../../hooks/useWebSocket';
import Card from '../ui/Card';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';

interface ConversationFlowManagerProps {
  conversationId: string;
}

interface ConversationPhase {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  completed: boolean;
  active: boolean;
}

interface ConversationProgress {
  currentPhase: string;
  completedPhases: string[];
  nextPhase?: string;
  overallProgress: number;
  suggestedActions: string[];
  isComplete: boolean;
}

const ConversationFlowManager: React.FC<ConversationFlowManagerProps> = ({
  conversationId,
}) => {
  const {
    conversation: { current, messages, activePersonas, isGenerating },
    ui: { isTyping },
  } = useAppStore();

  const { requestAIResponse } = useWebSocket({ conversationId });

  const [progress, setProgress] = useState<ConversationProgress>({
    currentPhase: 'initial-discovery',
    completedPhases: [],
    overallProgress: 0,
    suggestedActions: [],
    isComplete: false,
  });

  const [showPhaseTransition, setShowPhaseTransition] = useState(false);
  const [nextPhaseInfo, setNextPhaseInfo] = useState<ConversationPhase | null>(
    null
  );

  const phases: ConversationPhase[] = [
    {
      id: 'initial-discovery',
      name: 'Initial Discovery',
      description: 'Understanding your app idea and core requirements',
      icon: '🔍',
      color: 'bg-blue-500',
      completed: false,
      active: false,
    },
    {
      id: 'business-requirements',
      name: 'Business Requirements',
      description: 'Defining business goals and success metrics',
      icon: '📊',
      color: 'bg-green-500',
      completed: false,
      active: false,
    },
    {
      id: 'technical-architecture',
      name: 'Technical Architecture',
      description: 'Planning the technical approach and system design',
      icon: '🏗️',
      color: 'bg-purple-500',
      completed: false,
      active: false,
    },
    {
      id: 'user-experience',
      name: 'User Experience',
      description: 'Designing the user interface and experience flow',
      icon: '🎨',
      color: 'bg-pink-500',
      completed: false,
      active: false,
    },
    {
      id: 'infrastructure',
      name: 'Infrastructure',
      description: 'Planning deployment and operational requirements',
      icon: '⚙️',
      color: 'bg-orange-500',
      completed: false,
      active: false,
    },
    {
      id: 'task-planning',
      name: 'Task Planning',
      description: 'Breaking down work into actionable tasks',
      icon: '📋',
      color: 'bg-red-500',
      completed: false,
      active: false,
    },
  ];

  // Update phase status based on progress
  const updatedPhases = phases.map((phase) => ({
    ...phase,
    completed: progress.completedPhases.includes(phase.id),
    active: phase.id === progress.currentPhase,
  }));

  // Fetch conversation progress from backend
  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const response = await fetch(
          `/api/ai/conversation-progress/${conversationId}`
        );
        if (response.ok) {
          const progressData = await response.json();
          setProgress(progressData);
        }
      } catch (error) {
        console.error('Failed to fetch conversation progress:', error);
      }
    };

    if (conversationId) {
      fetchProgress();
    }
  }, [conversationId, messages.length]);

  // Check for phase transitions
  useEffect(() => {
    if (progress.nextPhase && progress.nextPhase !== progress.currentPhase) {
      const nextPhase = phases.find((p) => p.id === progress.nextPhase);
      if (nextPhase) {
        setNextPhaseInfo(nextPhase);
        setShowPhaseTransition(true);
      }
    }
  }, [progress.nextPhase, progress.currentPhase]);

  const handlePhaseTransition = async () => {
    if (!nextPhaseInfo) return;

    try {
      const response = await fetch(`/api/ai/transition-phase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId,
          nextPhase: nextPhaseInfo.id,
        }),
      });

      if (response.ok) {
        setProgress((prev) => ({
          ...prev,
          currentPhase: nextPhaseInfo.id,
          completedPhases: [...prev.completedPhases, prev.currentPhase],
        }));
        setShowPhaseTransition(false);
        setNextPhaseInfo(null);

        // Request AI response for the new phase
        setTimeout(() => {
          requestAIResponse();
        }, 500);
      }
    } catch (error) {
      console.error('Failed to transition phase:', error);
    }
  };

  const handleContinueCurrentPhase = () => {
    setShowPhaseTransition(false);
    setNextPhaseInfo(null);
  };

  const handleGenerateSpecifications = async () => {
    try {
      const response = await fetch(`/api/specifications/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId,
        }),
      });

      if (response.ok) {
        // Navigate to specifications preview
        window.location.href = `/specifications/${conversationId}`;
      }
    } catch (error) {
      console.error('Failed to generate specifications:', error);
    }
  };

  const currentPhaseIndex = phases.findIndex(
    (p) => p.id === progress.currentPhase
  );
  const progressPercentage = ((currentPhaseIndex + 1) / phases.length) * 100;

  return (
    <div className="space-y-4">
      {/* Progress Overview */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Conversation Progress
          </h3>
          <div className="text-sm text-gray-600">
            {Math.round(progressPercentage)}% Complete
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
          <div
            className="bg-primary-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>

        {/* Phase Indicators */}
        <div className="flex items-center justify-between">
          {updatedPhases.map((phase, index) => (
            <div key={phase.id} className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                  phase.completed
                    ? 'bg-green-500 text-white'
                    : phase.active
                      ? phase.color + ' text-white'
                      : 'bg-gray-200 text-gray-600'
                }`}
              >
                {phase.completed ? '✓' : phase.icon}
              </div>
              <div className="text-xs text-center mt-1 max-w-16">
                <div
                  className={`font-medium ${phase.active ? 'text-primary-600' : 'text-gray-600'}`}
                >
                  {phase.name.split(' ')[0]}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Current Phase Info */}
      {!progress.isComplete && (
        <Card className="p-4">
          <div className="flex items-start space-x-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                updatedPhases.find((p) => p.active)?.color || 'bg-gray-200'
              } text-white`}
            >
              {updatedPhases.find((p) => p.active)?.icon}
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900">
                {updatedPhases.find((p) => p.active)?.name}
              </h4>
              <p className="text-sm text-gray-600 mb-3">
                {updatedPhases.find((p) => p.active)?.description}
              </p>

              {/* Active Personas */}
              {activePersonas.length > 0 && (
                <div className="flex items-center space-x-2 mb-3">
                  <span className="text-xs text-gray-500">
                    Active team members:
                  </span>
                  <div className="flex -space-x-1">
                    {activePersonas.slice(0, 3).map((persona) => (
                      <div
                        key={persona.id}
                        className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-xs"
                        style={{ backgroundColor: persona.color }}
                        title={persona.name}
                      >
                        {persona.avatar}
                      </div>
                    ))}
                    {activePersonas.length > 3 && (
                      <div className="w-6 h-6 bg-gray-400 rounded-full border-2 border-white flex items-center justify-center text-xs text-white">
                        +{activePersonas.length - 3}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Suggested Actions */}
              {progress.suggestedActions.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-2">
                    Suggested next steps:
                  </p>
                  <ul className="text-xs text-gray-600 space-y-1">
                    {progress.suggestedActions
                      .slice(0, 3)
                      .map((action, index) => (
                        <li key={index} className="flex items-start">
                          <span className="text-primary-500 mr-1">•</span>
                          {action}
                        </li>
                      ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Status Indicator */}
            <div className="flex flex-col items-center space-y-1">
              {isGenerating || isTyping ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span className="text-xs text-gray-500">AI thinking...</span>
                </>
              ) : (
                <div
                  className="w-3 h-3 bg-green-400 rounded-full"
                  title="Ready for input"
                />
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Phase Transition Modal */}
      {showPhaseTransition && nextPhaseInfo && (
        <Card className="p-6 border-2 border-primary-200 bg-primary-50">
          <div className="text-center">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">{nextPhaseInfo.icon}</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Ready to Move to {nextPhaseInfo.name}?
            </h3>
            <p className="text-gray-600 mb-6">{nextPhaseInfo.description}</p>
            <div className="flex justify-center space-x-3">
              <Button variant="secondary" onClick={handleContinueCurrentPhase}>
                Continue Current Phase
              </Button>
              <Button onClick={handlePhaseTransition}>
                Move to {nextPhaseInfo.name}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Completion State */}
      {progress.isComplete && (
        <Card className="p-6 border-2 border-green-200 bg-green-50">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🎉</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Conversation Complete!
            </h3>
            <p className="text-gray-600 mb-6">
              Your AI team has gathered all the information needed to generate
              professional specifications.
            </p>
            <Button
              size="lg"
              onClick={handleGenerateSpecifications}
              className="px-8"
            >
              Generate Specifications
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};

export default ConversationFlowManager;
