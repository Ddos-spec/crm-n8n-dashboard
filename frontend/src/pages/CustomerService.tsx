import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import {
  Search,
  Paperclip,
  Send,
  MoreVertical,
  Phone,
  AlertTriangle,
  Download
} from 'lucide-react';
import { useCustomerContext } from '../context/customer';
import { useChat, useCustomers } from '../hooks/useData';
import { api } from '../lib/api';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

type Contact = {
  name: string;
  phone: string;
  status: 'active' | 'pending' | 'escalation';
  lastContact: string;
  id: number;
};

// Helper to get initials for avatar
const getInitials = (name: string) => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
};

// Helper to generate consistent gradient based on name char code
const getAvatarGradient = (name: string) => {
  const hash = name.charCodeAt(0);
  const gradients = [
    'linear-gradient(135deg, var(--accent), var(--cyan))',
    'linear-gradient(135deg, var(--info), var(--purple))',
    'linear-gradient(135deg, var(--warning), var(--pink))',
    'linear-gradient(135deg, var(--purple), var(--pink))',
    'linear-gradient(135deg, var(--danger), var(--warning))',
  ];
  return gradients[hash % gradients.length];
};

// Memoized message component for better performance
const ChatMessageItem = React.memo(({ msg }: { msg: { id: number; message_type: string; content: string; created_at: string } }) => {
  const isOutgoing = ['out', 'outbound', 'agent'].includes(msg.message_type);
  return (
    <div className={`message ${isOutgoing ? 'outgoing' : 'incoming'}`}>
      <div className="message-text">{msg.content}</div>
      <div className="message-time">
        {new Date(msg.created_at).toLocaleString([], { hour: '2-digit', minute: '2-digit' })}
      </div>
    </div>
  );
});
ChatMessageItem.displayName = 'ChatMessageItem';

