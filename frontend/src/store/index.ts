import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { ChatMessage, AIPersona, Conversation } from '../types';

interface ConversationState {
  current: Conversation | null;
  messages: ChatMessage[];
  activePersonas: AIPersona[];
  isGenerating: boolean;
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
