import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card, {
  CardContent,
  CardHeader,
  CardTitle,
} from '../components/ui/Card';
import Button from '../components/ui/Button';
import { ConversationList } from '../components/conversation/ConversationList';
import ConversationStarter from '../components/conversation/ConversationStarter';
import { useConversation } from '../hooks/useConversation';
import type { Conversation } from '../types';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { switchConversation } = useConversation();
  const [showConversations, setShowConversations] = useState(false);
  const [showConversationStarter, setShowConversationStarter] = useState(false);

  const handleCreateNew = () => {
    setShowConversationStarter(true);
  };

  const handleConversationCreated = (conversationId: string) => {
    navigate(`/conversation/${conversationId}`);
  };

  const handleSelectConversation = async (conversation: Conversation) => {
    const success = await switchConversation(conversation);
    if (success) {
      navigate(`/conversation/${conversation.id}`);
    }
  };

  if (showConversationStarter) {
    return (
      <div className="h-full overflow-auto">
        <div className="max-w-4xl mx-auto p-6">
          <div className="mb-6">
            <Button
              variant="secondary"
              onClick={() => setShowConversationStarter(false)}
              className="mb-4"
            >
              ← Back to Home
            </Button>
          </div>
          <ConversationStarter
            onConversationCreated={handleConversationCreated}
          />
        </div>
      </div>
    );
  }

  if (showConversations) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="mb-6">
          <Button
            variant="secondary"
            onClick={() => setShowConversations(false)}
            className="mb-4"
          >
            ← Back to Home
          </Button>
        </div>
        <ConversationList
          onSelectConversation={handleSelectConversation}
          onCreateNew={handleCreateNew}
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome to SpecForge
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Transform your app ideas into professional specifications through
          AI-powered team conversations
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <svg
                className="h-6 w-6 text-primary-600 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a2 2 0 01-2-2v-6a2 2 0 012-2h2m-2-4h6a2 2 0 012 2v6a2 2 0 01-2 2H9a2 2 0 01-2-2V4a2 2 0 012-2z"
                />
              </svg>
              AI Team Conversation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Engage with AI personas representing different roles: Product
              Manager, Tech Lead, UX Designer, DevOps Engineer, and Scrum
              Master.
            </p>
            <ul className="text-sm text-gray-500 space-y-1">
              <li>• Collaborative requirement gathering</li>
              <li>• Technical architecture discussions</li>
              <li>• User experience considerations</li>
              <li>• Implementation planning</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <svg
                className="h-6 w-6 text-primary-600 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Professional Specifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Generate three comprehensive markdown files ready for immediate
              use in your development workflow.
            </p>
            <ul className="text-sm text-gray-500 space-y-1">
              <li>• requirements.md - Detailed requirements</li>
              <li>• design.md - Technical architecture</li>
              <li>• tasks.md - Implementation roadmap</li>
              <li>• Kiro IDE compatible format</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="text-center space-y-4">
        <div className="flex justify-center space-x-4">
          <Button size="lg" className="px-8" onClick={handleCreateNew}>
            Start New Conversation
          </Button>
          <Button
            size="lg"
            variant="secondary"
            className="px-8"
            onClick={() => setShowConversations(true)}
          >
            View Conversations
          </Button>
        </div>
        <p className="text-sm text-gray-500">
          Describe your app idea and let our AI team help you create
          professional specifications
        </p>
      </div>

      <div className="mt-12 border-t border-gray-200 pt-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          How It Works
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-primary-600 font-bold text-lg">1</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">
              Describe Your Idea
            </h3>
            <p className="text-gray-600 text-sm">
              Share your app concept in plain language. No technical expertise
              required.
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-primary-600 font-bold text-lg">2</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">
              AI Team Discussion
            </h3>
            <p className="text-gray-600 text-sm">
              Watch as AI experts collaborate to refine your requirements and
              plan the implementation.
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-primary-600 font-bold text-lg">3</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Download Specs</h3>
            <p className="text-gray-600 text-sm">
              Get professional specifications ready for your development team to
              implement.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
