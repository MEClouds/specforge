import React from 'react';
import Card, { CardContent } from '../components/ui/Card';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const Conversation: React.FC = () => {
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
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex -space-x-2">
              {/* AI Persona avatars - placeholder */}
              <div className="w-8 h-8 bg-blue-500 rounded-full border-2 border-white flex items-center justify-center">
                <span className="text-xs text-white font-medium">PM</span>
              </div>
              <div className="w-8 h-8 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                <span className="text-xs text-white font-medium">TL</span>
              </div>
              <div className="w-8 h-8 bg-purple-500 rounded-full border-2 border-white flex items-center justify-center">
                <span className="text-xs text-white font-medium">UX</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chat messages area */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">
          {/* Placeholder for chat messages */}
          <Card className="mb-4">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                  <LoadingSpinner size="sm" />
                </div>
                <div className="flex-1">
                  <p className="text-gray-600">
                    Chat interface will be implemented in the next task...
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Chat input area */}
      <div className="bg-white border-t border-gray-200 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-end space-x-4">
            <div className="flex-1">
              <textarea
                placeholder="Describe your app idea or ask a question..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                rows={3}
              />
            </div>
            <button className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors duration-200">
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Conversation;
