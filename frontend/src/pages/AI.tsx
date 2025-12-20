import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, User, Bot, Zap } from 'lucide-react';
import { api } from '../lib/api';
import './AI.css';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export default function AI() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const data = await api.sendAiMessage(userMessage.content);
      
      // Asumsi format respons dari n8n/backend
      // Bisa berupa { output: "...", text: "..." } atau langsung string
      // Kita coba ekstrak yang paling masuk akal
      const botContent = data.output || data.response || data.text || data.message || JSON.stringify(data);

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: typeof botContent === 'string' ? botContent : JSON.stringify(botContent)
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Failed to send message', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Maaf, terjadi kesalahan saat menghubungi server AI. Silakan coba lagi nanti."
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestionClick = (text: string) => {
    setInput(text);
    // Optional: auto send
    // inputRef.current?.focus();
  };

  return (
    <div className="ai-page">
      <div className="ai-header">
        <h1 className="ai-title">
          <Sparkles size={24} className="text-purple-500" />
          Tepat AI Assistant
        </h1>
        <p className="ai-subtitle">Tanyakan apa saja tentang data CRM atau bantuan tugas</p>
      </div>

      <div className="chat-container">
        <div className="chat-history">
          {messages.length === 0 ? (
            <div className="ai-empty-state">
              <div className="ai-logo-large">
                <Bot size={40} />
              </div>
              <h3>Halo! Ada yang bisa saya bantu?</h3>
              <p>Saya terhubung dengan sistem n8n untuk membantu operasional Anda.</p>
              
              <div className="suggestion-chips">
                <button className="chip" onClick={() => handleSuggestionClick("Buatkan ringkasan penjualan hari ini")}>
                  📊 Ringkasan Penjualan
                </button>
                <button className="chip" onClick={() => handleSuggestionClick("Cek status pesanan customer Budi")}>
                  🔍 Cek Status Customer
                </button>
                <button className="chip" onClick={() => handleSuggestionClick("Buat draft pesan follow-up")}>
                  📝 Draft Follow-up
                </button>
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <div key={msg.id} className={`ai-message-row ${msg.role === 'user' ? 'user' : 'bot'}`}>
                  <div className={`ai-avatar ${msg.role === 'user' ? 'user' : 'bot'}`}>
                    {msg.role === 'user' ? <User size={18} /> : <Zap size={18} />}
                  </div>
                  <div className={`ai-bubble ${msg.role === 'user' ? 'user' : 'bot'}`}>
                    {msg.content.split('\n').map((line, i) => (
                      <p key={i}>{line}</p>
                    ))}
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="loading-dots">
                  <div className="dot"></div>
                  <div className="dot"></div>
                  <div className="dot"></div>
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="chat-input-container">
          <div className="chat-input-wrapper">
            <input
              ref={inputRef}
              type="text"
              className="ai-input"
              placeholder="Ketik pesan Anda..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
            />
            <button 
              className="ai-send-btn"
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
