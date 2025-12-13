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
      `"${c.name.replace(/