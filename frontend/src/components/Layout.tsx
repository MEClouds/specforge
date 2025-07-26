import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '../store';
import { cn } from '../utils/cn';
import { ConversationNavigation } from './conversation/ConversationNavigation';
import { useConversation } from '../hooks/useConversation';
import type { Conversation } from '../types';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const sidebarOpen = useAppStore((state) => state.ui.sidebarOpen);
  const setSidebarOpen = useAppStore((state) => state.setSidebarOpen);
  const { switchConversation } = useConversation();

  const handleCreateNew = () => {
    navigate('/conversation/new');
    setSidebarOpen(false);
  };

  const handleSelectConversation = async (conversation: Conversation) => {
    const success = await switchConversation(conversation);
    if (success) {
      navigate(`/conversation/${conversation.id}`);
      setSidebarOpen(false);
    }
  };

  const isConversationPage = location.pathname.startsWith('/conversation');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg
                className="h-8 w-8 text-primary-600"
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
            </div>
            <h1 className="ml-2 text-xl font-bold text-gray-900">SpecForge</h1>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <nav className="mt-5 px-2">
          <div className="space-y-1 mb-4">
            <button
              onClick={() => navigate('/')}
              className={cn(
                'w-full text-left group flex items-center px-2 py-2 text-sm font-medium rounded-md',
                location.pathname === '/'
                  ? 'bg-primary-100 text-primary-900'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <svg
                className={cn(
                  'mr-3 h-6 w-6',
                  location.pathname === '/'
                    ? 'text-primary-500'
                    : 'text-gray-400 group-hover:text-gray-500'
                )}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
              Home
            </button>
            <button
              onClick={handleCreateNew}
              className={cn(
                'w-full text-left group flex items-center px-2 py-2 text-sm font-medium rounded-md',
                location.pathname === '/conversation/new'
                  ? 'bg-primary-100 text-primary-900'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <svg
                className={cn(
                  'mr-3 h-6 w-6',
                  location.pathname === '/conversation/new'
                    ? 'text-primary-500'
                    : 'text-gray-400 group-hover:text-gray-500'
                )}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              New Conversation
            </button>
          </div>
        </nav>

        {/* Conversation Navigation - only show on conversation pages */}
        {isConversationPage && (
          <div className="flex-1 overflow-hidden">
            <ConversationNavigation
              onSelectConversation={handleSelectConversation}
              onCreateNew={handleCreateNew}
              className="h-full"
            />
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="lg:pl-64 flex flex-col flex-1">
        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between h-16 px-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500">
                AI-Powered Specification Generator
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
};

export default Layout;
