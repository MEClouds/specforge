import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { useConversation } from '../hooks/useConversation';
import ChatInterface from '../components/chat/ChatInterface';
import ConversationStarter from '../components/conversation/ConversationStarter';
import ConversationFlowManager from '../components/conversation/ConversationFlowManager';
import ConflictResolution from '../components/conversation/ConflictResolution';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Button from '../components/ui/Button';

const Conversation: React.FC = () => {
  const { id: conversationId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const {
    conversation: {
      current,
      activePersonas,
      messages,
      conflictingMessages,
      showConflictResolution,
    },
    ui: { error, isLoading },
    setShowConflictResolution,
    addMessage,
  } = useAppStore();

  const { loadConversation, clearCurrentConversation } = useConversation();

  // Show conversation starter for new conversations
  const [showConversationStarter, setShowConversationStarter] = useState(false);

  // Load existing conversation or show conversation starter
  useEffect(() => {
    if (conversationId && conversationId !== 'new') {
      loadConversation(conversationId);
    } else if (conversationId === 'new') {
      clearCurrentConversation();
      setShowConversationStarter(true);
    }
  }, [conversationId, loadConversation, clearCurrentConversation]);

  const handleConversationCreated = (newConversationId: string) => {
    navigate(`/conversation/${newConversationId}`);
    setShowConversationStarter(false);
  };

  const handleStartOver = () => {
    navigate('/conversation/new');
  };

  const handleConflictResolution = (resolution: unknown) => {
    addMessage(resolution);
    setShowConflictResolution(false);
  };

  const handleDismissConflict = () => {
    setShowConflictResolution(false);
  };

  // Detect conflicts in messages (simplified logic)
  useEffect(() => {
    if (messages.length >= 2) {
      const recentMessages = messages.slice(-3);
      const aiMessages = recentMessages.filter((m) => m.type === 'ai');

      if (aiMessages.length >= 2) {
        // Simple conflict detection based on keywords
        const hasConflict = aiMessages.some((msg1, i) =>
          aiMessages.slice(i + 1).some((msg2) => {
            const content1 = msg1.content.toLowerCase();
            const content2 = msg2.content.toLowerCase();

            // Check for disagreement keywords
            return (
              content1.includes('disagree') ||
              content1.includes('however') ||
              content1.includes('but') ||
              content2.includes('disagree') ||
              content2.includes('however') ||
              content2.includes('but') ||
              (content1.includes('recommend') &&
                content2.includes('recommend') &&
                msg1.persona?.role !== msg2.persona?.role)
            );
          })
        );

        if (hasConflict && !showConflictResolution) {
          const conflictingViewpoints = aiMessages.slice(-2).map((msg) => ({
            persona: msg.persona!,
            message: msg,
            position: msg.content.substring(0, 100) + '...',
          }));

          // Set conflicting messages in store (simplified)
          setShowConflictResolution(true);
        }
      }
    }
  }, [messages, showConflictResolution, setShowConflictResolution]);

  // Show conversation starter for new conversations
  if (showConversationStarter) {
    return (
      <div className="h-full overflow-auto">
        <ConversationStarter
          onConversationCreated={handleConversationCreated}
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-gray-600">Loading conversation...</p>
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
          <Button onClick={() => navigate('/conversation/new')}>
            Start New Conversation
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
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

        {/* Conflict Resolution */}
        {showConflictResolution && conflictingMessages.length >= 2 && (
          <div className="p-4 border-b border-gray-200">
            <ConflictResolution
              conversationId={current.id}
              conflictingViewpoints={conflictingMessages
                .slice(-2)
                .map((msg) => ({
                  persona: msg.persona!,
                  message: msg,
                  position: msg.content.substring(0, 100) + '...',
                }))}
              onResolutionComplete={handleConflictResolution}
              onDismiss={handleDismissConflict}
            />
          </div>
        )}

        {/* Chat Interface */}
        <div className="flex-1 overflow-hidden">
          <ChatInterface conversationId={current.id} className="h-full" />
        </div>
      </div>

      {/* Conversation Flow Sidebar */}
      <div className="w-80 border-l border-gray-200 bg-gray-50 overflow-y-auto">
        <div className="p-4">
          <ConversationFlowManager conversationId={current.id} />
        </div>
      </div>
    </div>
  );
};

export default Conversation;
