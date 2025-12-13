import React, { useEffect, useMemo, useState } from 'react';
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

export default function CustomerService() {
  const { data: customers, loading } = useCustomers();
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
  const { data: chatMessages, loading: chatLoading } = useChat(selected?.id);
  const [textMessage, setTextMessage] = useState('');
  
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
    if (!selected && contactList.length) {
      setSelected(contactList[0]);
    }
  }, [focusName, contactList, setFocusName, selected]);

  const handleSend = async () => {
    if (!selected || !textMessage.trim()) return;
    try {
      await api.sendMessage({
        mtype: 'text',
        receiver: selected.phone,
        text: textMessage.trim(),
      });
      setTextMessage('');
      // In a real app, we'd optimistically update the UI or refetch
    } catch (err) {
      console.error('Failed to send message', err);
      alert('Gagal mengirim pesan');
    }
  };

  const handleExportCSV = () => {
    if (!contactList.length) return;

    // CSV Header
    const headers = ['Name', 'Phone', 'Status', 'Last Contact'];
    
    // CSV Rows
    const rows = contactList.map(c => [
      `"${c.name.replace(/"/g, '""')}"`, // Escape quotes
      `"${c.phone}"`,
      c.status,
      c.lastContact
    ]);

    // Combine
    const csvContent = [
      headers.join(','), 
      ...rows.map(r => r.join(','))
    ].join('\n');

    // Create Blob and Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `customers_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="page active" id="customer-service">
      <div className="page-header">
        <h1 className="page-title">Customer Service</h1>
        <p className="page-subtitle">Kelola percakapan dan eskalasi customer</p>
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
            />
          </div>
          <div className="contact-list-body">
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
            {contactList.length === 0 && !loading && (
              <div style={{padding: 20, textAlign: 'center', color: 'var(--text-muted)'}}>Tidak ada kontak</div>
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
              <div className="chat-messages">
                {chatLoading && <div className="muted" style={{textAlign: 'center', marginTop: 20}}>Memuat chat...</div>}
                {!chatLoading && chatMessages.length === 0 && (
                  <div className="empty-state">
                    <div className="empty-state-icon"><Phone size={32}/></div>
                    <p>Belum ada riwayat percakapan</p>
                  </div>
                )}
                {chatMessages.map((msg) => {
                  const isOutgoing = ['out', 'outbound', 'agent'].includes(msg.message_type);
                  return (
                    <div key={msg.id} className={`message ${isOutgoing ? 'outgoing' : 'incoming'}`}>
                      <div className="message-text">{msg.content}</div>
                      <div className="message-time">
                        {new Date(msg.created_at).toLocaleString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  );
                })}
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
    </div>
  );
}