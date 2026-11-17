import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  X,
  Send,
  Bot,
  Terminal,
  ChevronDown,
  Wand2
} from 'lucide-react';
import { taskApi } from '../services/api';

export default function AiChatWidget({ onTasksUpdated }) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        "Hello! I'm your AI Task Assistant powered by Gemini & MCP Tools. How can I help you manage your tasks today?",
      tools: []
    }
  ]);
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      inputRef.current?.focus();
    }
  }, [isOpen, messages]);

  const quickPrompts = [
    'Show my pending tasks',
    'Create a task called Learn React',
    'Mark my Learn React task as completed',
    'Show my tasks for tomorrow'
  ];

  const handleSend = async (messageToSend) => {
    const text = (messageToSend || inputMessage).trim();
    if (!text || loading) return;

    const userMsg = {
      id: Date.now().toString(),
      role: 'user',
      content: text
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setLoading(true);

    try {
      const response = await taskApi.sendChatMessage(text, messages);

      const assistantMsg = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.reply,
        tools: response.executedTools || []
      };

      setMessages((prev) => [...prev, assistantMsg]);

      // If the AI invoked any tools, refresh the dashboard!
      if (response.executedTools && response.executedTools.length > 0) {
        if (onTasksUpdated) {
          onTasksUpdated();
        }
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `⚠️ Error: ${err.message || 'Could not communicate with AI assistant.'}`,
          tools: []
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const renderContent = (content) => {
    // Basic Markdown line-breaks and bold formatting
    return content.split('\n').map((line, i) => {
      // Replace **bold**
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      return (
        <div key={i} style={{ minHeight: '1.2em' }}>
          {parts.map((part, pIdx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={pIdx}>{part.slice(2, -2)}</strong>;
            }
            return part;
          })}
        </div>
      );
    });
  };

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <button
          className="ai-fab"
          onClick={() => setIsOpen(true)}
          title="Open AI Task Assistant"
        >
          <Sparkles size={24} />
        </button>
      )}

      {/* Floating Chat Drawer */}
      {isOpen && (
        <div className="ai-chat-drawer">
          <div className="ai-header">
            <div className="ai-header-info">
              <div className="ai-avatar">
                <Bot size={18} />
              </div>
              <div className="ai-header-text">
                <h4>AI Task Copilot</h4>
                <span>
                  <Terminal size={10} />
                  MCP Controlled Tools
                </span>
              </div>
            </div>
            <button className="btn-icon" onClick={() => setIsOpen(false)}>
              <ChevronDown size={20} />
            </button>
          </div>

          <div className="ai-messages">
            {messages.map((msg) => (
              <div key={msg.id} className={`chat-bubble ${msg.role}`}>
                <div>{renderContent(msg.content)}</div>
                {msg.tools && msg.tools.length > 0 && (
                  <div style={{ marginTop: '0.4rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    {msg.tools.map((tool, tIdx) => (
                      <div key={tIdx} className="tool-execution-badge">
                        <Terminal size={11} />
                        <span>MCP Tool: {tool.name}()</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="chat-bubble assistant" style={{ padding: '1rem 1.25rem' }}>
                <span className="dot-flashing"></span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts */}
          <div className="ai-quick-prompts">
            {quickPrompts.map((prompt, idx) => (
              <button
                key={idx}
                className="prompt-chip"
                onClick={() => handleSend(prompt)}
                disabled={loading}
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Input Form */}
          <form
            className="ai-input-form"
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
          >
            <input
              ref={inputRef}
              type="text"
              className="ai-input"
              placeholder="Ask anything or command tasks..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              disabled={loading}
            />
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={loading || !inputMessage.trim()}
              style={{ padding: '0.55rem 0.85rem' }}
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
