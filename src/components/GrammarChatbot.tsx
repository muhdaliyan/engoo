/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Send, RefreshCw, MessageCircle, Bot, User, AlertTriangle } from 'lucide-react';

interface GrammarNote {
  original: string;
  corrected: string;
  issueType: string;
  explanation: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  grammarNote?: GrammarNote | null;
}

const WELCOME: Message = {
  id: 'welcome',
  role: 'assistant',
  content:
    "Hey there! 👋 I'm your English conversation partner. Chat with me about anything — I'll gently point out any grammar mistakes and explain the rule, then keep our conversation going naturally. What's on your mind today?",
  grammarNote: null,
};

export default function GrammarChatbot() {
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [input]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const history = messages.slice(-14).map((m) => ({ role: m.role, content: m.content }));
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history, userMessage: text }),
      });

      if (!res.ok) throw new Error('Failed to get response');
      const data = await res.json();

      const assistantMsg: Message = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: data.reply,
        grammarNote: data.grammarNote ?? null,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content:
            "Sorry, I couldn't connect right now. Please check your GEMINI_API_KEY in Netlify environment variables.",
          grammarNote: null,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div
      className="flex flex-col bg-white h-full w-full overflow-hidden"
      id="grammar-chatbot"
    >
      {/* ── Header ── */}
      <div className="shrink-0 border-b border-stone-200 bg-stone-50/70 px-4 py-3">
        <div className="max-w-3xl mx-auto w-full flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
            <MessageCircle className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-bold text-stone-900 leading-tight">Talki</span>
            <span className="text-[10px] font-mono text-stone-400 uppercase tracking-wider">
              Grammar-correcting AI chat
            </span>
          </div>
          <div className="ml-auto flex items-center gap-1.5 text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </div>
        </div>
      </div>

      {/* ── Message list ── */}
      <div className="flex-1 overflow-y-auto px-4 py-6 custom-scrollbar">
        <div className="max-w-3xl mx-auto w-full flex flex-col gap-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              {/* Grammar note (above assistant bubble) */}
              {msg.role === 'assistant' && msg.grammarNote && (
                <div className="w-full max-w-[92%] bg-amber-50 border border-amber-200 rounded-xl p-3 flex flex-col gap-1.5 animate-fade-in">
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wide">
                      Grammar Tip · {msg.grammarNote.issueType}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px]">
                    <span className="line-through text-stone-400">{msg.grammarNote.original}</span>
                    <span className="text-stone-400">→</span>
                    <span className="text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                      {msg.grammarNote.corrected}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-600 leading-relaxed">
                    {msg.grammarNote.explanation}
                  </p>
                </div>
              )}

              {/* Bubble row */}
              <div
                className={`flex items-end gap-2 max-w-[85%] ${
                  msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                {/* Avatar */}
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mb-0.5 ${
                    msg.role === 'user' ? 'bg-stone-900' : 'bg-emerald-600'
                  }`}
                >
                  {msg.role === 'user' ? (
                    <User className="w-3 h-3 text-white" />
                  ) : (
                    <Bot className="w-3 h-3 text-white" />
                  )}
                </div>

                {/* Bubble */}
                <div
                  className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-stone-900 text-white rounded-tr-sm'
                      : 'bg-stone-100 text-stone-900 rounded-tl-sm'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {loading && (
            <div className="flex items-end gap-2">
              <div className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center shrink-0">
                <Bot className="w-3 h-3 text-white" />
              </div>
              <div className="bg-stone-100 px-4 py-3 rounded-2xl rounded-tl-sm">
                <div className="flex gap-1 items-center h-4">
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-stone-400 animate-bounce"
                    style={{ animationDelay: '0ms' }}
                  />
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-stone-400 animate-bounce"
                    style={{ animationDelay: '160ms' }}
                  />
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-stone-400 animate-bounce"
                    style={{ animationDelay: '320ms' }}
                  />
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* ── Input area ── */}
      <div className="shrink-0 border-t border-stone-200 p-4 bg-white/95 backdrop-blur-md">
        <div className="max-w-3xl mx-auto w-full">
          <div className="flex gap-2 items-end">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Say something in English…"
              id="chatbot-input"
              className="flex-1 resize-none px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm bg-stone-50 focus:bg-white focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-all leading-relaxed overflow-hidden"
              style={{ minHeight: '42px', maxHeight: '120px' }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              id="btn-chat-send"
              className="p-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-40 text-white rounded-xl transition-all cursor-pointer shrink-0 flex items-center justify-center"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
          <p className="text-[10px] text-stone-400 mt-1.5 text-center font-mono select-none">
            Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}
