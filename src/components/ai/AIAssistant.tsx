import { useState, useRef, useEffect, useCallback } from 'react';
import { useAIStore } from '@/store/aiStore';
import { processPrompt } from '@/ai/circuitAI';
import { applyBuildResult } from '@/ai/buildExecutor';
import { getAllTemplates, CIRCUIT_TEMPLATES } from '@/ai/templates';
import { runDCSimulation } from '@/simulation/engine';
import { useCircuitStore } from '@/store/circuitStore';
import { v4 as uuidv4 } from 'uuid';
import {
  Sparkles, Send, Trash2, Key, ChevronDown, ChevronUp,
  Zap, Check, AlertCircle, Lightbulb, X, Copy
} from 'lucide-react';

export default function AIAssistant() {
  const {
    messages, apiKey, isProcessing,
    setApiKey, addMessage, updateMessage, clearMessages, setProcessing,
  } = useAIStore();

  const [input, setInput] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(apiKey);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const templates = getAllTemplates();

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isProcessing) return;
    setInput('');

    // Add user message
    const userMsgId = uuidv4();
    addMessage({ id: userMsgId, role: 'user', text, timestamp: Date.now() });

    // Add loading placeholder
    const loadingId = uuidv4();
    addMessage({ id: loadingId, role: 'assistant', text: '', timestamp: Date.now(), isLoading: true });
    setProcessing(true);

    try {
      const response = await processPrompt(text, apiKey || undefined);

      // Remove loading, add real response
      updateMessage(loadingId, { isLoading: false, text: response.text, response });

      // If circuit was built, apply it
      if (response.type === 'circuit' && response.result?.success) {
        applyBuildResult(response.result);

        // Run simulation after a tick
        setTimeout(() => {
          const circuit = useCircuitStore.getState().circuit;
          const simResult = runDCSimulation(circuit);
          useCircuitStore.getState().setSimulationResult(simResult);
        }, 300);
      }
    } catch (err) {
      updateMessage(loadingId, {
        isLoading: false,
        text: '⚠️ Something went wrong. Please try again.',
      });
    } finally {
      setProcessing(false);
    }
  }, [input, isProcessing, apiKey, addMessage, updateMessage, setProcessing]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTemplate = (title: string) => {
    setInput(title);
    setShowTemplates(false);
    inputRef.current?.focus();
  };

  const handleSaveApiKey = () => {
    setApiKey(apiKeyInput.trim());
    setShowApiKey(false);
  };

  return (
    <div className="flex flex-col h-full bg-[#0f1117] select-none">
      {/* ── Header ─────────────────────────────────────────── */}
      <div style={{
        padding: '10px 12px',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'var(--surface-2)',
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          boxShadow: '0 2px 8px rgba(99,102,241,0.35)',
        }}>
          <Sparkles size={14} color="white" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text)' }}>Circuit AI</div>
          <div style={{ fontSize: '0.625rem', color: 'var(--text-muted)', marginTop: 1 }}>
            {apiKey ? '● API key set — custom circuits enabled' : '○ Rule-based mode (templates)'}
          </div>
        </div>
        <button
          onClick={() => setShowApiKey(v => !v)}
          title="Set OpenAI API key"
          style={{
            width: 26, height: 26, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: apiKey ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${apiKey ? 'rgba(34,197,94,0.3)' : 'var(--border)'}`,
            cursor: 'pointer', color: apiKey ? '#4ade80' : 'var(--text-muted)',
          }}
        >
          <Key size={11} />
        </button>
        <button
          onClick={clearMessages}
          title="Clear chat"
          style={{
            width: 26, height: 26, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)',
            cursor: 'pointer', color: 'var(--text-muted)',
          }}
        >
          <Trash2 size={11} />
        </button>
      </div>

      {/* ── API Key panel ────────────────────────────────────── */}
      {showApiKey && (
        <div style={{
          padding: 12, borderBottom: '1px solid var(--border)',
          background: 'rgba(99,102,241,0.06)',
        }}>
          <div style={{ fontSize: '0.688rem', color: '#a5b4fc', marginBottom: 6, fontWeight: 500 }}>
            OpenAI API Key (optional)
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              type="password"
              value={apiKeyInput}
              onChange={e => setApiKeyInput(e.target.value)}
              placeholder="sk-..."
              style={{
                flex: 1, background: 'var(--bg)', border: '1px solid var(--border-2)',
                borderRadius: 6, padding: '5px 8px', fontSize: '0.75rem',
                color: 'var(--text)', outline: 'none', fontFamily: 'monospace',
              }}
            />
            <button
              onClick={handleSaveApiKey}
              style={{
                padding: '5px 10px', borderRadius: 6, background: '#6366f1', color: 'white',
                fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', border: 'none',
              }}
            >Save</button>
          </div>
          <div style={{ fontSize: '0.625rem', color: 'var(--text-muted)', marginTop: 5 }}>
            With a key, AI can design any custom circuit from free-text descriptions.
          </div>
        </div>
      )}

      {/* ── Messages ─────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {messages.map(msg => (
          <MessageBubble key={msg.id} msg={msg} onTemplateClick={handleTemplate} />
        ))}
        {isProcessing && (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '8px 10px' }}>
            <TypingDots />
            <span style={{ fontSize: '0.688rem', color: 'var(--text-muted)' }}>AI is thinking…</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Quick templates ───────────────────────────────────── */}
      <div style={{ borderTop: '1px solid var(--border)' }}>
        <button
          onClick={() => setShowTemplates(v => !v)}
          style={{
            width: '100%', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6,
            background: 'rgba(255,255,255,0.02)', cursor: 'pointer', border: 'none',
            borderBottom: showTemplates ? '1px solid var(--border)' : 'none',
          }}
        >
          <Lightbulb size={11} color="#facc15" />
          <span style={{ fontSize: '0.688rem', color: 'var(--text-muted)', flex: 1, textAlign: 'left' }}>
            Quick templates
          </span>
          {showTemplates ? <ChevronUp size={10} color="var(--text-muted)" /> : <ChevronDown size={10} color="var(--text-muted)" />}
        </button>

        {showTemplates && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: '8px 10px', maxHeight: 150, overflowY: 'auto' }}>
            {templates.map(t => (
              <button
                key={t.key}
                onClick={() => { handleTemplate(t.title); handleSend(); }}
                style={{
                  padding: '3px 8px', borderRadius: 20, fontSize: '0.625rem',
                  background: 'var(--surface-3)', border: '1px solid var(--border-2)',
                  color: 'var(--text-muted)', cursor: 'pointer', whiteSpace: 'nowrap',
                  transition: 'all 0.1s',
                }}
                onMouseEnter={e => {
                  (e.target as HTMLElement).style.background = 'rgba(99,102,241,0.15)';
                  (e.target as HTMLElement).style.color = '#a5b4fc';
                  (e.target as HTMLElement).style.borderColor = 'rgba(99,102,241,0.4)';
                }}
                onMouseLeave={e => {
                  (e.target as HTMLElement).style.background = 'var(--surface-3)';
                  (e.target as HTMLElement).style.color = 'var(--text-muted)';
                  (e.target as HTMLElement).style.borderColor = 'var(--border-2)';
                }}
              >
                {t.title}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Input area ───────────────────────────────────────── */}
      <div style={{ padding: '8px 10px', borderTop: '1px solid var(--border)', background: 'var(--surface)' }}>
        <div style={{
          display: 'flex', gap: 6, alignItems: 'flex-end',
          background: 'var(--bg)', border: '1px solid var(--border-2)',
          borderRadius: 10, padding: '6px 8px',
          transition: 'border-color 0.15s',
        }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe a circuit… e.g. 'LED blinker with 555 timer'"
            rows={1}
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              resize: 'none', fontFamily: 'var(--font-sans, sans-serif)', fontSize: '0.8125rem',
              color: 'var(--text)', lineHeight: '1.4', maxHeight: 80, overflowY: 'auto',
            }}
            onInput={e => {
              const el = e.target as HTMLTextAreaElement;
              el.style.height = 'auto';
              el.style.height = Math.min(el.scrollHeight, 80) + 'px';
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isProcessing}
            style={{
              width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: input.trim() && !isProcessing ? '#6366f1' : 'var(--surface-3)',
              border: 'none', cursor: input.trim() ? 'pointer' : 'default',
              transition: 'background 0.15s', flexShrink: 0,
            }}
          >
            <Send size={13} color={input.trim() && !isProcessing ? 'white' : 'var(--text-muted)'} />
          </button>
        </div>
        <div style={{ fontSize: '0.563rem', color: 'var(--text-subtle)', marginTop: 4, textAlign: 'center' }}>
          Enter to send · Shift+Enter for new line
        </div>
      </div>
    </div>
  );
}

// ── Message bubble ─────────────────────────────────────────────
function MessageBubble({ msg, onTemplateClick }: {
  msg: import('@/store/aiStore').ChatMessage;
  onTemplateClick: (t: string) => void;
}) {
  const isUser = msg.role === 'user';

  if (msg.isLoading) return null;

  return (
    <div style={{
      display: 'flex',
      flexDirection: isUser ? 'row-reverse' : 'row',
      gap: 7,
      alignItems: 'flex-start',
    }}>
      {/* Avatar */}
      {!isUser && (
        <div style={{
          width: 22, height: 22, borderRadius: 6, flexShrink: 0,
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1,
        }}>
          <Sparkles size={11} color="white" />
        </div>
      )}

      <div style={{ maxWidth: '85%', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {/* Bubble */}
        <div style={{
          padding: '8px 11px',
          borderRadius: isUser ? '12px 4px 12px 12px' : '4px 12px 12px 12px',
          background: isUser
            ? 'linear-gradient(135deg, #6366f1 0%, #7c3aed 100%)'
            : 'var(--surface-2)',
          border: isUser ? 'none' : '1px solid var(--border)',
          color: isUser ? 'white' : 'var(--text)',
          fontSize: '0.8125rem',
          lineHeight: 1.5,
        }}>
          <MarkdownText text={msg.text} />
        </div>

        {/* Circuit result card */}
        {msg.response?.type === 'circuit' && msg.response.result && (
          <CircuitResultCard result={msg.response.result} />
        )}

        {/* Suggestions */}
        {msg.response?.type === 'suggestions' && msg.response.suggestions && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 2 }}>
            {msg.response.suggestions.map(s => (
              <button
                key={s}
                onClick={() => onTemplateClick(s)}
                style={{
                  padding: '3px 10px', borderRadius: 20, fontSize: '0.688rem',
                  background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.35)',
                  color: '#a5b4fc', cursor: 'pointer', transition: 'all 0.1s',
                }}
              >{s}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Circuit result card ────────────────────────────────────────
function CircuitResultCard({ result }: { result: import('@/ai/circuitAI').BuildResult }) {
  const compCount = result.actions.filter(a => a.type === 'add_component').length;
  const wireCount = result.actions.filter(a => a.type === 'add_wire').length;

  return (
    <div style={{
      background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.25)',
      borderRadius: 8, padding: '8px 10px', fontSize: '0.75rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
        <Check size={12} color="#4ade80" />
        <span style={{ color: '#4ade80', fontWeight: 600 }}>Circuit built successfully</span>
      </div>
      <div style={{ display: 'flex', gap: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
        <span>⚡ {compCount} components</span>
        <span>〰 {wireCount} wires</span>
      </div>
      {result.notes.length > 0 && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 6, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {result.notes.map((note, i) => (
            <div key={i} style={{ display: 'flex', gap: 5, color: 'var(--text-muted)', fontSize: '0.688rem' }}>
              <span style={{ color: '#facc15', flexShrink: 0 }}>💡</span>
              <span>{note}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Markdown text renderer (minimal: **bold** and newlines) ─────
function MarkdownText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} style={{ fontWeight: 600 }}>{part.slice(2, -2)}</strong>;
        }
        return part.split('\n').map((line, j) => (
          <span key={`${i}-${j}`}>
            {j > 0 && <br />}
            {line}
          </span>
        ));
      })}
    </>
  );
}

// ── Typing dots animation ──────────────────────────────────────
function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
      {[0, 1, 2].map(i => (
        <div
          key={i}
          style={{
            width: 5, height: 5, borderRadius: '50%', background: '#6366f1',
            animation: `typing-bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes typing-bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