export default function CustomerService() {
  const [searchTerm, setSearchTerm] = useState('');
  // Use debounce for search to prevent excessive API calls
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data: customers, loading, hasMore, loadMore } = useCustomers(debouncedSearch);
  
  const contactList = useMemo<Contact[]>(
    () =>
      customers.map((c) => ({
        id: c.id,
        name: c.name ?? 'Tanpa nama',
        phone: c.phone,
        status: (['active', 'pending', 'escalation'].includes(c.status) ? c.status : 'pending') as any,
        lastContact: c.last_message_at ? new Date(c.last_message_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'N/A',
      })),
    [customers],
  );

  const [selected, setSelected] = useState<Contact | null>(null);
  const { focusName, setFocusName } = useCustomerContext();
  const { data: chatMessages, loading: chatLoading, hasMore: hasMoreMessages, loadMore: loadMoreMessages } = useChat(selected?.id);
  const [textMessage, setTextMessage] = useState('');
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);
  const chatMessagesContainerRef = useRef<HTMLDivElement>(null);
  const previousSelectedId = useRef<number | undefined>(undefined);

  // Auto scroll to bottom only when customer changes (first load)
  useEffect(() => {
    // Only scroll if customer changed (not pagination)
    if (selected?.id !== previousSelectedId.current && chatMessages.length > 0 && !chatLoading) {
      // Use timeout to ensure DOM is updated
      setTimeout(() => {
        chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
    previousSelectedId.current = selected?.id;
  }, [selected?.id, chatMessages.length, chatLoading]);

  // Logic for handling focus from other pages
  useEffect(() => {
    if (focusName && contactList.length) {
      const found = contactList.find((c) => c.name === focusName);
      if (found) {
        setSelected(found);
        setFocusName(null);
        return;
      }
    }
    // Only auto-select first if not searching and list loaded
    if (!selected && contactList.length > 0 && !loading) {
      setSelected(contactList[0]);
    }
  }, [focusName, contactList, setFocusName, selected, loading]);

  const handleSend = async () => {
    if (!selected || !textMessage.trim()) return;
    try {
      await api.sendMessage({
        mtype: 'text',
        receiver: selected.phone,
        text: textMessage.trim(),
      });
      setTextMessage('');
    } catch (err) {
      console.error('Failed to send message', err);
      alert('Gagal mengirim pesan');
    }
  };

  const handleExportCSV = () => {
    if (!contactList.length) return;
    const headers = ['Name', 'Phone', 'Status', 'Last Contact'];
    const rows = contactList.map(c => [
      `"${c.name.replace(/"/g, '""')}"`, 
      `"${c.phone}"`, 
      c.status,
      c.lastContact
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `customers_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Infinite Scroll Handler
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
    // Load more when scrolled to bottom (with 50px buffer)
    if (scrollHeight - scrollTop <= clientHeight + 50) {
      if (hasMore && !loading) {
        loadMore();
      }
    }
  };

  return (
    <div className="page active" id="customer-service">
      <div className="page-header">
        <h1 className="page-title">Customer Service</h1>
      </div>

      <div className="chat-layout">
        {/* Sidebar Contact List */}
        <div className="contact-list">
          <div className="contact-list-header">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div className="contact-list-title" style={{ marginBottom: 0 }}>Kontak</div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleExportCSV} 
                title="Export to CSV"
                style={{ padding: 6 }}
              >
                <Download size={16} />
              </Button>
            </div>
            <Input 
              placeholder="Cari customer..." 
              icon={<Search size={16} />} 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="contact-list-body" onScroll={handleScroll}>
            {contactList.map((contact) => (
              <div 
                key={contact.id}
                className={`contact-item ${selected?.id === contact.id ? 'active' : ''}`}
                onClick={() => setSelected(contact)}
              >
                <div 
                  className="contact-avatar"
                  style={{ background: getAvatarGradient(contact.name) }}
                >
                  {getInitials(contact.name)}
                </div>
                <div className="contact-info">
                  <div className="contact-name">
                    {contact.name}
                    <Badge variant="green" className="badge-sm" style={{padding: '2px 8px', fontSize: 10}}>{contact.status}</Badge>
                  </div>
                  <div className="contact-phone">{contact.phone}</div>
                  <div className="contact-preview">Click to view chat history...</div>
                </div>
              </div>
            ))}
            
            {loading && (
              <div style={{padding: 20, textAlign: 'center', color: 'var(--text-muted)'}}>
                <div className="spinner" style={{display:'inline-block', width: 16, height: 16, border: '2px solid var(--text-muted)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite'}}></div>
                <span style={{marginLeft: 8}}>Memuat kontak...</span>
              </div>
            )}
            
            {!loading && contactList.length === 0 && (
              <div style={{padding: 20, textAlign: 'center', color: 'var(--text-muted)'}}>Tidak ada kontak</div>
            )}
            
            {!loading && !hasMore && contactList.length > 0 && (
              <div style={{padding: 10, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)'}}>Semua kontak telah dimuat</div>
            )}
          </div>
        </div>

        {/* Main Chat Panel */}
        <div className="chat-panel">
          {selected ? (
            <>
              {/* Chat Header */}
              <div className="chat-header">
                <div className="chat-user">
                  <div 
                    className="contact-avatar"
                    style={{ background: getAvatarGradient(selected.name) }}
                  >
                    {getInitials(selected.name)}
                  </div>
                  <div className="chat-user-info">
                    <h3>{selected.name}</h3>
                    <p>{selected.phone}</p>
                  </div>
                </div>
                <div className="chat-actions">
                  <Badge variant="green" dot>Active</Badge>
                  <Button variant="secondary" size="sm" icon={<AlertTriangle size={14}/>}>
                    Escalate
                  </Button>
                  <Button variant="ghost" size="sm">
                    <MoreVertical size={16} />
                  </Button>
                </div>
              </div>

              {/* Messages Area */}
              <div className="chat-messages" ref={chatMessagesContainerRef}>
                {/* Load Older Messages Button */}
                {hasMoreMessages && !chatLoading && chatMessages.length > 0 && (
                  <div style={{ textAlign: 'center', padding: '12px 0', marginBottom: 8 }}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={loadMoreMessages}
                      style={{ fontSize: 12 }}
                    >
                      Muat pesan lebih lama
                    </Button>
                  </div>
                )}

                {chatLoading && chatMessages.length === 0 && (
                  <div className="muted" style={{textAlign: 'center', marginTop: 20}}>Memuat chat...</div>
                )}

                {!chatLoading && chatMessages.length === 0 && (
                  <div className="empty-state">
                    <div className="empty-state-icon"><Phone size={32}/></div>
                    <p>Belum ada riwayat percakapan</p>
                  </div>
                )}

                {/* Chat Messages */}
                {chatMessages.map((msg) => (
                  <ChatMessageItem key={msg.id} msg={msg} />
                ))}

                {/* Loading indicator for pagination */}
                {chatLoading && chatMessages.length > 0 && (
                  <div style={{textAlign: 'center', padding: '8px 0', color: 'var(--text-muted)', fontSize: 12}}>
                    <div className="spinner" style={{display:'inline-block', width: 12, height: 12, border: '2px solid var(--text-muted)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', marginRight: 6}}></div>
                    Memuat pesan...
                  </div>
                )}

                {/* Scroll anchor for auto-scroll to bottom */}
                <div ref={chatMessagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="chat-input-area">
                <div className="chat-input-wrapper">
                  <Button variant="ghost">
                    <Paperclip size={20} />
                  </Button>
                  <input 
                    type="text" 
                    className="chat-input" 
                    placeholder="Ketik pesan..."
                    value={textMessage}
                    onChange={(e) => setTextMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  />
                  <Button onClick={handleSend} icon={<Send size={18} />}>
                    Kirim
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <h3>Pilih Customer</h3>
              <p>Pilih salah satu kontak di sebelah kiri untuk memulai chat</p>
            </div>
          )}
        </div>
      </div>
      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
