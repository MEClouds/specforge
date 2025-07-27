import { PersonaRole, ConversationPhase } from '../../types/ai';

export interface MockAIResponse {
  persona: PersonaRole;
  content: string;
  phase: ConversationPhase;
  tokens: number;
  processingTimeMs: number;
}

export const mockAIResponses: Record<string, MockAIResponse[]> = {
  'task-management-app': [
    {
      persona: PersonaRole.PRODUCT_MANAGER,
      content:
        "Great idea! A task management app for remote teams is definitely needed. Let me ask a few questions to better understand your vision:\n\n1. What specific pain points are you trying to solve for remote teams?\n2. How many team members would typically use this app?\n3. What's your target timeline for launch?\n4. Do you have any specific integrations in mind (Slack, email, etc.)?\n\nUnderstanding these details will help us create a more targeted solution.",
      phase: ConversationPhase.INITIAL_DISCOVERY,
      tokens: 120,
      processingTimeMs: 1500,
    },
    {
      persona: PersonaRole.TECH_LEAD,
      content:
        "From a technical perspective, I'm thinking about the architecture for real-time collaboration. We'll need to consider:\n\n**Core Technologies:**\n- Real-time updates (WebSockets or Server-Sent Events)\n- Scalable database design for concurrent users\n- API design for mobile and web clients\n\n**Key Technical Questions:**\n1. Expected concurrent users per team?\n2. Offline functionality requirements?\n3. File attachment and storage needs?\n4. Integration complexity with existing tools?\n\nThese factors will significantly impact our technology stack choices.",
      phase: ConversationPhase.TECHNICAL_EXPLORATION,
      tokens: 150,
      processingTimeMs: 2000,
    },
    {
      persona: PersonaRole.UX_DESIGNER,
      content:
        "Excellent! User experience will be crucial for adoption. I'm envisioning:\n\n**User Flow Priorities:**\n- Quick task creation and assignment\n- Clear visual hierarchy for task priorities\n- Intuitive team collaboration features\n- Mobile-first responsive design\n\n**UX Considerations:**\n1. How do users currently manage tasks?\n2. What devices will they primarily use?\n3. Notification preferences and frequency?\n4. Accessibility requirements?\n\nI'd love to understand the user journey from task creation to completion.",
      phase: ConversationPhase.UX_PLANNING,
      tokens: 135,
      processingTimeMs: 1800,
    },
    {
      persona: PersonaRole.DEVOPS,
      content:
        "For infrastructure and deployment, I'm considering:\n\n**Scalability & Performance:**\n- Auto-scaling for variable team sizes\n- Global CDN for file attachments\n- Database optimization for real-time queries\n- Monitoring and alerting setup\n\n**Security & Compliance:**\n- Data encryption at rest and in transit\n- User authentication and authorization\n- GDPR compliance for international teams\n- Backup and disaster recovery\n\n**Questions:**\n1. Expected growth rate?\n2. Geographic distribution of users?\n3. Compliance requirements?\n4. Budget constraints for infrastructure?",
      phase: ConversationPhase.INFRASTRUCTURE_PLANNING,
      tokens: 160,
      processingTimeMs: 2200,
    },
    {
      persona: PersonaRole.SCRUM_MASTER,
      content:
        'Perfect! Let me organize our development approach:\n\n**Sprint Planning:**\n- Sprint 1-2: Core task CRUD operations\n- Sprint 3-4: Real-time collaboration features\n- Sprint 5-6: Team management and permissions\n- Sprint 7-8: Integrations and notifications\n\n**Development Estimates:**\n- MVP: 8-10 weeks with 3-4 developers\n- Full feature set: 16-20 weeks\n- Testing and deployment: 2-3 weeks\n\n**Risk Mitigation:**\n1. Early user feedback sessions\n2. Incremental feature rollout\n3. Performance testing at each milestone\n\nShall we proceed with detailed task breakdown?',
      phase: ConversationPhase.PROJECT_PLANNING,
      tokens: 145,
      processingTimeMs: 1900,
    },
  ],
  'ecommerce-platform': [
    {
      persona: PersonaRole.PRODUCT_MANAGER,
      content:
        "An e-commerce platform for small businesses is a fantastic opportunity! The market is huge and there's always room for innovation. Let me understand your specific angle:\n\n**Key Questions:**\n1. What makes your platform different from Shopify, WooCommerce, or Square?\n2. What specific challenges do small businesses face that you want to solve?\n3. What's your revenue model (subscription, transaction fees, both)?\n4. Target business size (solo entrepreneurs, 2-10 employees, etc.)?\n\nUnderstanding your unique value proposition will help us build something truly compelling.",
      phase: ConversationPhase.INITIAL_DISCOVERY,
      tokens: 140,
      processingTimeMs: 1600,
    },
    {
      persona: PersonaRole.TECH_LEAD,
      content:
        "E-commerce platforms have complex technical requirements. Here's what I'm thinking:\n\n**Core Architecture:**\n- Microservices for scalability (catalog, orders, payments, inventory)\n- Event-driven architecture for real-time updates\n- Multi-tenant database design\n- Payment gateway integrations (Stripe, PayPal, etc.)\n\n**Technical Challenges:**\n1. PCI compliance for payment processing\n2. Inventory synchronization across channels\n3. Performance optimization for product catalogs\n4. Mobile app vs. responsive web strategy\n\n**Questions:**\n- Expected transaction volume?\n- Multi-currency support needed?\n- Third-party integrations required?",
      phase: ConversationPhase.TECHNICAL_EXPLORATION,
      tokens: 165,
      processingTimeMs: 2300,
    },
  ],
  'social-media-pet-owners': [
    {
      persona: PersonaRole.PRODUCT_MANAGER,
      content:
        "A social media app for pet owners is such a heartwarming idea! Pet owners are incredibly passionate and engaged users. Let's explore this:\n\n**Market Opportunity:**\n- 70% of US households own pets\n- Pet industry worth $260+ billion globally\n- High engagement potential with photo/video content\n\n**Key Questions:**\n1. What specific features differentiate this from Instagram or Facebook groups?\n2. Monetization strategy (ads, premium features, marketplace)?\n3. Target pet types or all pets?\n4. Geographic focus initially?\n\nThe community aspect could be really powerful here!",
      phase: ConversationPhase.INITIAL_DISCOVERY,
      tokens: 130,
      processingTimeMs: 1400,
    },
    {
      persona: PersonaRole.UX_DESIGNER,
      content:
        "This is going to be so fun to design! Pet content is naturally engaging and shareable. Here's my vision:\n\n**User Experience Focus:**\n- Photo/video sharing with pet-specific filters\n- Breed-based communities and discussions\n- Local pet services discovery (vets, groomers, parks)\n- Pet profile creation with health tracking\n\n**Design Considerations:**\n1. How do users discover relevant content?\n2. Privacy settings for pet and owner information?\n3. Accessibility for older pet owners?\n4. Gamification elements (pet achievements, milestones)?\n\nThe emotional connection users have with their pets will drive incredible engagement!",
      phase: ConversationPhase.UX_PLANNING,
      tokens: 155,
      processingTimeMs: 2100,
    },
  ],
};

