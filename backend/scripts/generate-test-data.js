const fs = require('fs');
const path = require('path');

// Generate CSV test data for load testing
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

// Generate CSV content
const csvHeader = 'appIdea,targetUsers,complexity\n';
const csvContent = testData
  .map((row) => `"${row.appIdea}","${row.targetUsers}","${row.complexity}"`)
  .join('\n');

const csvData = csvHeader + csvContent;

// Write to file
const outputPath = path.join(__dirname, '../src/__tests__/load/test-data.csv');
fs.writeFileSync(outputPath, csvData);

console.log(`Generated test data CSV at: ${outputPath}`);
console.log(`Generated ${testData.length} test cases`);
