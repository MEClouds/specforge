import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { useConversation } from '../hooks/useConversation';
import ChatInterface from '../components/chat/ChatInterface';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';

const Conversation: React.FC = () => {
  const { id: conversationId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const {
    conversation: { current, activePersonas },
    ui: { error, isLoading },
  } = useAppStore();

  const {
    createConversation,
    loadConversation,
    clearCurrentConversation,
    isCreating,
  } = useConversation();

  // Form state for new conversation
  const [showNewConversationForm, setShowNewConversationForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    appIdea: '',
    targetUsers: '',
    complexity: 'moderate' as 'simple' | 'moderate' | 'complex',
  });

  // Load existing conversation or show new conversation form
  useEffect(() => {
    if (conversationId && conversationId !== 'new') {
      loadConversation(conversationId);
    } else if (conversationId === 'new') {
      clearCurrentConversation();
      setShowNewConversationForm(true);
    }
  }, [conversationId, loadConversation, clearCurrentConversation]);

  const handleCreateConversation = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.appIdea.trim() || !formData.targetUsers.trim()) {
      return;
    }

    const conversation = await createConversation({
      title: formData.title || `${formData.appIdea.substring(0, 50)}...`,
      description: formData.description,
      appIdea: formData.appIdea,
      targetUsers: formData.targetUsers.split(',').map((user) => user.trim()),
      complexity: formData.complexity,
    });

    if (conversation) {
      navigate(`/conversation/${conversation.id}`);
      setShowNewConversationForm(false);
    }
  };

  const handleStartOver = () => {
    navigate('/conversation/new');
  };

  // Show new conversation form
  if (showNewConversationForm) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <Card className="w-full max-w-2xl p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Start New Conversation
          </h2>
          <form onSubmit={handleCreateConversation} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                App Title (Optional)
              </label>
              <Input
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="My Awesome App"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description (Optional)
              </label>
              <Input
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Brief description of your app"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                App Idea *
              </label>
              <textarea
                value={formData.appIdea}
                onChange={(e) =>
                  setFormData({ ...formData, appIdea: e.target.value })
                }
                placeholder="Describe your app idea in detail. What problem does it solve? What features should it have?"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={4}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target Users *
              </label>
              <Input
                value={formData.targetUsers}
                onChange={(e) =>
                  setFormData({ ...formData, targetUsers: e.target.value })
                }
                placeholder="developers, students, business owners (comma-separated)"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Complexity
              </label>
              <select
                value={formData.complexity}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    complexity: e.target.value as any,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="simple">Simple</option>
                <option value="moderate">Moderate</option>
                <option value="complex">Complex</option>
              </select>
            </div>

            <div className="flex space-x-3 pt-4">
              <Button
                type="submit"
                disabled={
                  isCreating ||
                  !formData.appIdea.trim() ||
                  !formData.targetUsers.trim()
                }
                className="flex-1"
              >
                {isCreating ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  'Start Conversation'
                )}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate('/')}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      </div>
    );
  }

  if (isLoading || isCreating) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-gray-600">
            {isCreating
              ? 'Creating conversation...'
              : 'Loading conversation...'}
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
          <Button onClick={() => navigate('/conversation/new')}>
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
