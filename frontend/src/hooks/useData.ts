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
        // Sanitize data to ensure numbers
        const sanitized = {
          totalCustomers: parseInt(String(res.data.totalCustomers || 0)),
          totalChats: parseInt(String(res.data.totalChats || 0)),
          openEscalations: parseInt(String(res.data.openEscalations || 0)),
          leadsThisMonth: parseInt(String(res.data.leadsThisMonth || 0)),
          customerTrend: res.data.customerTrend || '0%',
          customerTrendStatus: res.data.customerTrendStatus || 'up',
          chatTrend: res.data.chatTrend || '0%',
          chatTrendStatus: res.data.chatTrendStatus || 'up',
          escTrend: res.data.escTrend || '0%',
          escTrendStatus: res.data.escTrendStatus || 'down',
          leadsTrend: res.data.leadsTrend || '0%',
          leadsTrendStatus: res.data.leadsTrendStatus || 'up',
        };
        setData(sanitized);
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

export function useCustomers(search?: string) {
  const [data, setData] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const LIMIT = 500; // Increased from 20 to 500 to load more customers at once

  // Reset when search changes
  useEffect(() => {
    setData([]);
    setOffset(0);
    setHasMore(true);
    setLoading(true);
  }, [search]);

  // Load data effect
  useEffect(() => {
    const load = async () => {
      // Prevent race conditions or loading if no more data
      if (!hasMore && offset > 0) return; 
      
      try {
        setLoading(true);
        const res = await api.getCustomers({ limit: LIMIT, offset, search });
        const newData = res.data;

        if (newData.length < LIMIT) {
          setHasMore(false);
        }

        setData((prev) => {
          // If offset is 0, replace data (new search/init). Else append.
          return offset === 0 ? newData : [...prev, ...newData];
        });
      } catch (err) {
        console.error('load customers', err);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [offset, search]); // Removed hasMore dependency to avoid loop, controlled by logic inside

  const loadMore = () => {
    if (!loading && hasMore) {
      setOffset((prev) => prev + LIMIT);
    }
  };

  return { data, loading, hasMore, loadMore };
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
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const LIMIT = 50; // Load 50 messages at a time for better performance

  // Reset when customer changes
  useEffect(() => {
    setData([]);
    setOffset(0);
    setHasMore(true);
  }, [customerId]);

  // Load chat messages
  useEffect(() => {
    if (!customerId) return;

    const load = async () => {
      if (!hasMore && offset > 0) return; // Don't load if no more data

      setLoading(true);
      try {
        const res = await api.getChatHistory(customerId, { limit: LIMIT, offset });
        const newMessages = res.data;

        if (newMessages.length < LIMIT) {
          setHasMore(false);
        }

        setData((prev) => {
          // If offset is 0, replace data (new customer). Else prepend older messages.
          return offset === 0 ? newMessages : [...newMessages, ...prev];
        });
      } catch (err) {
        console.error('load chat', err);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [customerId, offset]);

  const loadMore = () => {
    if (!loading && hasMore) {
      setOffset((prev) => prev + LIMIT);
    }
  };

  return { data, loading, hasMore, loadMore };
}
