import { test, expect } from '@playwright/test';

test.describe('Conversation Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should complete full conversation flow and generate specifications', async ({
    page,
  }) => {
    // Start a new conversation
    await expect(page.getByText('Start New Conversation')).toBeVisible();
    await page.getByText('Start New Conversation').click();

    // Enter app idea
    const appIdeaInput = page.getByPlaceholder('Describe your app idea...');
    await expect(appIdeaInput).toBeVisible();
    await appIdeaInput.fill(
      'I want to build a task management app for remote teams with real-time collaboration features'
    );

    // Submit the idea
    await page.getByRole('button', { name: 'Start Conversation' }).click();

    // Wait for AI response
    await expect(page.getByText('Sarah')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Product Manager')).toBeVisible();

    // Verify first AI message appears
    await expect(page.locator('[data-testid="chat-message"]')).toHaveCount(2); // User + AI message

    // Continue conversation - respond to Product Manager
    const chatInput = page.getByPlaceholder('Type your message...');
    await chatInput.fill(
      'The target users are remote software development teams, typically 5-15 people per team'
    );
    await page.getByRole('button', { name: 'Send' }).click();

    // Wait for multiple AI personas to engage
    await expect(page.getByText('Tech Lead')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('UX Designer')).toBeVisible({ timeout: 15000 });

    // Verify conversation progresses through phases
    await expect(page.locator('[data-testid="chat-message"]')).toHaveCount(6, {
      timeout: 20000,
    }); // Multiple AI responses

    // Continue with more detailed responses
    await chatInput.fill(
      'Key features should include task assignment, progress tracking, file sharing, and video calls integration'
    );
    await page.getByRole('button', { name: 'Send' }).click();

    // Wait for DevOps and Scrum Master to join
    await expect(page.getByText('DevOps')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Scrum Master')).toBeVisible({
      timeout: 15000,
    });

    // Provide final details
    await chatInput.fill(
      'We need this to be scalable for up to 1000 teams, with enterprise security features'
    );
    await page.getByRole('button', { name: 'Send' }).click();

    // Wait for conversation completion and specification generation
    await expect(page.getByText('Specifications Ready')).toBeVisible({
      timeout: 30000,
    });

    // Verify specification preview is available
    await expect(page.getByText('Preview Specifications')).toBeVisible();
    await page.getByText('Preview Specifications').click();

    // Check that all three specification files are generated
    await expect(page.getByText('requirements.md')).toBeVisible();
    await expect(page.getByText('design.md')).toBeVisible();
    await expect(page.getByText('tasks.md')).toBeVisible();

    // Verify download functionality
    await expect(page.getByText('Download All')).toBeVisible();

    // Test individual file preview
    await page.getByText('requirements.md').click();
    await expect(page.getByText('Requirements Document')).toBeVisible();

    await page.getByText('design.md').click();
    await expect(page.getByText('Design Document')).toBeVisible();

    await page.getByText('tasks.md').click();
    await expect(page.getByText('Implementation Plan')).toBeVisible();
  });

  test('should handle conversation interruption and resumption', async ({
    page,
  }) => {
    // Start conversation
    await page.getByText('Start New Conversation').click();

    const appIdeaInput = page.getByPlaceholder('Describe your app idea...');
    await appIdeaInput.fill('Simple weather app');
    await page.getByRole('button', { name: 'Start Conversation' }).click();

    // Wait for first AI response
    await expect(page.getByText('Sarah')).toBeVisible({ timeout: 10000 });

    // Get conversation ID from URL
    const url = page.url();
    const conversationId = url.split('/').pop();

    // Refresh page to simulate interruption
    await page.reload();

    // Verify conversation is restored
    await expect(page.locator('[data-testid="chat-message"]')).toHaveCount(2);
    await expect(page.getByText('Simple weather app')).toBeVisible();

    // Continue conversation
    const chatInput = page.getByPlaceholder('Type your message...');
    await chatInput.fill('For mobile users who want quick weather updates');
    await page.getByRole('button', { name: 'Send' }).click();

    // Verify conversation continues normally
    await expect(page.locator('[data-testid="chat-message"]')).toHaveCount(4, {
      timeout: 10000,
    });
  });

  test('should handle AI persona conflicts and resolution', async ({
    page,
  }) => {
    // Start conversation with a complex app idea that might cause conflicts
    await page.getByText('Start New Conversation').click();

    const appIdeaInput = page.getByPlaceholder('Describe your app idea...');
    await appIdeaInput.fill(
      'Real-time multiplayer game with blockchain integration and AI-powered matchmaking'
    );
    await page.getByRole('button', { name: 'Start Conversation' }).click();

    // Wait for multiple personas to engage
    await expect(page.getByText('Product Manager')).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText('Tech Lead')).toBeVisible({ timeout: 15000 });

    // Provide details that might cause technical vs business conflicts
    const chatInput = page.getByPlaceholder('Type your message...');
    await chatInput.fill(
      'We need to launch in 2 months with full blockchain features and support for 100,000 concurrent players'
    );
    await page.getByRole('button', { name: 'Send' }).click();

    // Look for conflict resolution indicators
    await expect(page.getByText('DevOps')).toBeVisible({ timeout: 15000 });

    // Verify that personas are discussing trade-offs
    await expect(page.locator('[data-testid="chat-message"]')).toHaveCount(6, {
      timeout: 20000,
    });

    // Check for conflict resolution UI if it appears
    const conflictResolution = page.locator(
      '[data-testid="conflict-resolution"]'
    );
    if (await conflictResolution.isVisible()) {
      await expect(conflictResolution).toContainText(
        'The team is discussing different approaches'
      );
    }
  });

  test('should validate input and show appropriate errors', async ({
    page,
  }) => {
    // Try to start conversation without app idea
    await page.getByText('Start New Conversation').click();
    await page.getByRole('button', { name: 'Start Conversation' }).click();

    // Should show validation error
    await expect(page.getByText('Please describe your app idea')).toBeVisible();

    // Try with very short input
    const appIdeaInput = page.getByPlaceholder('Describe your app idea...');
    await appIdeaInput.fill('app');
    await page.getByRole('button', { name: 'Start Conversation' }).click();

    // Should show minimum length error
    await expect(
      page.getByText('Please provide more details about your app idea')
    ).toBeVisible();

    // Try with valid input
    await appIdeaInput.fill(
      'A mobile app for tracking daily habits and building routines'
    );
    await page.getByRole('button', { name: 'Start Conversation' }).click();

    // Should proceed normally
    await expect(page.getByText('Sarah')).toBeVisible({ timeout: 10000 });
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Start conversation
    await page.getByText('Start New Conversation').click();

    const appIdeaInput = page.getByPlaceholder('Describe your app idea...');
    await appIdeaInput.fill('Social media app for pet owners');
    await page.getByRole('button', { name: 'Start Conversation' }).click();

    // Wait for first response
    await expect(page.getByText('Sarah')).toBeVisible({ timeout: 10000 });

    // Simulate network failure by going offline
    await page.context().setOffline(true);

    // Try to send a message
    const chatInput = page.getByPlaceholder('Type your message...');
    await chatInput.fill('Focus on dog owners initially');
    await page.getByRole('button', { name: 'Send' }).click();

    // Should show connection error
    await expect(page.getByText('Connection lost')).toBeVisible();
    await expect(page.getByText('Reconnecting...')).toBeVisible();

    // Restore connection
    await page.context().setOffline(false);

    // Should reconnect and allow message sending
    await expect(page.getByText('Connected')).toBeVisible({ timeout: 5000 });

    // Retry sending message
    await page.getByRole('button', { name: 'Send' }).click();
    await expect(page.locator('[data-testid="chat-message"]')).toHaveCount(4, {
      timeout: 10000,
    });
  });
});
