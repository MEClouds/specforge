// Load test configuration for Artillery
module.exports = {
  config: {
    target: 'http://localhost:3001',
    phases: [
      {
        duration: 60,
        arrivalRate: 5,
        name: 'Warm up',
      },
      {
        duration: 120,
        arrivalRate: 10,
        name: 'Ramp up load',
      },
      {
        duration: 300,
        arrivalRate: 20,
        name: 'Sustained load',
      },
      {
        duration: 60,
        arrivalRate: 50,
        name: 'Peak load',
      },
    ],
    payload: {
      path: './test-data.csv',
      fields: ['appIdea', 'targetUsers', 'complexity'],
    },
  },
  scenarios: [
    {
      name: 'Create conversation and generate specifications',
      weight: 70,
      flow: [
        {
          post: {
            url: '/api/conversations',
            json: {
              title: 'Load Test Conversation {{ $randomString() }}',
              appIdea: '{{ appIdea }}',
              targetUsers: ['{{ targetUsers }}'],
              complexity: '{{ complexity }}',
            },
            capture: {
              json: '$.data.id',
              as: 'conversationId',
            },
          },
        },
        {
          think: 2,
        },
        {
          post: {
            url: '/api/conversations/{{ conversationId }}/messages',
            json: {
              content: 'I want to build {{ appIdea }} for {{ targetUsers }}',
            },
          },
        },
        {
          think: 5,
        },
        {
          post: {
            url: '/api/conversations/{{ conversationId }}/messages',
            json: {
              content:
                'The complexity should be {{ complexity }} and target {{ targetUsers }}',
            },
          },
        },
        {
          think: 3,
        },
        {
          post: {
            url: '/api/specifications/generate',
            json: {
              conversationId: '{{ conversationId }}',
            },
          },
        },
        {
          get: {
            url: '/api/specifications/{{ conversationId }}/download',
          },
        },
      ],
    },
    {
      name: 'Browse existing conversations',
      weight: 20,
      flow: [
        {
          get: {
            url: '/api/conversations',
          },
        },
        {
          think: 1,
        },
        {
          get: {
            url: '/api/conversations/{{ $randomString() }}',
            expect: [
              {
                statusCode: [200, 404],
              },
            ],
          },
        },
      ],
    },
    {
      name: 'Health check and monitoring',
      weight: 10,
      flow: [
        {
          get: {
            url: '/api/health',
          },
        },
        {
          get: {
            url: '/api/metrics',
            expect: [
              {
                statusCode: [200, 404],
              },
            ],
          },
        },
      ],
    },
  ],
};

// Test data for load testing
const testData = [
  {
    appIdea: 'A task management app for remote teams',
    targetUsers: 'developers',
    complexity: 'moderate',
  },
  {
    appIdea: 'E-commerce platform for small businesses',
    targetUsers: 'business owners',
    complexity: 'complex',
  },
  {
    appIdea: 'Social media app for pet owners',
    targetUsers: 'pet owners',
    complexity: 'simple',
  },
  {
    appIdea: 'Learning management system for schools',
    targetUsers: 'teachers,students',
    complexity: 'complex',
  },
  {
    appIdea: 'Weather app with location services',
    targetUsers: 'general users',
    complexity: 'simple',
  },
  {
    appIdea: 'Fitness tracking app with social features',
    targetUsers: 'fitness enthusiasts',
    complexity: 'moderate',
  },
  {
    appIdea: 'Recipe sharing platform with meal planning',
    targetUsers: 'home cooks',
    complexity: 'moderate',
  },
  {
    appIdea: 'Real-time collaboration tool for designers',
    targetUsers: 'designers',
    complexity: 'complex',
  },
  {
    appIdea: 'Personal finance tracker with budgeting',
    targetUsers: 'individuals',
    complexity: 'moderate',
  },
  {
    appIdea: 'Event planning and management platform',
    targetUsers: 'event planners',
    complexity: 'complex',
  },
];

// Export test data for CSV generation
module.exports.testData = testData;
