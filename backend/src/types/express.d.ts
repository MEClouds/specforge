import { WebSocketService } from '../services/WebSocketService';
import { ConversationOrchestrator } from '../services/ConversationOrchestrator';
import { AIService } from '../services/AIService';

declare global {
  namespace Express {
    interface Request {
      webSocketService?: WebSocketService;
      conversationOrchestrator?: ConversationOrchestrator;
      aiService?: AIService;
    }
  }
}
