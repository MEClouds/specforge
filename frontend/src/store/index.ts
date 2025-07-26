import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { ChatMessage, AIPersona, Conversation } from '../types';

interface ConversationState {
  current: Conversation | null;
  messages: ChatMessage[];
  activePersonas: AIPersona[];
  isGenerating: boolean;
  list: (Conversation & {
    messageCount: number;
    specificationCount: number;
  })[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  // Conversation flow state
  currentPhase: string;
  completedPhases: string[];
  nextPhase?: string;
  overallProgress: number;
  suggestedActions: string[];
  isComplete: boolean;
  // Conflict resolution state
  conflictingMessages: ChatMessage[];
  showConflictResolution: boolean;
}

interface SpecificationState {
  requirements: string | null;
  design: string | null;
  tasks: string | null;
  isPreviewMode: boolean;
}

interface UIState {
  isTyping: boolean;
  currentTypingPersona: string | null;
  sidebarOpen: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AppState {
  conversation: ConversationState;
  specifications: SpecificationState;
  ui: UIState;

  // Actions
  setCurrentConversation: (conversation: Conversation | null) => void;
  addMessage: (message: ChatMessage) => void;
  setMessages: (messages: ChatMessage[]) => void;
  setActivePersonas: (personas: AIPersona[]) => void;
  setIsGenerating: (isGenerating: boolean) => void;

  // Conversation flow actions
  setConversationProgress: (progress: {
    currentPhase: string;
    completedPhases: string[];
    nextPhase?: string;
    overallProgress: number;
    suggestedActions: string[];
    isComplete: boolean;
  }) => void;
  setCurrentPhase: (phase: string) => void;
  addCompletedPhase: (phase: string) => void;
  setSuggestedActions: (actions: string[]) => void;
  setConversationComplete: (isComplete: boolean) => void;

  // Conflict resolution actions
  setConflictingMessages: (messages: ChatMessage[]) => void;
  setShowConflictResolution: (show: boolean) => void;

  // Conversation list management
  setConversationList: (
    conversations: (Conversation & {
      messageCount: number;
      specificationCount: number;
    })[],
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    }
  ) => void;
  addConversationToList: (
    conversation: Conversation & {
      messageCount: number;
      specificationCount: number;
    }
  ) => void;
  updateConversationInList: (
    id: string,
    updates: Partial<Conversation>
  ) => void;
  removeConversationFromList: (id: string) => void;

  setSpecifications: (specs: Partial<SpecificationState>) => void;
  setPreviewMode: (isPreviewMode: boolean) => void;

  setTyping: (isTyping: boolean, persona?: string) => void;
  setSidebarOpen: (open: boolean) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;

  // Reset functions
  resetConversation: () => void;
  resetSpecifications: () => void;
}

const initialConversationState: ConversationState = {
  current: null,
  messages: [],
  activePersonas: [],
  isGenerating: false,
  list: [],
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  },
  // Conversation flow state
  currentPhase: 'initial-discovery',
  completedPhases: [],
  overallProgress: 0,
  suggestedActions: [],
  isComplete: false,
  // Conflict resolution state
  conflictingMessages: [],
  showConflictResolution: false,
};

const initialSpecificationState: SpecificationState = {
  requirements: null,
  design: null,
  tasks: null,
  isPreviewMode: false,
};

const initialUIState: UIState = {
  isTyping: false,
  currentTypingPersona: null,
  sidebarOpen: false,
  isLoading: false,
  error: null,
};

export const useAppStore = create<AppState>()(
  devtools(
    (set) => ({
      conversation: initialConversationState,
      specifications: initialSpecificationState,
      ui: initialUIState,

      // Conversation actions
      setCurrentConversation: (conversation) =>
        set((state) => ({
          conversation: { ...state.conversation, current: conversation },
        })),

      addMessage: (message) =>
        set((state) => ({
          conversation: {
            ...state.conversation,
            messages: [...state.conversation.messages, message],
          },
        })),

      setMessages: (messages) =>
        set((state) => ({
          conversation: { ...state.conversation, messages },
        })),

      setActivePersonas: (activePersonas) =>
        set((state) => ({
          conversation: { ...state.conversation, activePersonas },
        })),

      setIsGenerating: (isGenerating) =>
        set((state) => ({
          conversation: { ...state.conversation, isGenerating },
        })),

      // Conversation flow actions
      setConversationProgress: (progress) =>
        set((state) => ({
          conversation: { ...state.conversation, ...progress },
        })),

      setCurrentPhase: (currentPhase) =>
        set((state) => ({
          conversation: { ...state.conversation, currentPhase },
        })),

      addCompletedPhase: (phase) =>
        set((state) => ({
          conversation: {
            ...state.conversation,
            completedPhases: [...state.conversation.completedPhases, phase],
          },
        })),

      setSuggestedActions: (suggestedActions) =>
        set((state) => ({
          conversation: { ...state.conversation, suggestedActions },
        })),

      setConversationComplete: (isComplete) =>
        set((state) => ({
          conversation: { ...state.conversation, isComplete },
        })),

      // Conflict resolution actions
      setConflictingMessages: (conflictingMessages) =>
        set((state) => ({
          conversation: { ...state.conversation, conflictingMessages },
        })),

      setShowConflictResolution: (showConflictResolution) =>
        set((state) => ({
          conversation: { ...state.conversation, showConflictResolution },
        })),

      // Conversation list management
      setConversationList: (list, pagination) =>
        set((state) => ({
          conversation: { ...state.conversation, list, pagination },
        })),

      addConversationToList: (conversation) =>
        set((state) => ({
          conversation: {
            ...state.conversation,
            list: [conversation, ...state.conversation.list],
            pagination: {
              ...state.conversation.pagination,
              total: state.conversation.pagination.total + 1,
            },
          },
        })),

      updateConversationInList: (id, updates) =>
        set((state) => ({
          conversation: {
            ...state.conversation,
            list: state.conversation.list.map((conv) =>
              conv.id === id ? { ...conv, ...updates } : conv
            ),
          },
        })),

      removeConversationFromList: (id) =>
        set((state) => ({
          conversation: {
            ...state.conversation,
            list: state.conversation.list.filter((conv) => conv.id !== id),
            pagination: {
              ...state.conversation.pagination,
              total: Math.max(0, state.conversation.pagination.total - 1),
            },
          },
        })),

      // Specification actions
      setSpecifications: (specs) =>
        set((state) => ({
          specifications: { ...state.specifications, ...specs },
        })),

      setPreviewMode: (isPreviewMode) =>
        set((state) => ({
          specifications: { ...state.specifications, isPreviewMode },
        })),

      // UI actions
      setTyping: (isTyping, persona) =>
        set((state) => ({
          ui: {
            ...state.ui,
            isTyping,
            currentTypingPersona: persona || null,
          },
        })),

      setSidebarOpen: (sidebarOpen) =>
        set((state) => ({
          ui: { ...state.ui, sidebarOpen },
        })),

      setLoading: (isLoading) =>
        set((state) => ({
          ui: { ...state.ui, isLoading },
        })),

      setError: (error) =>
        set((state) => ({
          ui: { ...state.ui, error },
        })),

      // Reset functions
      resetConversation: () =>
        set(() => ({
          conversation: initialConversationState,
        })),

      resetSpecifications: () =>
        set(() => ({
          specifications: initialSpecificationState,
        })),
    }),
    {
      name: 'specforge-store',
    }
  )
);
