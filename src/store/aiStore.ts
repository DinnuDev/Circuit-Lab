import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { AIResponse } from '@/ai/circuitAI';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: number;
  response?: AIResponse;
  isLoading?: boolean;
}

interface AIStore {
  messages: ChatMessage[];
  apiKey: string;
  aiPanelOpen: boolean;
  isProcessing: boolean;

  setApiKey: (key: string) => void;
  setAIPanelOpen: (open: boolean) => void;
  toggleAIPanel: () => void;
  addMessage: (msg: ChatMessage) => void;
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
  clearMessages: () => void;
  setProcessing: (v: boolean) => void;
}

const WELCOME: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  text: `Hello! I'm your **Circuit AI** assistant. Tell me what circuit to build and I'll create it instantly.

**Try saying:**
- *"Build a blinking LED with a 555 timer"*
- *"Create a voltage divider with 12V"*
- *"Make an NPN transistor switch"*
- *"Design an op-amp inverting amplifier"*
- *"5V voltage regulator circuit"*

Type **help** to see all available templates, or provide an OpenAI API key above for unlimited custom circuits.`,
  timestamp: Date.now(),
};

export const useAIStore = create<AIStore>()(
  immer(set => ({
    messages: [WELCOME],
    apiKey: '',
    aiPanelOpen: false,
    isProcessing: false,

    setApiKey: (key) => set(s => { s.apiKey = key; }),
    setAIPanelOpen: (open) => set(s => { s.aiPanelOpen = open; }),
    toggleAIPanel: () => set(s => { s.aiPanelOpen = !s.aiPanelOpen; }),
    addMessage: (msg) => set(s => { s.messages.push(msg); }),
    updateMessage: (id, updates) => set(s => {
      const idx = s.messages.findIndex(m => m.id === id);
      if (idx !== -1) Object.assign(s.messages[idx], updates);
    }),
    clearMessages: () => set(s => { s.messages = [WELCOME]; }),
    setProcessing: (v) => set(s => { s.isProcessing = v; }),
  }))
);
