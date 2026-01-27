import React, { useCallback, useMemo, useRef, useState } from 'react';
import { MessageCircle, Send, Loader2, AlertTriangle, Copy } from 'lucide-react';

const createSessionId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `session-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

type ChatRole = 'user' | 'assistant';

type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  timestamp: string;
};

const getWebhookUrl = () =>
  import.meta.env.VITE_N8N_CHAT_WEBHOOK ||
  'https://projek-n8n-n8n.qk6yxt.easypanel.host/webhook/4d637604-a1c4-4774-9d1e-c453fb46b85a/chat';

const extractReply = (data: unknown) => {
  if (typeof data === 'string') return data;
  if (data && typeof data === 'object') {
    const payload = data as Record<string, unknown>;
    if (typeof payload.reply === 'string') return payload.reply;
    if (typeof payload.message === 'string') return payload.message;
    if (typeof payload.text === 'string') return payload.text;
    if (payload.data && typeof payload.data === 'object') {
      const nested = payload.data as Record<string, unknown>;
      if (typeof nested.reply === 'string') return nested.reply;
      if (typeof nested.message === 'string') return nested.message;
      if (typeof nested.text === 'string') return nested.text;
    }
  }
  return null;
};

export default function EmbeddedChat() {
  const sessionId = useMemo(() => createSessionId(), []);
  const webhookUrl = useMemo(() => getWebhookUrl(), []);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Halo! Tulis pesanmu di bawah, aku akan teruskan ke workflow n8n.',
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    });
  };

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isSending) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: trimmed,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsSending(true);
    setErrorMessage(null);

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: trimmed,
          sessionId,
          source: 'crm-dashboard',
          timestamp: new Date().toISOString(),
        }),
      });

      const contentType = response.headers.get('content-type');
      const payload = contentType && contentType.includes('application/json')
        ? await response.json()
        : await response.text();

      if (!response.ok) {
        const errorText = extractReply(payload) || 'Webhook error';
        throw new Error(errorText);
      }

      const replyText = extractReply(payload) || 'Pesan diterima. Balasan belum tersedia.';
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        text: replyText,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      scrollToBottom();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gagal menghubungi webhook.';
      setErrorMessage(message);
    } finally {
      setIsSending(false);
      scrollToBottom();
    }
  }, [input, isSending, sessionId, webhookUrl]);

  const handleCopyWebhook = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
    } catch (err) {
      console.error('Failed to copy webhook URL', err);
    }
  }, [webhookUrl]);

  return (
    <div className="embedded-chat-page">
      <style>{`
        .embedded-chat-page {
          max-width: 960px;
          margin: 24px auto 80px;
          padding: 0 20px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .embedded-chat-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 20px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 16px;
        }

        .embedded-chat-title {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 16px;
          font-weight: 600;
        }

        .embedded-chat-title p {
          margin: 4px 0 0;
          font-size: 12px;
          color: var(--text-muted);
        }

        .embedded-chat-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .embedded-chat-actions button {
          border: 1px solid var(--border);
          background: var(--bg-tertiary);
          color: var(--text-secondary);
          border-radius: 10px;
          padding: 8px 12px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .embedded-chat-actions button:hover {
          border-color: var(--accent);
          color: var(--accent);
          background: var(--bg-hover);
        }

        .embedded-chat-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 18px;
          display: flex;
          flex-direction: column;
          min-height: 520px;
          overflow: hidden;
        }

        .embedded-chat-messages {
          flex: 1;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          overflow-y: auto;
          background: var(--bg-secondary);
        }

        .embedded-chat-message {
          max-width: 78%;
          padding: 12px 16px;
          border-radius: 14px;
          font-size: 14px;
          line-height: 1.5;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .embedded-chat-message.user {
          align-self: flex-end;
          background: linear-gradient(135deg, var(--accent), var(--cyan));
          color: white;
          border-bottom-right-radius: 6px;
        }

        .embedded-chat-message.assistant {
          align-self: flex-start;
          background: var(--bg-card);
          border: 1px solid var(--border);
          color: var(--text-primary);
          border-bottom-left-radius: 6px;
        }

        .embedded-chat-meta {
          font-size: 11px;
          opacity: 0.7;
          text-align: right;
        }

        .embedded-chat-input {
          border-top: 1px solid var(--border);
          padding: 16px 20px;
          display: flex;
          gap: 12px;
          align-items: center;
          background: var(--bg-card);
        }

        .embedded-chat-input input {
          flex: 1;
          border-radius: 12px;
          border: 1px solid var(--border);
          background: var(--bg-tertiary);
          padding: 12px 14px;
          font-size: 14px;
          color: var(--text-primary);
          outline: none;
        }

        .embedded-chat-input input:focus {
          border-color: var(--accent);
        }

        .embedded-chat-input button {
          border: none;
          border-radius: 12px;
          padding: 12px 16px;
          background: linear-gradient(135deg, var(--accent), var(--cyan));
          color: white;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          transition: opacity 0.15s ease;
        }

        .embedded-chat-input button:disabled {
          cursor: not-allowed;
          opacity: 0.6;
        }

        .embedded-chat-error {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(239, 68, 68, 0.12);
          color: var(--danger);
          border: 1px solid rgba(239, 68, 68, 0.3);
          padding: 10px 14px;
          border-radius: 12px;
          font-size: 13px;
        }

        .embedded-chat-footnote {
          font-size: 12px;
          color: var(--text-muted);
        }

        .spin {
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .embedded-chat-page {
            margin: 16px auto 80px;
          }

          .embedded-chat-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }

          .embedded-chat-actions {
            width: 100%;
            justify-content: flex-start;
            flex-wrap: wrap;
          }

          .embedded-chat-message {
            max-width: 90%;
          }
        }
      `}</style>

      <div className="embedded-chat-header">
        <div className="embedded-chat-title">
          <MessageCircle size={20} />
          <div>
            Embedded Chat (n8n)
            <p>Terhubung ke webhook chat untuk ditanam di Vercel.</p>
          </div>
        </div>
        <div className="embedded-chat-actions">
          <button type="button" onClick={handleCopyWebhook} title="Copy webhook">
            <Copy size={14} />
            Copy Webhook
          </button>
          <button type="button" onClick={() => window.open(webhookUrl, '_blank')} title="Buka webhook">
            <MessageCircle size={14} />
            Buka Webhook
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="embedded-chat-error">
          <AlertTriangle size={16} />
          {errorMessage}
        </div>
      )}

      <div className="embedded-chat-card">
        <div className="embedded-chat-messages">
          {messages.map((message) => (
            <div key={message.id} className={`embedded-chat-message ${message.role}`}>
              <div>{message.text}</div>
              <div className="embedded-chat-meta">
                {new Date(message.timestamp).toLocaleTimeString('id-ID', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        <div className="embedded-chat-input">
          <input
            type="text"
            placeholder="Tulis pesan untuk n8n..."
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                handleSend();
              }
            }}
            disabled={isSending}
          />
          <button type="button" onClick={handleSend} disabled={isSending || !input.trim()}>
            {isSending ? <Loader2 size={16} className="spin" /> : <Send size={16} />}
            {isSending ? 'Mengirim...' : 'Kirim'}
          </button>
        </div>
      </div>

      <div className="embedded-chat-footnote">
        Webhook aktif: <strong>{webhookUrl}</strong>
      </div>
    </div>
  );
}
