import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useAppStore } from '../store';
import ChatInterface from '../components/chat/ChatInterface';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Button from '../components/ui/Button';

const Conversation: React.FC = () => {
  const { id: conversationId } = useParams<{ id: string }>();
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);

  const {
    conversation: { current, activePersonas },
    setCurrentConversation,
    resetConversation,
    ui: { error },
  } = useAppStore();

  const createNewConversation = useCallback(async () => {
    setIsCreatingConversation(true);
    try {
      // For now, create a mock conversation
      // In a real implementation, this would call the API
      const mockConversation = {
        id: `conv_${Date.now()}`,
        title: 'New App Specification',
        description: 'AI-assisted app specification generation',
        status: 'active' as const,
        appIdea: '',
        targetUsers: [],
        complexity: 'moderate' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      setCurrentConversation(mockConversation);
    } catch (error) {
      console.error('Failed to create conversation:', error);
    } finally {
      setIsCreatingConversation(false);
    }
  }, [setCurrentConversation]);

  // Create a new conversation if no ID is provided
  useEffect(() => {
    if (!conversationId && !current && !isCreatingConversation) {
      createNewConversation();
    }
  }, [conversationId, createNewConversation, current, isCreatingConversation]);

  const handleStartOver = () => {
    resetConversation();
    createNewConversation();
  };

  if (isCreatingConversation) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-gray-600">
            Setting up your AI team conversation...
          </p>
        </div>
      </div>
    );
  }

  if (!current) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            No Conversation Found
          </h2>
          <p className="text-gray-600 mb-4">
            Let's start a new conversation with the AI team.
          </p>
          <Button onClick={createNewConversation}>
            Start New Conversation
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Chat header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">
              AI Team Conversation
            </h1>
            <p className="text-sm text-gray-500">
              Collaborate with AI experts to refine your app specifications
            </p>
            {current.title && current.title !== 'New App Specification' && (
              <p className="text-sm font-medium text-gray-700 mt-1">
                {current.title}
              </p>
            )}
          </div>
          <div className="flex items-center space-x-3">
            {/* Active personas display */}
            {activePersonas.length > 0 && (
              <div className="flex -space-x-2">
                {activePersonas.slice(0, 3).map((persona) => (
                  <div
                    key={persona.id}
                    className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-xs font-medium text-white"
                    style={{ backgroundColor: persona.color }}
                    title={persona.name}
                  >
                    {persona.avatar}
                  </div>
                ))}
                {activePersonas.length > 3 && (
                  <div className="w-8 h-8 bg-gray-400 rounded-full border-2 border-white flex items-center justify-center text-xs font-medium text-white">
                    +{activePersonas.length - 3}
                  </div>
                )}
              </div>
            )}

            <Button variant="outline" size="sm" onClick={handleStartOver}>
              Start Over
            </Button>
          </div>
        </div>

        {error && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
            {error}
          </div>
        )}
      </div>

      {/* Chat Interface */}
      <div className="flex-1 overflow-hidden">
        <ChatInterface conversationId={current.id} className="h-full" />
      </div>
    </div>
  );
};

export default Conversation;
