import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConversation } from '../../hooks/useConversation';
import Card, { CardContent, CardHeader, CardTitle } from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import LoadingSpinner from '../ui/LoadingSpinner';

interface ConversationStarterProps {
  onConversationCreated?: (conversationId: string) => void;
}

const ConversationStarter: React.FC<ConversationStarterProps> = ({
  onConversationCreated,
}) => {
  const navigate = useNavigate();
  const { createConversation, isCreating } = useConversation();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    appIdea: '',
    targetUsers: '',
    complexity: 'moderate' as 'simple' | 'moderate' | 'complex',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [currentStep, setCurrentStep] = useState(1);

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!formData.appIdea.trim()) {
        newErrors.appIdea = 'App idea is required';
      } else if (formData.appIdea.trim().length < 20) {
        newErrors.appIdea =
          'Please provide more details about your app idea (at least 20 characters)';
      }
    }

    if (step === 2) {
      if (!formData.targetUsers.trim()) {
        newErrors.targetUsers = 'Target users are required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep(currentStep - 1);
    setErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateStep(2)) {
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
      if (onConversationCreated) {
        onConversationCreated(conversation.id);
      } else {
        navigate(`/conversation/${conversation.id}`);
      }
    }
  };

  const complexityOptions = [
    {
      value: 'simple',
      label: 'Simple',
      description: 'Basic functionality, minimal features',
    },
    {
      value: 'moderate',
      label: 'Moderate',
      description: 'Standard features with some complexity',
    },
    {
      value: 'complex',
      label: 'Complex',
      description: 'Advanced features, integrations, scalability',
    },
  ];

  const exampleIdeas = [
    'A task management app for remote teams with real-time collaboration',
    'A fitness tracking app with social features and workout recommendations',
    'An e-commerce platform for local artisans with inventory management',
    'A learning management system for online courses with video streaming',
  ];

  const exampleUsers = [
    'developers, project managers, remote workers',
    'fitness enthusiasts, personal trainers, health-conscious individuals',
    'artisans, small business owners, craft enthusiasts',
    'educators, students, corporate trainers',
  ];

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card className="p-6">
        <CardHeader className="text-center mb-6">
          <CardTitle className="text-2xl font-bold text-gray-900">
            Start Your AI Team Conversation
          </CardTitle>
          <p className="text-gray-600 mt-2">
            Our AI experts will help you transform your idea into professional
            specifications
          </p>
        </CardHeader>

        <CardContent>
          {/* Progress indicator */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center space-x-4">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep >= 1
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                1
              </div>
              <div
                className={`w-16 h-1 ${currentStep >= 2 ? 'bg-primary-600' : 'bg-gray-200'}`}
              />
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep >= 2
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                2
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Describe Your App Idea *
                  </label>
                  <textarea
                    value={formData.appIdea}
                    onChange={(e) =>
                      setFormData({ ...formData, appIdea: e.target.value })
                    }
                    placeholder="What problem does your app solve? What are the main features? Be as detailed as possible..."
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                      errors.appIdea ? 'border-red-300' : 'border-gray-300'
                    }`}
                    rows={6}
                    maxLength={2000}
                  />
                  {errors.appIdea && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.appIdea}
                    </p>
                  )}
                  <div className="mt-2 text-xs text-gray-500">
                    {formData.appIdea.length}/2000 characters
                  </div>
                </div>

                {/* Example ideas */}
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Need inspiration? Try one of these examples:
                  </p>
                  <div className="space-y-2">
                    {exampleIdeas.map((idea, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() =>
                          setFormData({ ...formData, appIdea: idea })
                        }
                        className="w-full text-left p-3 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        {idea}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    type="button"
                    onClick={handleNext}
                    disabled={!formData.appIdea.trim()}
                  >
                    Next Step
                  </Button>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    App Title (Optional)
                  </label>
                  <Input
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    placeholder="My Awesome App"
                    maxLength={100}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Brief Description (Optional)
                  </label>
                  <Input
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="A brief summary of your app"
                    maxLength={200}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Target Users *
                  </label>
                  <Input
                    value={formData.targetUsers}
                    onChange={(e) =>
                      setFormData({ ...formData, targetUsers: e.target.value })
                    }
                    placeholder="developers, students, business owners (comma-separated)"
                    className={errors.targetUsers ? 'border-red-300' : ''}
                  />
                  {errors.targetUsers && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.targetUsers}
                    </p>
                  )}

                  {/* Example users */}
                  <div className="mt-2">
                    <p className="text-xs text-gray-600 mb-1">Examples:</p>
                    <div className="flex flex-wrap gap-2">
                      {exampleUsers.map((users, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() =>
                            setFormData({ ...formData, targetUsers: users })
                          }
                          className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                        >
                          {users}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Project Complexity
                  </label>
                  <div className="space-y-3">
                    {complexityOptions.map((option) => (
                      <label
                        key={option.value}
                        className={`flex items-start p-3 border rounded-lg cursor-pointer transition-colors ${
                          formData.complexity === option.value
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="complexity"
                          value={option.value}
                          checked={formData.complexity === option.value}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              complexity: e.target.value as any,
                            })
                          }
                          className="mt-1 mr-3"
                        />
                        <div>
                          <div className="font-medium text-gray-900">
                            {option.label}
                          </div>
                          <div className="text-sm text-gray-600">
                            {option.description}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex justify-between">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleBack}
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    disabled={isCreating || !formData.targetUsers.trim()}
                    className="flex items-center"
                  >
                    {isCreating ? (
                      <>
                        <LoadingSpinner size="sm" className="mr-2" />
                        Starting Conversation...
                      </>
                    ) : (
                      'Start AI Team Conversation'
                    )}
                  </Button>
                </div>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConversationStarter;
