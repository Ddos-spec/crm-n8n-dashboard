import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import {
  Search,
  Paperclip,
  Send,
  MoreVertical,
  Phone,
  AlertTriangle,
  Download,
  Image,
  X
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
const ChatMessageItem = React.memo(({ msg, customerName }: { msg: { id: number; message_type: string; content: string; created_at: string }, customerName: string }) => {
  const isOutgoing = ['out', 'outbound', 'agent'].includes(msg.message_type);
  return (
    <div className={`cs-message-row ${isOutgoing ? 'outgoing' : 'incoming'}`}>
      {!isOutgoing && (
        <div className="cs-avatar-mini" style={{ background: getAvatarGradient(customerName) }}>
          {getInitials(customerName)}
        </div>
      )}
      
      <div className={`cs-message ${isOutgoing ? 'outgoing' : 'incoming'}`}>
        <div className="cs-message-sender">
          {isOutgoing ? 'Admin' : customerName.split(' ')[0]}
        </div>
        <div className="cs-message-text">{msg.content}</div>
        <div className="cs-message-time">
          {new Date(msg.created_at).toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      {isOutgoing && (
        <div className="cs-avatar-mini admin">
          ME
        </div>
      )}
    </div>
  );
});
ChatMessageItem.displayName = 'ChatMessageItem';

// Memoized contact item for performance
const ContactItem = React.memo(({
  contact,
  isSelected,
  onClick
}: {
  contact: Contact;
  isSelected: boolean;
  onClick: () => void;
}) => (
  <div
    className={`cs-contact-item ${isSelected ? 'active' : ''}`}
    onClick={onClick}
  >
    <div
      className="cs-contact-avatar"
      style={{ background: getAvatarGradient(contact.name) }}
    >
      {getInitials(contact.name)}
    </div>
    <div className="cs-contact-info">
      <div className="cs-contact-name">
        {contact.name}
        <span className={`cs-status-badge ${contact.status}`}>{contact.status}</span>
      </div>
      <div className="cs-contact-phone">{contact.phone}</div>
      <div className="cs-contact-preview">Klik untuk melihat chat...</div>
    </div>
  </div>
));
ContactItem.displayName = 'ContactItem';

export default function CustomerService() {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [textMessage, setTextMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const contactListRef = useRef<HTMLDivElement>(null);
  const previousSelectedId = useRef<number | undefined>(undefined);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data: customers, loading, hasMore, loadMore } = useCustomers(debouncedSearch);

  const contactList = useMemo<Contact[]>(
    () =>
      customers.map((c) => ({
        id: c.id,
        name: c.name ?? 'Tanpa nama',
        phone: c.phone,
        status: (['active', 'pending', 'escalation'].includes(c.status) ? c.status : 'pending') as Contact['status'],
        lastContact: c.last_message_at ? new Date(c.last_message_at).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'}) : 'N/A',
      })),
    [customers],
  );

  const [selected, setSelected] = useState<Contact | null>(null);
  const { focusName, setFocusName } = useCustomerContext();
  const { data: chatMessages, loading: chatLoading, hasMore: hasMoreMessages, loadMore: loadMoreMessages } = useChat(selected?.id);

  // Auto scroll to bottom when customer changes
  useEffect(() => {
    if (selected?.id !== previousSelectedId.current && chatMessages.length > 0 && !chatLoading) {
      setTimeout(() => {
        chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
    previousSelectedId.current = selected?.id;
  }, [selected?.id, chatMessages.length, chatLoading]);

  // Handle focus from other pages
  useEffect(() => {
    if (focusName && contactList.length) {
      const found = contactList.find((c) => c.name === focusName);
      if (found) {
        setSelected(found);
        setFocusName(null);
      }
    }
  }, [focusName, contactList, setFocusName]);

  // Auto-select first contact
  useEffect(() => {
    if (!selected && contactList.length > 0 && !loading && !searchTerm) {
      setSelected(contactList[0]);
    }
  }, [contactList.length, loading, searchTerm]);

  // Handle image selection
  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('Ukuran gambar maksimal 10MB');
        return;
      }
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const clearImage = useCallback(() => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // Send message
  const handleSend = useCallback(async () => {
    if (!selected || (!textMessage.trim() && !selectedImage)) return;

    setSending(true);
    try {
      if (selectedImage) {
        // For image, we'd need to upload first, then send
        // For now, we'll just send as a notification since backend needs to support this
        await api.sendMessage({
          mtype: 'image',
          receiver: selected.phone,
          text: textMessage.trim() || undefined,
          // url: would be the uploaded image URL
        });
        clearImage();
      } else {
        await api.sendMessage({
          mtype: 'text',
          receiver: selected.phone,
          text: textMessage.trim(),
        });
      }
      setTextMessage('');
    } catch (err) {
      console.error('Failed to send message', err);
      alert('Gagal mengirim pesan');
    } finally {
      setSending(false);
    }
  }, [selected, textMessage, selectedImage, clearImage]);

  // Export CSV
  const handleExportCSV = useCallback(() => {
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
  }, [contactList]);

  // Infinite scroll for contacts
  const handleContactScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 100) {
      if (hasMore && !loading) {
        loadMore();
      }
    }
  }, [hasMore, loading, loadMore]);

  // Prevent scroll propagation
  const handleWheelContact = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const { scrollTop, scrollHeight, clientHeight } = element;
    const isAtTop = scrollTop === 0;
    const isAtBottom = scrollTop + clientHeight >= scrollHeight;

    if ((isAtTop && e.deltaY < 0) || (isAtBottom && e.deltaY > 0)) {
      // At boundary, allow default behavior
    } else {
      e.stopPropagation();
    }
  }, []);

  const handleWheelChat = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const { scrollTop, scrollHeight, clientHeight } = element;
    const isAtTop = scrollTop === 0;
    const isAtBottom = scrollTop + clientHeight >= scrollHeight;

    if ((isAtTop && e.deltaY < 0) || (isAtBottom && e.deltaY > 0)) {
      // At boundary, allow default behavior
    } else {
      e.stopPropagation();
    }
  }, []);

  return (
    <>
      <style>{`
        .cs-page {
          position: fixed;
          top: 64px;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          background: var(--bg-primary);
          overflow: hidden;
        }

        /* Contact List Sidebar */
        .cs-sidebar {
          width: 360px;
          min-width: 280px;
          background: var(--bg-card);
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          height: 100%;
        }

        .cs-sidebar-header {
          padding: 16px;
          border-bottom: 1px solid var(--border);
          flex-shrink: 0;
        }

        .cs-sidebar-title-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .cs-sidebar-title {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .cs-contact-list {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          scroll-behavior: smooth;
        }

        .cs-contact-item {
          padding: 14px 16px;
          border-bottom: 1px solid var(--border);
          cursor: pointer;
          display: flex;
          gap: 12px;
          transition: background 0.15s ease;
        }

        .cs-contact-item:hover {
          background: var(--bg-hover);
        }

        .cs-contact-item.active {
          background: var(--accent-glow);
          border-left: 3px solid var(--accent);
        }

        .cs-contact-avatar {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 14px;
          color: white;
          flex-shrink: 0;
        }

        .cs-contact-info {
          flex: 1;
          min-width: 0;
        }

        .cs-contact-name {
          font-weight: 600;
          font-size: 14px;
          margin-bottom: 2px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .cs-status-badge {
          font-size: 10px;
          padding: 2px 8px;
          border-radius: 10px;
          font-weight: 500;
        }

        .cs-status-badge.active {
          background: rgba(16, 185, 129, 0.15);
          color: var(--accent);
        }

        .cs-status-badge.pending {
          background: rgba(245, 158, 11, 0.15);
          color: var(--warning);
        }

        .cs-status-badge.escalation {
          background: rgba(239, 68, 68, 0.15);
          color: var(--danger);
        }

        .cs-contact-phone {
          font-size: 12px;
          color: var(--text-muted);
          font-family: var(--font-mono);
          margin-bottom: 2px;
        }

        .cs-contact-preview {
          font-size: 12px;
          color: var(--text-secondary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .cs-loading {
          padding: 16px;
          text-align: center;
          color: var(--text-muted);
          font-size: 13px;
        }

        /* Chat Panel */
        .cs-chat-panel {
          flex: 1;
          display: flex;
          flex-direction: column;
          background: var(--bg-secondary);
          height: 100%;
          min-width: 0;
        }

        .cs-chat-header {
          padding: 16px 20px;
          background: var(--bg-card);
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-shrink: 0;
        }

        .cs-chat-user {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .cs-chat-user-info h3 {
          font-size: 15px;
          font-weight: 600;
          margin: 0 0 2px 0;
        }

        .cs-chat-user-info p {
          font-size: 12px;
          color: var(--text-muted);
          font-family: var(--font-mono);
          margin: 0;
        }

        .cs-chat-actions {
          display: flex;
          gap: 8px;
        }

        /* Messages Area */
        .cs-messages {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          scroll-behavior: smooth;
        }

        .cs-message-row {
          display: flex;
          gap: 12px;
          max-width: 80%;
          align-items: flex-end;
          margin-bottom: 4px;
        }

        .cs-message-row.incoming {
          align-self: flex-start;
        }

        .cs-message-row.outgoing {
          align-self: flex-end;
          justify-content: flex-end;
        }

        .cs-avatar-mini {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: 700;
          color: white;
          flex-shrink: 0;
          margin-bottom: 4px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .cs-avatar-mini.admin {
          background: var(--bg-tertiary);
          color: var(--text-secondary);
          border: 1px solid var(--border);
        }

        .cs-message {
          max-width: 100%;
          padding: 12px 16px;
          border-radius: 12px;
          position: relative;
          min-width: 120px;
        }

        .cs-message.incoming {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-bottom-left-radius: 4px;
        }

        .cs-message.outgoing {
          background: linear-gradient(135deg, var(--accent), var(--cyan));
          color: white;
          border-bottom-right-radius: 4px;
        }

        .cs-message-sender {
          font-size: 11px;
          font-weight: 700;
          margin-bottom: 4px;
          opacity: 0.8;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .cs-message-text {
          font-size: 14px;
          line-height: 1.5;
          margin-bottom: 4px;
          word-break: break-word;
        }

        .cs-message-time {
          font-size: 10px;
          opacity: 0.7;
          text-align: right;
        }

        .cs-message.incoming .cs-message-time {
          color: var(--text-muted);
        }

        .cs-load-more-btn {
          align-self: center;
          padding: 8px 16px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border);
          border-radius: 8px;
          color: var(--text-secondary);
          font-size: 12px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .cs-load-more-btn:hover {
          background: var(--bg-hover);
          border-color: var(--accent);
          color: var(--accent);
        }

        /* Input Area */
        .cs-input-area {
          padding: 16px 20px;
          background: var(--bg-card);
          border-top: 1px solid var(--border);
          flex-shrink: 0;
        }

        .cs-image-preview {
          margin-bottom: 12px;
          position: relative;
          display: inline-block;
        }

        .cs-image-preview img {
          max-width: 200px;
          max-height: 150px;
          border-radius: 8px;
          border: 1px solid var(--border);
        }

        .cs-image-preview-close {
          position: absolute;
          top: -8px;
          right: -8px;
          width: 24px;
          height: 24px;
          background: var(--danger);
          border: none;
          border-radius: 50%;
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .cs-input-wrapper {
          display: flex;
          gap: 10px;
          align-items: center;
        }

        .cs-input-wrapper input[type="file"] {
          display: none;
        }

        .cs-text-input {
          flex: 1;
          padding: 12px 16px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border);
          border-radius: 10px;
          color: var(--text-primary);
          font-size: 14px;
          outline: none;
          transition: border-color 0.15s ease;
        }

        .cs-text-input:focus {
          border-color: var(--accent);
        }

        .cs-text-input::placeholder {
          color: var(--text-muted);
        }

        .cs-icon-btn {
          width: 42px;
          height: 42px;
          border: 1px solid var(--border);
          background: var(--bg-tertiary);
          border-radius: 10px;
          color: var(--text-secondary);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
          flex-shrink: 0;
        }

        .cs-icon-btn:hover {
          background: var(--bg-hover);
          border-color: var(--accent);
          color: var(--accent);
        }

        .cs-send-btn {
          padding: 12px 20px;
          background: linear-gradient(135deg, var(--accent), var(--cyan));
          border: none;
          border-radius: 10px;
          color: white;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: opacity 0.15s ease;
          flex-shrink: 0;
        }

        .cs-send-btn:hover {
          opacity: 0.9;
        }

        .cs-send-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Empty State */
        .cs-empty-state {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          text-align: center;
          padding: 40px;
        }

        .cs-empty-state-icon {
          width: 64px;
          height: 64px;
          background: var(--bg-tertiary);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
        }

        .cs-empty-state h3 {
          font-size: 18px;
          margin: 0 0 8px 0;
          color: var(--text-primary);
        }

        .cs-empty-state p {
          margin: 0;
          font-size: 14px;
        }

        /* Scrollbar styling */
        .cs-contact-list::-webkit-scrollbar,
        .cs-messages::-webkit-scrollbar {
          width: 6px;
        }

        .cs-contact-list::-webkit-scrollbar-track,
        .cs-messages::-webkit-scrollbar-track {
          background: transparent;
        }

        .cs-contact-list::-webkit-scrollbar-thumb,
        .cs-messages::-webkit-scrollbar-thumb {
          background: var(--border);
          border-radius: 3px;
        }

        .cs-contact-list::-webkit-scrollbar-thumb:hover,
        .cs-messages::-webkit-scrollbar-thumb:hover {
          background: var(--text-muted);
        }

        /* Responsive */
        @media (max-width: 768px) {
          .cs-sidebar {
            width: 100%;
            max-height: 40vh;
          }

          .cs-page {
            flex-direction: column;
          }

          .cs-chat-panel {
            height: 60vh;
          }
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .cs-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid var(--border);
          border-top-color: var(--accent);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          display: inline-block;
          margin-right: 8px;
        }
      `}</style>

      <div className="cs-page">
        {/* Contact List Sidebar */}
        <div className="cs-sidebar">
          <div className="cs-sidebar-header">
            <div className="cs-sidebar-title-row">
              <div className="cs-sidebar-title">Kontak</div>
              <button
                className="cs-icon-btn"
                onClick={handleExportCSV}
                title="Export CSV"
              >
                <Download size={16} />
              </button>
            </div>
            <Input
              placeholder="Cari customer..."
              icon={<Search size={16} />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div
            className="cs-contact-list"
            ref={contactListRef}
            onScroll={handleContactScroll}
            onWheel={handleWheelContact}
          >
            {contactList.map((contact) => (
              <ContactItem
                key={contact.id}
                contact={contact}
                isSelected={selected?.id === contact.id}
                onClick={() => setSelected(contact)}
              />
            ))}

            {loading && (
              <div className="cs-loading">
                <span className="cs-spinner"></span>
                Memuat kontak...
              </div>
            )}

            {!loading && contactList.length === 0 && (
              <div className="cs-loading">Tidak ada kontak ditemukan</div>
            )}

            {!loading && !hasMore && contactList.length > 0 && (
              <div className="cs-loading" style={{ fontSize: 11 }}>Semua kontak telah dimuat</div>
            )}
          </div>
        </div>

        {/* Chat Panel */}
        <div className="cs-chat-panel">
          {selected ? (
            <>
              {/* Chat Header */}
              <div className="cs-chat-header">
                <div className="cs-chat-user">
                  <div
                    className="cs-contact-avatar"
                    style={{ background: getAvatarGradient(selected.name) }}
                  >
                    {getInitials(selected.name)}
                  </div>
                  <div className="cs-chat-user-info">
                    <h3>{selected.name}</h3>
                    <p>{selected.phone}</p>
                  </div>
                </div>
                <div className="cs-chat-actions">
                  <Badge variant="green" dot>Active</Badge>
                  <Button variant="secondary" size="sm" icon={<AlertTriangle size={14}/>}>
                    Escalate
                  </Button>
                  <Button variant="ghost" size="sm">
                    <MoreVertical size={16} />
                  </Button>
                </div>
              </div>

              {/* Messages */}
              <div
                className="cs-messages"
                ref={chatContainerRef}
                onWheel={handleWheelChat}
              >
                {/* Load Older Messages */}
                {hasMoreMessages && !chatLoading && chatMessages.length > 0 && (
                  <button
                    className="cs-load-more-btn"
                    onClick={loadMoreMessages}
                  >
                    Muat pesan lebih lama
                  </button>
                )}

                {chatLoading && chatMessages.length === 0 && (
                  <div className="cs-empty-state">
                    <span className="cs-spinner"></span>
                    <p>Memuat chat...</p>
                  </div>
                )}

                {!chatLoading && chatMessages.length === 0 && (
                  <div className="cs-empty-state">
                    <div className="cs-empty-state-icon">
                      <Phone size={28} />
                    </div>
                    <p>Belum ada riwayat percakapan</p>
                  </div>
                )}

                {chatMessages.map((msg) => (
                  <ChatMessageItem key={msg.id} msg={msg} customerName={selected?.name || 'Customer'} />
                ))}

                {chatLoading && chatMessages.length > 0 && (
                  <div className="cs-loading">
                    <span className="cs-spinner"></span>
                    Memuat pesan...
                  </div>
                )}

                <div ref={chatMessagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="cs-input-area">
                {imagePreview && (
                  <div className="cs-image-preview">
                    <img src={imagePreview} alt="Preview" />
                    <button className="cs-image-preview-close" onClick={clearImage}>
                      <X size={14} />
                    </button>
                  </div>
                )}

                <div className="cs-input-wrapper">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleImageSelect}
                  />
                  <button
                    className="cs-icon-btn"
                    onClick={() => fileInputRef.current?.click()}
                    title="Tambah gambar"
                  >
                    <Image size={18} />
                  </button>
                  <input
                    type="text"
                    className="cs-text-input"
                    placeholder="Ketik pesan..."
                    value={textMessage}
                    onChange={(e) => setTextMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                    disabled={sending}
                  />
                  <button
                    className="cs-send-btn"
                    onClick={handleSend}
                    disabled={sending || (!textMessage.trim() && !selectedImage)}
                  >
                    <Send size={16} />
                    Kirim
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="cs-empty-state">
              <div className="cs-empty-state-icon">
                <Phone size={28} />
              </div>
              <h3>Pilih Customer</h3>
              <p>Pilih salah satu kontak di sebelah kiri untuk memulai chat</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