export const getRandomMockResponse = (
  appIdea: string,
  phase: ConversationPhase
): MockAIResponse | null => {
  const normalizedIdea = appIdea.toLowerCase().replace(/[^a-z0-9]/g, '-');

  // Find matching responses
  const matchingKey = Object.keys(mockAIResponses).find(
    (key) =>
      normalizedIdea.includes(key.replace(/-/g, '')) ||
      key.replace(/-/g, '').includes(normalizedIdea.replace(/-/g, ''))
  );

  if (matchingKey) {
    const responses = mockAIResponses[matchingKey].filter(
      (r) => r.phase === phase
    );
    if (responses.length > 0) {
      return responses[Math.floor(Math.random() * responses.length)];
    }
  }

  // Fallback generic responses
  return getGenericMockResponse(phase);
};

export const getGenericMockResponse = (
  phase: ConversationPhase
): MockAIResponse => {
  const genericResponses: Record<ConversationPhase, MockAIResponse[]> = {
    [ConversationPhase.INITIAL_DISCOVERY]: [
      {
        persona: PersonaRole.PRODUCT_MANAGER,
        content:
          "That's an interesting idea! Let me ask a few questions to better understand your vision and help shape this into a successful product. What specific problem are you trying to solve, and who is your target audience?",
        phase: ConversationPhase.INITIAL_DISCOVERY,
        tokens: 100,
        processingTimeMs: 1200,
      },
    ],
    [ConversationPhase.TECHNICAL_EXPLORATION]: [
      {
        persona: PersonaRole.TECH_LEAD,
        content:
          "From a technical standpoint, I need to understand the scale and complexity we're dealing with. What are your expectations for user load, data storage requirements, and integration needs?",
        phase: ConversationPhase.TECHNICAL_EXPLORATION,
        tokens: 110,
        processingTimeMs: 1400,
      },
    ],
    [ConversationPhase.UX_PLANNING]: [
      {
        persona: PersonaRole.UX_DESIGNER,
        content:
          "Great! Now let's think about the user experience. What devices will your users primarily use, and what's the most important user journey we need to optimize for?",
        phase: ConversationPhase.UX_PLANNING,
        tokens: 95,
        processingTimeMs: 1100,
      },
    ],
    [ConversationPhase.INFRASTRUCTURE_PLANNING]: [
      {
        persona: PersonaRole.DEVOPS,
        content:
          'For infrastructure planning, I need to consider scalability, security, and deployment strategy. What are your performance requirements and compliance needs?',
        phase: ConversationPhase.INFRASTRUCTURE_PLANNING,
        tokens: 105,
        processingTimeMs: 1300,
      },
    ],
    [ConversationPhase.PROJECT_PLANNING]: [
      {
        persona: PersonaRole.SCRUM_MASTER,
        content:
          "Let's organize this into actionable development phases. Based on our discussion, I can break this down into sprints with clear deliverables and timelines.",
        phase: ConversationPhase.PROJECT_PLANNING,
        tokens: 90,
        processingTimeMs: 1000,
      },
    ],
  };

  const responses = genericResponses[phase];
  return responses[Math.floor(Math.random() * responses.length)];
};

export const createMockAIService = () => {
  return {
    generateResponse: jest
      .fn()
      .mockImplementation(
        async (persona: PersonaRole, context: any, message: string) => {
          // Simulate processing delay
          await new Promise((resolve) => setTimeout(resolve, 100));

          const mockResponse = getRandomMockResponse(
            context.appIdea,
            context.currentPhase
          );
          return mockResponse || getGenericMockResponse(context.currentPhase);
        }
      ),
    getAvailablePersonas: jest.fn().mockReturnValue([
      { role: PersonaRole.PRODUCT_MANAGER, name: 'Sarah Chen' },
      { role: PersonaRole.TECH_LEAD, name: 'Alex Rodriguez' },
      { role: PersonaRole.UX_DESIGNER, name: 'Maya Patel' },
      { role: PersonaRole.DEVOPS, name: 'Jordan Kim' },
      { role: PersonaRole.SCRUM_MASTER, name: 'Taylor Johnson' },
    ]),
    validateApiKeys: jest.fn().mockResolvedValue({
      openai: true,
      anthropic: true,
      deepseek: true,
    }),
  };
};
