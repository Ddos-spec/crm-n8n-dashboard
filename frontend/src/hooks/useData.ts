import { useEffect, useState } from 'react';
import { api, Campaign, Customer, Escalation, ChatMessage, Business, DashboardStats } from '../lib/api';

export function useDashboardStats() {
  const [data, setData] = useState<DashboardStats>({
    totalCustomers: 0,
    totalChats: 0,
    openEscalations: 0,
    leadsThisMonth: 0,
    customerTrend: '0%',
    customerTrendStatus: 'up',
    chatTrend: '0%',
    chatTrendStatus: 'up',
    escTrend: '0%',
    escTrendStatus: 'down',
    leadsTrend: '0%',
    leadsTrendStatus: 'up'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.getDashboardStats();
        setData(res.data);
      } catch (err) {
        console.error('load stats', err);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  return { data, loading };
}

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

export function useBusinesses(params?: { status?: string; search?: string }) {
  const [data, setData] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.getBusinesses({ limit: 100, ...params });
        setData(res.data);
      } catch (err) {
        console.error('load businesses', err);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [params?.search, params?.status]);
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
