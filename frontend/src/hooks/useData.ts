import { useEffect, useState } from 'react';
import { api, Campaign, Customer, Escalation, ChatMessage } from '../lib/api';

export function useCustomers() {
  const [data, setData] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.getCustomers();
        setData(res.data);
      } catch (err) {
        console.error('load customers', err);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);
  return { data, loading };
}

export function useEscalations() {
  const [data, setData] = useState<Escalation[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.getEscalations();
        setData(res.data);
      } catch (err) {
        console.error('load escalations', err);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);
  return { data, loading };
}

export function useCampaigns() {
  const [data, setData] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.getCampaigns();
        setData(res.data);
      } catch (err) {
        console.error('load campaigns', err);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);
  return { data, loading };
}

export function useChat(customerId?: number) {
  const [data, setData] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!customerId) return;
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.getChatHistory(customerId);
        setData(res.data);
      } catch (err) {
        console.error('load chat', err);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [customerId]);

  return { data, loading };
}
